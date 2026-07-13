import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Shell, { CardButton, Loading, ErrorBox } from "../components/Shell";
import { useLanguage } from "../i18n";

export default function Levels() {
  const { lang, t } = useLanguage();
  const { pillId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    api.levels(pillId).then(setData).catch((e) => setErr(e.message));
  }, [pillId, lang]);

  return (
    <Shell title={t("level")} backTo={-1}>
      {err && <ErrorBox message={err} />}
      {!data && !err && <Loading />}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((l, i) => (
          <CardButton
            key={l.id}
            to={`/level/${l.id}`}
            color={i % 2 === 0 ? "#7C3AED" : "#2563EB"}
            delay={i * 0.04}
          >
            <div className="text-2xl font-black">
              {t("level")} {l.index}
            </div>
            <div className="mt-2 text-sm font-bold opacity-85">
              {l.activitiesCount} {t("activities")}
            </div>
          </CardButton>
        ))}
      </div>
    </Shell>
  );
}
