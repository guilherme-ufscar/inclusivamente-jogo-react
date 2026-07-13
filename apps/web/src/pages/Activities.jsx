import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Shell, { CardButton, Loading, ErrorBox } from "../components/Shell";
import { useLanguage } from "../i18n";

export default function Activities() {
  const { lang, t } = useLanguage();
  const { levelId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    api.activities(levelId).then(setData).catch((e) => setErr(e.message));
  }, [levelId, lang]);

  return (
    <Shell title={t("appTitle")} subtitle={t("pickTrack")} backTo={-1}>
      {err && <ErrorBox message={err} />}
      {!data && !err && <Loading />}
      {data?.length > 0 && (
        <CardButton to={`/play/${data[0].id}`} color="#059669" delay={0}>
          <div className="text-xl font-black">▶ {t("home")}</div>
        </CardButton>
      )}
      <div className="mt-4 grid gap-2">
        {data?.map((a, i) => (
          <CardButton
            key={a.id}
            to={`/play/${a.id}`}
            color={a.choiceType === "multiple" ? "#7C3AED" : "#2563EB"}
            delay={0.02 + i * 0.02}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-black">{a.title}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">
                {a.choiceType === "multiple" ? t("multiple") : t("single")}
              </span>
            </div>
          </CardButton>
        ))}
      </div>
    </Shell>
  );
}
