import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../i18n";

const STORAGE_KEY = "inclusiva_a11y";
const FONT_STEPS = [0.9, 1, 1.1, 1.2, 1.35, 1.5];
const DEFAULT_FONT_IDX = 1;

const DEFAULTS = {
  highContrast: false,
  grayscale: false,
  underlineLinks: false,
  bigCursor: false,
  reduceMotion: false,
  readingGuide: false,
  fontIdx: DEFAULT_FONT_IDX,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function applyPrefs(prefs) {
  const root = document.documentElement;
  root.classList.toggle("a11y-contrast", !!prefs.highContrast);
  root.classList.toggle("a11y-grayscale", !!prefs.grayscale);
  root.classList.toggle("a11y-underline", !!prefs.underlineLinks);
  root.classList.toggle("a11y-big-cursor", !!prefs.bigCursor);
  root.classList.toggle("a11y-reduce-motion", !!prefs.reduceMotion);
  root.classList.toggle("a11y-reading-guide", !!prefs.readingGuide);

  const scale = FONT_STEPS[prefs.fontIdx] ?? 1;
  root.style.setProperty("--a11y-font-scale", String(scale));
  root.style.fontSize = `${16 * scale}px`;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Remove leftover VLibras DOM/script if a previous build injected it. */
function removeVLibrasIfAny() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[vw], .enabled[vw]").forEach((el) => el.remove());
  document.getElementById("vlibras-script")?.remove();
  document
    .querySelectorAll('script[src*="vlibras.gov.br"]')
    .forEach((el) => el.remove());
}

export default function AccessibilityBar() {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [guideY, setGuideY] = useState(0);

  useEffect(() => {
    removeVLibrasIfAny();
    const p = loadPrefs();
    setPrefs(p);
    applyPrefs(p);
  }, []);

  useEffect(() => {
    if (!prefs.readingGuide) return;
    const onMove = (e) => setGuideY(e.clientY);
    const onTouch = (e) => {
      if (e.touches?.[0]) setGuideY(e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [prefs.readingGuide]);

  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyPrefs(next);
      return next;
    });
  }, []);

  const changeFont = (dir) => {
    setPrefs((prev) => {
      const nextIdx = Math.max(0, Math.min(FONT_STEPS.length - 1, prev.fontIdx + dir));
      const next = { ...prev, fontIdx: nextIdx };
      applyPrefs(next);
      return next;
    });
  };

  const resetAll = () => {
    const next = { ...DEFAULTS };
    setPrefs(next);
    applyPrefs(next);
  };

  const items = [
    {
      id: "fontUp",
      label: t("a11yFontUp"),
      icon: "A+",
      action: () => changeFont(1),
      active: prefs.fontIdx > DEFAULT_FONT_IDX,
    },
    {
      id: "fontDown",
      label: t("a11yFontDown"),
      icon: "A−",
      action: () => changeFont(-1),
      active: prefs.fontIdx < DEFAULT_FONT_IDX,
    },
    {
      id: "contrast",
      label: t("a11yContrast"),
      icon: "◐",
      action: () => update({ highContrast: !prefs.highContrast }),
      active: prefs.highContrast,
    },
    {
      id: "grayscale",
      label: t("a11yGrayscale"),
      icon: "▦",
      action: () => update({ grayscale: !prefs.grayscale }),
      active: prefs.grayscale,
    },
    {
      id: "underline",
      label: t("a11yUnderline"),
      icon: "U̲",
      action: () => update({ underlineLinks: !prefs.underlineLinks }),
      active: prefs.underlineLinks,
    },
    {
      id: "cursor",
      label: t("a11yBigCursor"),
      icon: "↖",
      action: () => update({ bigCursor: !prefs.bigCursor }),
      active: prefs.bigCursor,
    },
    {
      id: "motion",
      label: t("a11yReduceMotion"),
      icon: "⏸",
      action: () => update({ reduceMotion: !prefs.reduceMotion }),
      active: prefs.reduceMotion,
    },
    {
      id: "guide",
      label: t("a11yReadingGuide"),
      icon: "▬",
      action: () => update({ readingGuide: !prefs.readingGuide }),
      active: prefs.readingGuide,
    },
    {
      id: "reset",
      label: t("a11yReset"),
      icon: "↺",
      action: resetAll,
      active: false,
    },
  ];

  return (
    <>
      {prefs.readingGuide && (
        <div
          className="a11y-guide-line"
          style={{ top: `${guideY}px` }}
          aria-hidden="true"
        />
      )}

      <div className="a11y-root" lang={lang}>
        {open && (
          <div
            className="a11y-panel"
            role="dialog"
            aria-label={t("a11yTitle")}
          >
            <div className="a11y-panel-head">
              <span className="a11y-panel-title">{t("a11yTitle")}</span>
              <button
                type="button"
                className="a11y-close"
                onClick={() => setOpen(false)}
                aria-label={t("a11yClose")}
              >
                ✕
              </button>
            </div>
            <p className="a11y-hint">{t("a11yHint")}</p>
            <div className="a11y-grid">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className={`a11y-tool ${it.active ? "is-active" : ""}`}
                  onClick={it.action}
                  title={it.label}
                  aria-pressed={it.id !== "reset" ? it.active : undefined}
                >
                  <span className="a11y-tool-icon" aria-hidden="true">
                    {it.icon}
                  </span>
                  <span className="a11y-tool-label">{it.label}</span>
                </button>
              ))}
            </div>
            <p className="a11y-font-level">
              {t("a11yFontLevel")}: {Math.round((FONT_STEPS[prefs.fontIdx] || 1) * 100)}%
            </p>
          </div>
        )}

        <button
          type="button"
          className={`a11y-fab ${open ? "is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={t("a11yTitle")}
          aria-label={t("a11yTitle")}
        >
          <span className="a11y-fab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <circle cx="12" cy="4.5" r="2.2" />
              <path d="M12 8c-3.2 0-5.8 1.2-7.2 2.2-.5.35-.5 1.1.1 1.35L8 13v7.2c0 .55.45 1 1 1h1.2c.55 0 1-.45 1-1V16h1.6v4.2c0 .55.45 1 1 1H15c.55 0 1-.45 1-1V13l3.1-1.45c.6-.25.6-1 .1-1.35C17.8 9.2 15.2 8 12 8z" />
            </svg>
          </span>
        </button>
      </div>
    </>
  );
}
