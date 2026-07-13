import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import Shell, { CardButton, Loading, ErrorBox, ScreenPrompt } from "../components/Shell";
import { useLanguage } from "../i18n";
import { usePersona } from "../persona";
import { useAuth } from "../auth";
import { THEMES } from "../themes";
import { IconYear } from "../icons";

const COLORS = ["#7C3AED", "#2563EB", "#059669", "#DB2777", "#EA580C", "#0891B2"];

function yearNumber(code, label, i) {
  const fromCode = String(code || "").match(/(\d+)/);
  if (fromCode) return Number(fromCode[1]);
  const fromLabel = String(label || "").match(/(\d+)/);
  if (fromLabel) return Number(fromLabel[1]);
  return i + 1;
}

export default function Home() {
  const { lang, t } = useLanguage();
  const { hasTutor } = useAuth();
  const { slug, loading: personaLoading, error: personaErr } = usePersona();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (hasTutor === null) return;
    if (!slug || personaLoading) return;
    setData(null);
    setErr(null);
    api.years(slug).then(setData).catch((e) => setErr(e.message));
  }, [slug, lang, personaLoading, hasTutor]);

  if (hasTutor === null) {
    return <Navigate to="/" replace />;
  }

  return (
    <Shell backTo="/" themeUrl={THEMES.parque} wide showLang={false} overlay="soft">
      <ScreenPrompt>{t("pickYear")}</ScreenPrompt>

      {(err || personaErr) && <ErrorBox message={err || personaErr} />}
      {(personaLoading || (!data && !err)) && <Loading />}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((y, i) => {
            const n = yearNumber(y.code, y.label, i);
            return (
              <CardButton
                key={y.id}
                to={`/y/${encodeURIComponent(y.code)}`}
                color={COLORS[i % COLORS.length]}
                delay={i * 0.03}
                large
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white">
                    <IconYear n={n} className="h-12 w-12" />
                  </span>
                  <div className="text-2xl font-black sm:text-3xl">{y.label}</div>
                </div>
              </CardButton>
            );
          })}
        </div>
      )}

    </Shell>
  );
}
