/**
 * Persona from painel JWT (claim 0–4).
 * Admin may override via setPersonaSlug (localStorage).
 * Dev fallback: ?persona=slug|0-4.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth, PERSONA_MAP } from "./auth";

const STORAGE_KEY = "inclusiva_persona";
const ADMIN_PICK_KEY = "inclusiva_admin_persona_picked";

export function getAdminPersonaPicked() {
  try {
    return sessionStorage.getItem(ADMIN_PICK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminPersonaPicked(v) {
  try {
    if (v) sessionStorage.setItem(ADMIN_PICK_KEY, "1");
    else sessionStorage.removeItem(ADMIN_PICK_KEY);
  } catch {
    /* ignore */
  }
}

function resolvePersonaSlug(authSlug, isAdmin) {
  // Admin override always wins once chosen
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isAdmin && stored && PERSONA_MAP.includes(stored)) return stored;
  } catch {
    /* ignore */
  }

  if (!isAdmin && authSlug && PERSONA_MAP.includes(authSlug)) return authSlug;

  // Query string (dev / deep-link)
  try {
    const q = new URLSearchParams(window.location.search).get("persona");
    if (q != null && q !== "") {
      if (/^\d+$/.test(q)) {
        const idx = Number(q);
        if (idx >= 0 && idx < PERSONA_MAP.length) return PERSONA_MAP[idx];
      }
      const s = q.toLowerCase();
      if (PERSONA_MAP.includes(s)) return s;
    }
  } catch {
    /* ignore */
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && PERSONA_MAP.includes(stored)) return stored;
  } catch {
    /* ignore */
  }

  if (authSlug && PERSONA_MAP.includes(authSlug)) return authSlug;
  return "padrao";
}

const PersonaContext = createContext({
  slug: "padrao",
  persona: null,
  loading: true,
  error: null,
  setPersonaSlug: () => {},
  adminPicked: false,
});

export function PersonaProvider({ children }) {
  const { personaSlug: authSlug, loading: authLoading, isAdmin } = useAuth();
  const [slug, setSlug] = useState(() => resolvePersonaSlug(authSlug, false));
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminPicked, setAdminPickedState] = useState(() => getAdminPersonaPicked());

  const setPersonaSlug = useCallback((next, opts = {}) => {
    const s = String(next || "").toLowerCase();
    if (!PERSONA_MAP.includes(s)) return;
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* ignore */
    }
    setSlug(s);
    if (opts.adminPick) {
      setAdminPersonaPicked(true);
      setAdminPickedState(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setSlug(resolvePersonaSlug(authSlug, isAdmin));
    setAdminPickedState(getAdminPersonaPicked());
  }, [authSlug, authLoading, isAdmin]);

  useEffect(() => {
    const sync = () => {
      setSlug(resolvePersonaSlug(authSlug, isAdmin));
      setAdminPickedState(getAdminPersonaPicked());
    };
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [authSlug, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .personas()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((p) => p.slug === slug) || list[0] || null;
        setPersona(found);
        if (found && found.slug !== slug) setSlug(found.slug);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const value = useMemo(
    () => ({
      slug: persona?.slug || slug,
      persona,
      loading: loading || authLoading,
      error,
      setPersonaSlug,
      adminPicked,
    }),
    [slug, persona, loading, authLoading, error, setPersonaSlug, adminPicked]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  return useContext(PersonaContext);
}
