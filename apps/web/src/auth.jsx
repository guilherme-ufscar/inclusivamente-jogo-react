/**
 * Auth from painel JWT (?token=) — same token used as Bearer on painel API.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { painelMe, flushPendingReports } from "./painelClient";

export const JWT_KEY = "inclusiva_jwt";
export const JWT_META_KEY = "inclusiva_jwt_meta";
export const SESSION_KEY = "inclusiva_session";
export const PERSONA_MAP = ["padrao", "tea", "di_tea", "di_severa", "visual"];

const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === "1";

export function decodeJwtPayload(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const json = atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  try {
    return (
      localStorage.getItem(JWT_KEY) ||
      localStorage.getItem("token") ||
      sessionStorage.getItem(JWT_KEY) ||
      ""
    );
  } catch {
    return "";
  }
}

export function normalizeLangFromUser(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.startsWith("pt")) return "pt";
  if (s.startsWith("en")) return "en";
  if (s.startsWith("es")) return "es";
  return null;
}

export function personaSlugFromUser(user, payload) {
  const raw =
    user?.persona ??
    payload?.persona ??
    payload?.jwt_persona ??
    payload?.jwtPersona ??
    null;
  if (raw !== null && raw !== undefined && raw !== "") {
    if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
      const idx = Number(raw);
      if (idx >= 0 && idx < PERSONA_MAP.length) return PERSONA_MAP[idx];
    }
    const s = String(raw).toLowerCase();
    if (PERSONA_MAP.includes(s)) return s;
  }
  // query / storage fallbacks handled by PersonaProvider
  return null;
}

export function isAdminUser(user, payload) {
  const role = String(user?.role || payload?.role || "").toLowerCase();
  if (role === "admin" || role === "gestor") return true;
  if (user?.isAdmin || user?.is_admin || payload?.isAdmin || payload?.is_admin) return true;
  return false;
}

function persistToken(token) {
  try {
    localStorage.setItem(JWT_KEY, token);
    localStorage.setItem("token", token); // compat painel
    const payload = decodeJwtPayload(token) || {};
    localStorage.setItem(
      JWT_META_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        exp: payload.exp || null,
      })
    );
  } catch {
    /* ignore */
  }
}

function clearToken() {
  try {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem(JWT_META_KEY);
  } catch {
    /* ignore */
  }
}

function captureTokenFromUrl() {
  try {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("token");
    if (t) {
      persistToken(t);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      return t;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { hasTutor: null, startedAt: null };
    const o = JSON.parse(raw);
    return {
      hasTutor: typeof o.hasTutor === "boolean" ? o.hasTutor : null,
      startedAt: o.startedAt || null,
    };
  } catch {
    return { hasTutor: null, startedAt: null };
  }
}

const AuthContext = createContext({
  token: null,
  user: null,
  payload: null,
  loading: true,
  demo: true,
  error: null,
  authBlock: null, // null | 'sondagem' | 'invalid' | 'not_student'
  personaSlug: null,
  language: null,
  isAdmin: false,
  hasTutor: null,
  setHasTutor: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => captureTokenFromUrl() || getStoredToken() || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authBlock, setAuthBlock] = useState(null);
  const [session, setSession] = useState(readSession);

  const payload = useMemo(() => decodeJwtPayload(token) || null, [token]);

  const refreshUser = useCallback(async () => {
    const tok = getStoredToken();
    if (!tok) {
      setToken(null);
      setUser(null);
      setAuthBlock(REQUIRE_AUTH ? "invalid" : null);
      setLoading(false);
      return;
    }

    // exp check
    const p = decodeJwtPayload(tok);
    if (p?.exp && p.exp * 1000 < Date.now()) {
      clearToken();
      setToken(null);
      setUser(null);
      setAuthBlock("invalid");
      setError("Sessão expirada. Entre de novo pelo painel.");
      setLoading(false);
      return;
    }

    setToken(tok);
    const r = await painelMe();

    if (r.demo) {
      // no network path treated as demo if no token handled above
      setUser(null);
      setAuthBlock(null);
      setLoading(false);
      return;
    }

    if (!r.ok) {
      // Offline with valid-looking JWT: allow demo-with-token using payload only
      if (r.error === "network_error" && p) {
        setUser({
          ...p,
          role: p.role || "student",
          offline: true,
        });
        setAuthBlock(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (r.status === 401 || r.status === 403 || /invalid|expired|token/i.test(r.error || "")) {
        clearToken();
        setToken(null);
        setUser(null);
        setAuthBlock(REQUIRE_AUTH ? "invalid" : null);
        setError(r.error || "Token inválido");
        setLoading(false);
        return;
      }
      // other errors: soft fail → payload-only
      if (p) {
        setUser({ ...p, role: p.role || "student" });
        setAuthBlock(null);
      }
      setLoading(false);
      return;
    }

    const u = r.data?.data?.user || r.data?.user || r.data?.data || r.data;
    setUser(u);
    setError(null);

    if (u?.role && u.role !== "student" && !isAdminUser(u, p)) {
      // non-student can still explore in demo unless require auth student-only
      setAuthBlock(null);
    }
    if (u?.role === "student" && u.sondagem_completed === false) {
      setAuthBlock("sondagem");
    } else {
      setAuthBlock(null);
    }

    // Apply language from user once
    const lang = normalizeLangFromUser(u?.language || p?.language || p?.lang);
    if (lang) {
      try {
        localStorage.setItem("inclusiva_lang", lang);
      } catch {
        /* ignore */
      }
    }

    setLoading(false);
    flushPendingReports().catch(() => {});
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onFocus = () => refreshUser();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUser]);

  const setHasTutor = useCallback((value) => {
    const next = {
      hasTutor: Boolean(value),
      startedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setAuthBlock(REQUIRE_AUTH ? "invalid" : null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setSession({ hasTutor: null, startedAt: null });
  }, []);

  const demo = !token;
  const personaSlug = personaSlugFromUser(user, payload);
  const language = normalizeLangFromUser(
    user?.language || payload?.language || payload?.lang
  );
  const isAdmin = isAdminUser(user, payload);

  const value = useMemo(
    () => ({
      token,
      user,
      payload,
      loading,
      demo,
      error,
      authBlock,
      personaSlug,
      language,
      isAdmin,
      hasTutor: session.hasTutor,
      setHasTutor,
      logout,
      refreshUser,
      requireAuth: REQUIRE_AUTH,
    }),
    [
      token,
      user,
      payload,
      loading,
      demo,
      error,
      authBlock,
      personaSlug,
      language,
      isAdmin,
      session.hasTutor,
      setHasTutor,
      logout,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
