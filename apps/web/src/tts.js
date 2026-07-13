/**
 * Native browser TTS (Web Speech API) — instant, no pre-generation.
 * Prefers Brazilian Portuguese female voices when available.
 */

const FEMALE_HINTS =
  /female|femin|mulher|woman|maria|luciana|francisca|vit[oó]ria|vitoria|helena|fernanda|camila|ana|julia|google português do brasil|microsoft maria|microsoft francisca/i;

const MALE_HINTS = /male|mascul|homem|man|daniel|ricardo|google uk english male|microsoft daniel/i;

let cachedVoice = null;
let voicesReady = false;

function scoreVoice(v) {
  if (!v) return -1000;
  const name = `${v.name} ${v.lang}`;
  let score = 0;
  const lang = (v.lang || "").toLowerCase();
  if (lang === "pt-br" || lang.startsWith("pt-br")) score += 50;
  else if (lang.startsWith("pt")) score += 30;
  else score -= 20;
  if (FEMALE_HINTS.test(name)) score += 40;
  if (MALE_HINTS.test(name) && !FEMALE_HINTS.test(name)) score -= 35;
  // Prefer local/native over remote when possible
  if (v.localService) score += 5;
  return score;
}

export function warmTtsVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const load = () => {
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    voicesReady = true;
    const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    cachedVoice = ranked[0] || null;
  };
  load();
  if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
    window.speechSynthesis.onvoiceschanged = load;
  }
  // Chrome sometimes needs a tick
  setTimeout(load, 250);
}

export function pickPtBrFemaleVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return cachedVoice;
  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  cachedVoice = ranked[0] || null;
  voicesReady = true;
  return cachedVoice;
}

/**
 * Speak text with feminine pt-BR when possible.
 * @returns {boolean} true if speech was started
 */
export function speakPortuguese(text, { rate = 0.92, pitch = 1.15, volume = 1, lang = "pt" } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const clean = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return false;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const l = String(lang || "pt").toLowerCase();
  u.lang = l.startsWith("en") ? "en-US" : l.startsWith("es") ? "es-MX" : "pt-BR";
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;

  const voice = pickPtBrFemaleVoice();
  if (voice) {
    // Prefer matching language family
    const voices = window.speechSynthesis.getVoices() || [];
    const prefer = voices
      .filter((v) => (v.lang || "").toLowerCase().startsWith(u.lang.slice(0, 2)))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
    u.voice = prefer || voice;
    if (u.voice?.lang) u.lang = u.voice.lang;
  }

  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function ttsSupported() {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}
