import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Shell, { CardButton, Loading, ErrorBox, ScreenPrompt } from "../components/Shell";
import { useLanguage } from "../i18n";
import { usePersona } from "../persona";
import { THEMES } from "../themes";
import { IconBook, IconMath } from "../icons";

export default function Matters() {
  const { lang, t } = useLanguage();
  const { yearCode } = useParams();
  const { slug, loading: personaLoading } = usePersona();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!slug || personaLoading) return;
    setData(null);
    setErr(null);
    api.matters(slug, yearCode).then(setData).catch((e) => setErr(e.message));
  }, [slug, yearCode, lang, personaLoading]);

  return (
    <Shell backTo="/y" themeUrl={THEMES.parque} showLang={false} overlay="soft" wide>
      <ScreenPrompt>{t("pickMatter")}</ScreenPrompt>

      {err && <ErrorBox message={err} />}
      {(!data && !err) || personaLoading ? <Loading /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((m, i) => {
          const isMath = m.code === "ma" || m.code === "mt";
          const Icon = isMath ? IconMath : IconBook;
          return (
            <CardButton
              key={m.id}
              to={`/y/${encodeURIComponent(yearCode)}/m/${m.id}`}
              color={isMath ? "#2563EB" : "#DB2777"}
              delay={i * 0.04}
              large
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Icon className="h-9 w-9" />
                </span>
                <div className="min-w-0 break-words text-xl font-black leading-tight sm:text-2xl">
                  {m.label || (isMath ? t("math") : t("portuguese"))}
                </div>
              </div>
            </CardButton>
          );
        })}
      </div>

    </Shell>
  );
}
