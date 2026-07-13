import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Shell, { CardButton, Loading, ErrorBox } from "../components/Shell";
import { useLanguage } from "../i18n";

const COLORS = ["#7C3AED", "#2563EB", "#059669", "#DB2777", "#EA580C", "#0891B2"];

export default function Pills() {
  const { lang, t } = useLanguage();
  const { matterId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    api.pills(matterId).then(setData).catch((e) => setErr(e.message));
  }, [matterId, lang]);

  return (
    <Shell title={t("appTitle")} backTo={-1}>
      {err && <ErrorBox message={err} />}
      {!data && !err && <Loading />}
      <div className="grid gap-3">
        {data?.map((p, i) => (
          <CardButton key={p.id} to={`/pill/${p.id}`} color={COLORS[i % COLORS.length]} delay={i * 0.03}>
            <div className="text-xl font-black">
              {p.index}. {p.name}
            </div>
            <div className="mt-2 text-sm font-bold opacity-85">
              {p.activitiesCount} {t("activities")} · {p.levelsCount} {t("level").toLowerCase()}s
            </div>
          </CardButton>
        ))}
      </div>
    </Shell>
  );
}
