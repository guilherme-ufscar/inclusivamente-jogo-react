import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Shell, { CardButton, Loading, ErrorBox } from "../components/Shell";
import { useLanguage } from "../i18n";

const COLORS = ["#7C3AED", "#2563EB", "#059669", "#DB2777", "#EA580C", "#0891B2"];

export default function Years() {
  const { lang, t } = useLanguage();
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    api.years(slug).then(setData).catch((e) => setErr(e.message));
  }, [slug, lang]);

  return (
    <Shell title={t("appTitle")} subtitle={slug} backTo="/" >
      {err && <ErrorBox message={err} />}
      {!data && !err && <Loading />}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((y, i) => (
          <CardButton
            key={y.id}
            to={`/p/${slug}/y/${encodeURIComponent(y.code)}`}
            color={COLORS[i % COLORS.length]}
            delay={i * 0.04}
          >
            <div className="text-2xl font-black">{y.label}</div>
            <div className="mt-2 text-sm font-bold opacity-85">
              {y.activitiesCount} {t("activities")}
            </div>
          </CardButton>
        ))}
      </div>
    </Shell>
  );
}
