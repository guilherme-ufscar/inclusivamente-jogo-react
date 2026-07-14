import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell, { Loading, ErrorBox, ScreenPrompt } from "../components/Shell";
import { useLanguage } from "../i18n";
import { useAuth } from "../auth";
import { usePersona } from "../persona";
import { api } from "../api";
import { THEMES } from "../themes";

const LANG_LABEL = {
  pt: "Português",
  en: "English",
  es: "Español",
};

const YEAR_LABEL = {
  "01": "1º",
  "02": "2º",
  "03": "3º",
  "04": "4º",
  "05": "5º",
  "4anos": "4 anos",
  "5anos": "5 anos",
};

function fmt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

export default function AdminPersonas() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { setPersonaSlug, slug } = usePersona();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .catalogStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <Shell wide themeUrl={THEMES.parque} overlay="soft" showLang={false}>
        <Loading />
      </Shell>
    );
  }

  // Non-admin never sees this screen
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  function pick(personaSlug) {
    setPersonaSlug(personaSlug, { adminPick: true });
    navigate("/", { replace: true });
  }

  return (
    <Shell
      wide
      themeUrl={THEMES.parque}
      overlay="soft"
      showLang={false}
      center={false}
    >
      <ScreenPrompt>{t("adminPickPersona")}</ScreenPrompt>
      <p className="mb-4 text-center text-sm font-bold text-slate-600">
        {t("adminPickPersonaHint")}
      </p>

      {loading && <Loading />}
      {err && <ErrorBox message={err} />}

      {stats && (
        <>
          {/* Global totals */}
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-white shadow">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                {t("adminTotal")}
              </p>
              <p className="text-2xl font-black">{fmt(stats.total)}</p>
            </div>
            {["pt", "en", "es"].map((code) => (
              <div
                key={code}
                className="rounded-2xl border-2 border-slate-200 bg-white px-3 py-3 text-center shadow-sm"
              >
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  {LANG_LABEL[code] || code}
                </p>
                <p className="text-xl font-black text-slate-800">
                  {fmt(stats.byLanguage?.[code])}
                </p>
              </div>
            ))}
          </div>

          {/* Choice type filters */}
          {stats.byChoiceType && Object.keys(stats.byChoiceType).length > 0 && (
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {Object.entries(stats.byChoiceType).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-800"
                >
                  {k === "single"
                    ? t("adminSingle")
                    : k === "multiple"
                      ? t("adminMultiple")
                      : k}
                  : {fmt(v)}
                </span>
              ))}
            </div>
          )}

          {/* Persona cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(stats.personas || []).map((p) => {
              const active = p.slug === slug;
              const years = Object.entries(p.byYear || {}).sort(([a], [b]) =>
                a.localeCompare(b)
              );
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => pick(p.slug)}
                  className={`rounded-3xl border-4 bg-white p-4 text-left shadow-md transition hover:scale-[1.01] active:scale-[0.99] ${
                    active ? "border-emerald-500 ring-2 ring-emerald-300" : "border-slate-200"
                  }`}
                  style={{ borderColor: active ? undefined : p.color || undefined }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="text-lg font-black leading-tight"
                        style={{ color: p.color || "#4c1d95" }}
                      >
                        {p.name || p.slug}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        JWT {p.jwtPersona ?? "—"} · {p.slug}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-900 px-3 py-1.5 text-center text-white">
                      <p className="text-[10px] font-bold uppercase opacity-80">
                        {t("adminActs")}
                      </p>
                      <p className="text-xl font-black leading-none">{fmt(p.total)}</p>
                    </div>
                  </div>

                  <div className="mb-2 grid grid-cols-3 gap-1.5">
                    {["pt", "en", "es"].map((code) => (
                      <div
                        key={code}
                        className="rounded-xl bg-slate-50 px-1.5 py-1.5 text-center"
                      >
                        <p className="text-[10px] font-bold text-slate-500">
                          {code.toUpperCase()}
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          {fmt(p.byLanguage?.[code])}
                        </p>
                      </div>
                    ))}
                  </div>

                  {years.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {years.map(([code, n]) => (
                        <span
                          key={code}
                          className="rounded-lg bg-sky-50 px-2 py-0.5 text-[11px] font-extrabold text-sky-800"
                        >
                          {YEAR_LABEL[code] || code}: {fmt(n)}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.byMatter && Object.keys(p.byMatter).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(p.byMatter).map(([code, n]) => (
                        <span
                          key={code}
                          className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-900"
                        >
                          {code === "lp" || code === "pt"
                            ? t("portuguese")
                            : code === "ma" || code === "mt"
                              ? t("math")
                              : code}
                          : {fmt(n)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-center text-sm font-extrabold text-emerald-700">
                    {t("adminSelect")} →
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
