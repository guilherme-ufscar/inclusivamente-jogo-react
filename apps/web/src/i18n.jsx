import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FLAG_IMAGES } from "./themes";

const LANG_KEY = "inclusiva_lang";

export const LANGS = [
  { code: "pt", label: "Português", short: "BR", flagSrc: FLAG_IMAGES.pt },
  { code: "en", label: "English", short: "US", flagSrc: FLAG_IMAGES.en },
  { code: "es", label: "Español", short: "ES", flagSrc: FLAG_IMAGES.es },
];

const UI = {
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
    pickYear: "Em qual ano você está?",
    pickMatter: "O que vamos aprender hoje?",
    pickTheme: "Escolha um tema",
    pickLevel: "Escolha o nível",
    playNow: "Vamos jogar!",
    playHint: "Toque no tema, no nível e depois no botão verde",
    appTitle: "Inclusiva Educa",
    langHint: "Idioma",
    langChangeTip: "Quer trocar o idioma? Toque na bandeira:",
    portuguese: "Português",
    math: "Matemática",
    stepYear: "Ano",
    stepMatter: "Matéria",
    stepPlay: "Jogar",
    theme: "Tema",
    ready: "Pronto para começar?",
    stepTutor: "Tutor",
    pickTutorMode: "Você vai jogar com tutor ou sozinho?",
    withTutor: "Com tutor",
    withTutorHint: "Alguém ajuda na atividade",
    withoutTutor: "Sem tutor",
    withoutTutorHint: "Eu jogo sozinho",
    modeWithTutor: "Modo: com tutor",
    modeWithoutTutor: "Modo: sem tutor",
    demoMode: "Modo demonstração — resultados não vão para o painel",
    sondagemWait: "Aguarde a conclusão da sondagem no painel.",
    sondagemHint: "Quando a sondagem estiver pronta, entre de novo pelo painel.",
    loginRequired: "É preciso entrar pelo painel Inclusivamente.",
    loginHint: "O aluno faz login no painel e é redirecionado ao jogo com um token.",
    goPanel: "Abrir painel",
    helloName: "Olá, {name}!",
    pickExercise: "Escolha o exercício",
    exercise: "Exercício",
    locked: "Bloqueado",
    lockedHint: "Termine o exercício anterior primeiro",
    doneMark: "Feito",
    freePlay: "Livre",
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
    pickYear: "Which year are you in?",
    pickMatter: "What shall we learn today?",
    pickTheme: "Pick a theme",
    pickLevel: "Pick a level",
    playNow: "Let's play!",
    playHint: "Tap a theme, a level, then the green button",
    appTitle: "Inclusiva Educa",
    langHint: "Language",
    langChangeTip: "Want to change the language? Tap a flag:",
    portuguese: "Language arts",
    math: "Math",
    stepYear: "Year",
    stepMatter: "Subject",
    stepPlay: "Play",
    theme: "Theme",
    ready: "Ready to start?",
    stepTutor: "Tutor",
    pickTutorMode: "Will you play with a tutor or alone?",
    withTutor: "With tutor",
    withTutorHint: "Someone helps with the activity",
    withoutTutor: "Without tutor",
    withoutTutorHint: "I play on my own",
    modeWithTutor: "Mode: with tutor",
    modeWithoutTutor: "Mode: without tutor",
    demoMode: "Demo mode — results are not sent to the panel",
    sondagemWait: "Please wait until the screening is completed in the panel.",
    sondagemHint: "When screening is ready, open the game again from the panel.",
    loginRequired: "Please sign in through the Inclusivamente panel.",
    loginHint: "Students log in on the panel and are redirected here with a token.",
    goPanel: "Open panel",
    helloName: "Hi, {name}!",
    pickExercise: "Pick an exercise",
    exercise: "Exercise",
    locked: "Locked",
    lockedHint: "Finish the previous exercise first",
    doneMark: "Done",
    freePlay: "Open",
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
    pickYear: "¿En qué año estás?",
    pickMatter: "¿Qué vamos a aprender hoy?",
    pickTheme: "Elige un tema",
    pickLevel: "Elige el nivel",
    playNow: "¡A jugar!",
    playHint: "Toca un tema, un nivel y luego el botón verde",
    appTitle: "Inclusiva Educa",
    langHint: "Idioma",
    langChangeTip: "¿Quieres cambiar el idioma? Toca una bandera:",
    portuguese: "Lengua",
    math: "Matemáticas",
    stepYear: "Año",
    stepMatter: "Materia",
    stepPlay: "Jugar",
    theme: "Tema",
    ready: "¿Listo para empezar?",
    stepTutor: "Tutor",
    pickTutorMode: "¿Vas a jugar con tutor o solo?",
    withTutor: "Con tutor",
    withTutorHint: "Alguien ayuda en la actividad",
    withoutTutor: "Sin tutor",
    withoutTutorHint: "Juego solo",
    modeWithTutor: "Modo: con tutor",
    modeWithoutTutor: "Modo: sin tutor",
    demoMode: "Modo demo — los resultados no se envían al panel",
    sondagemWait: "Espera a que termine la evaluación en el panel.",
    sondagemHint: "Cuando esté lista, entra de nuevo desde el panel.",
    loginRequired: "Debes entrar desde el panel Inclusivamente.",
    loginHint: "El alumno inicia sesión en el panel y es redirigido aquí con un token.",
    goPanel: "Abrir panel",
    helloName: "¡Hola, {name}!",
    pickExercise: "Elige el ejercicio",
    exercise: "Ejercicio",
    locked: "Bloqueado",
    lockedHint: "Termina el ejercicio anterior primero",
    doneMark: "Hecho",
    freePlay: "Libre",
  },
};

function normalizeLang(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.startsWith("pt")) return "pt";
  if (s.startsWith("en")) return "en";
  if (s.startsWith("es")) return "es";
  return null;
}

function readJwtLang() {
  try {
    const token =
      localStorage.getItem("inclusiva_jwt") ||
      sessionStorage.getItem("inclusiva_jwt") ||
      "";
    if (!token || !token.includes(".")) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return normalizeLang(payload.lang || payload.locale || payload.language);
  } catch {
    return null;
  }
}

function initialLang() {
  try {
    const stored = normalizeLang(localStorage.getItem(LANG_KEY));
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return readJwtLang() || "pt";
}

const LanguageContext = createContext({
  lang: "pt",
  setLang: () => {},
  t: (k) => k,
  langs: LANGS,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  // Re-read if auth wrote language from JWT
  useEffect(() => {
    const sync = () => {
      try {
        const stored = normalizeLang(localStorage.getItem(LANG_KEY));
        if (stored && stored !== lang) setLangState(stored);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    // one-shot after mount (auth may set lang)
    const t = setTimeout(sync, 300);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearTimeout(t);
    };
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
  }, [lang]);

  const setLang = (code) => {
    const n = normalizeLang(code) || "pt";
    setLangState(n);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key) => UI[lang]?.[key] ?? UI.pt[key] ?? key,
      langs: LANGS,
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Compact flag switcher — small solid chip, no glass */
export function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, langs, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full bg-white p-1 shadow-md ${className}`}
      role="group"
      aria-label={t("langHint")}
    >
      {langs.map((L) => {
        const on = lang === L.code;
        return (
          <motion.button
            key={L.code}
            type="button"
            onClick={() => setLang(L.code)}
            title={L.label}
            aria-label={L.label}
            aria-pressed={on}
            whileTap={{ scale: 0.92 }}
            className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 transition sm:h-10 sm:w-10 ${
              on
                ? "border-violet-500 shadow-sm"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <img
              src={L.flagSrc}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
