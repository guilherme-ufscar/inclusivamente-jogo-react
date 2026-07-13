/**
 * Theme (pill) → unified exercise list (all levels merged) + sequential unlock.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import Shell, { Loading, ErrorBox, ScreenPrompt, CardButton } from "../components/Shell";
import { useLanguage } from "../i18n";
import { usePersona } from "../persona";
import { THEMES } from "../themes";
import { resolvePillTitle } from "../pillTitles";
import { iconForTitle } from "../icons";
import {
  getCompletedSet,
  isUnlocked,
  firstUnlockedIndex,
} from "../progress";

const COLORS = ["#7C3AED", "#2563EB", "#059669", "#DB2777", "#EA580C", "#0891B2", "#4F46E5", "#0D9488"];

export default function Explore() {
  const { lang, t } = useLanguage();
  const { yearCode, matterId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug } = usePersona();

  const [pills, setPills] = useState(null);
  const [matterCode, setMatterCode] = useState("lp");
  const [err, setErr] = useState(null);
  const [pillId, setPillId] = useState(() => searchParams.get("pill") || null);
  const [exercises, setExercises] = useState(null); // flat activity list
  const [loadingEx, setLoadingEx] = useState(false);
  const [tick, setTick] = useState(0); // re-read progress after return

  useEffect(() => {
    setPills(null);
    setPillId(null);
    setExercises(null);
    setErr(null);
    api
      .pills(matterId)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.pills || [];
        const code = list[0]?.matterCode || "lp";
        setMatterCode(code);
        setPills(list);
        const fromUrl = searchParams.get("pill");
        if (fromUrl && list.some((p) => p.id === fromUrl)) setPillId(fromUrl);
        else if (list?.length === 1) setPillId(list[0].id);
      })
      .catch((e) => setErr(e.message));
  }, [matterId, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge all levels of selected pill into one exercise list
  useEffect(() => {
    if (!pillId) {
      setExercises(null);
      return;
    }
    let cancelled = false;
    setLoadingEx(true);
    setExercises(null);
    (async () => {
      try {
        const levels = await api.levels(pillId);
        const ordered = [...(levels || [])].sort((a, b) => a.index - b.index);
        const all = [];
        for (const lv of ordered) {
          const acts = await api.activities(lv.id);
          for (const a of acts || []) {
            all.push({
              ...a,
              _levelIndex: lv.index,
              _levelId: lv.id,
            });
          }
        }
        if (!cancelled) setExercises(all);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoadingEx(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pillId, lang, tick]);

  // Refresh progress when window focused (return from player)
  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const orderedIds = useMemo(() => (exercises || []).map((a) => a.id), [exercises]);
  const completed = useMemo(
    () => getCompletedSet(slug, pillId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, pillId, exercises, tick]
  );
  const nextIdx = firstUnlockedIndex(orderedIds, completed);

  function selectPill(id) {
    setPillId(id || null);
    if (id) setSearchParams({ pill: id });
    else setSearchParams({});
  }

  function openExercise(act, index) {
    if (!isUnlocked(index, orderedIds, completed)) return;
    navigate(`/play/${act.id}`, {
      state: {
        backTo: `/y/${encodeURIComponent(yearCode)}/m/${matterId}?pill=${pillId}`,
        pillId,
        exerciseIndex: index,
        orderedIds,
      },
    });
  }

  return (
    <Shell
      backTo={`/y/${encodeURIComponent(yearCode)}`}
      themeUrl={THEMES.parque}
      showLang={false}
      overlay="soft"
      center={false}
      wide
    >
      {err && <ErrorBox message={err} />}
      {!pills && !err && <Loading />}

      {/* Themes */}
      {pills && !pillId && (
        <>
          <ScreenPrompt>{t("pickTheme")}</ScreenPrompt>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pills.map((p, i) => {
              const color = COLORS[i % COLORS.length];
              const title = resolvePillTitle(p, p.matterCode || matterCode, lang);
              const Icon = iconForTitle(title, p.matterCode || matterCode);
              return (
                <CardButton
                  key={p.id}
                  color={color}
                  delay={i * 0.02}
                  large
                  onClick={() => selectPill(p.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="min-w-0 flex-1 break-words text-base font-black leading-snug sm:text-lg">
                      {title}
                    </span>
                  </div>
                </CardButton>
              );
            })}
          </div>
        </>
      )}

      {/* Exercises (unified level) */}
      {pillId && (
        <>
          <button
            type="button"
            onClick={() => {
              selectPill(null);
              setExercises(null);
            }}
            className="mb-3 text-sm font-bold text-violet-600"
          >
            ← {t("pickTheme")}
          </button>

          <ScreenPrompt>
            {resolvePillTitle(
              pills.find((p) => p.id === pillId) || {},
              matterCode,
              lang
            )}
          </ScreenPrompt>
          <p className="mb-4 text-center text-sm font-bold text-slate-500">
            {t("pickExercise")}
          </p>

          {loadingEx && <Loading />}

          {exercises && exercises.length === 0 && (
            <p className="text-center font-bold text-slate-500">—</p>
          )}

          {exercises && exercises.length > 0 && (
            <div className="grid gap-2">
              {exercises.map((a, i) => {
                const unlocked = isUnlocked(i, orderedIds, completed);
                const done = completed.has(a.id);
                const isNext = i === nextIdx;
                const color = done
                  ? "#059669"
                  : isNext
                    ? "#7C3AED"
                    : unlocked
                      ? "#2563EB"
                      : "#94a3b8";
                return (
                  <CardButton
                    key={a.id}
                    color={color}
                    delay={Math.min(i * 0.015, 0.3)}
                    disabled={!unlocked}
                    onClick={() => openExercise(a, i)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/25 text-lg font-black">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-base font-black">
                            {a.title && a.title !== "Atividade 1"
                              ? a.title
                              : `${t("exercise")} ${i + 1}`}
                          </div>
                          {!unlocked && (
                            <div className="text-xs font-bold opacity-90">{t("lockedHint")}</div>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/25 px-2.5 py-1 text-xs font-black uppercase">
                        {done ? `✓ ${t("doneMark")}` : unlocked ? "▶" : t("locked")}
                      </span>
                    </div>
                  </CardButton>
                );
              })}
            </div>
          )}
        </>
      )}

    </Shell>
  );
}
