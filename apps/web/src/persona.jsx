/**
 * Persona from painel JWT (claim 0–4). No UI to pick persona.
 * Dev fallback: ?persona=slug|0-4 or localStorage inclusiva_persona.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth, PERSONA_MAP } from "./auth";

const STORAGE_KEY = "inclusiva_persona";

function resolvePersonaSlug(authSlug) {
  if (authSlug && PERSONA_MAP.includes(authSlug)) return authSlug;

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

  return "padrao";
}

const PersonaContext = createContext({
  slug: "padrao",
  persona: null,
  loading: true,
  error: null,
});

export function PersonaProvider({ children }) {
  const { personaSlug: authSlug, loading: authLoading } = useAuth();
  const [slug, setSlug] = useState(() => resolvePersonaSlug(authSlug));
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    setSlug(resolvePersonaSlug(authSlug));
  }, [authSlug, authLoading]);

  useEffect(() => {
    const sync = () => setSlug(resolvePersonaSlug(authSlug));
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [authSlug]);

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
    }),
    [slug, persona, loading, authLoading, error]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  return useContext(PersonaContext);
}
