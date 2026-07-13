import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "../i18n";
import { IconBack } from "../icons";

/**
 * Minimal kid-friendly shell:
 * - solid white card sized to content (no empty flex stretch)
 * - optional theme image or solid/soft gradient
 * - language can stay off header (pages place it elsewhere)
 */
export default function Shell({
  children,
  wide,
  backTo,
  showLang = false,
  themeUrl = null,
  /** soft | dark | none — only when themeUrl is set */
  overlay = "soft",
  /** CSS gradient / color when no themeUrl */
  bgClass = null,
  headerExtra,
  center = true,
}) {
  const navigate = useNavigate();
  const hasBack = backTo === -1 || backTo === "-1" || Boolean(backTo);

  const back = !hasBack ? null : backTo === -1 || backTo === "-1" ? (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-md"
      aria-label="Voltar"
    >
      <IconBack className="h-5 w-5" />
    </button>
  ) : (
    <Link
      to={backTo}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-md"
      aria-label="Voltar"
    >
      <IconBack className="h-5 w-5" />
    </Link>
  );

  const overlayCss =
    overlay === "none"
      ? "none"
      : overlay === "dark"
        ? "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.5) 100%)"
        : "linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.45) 100%)";

  const bgStyle = themeUrl
    ? { backgroundImage: `${overlayCss}, url(${themeUrl})` }
    : undefined;

  const fallbackBg =
    bgClass ||
    "bg-gradient-to-br from-violet-200 via-sky-100 to-amber-100";

  return (
    <div className={`relative min-h-screen font-display ${themeUrl ? "" : fallbackBg}`}>
      {themeUrl && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={bgStyle}
        />
      )}

      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 ${
          wide ? "max-w-5xl" : "max-w-2xl"
        } ${center ? "justify-center" : ""}`}
      >
        {(back || showLang || headerExtra) && (
          <div className="mb-3 flex items-center justify-between gap-2">
            {back || <span />}
            <div className="flex items-center gap-2">
              {headerExtra}
              {showLang && <LanguageSwitcher />}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-[1.75rem] bg-white p-5 shadow-xl sm:p-7"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function CardButton({
  children,
  onClick,
  to,
  color = "#7C3AED",
  delay = 0,
  selected = false,
  large = false,
  className = "",
  disabled = false,
}) {
  const base = `btn-pop block w-full text-left text-white ${
    large ? "p-5 sm:p-6" : "p-4"
  } ${disabled ? "opacity-45 pointer-events-none grayscale" : ""} ${className}`;
  const style = {
    backgroundColor: color,
    boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 6px ${color}` : undefined,
  };

  const inner =
    to && !disabled ? (
      <Link to={to} className={base} style={style}>
        {children}
      </Link>
    ) : (
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={base}
        style={style}
        aria-pressed={selected}
      >
        {children}
      </button>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={disabled ? {} : { scale: 1.015 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {inner}
    </motion.div>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-[20vh] items-center justify-center text-lg font-bold text-slate-400">
      …
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="rounded-2xl bg-rose-100 p-4 text-center font-bold text-rose-800">
      {message || "Algo deu errado"}
    </div>
  );
}

export function ScreenPrompt({ children }) {
  return (
    <p className="mb-5 text-center text-lg font-black leading-snug text-slate-800 sm:text-xl">
      {children}
    </p>
  );
}

/** Language block for bottom of cards — with short tip */
export function LanguageFooter() {
  // imported lazily via i18n in parent to avoid circular deps — use LanguageSwitcher from i18n
  return null;
}
