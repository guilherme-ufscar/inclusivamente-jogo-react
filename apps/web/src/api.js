const BASE = import.meta.env.VITE_API_URL || "";

const LANG_KEY = "inclusiva_lang";

function currentLang() {
  try {
    return localStorage.getItem(LANG_KEY) || "pt";
  } catch {
    return "pt";
  }
}

function withLang(path) {
  const lang = currentLang();
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}lang=${encodeURIComponent(lang)}`;
}

function authHeader() {
  try {
    const tok =
      localStorage.getItem("inclusiva_jwt") || localStorage.getItem("token") || "";
    return tok ? { Authorization: `Bearer ${tok}` } : {};
  } catch {
    return {};
  }
}

async function request(path, options) {
  const res = await fetch(`${BASE}${withLang(path)}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Lang": currentLang(),
      ...authHeader(),
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || "Erro na API");
  }
  return res.json();
}

export const api = {
  personas: () => request("/api/personas"),
  years: (slug) => request(`/api/personas/${slug}/years`),
  matters: (slug, yearCode) =>
    request(`/api/personas/${slug}/years/${encodeURIComponent(yearCode)}/matters`),
  pills: (matterId) => request(`/api/matters/${matterId}/pills`),
  levels: (pillId) => request(`/api/pills/${pillId}/levels`),
  activities: (levelId) => request(`/api/levels/${levelId}/activities`),
  activity: (id) => request(`/api/activities/${id}`),
  validate: (id, body) =>
    request(`/api/activities/${id}/validate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  languages: () => request("/api/meta/languages"),
  ttsUrl: (text, lang) =>
    `${BASE}/api/tts?text=${encodeURIComponent(String(text).slice(0, 800))}&lang=${encodeURIComponent(lang || currentLang())}`,
};
