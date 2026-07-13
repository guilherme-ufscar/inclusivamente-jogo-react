/**
 * Language helpers for multilíngue (pt | en | es)
 */

export const SUPPORTED_LANGS = ["pt", "en", "es"];

export function normalizeLang(raw) {
  if (!raw) return "pt";
  const s = String(raw).trim().toLowerCase().replace("_", "-");
  if (s === "pt" || s.startsWith("pt-") || s === "por" || s === "portuguese") return "pt";
  if (s === "en" || s.startsWith("en-") || s === "eng" || s === "english") return "en";
  if (s === "es" || s.startsWith("es-") || s === "spa" || s === "spanish" || s === "español" || s === "espanol")
    return "es";
  return "pt";
}

/** Resolve language from request (query > header > user JWT > default pt) */
export function langFromRequest(req) {
  const q = req.query?.lang || req.query?.locale || req.query?.language;
  const h = req.headers?.["x-lang"] || req.headers?.["x-locale"] || req.headers?.["accept-language"];
  const fromAccept = h && String(h).split(",")[0];
  const fromUser = req.user?.language || req.user?.lang || req.user?.locale;
  return normalizeLang(q || fromUser || fromAccept || "pt");
}

export const UI_LABELS = {
  pt: {
    loading: "Carregando…",
    back: "Voltar",
    home: "Início",
    confirm: "Confirmar",
    tryAgain: "Tentar de novo",
    listen: "Ouvir enunciado",
    single: "Escolha única",
    multiple: "Múltipla escolha",
    question: "Pergunta",
    level: "Nível",
    activities: "atividades",
    years: "anos",
    almost: "Quase! Tente outra vez.",
    great: "Muito bem!",
    done: "Trilha concluída!",
    pickTrack: "Escolha sua trilha e vamos aprender brincando!",
    appTitle: "Inclusiva Educa",
    langHint: "Idioma",
    matter_lp: "Português",
    matter_ma: "Matemática",
    matter_pt: "Português",
    matter_mt: "Matemática",
  },
  en: {
    loading: "Loading…",
    back: "Back",
    home: "Home",
    confirm: "Confirm",
    tryAgain: "Try again",
    listen: "Listen to the question",
    single: "Single choice",
    multiple: "Multiple choice",
    question: "Question",
    level: "Level",
    activities: "activities",
    years: "years",
    almost: "Almost! Try again.",
    great: "Great job!",
    done: "Track complete!",
    pickTrack: "Pick your path and let's learn while playing!",
    appTitle: "Inclusiva Educa",
    langHint: "Language",
    matter_lp: "Language",
    matter_ma: "Math",
    matter_pt: "Language",
    matter_mt: "Math",
  },
  es: {
    loading: "Cargando…",
    back: "Volver",
    home: "Inicio",
    confirm: "Confirmar",
    tryAgain: "Intentar de nuevo",
    listen: "Escuchar el enunciado",
    single: "Opción única",
    multiple: "Opción múltiple",
    question: "Pregunta",
    level: "Nivel",
    activities: "actividades",
    years: "años",
    almost: "¡Casi! Inténtalo otra vez.",
    great: "¡Muy bien!",
    done: "¡Ruta completada!",
    pickTrack: "¡Elige tu ruta y aprendamos jugando!",
    appTitle: "Inclusiva Educa",
    langHint: "Idioma",
    matter_lp: "Lengua",
    matter_ma: "Matemáticas",
    matter_pt: "Lengua",
    matter_mt: "Matemáticas",
  },
};

export function t(lang, key) {
  const L = UI_LABELS[normalizeLang(lang)] || UI_LABELS.pt;
  return L[key] ?? UI_LABELS.pt[key] ?? key;
}

export function matterLabel(lang, code) {
  const c = String(code || "").toLowerCase();
  return t(lang, `matter_${c}`) || code;
}

export function yearLabel(lang, code, fallback) {
  const c = String(code || "");
  if (/anos/i.test(c)) {
    const n = c.replace(/\D/g, "") || c;
    if (lang === "en") return `${n} years old`;
    if (lang === "es") return `${n} años`;
    return fallback || c;
  }
  const n = c.replace(/^0+/, "") || c;
  if (lang === "en") return `${n}${n === "1" ? "st" : n === "2" ? "nd" : n === "3" ? "rd" : "th"} grade`;
  if (lang === "es") return `${n}.º año`;
  return fallback || `${n}º Ano`;
}
