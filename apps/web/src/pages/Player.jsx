import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { Loading, ErrorBox } from "../components/Shell";
import { speakPortuguese, stopSpeaking, warmTtsVoices } from "../tts";
import { useLanguage } from "../i18n";
import { useAuth } from "../auth";
import { usePersona } from "../persona";
import { startPainelActivity, finishPainelActivity } from "../painelClient";
import {
  toPainelActivityId,
  difficultyFromStats,
  autonomyFromStats,
} from "../activityId";
import { markCompleted } from "../progress";

/** Visual row for counting / spatial / arithmetic statements */
function StatementVisuals({ visual }) {
  if (!visual) return null;

  if (visual.type === "count" || visual.type === "minus_count") {
    const urls = visual.urls || [];
    if (!urls.length) return null;
    return (
      <div className="mt-4 rounded-2xl bg-violet-50 px-3 py-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {urls.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-9 w-9 object-contain sm:h-11 sm:w-11"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ))}
          {visual.fullN > visual.n && (
            <span className="ml-1 text-sm font-extrabold text-violet-600">
              ×{visual.fullN}
            </span>
          )}
        </div>
        {visual.type === "minus_count" && (
          <p className="mt-1 text-center text-xs font-bold text-violet-500">
            retire / tire da quantidade
          </p>
        )}
      </div>
    );
  }

  if (visual.type === "spatial_row" && visual.items?.length) {
    return (
      <div className="mt-4 rounded-2xl bg-emerald-50 px-3 py-4">
        {visual.caption && (
          <p className="mb-3 text-center text-sm font-extrabold text-emerald-800">
            {visual.caption}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-5">
          {visual.items.map((it, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md sm:h-20 sm:w-20 ${
                  it.role === "answer" ? "ring-4 ring-emerald-400" : "ring-2 ring-slate-200"
                }`}
              >
                <img
                  src={it.icon}
                  alt={it.label}
                  className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <span className="max-w-[5.5rem] text-center text-xs font-extrabold text-slate-700">
                {it.label}
              </span>
              {i < visual.items.length - 1 && (
                <span className="sr-only">depois</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] font-bold text-emerald-600">
          ← esquerda · direita →
        </p>
      </div>
    );
  }

  if (visual.type === "spatial_stack" && visual.items?.length) {
    return (
      <div className="mt-4 rounded-2xl bg-emerald-50 px-3 py-4">
        {visual.caption && (
          <p className="mb-3 text-center text-sm font-extrabold text-emerald-800">
            {visual.caption}
          </p>
        )}
        <div className="flex flex-col items-center gap-2">
          {visual.items.map((it, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ${
                  it.role === "answer" ? "ring-4 ring-emerald-400" : "ring-2 ring-slate-200"
                }`}
              >
                <img src={it.icon} alt={it.label} className="h-12 w-12 object-contain" />
              </div>
              <span className="text-xs font-extrabold text-slate-700">{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual.type === "bars" && visual.bars?.length) {
    return (
      <div className="mt-4 space-y-2 rounded-2xl bg-sky-50 px-4 py-3">
        {visual.bars.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <img src={b.icon} alt="" className="h-8 w-8" />
            <span className="w-20 text-xs font-extrabold text-slate-700">{b.label}</span>
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: Math.min(b.n, 12) }).map((_, j) => (
                <span
                  key={j}
                  className="inline-block h-5 w-3 rounded-sm bg-sky-500"
                />
              ))}
            </div>
            <span className="text-sm font-black text-sky-800">{b.n}</span>
          </div>
        ))}
      </div>
    );
  }

  if (visual.type === "add" && visual.parts) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-violet-50 px-3 py-3">
        {visual.parts.map((part, pi) => {
          const code = part.code || "2b50";
          const src = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code}.png`;
          return (
            <div key={pi} className="flex items-center gap-1">
              {pi > 0 && (
                <span className="mx-1 text-2xl font-black text-violet-600">+</span>
              )}
              {Array.from({ length: Math.min(part.n, 10) }).map((_, i) => (
                <img key={i} src={src} alt="" className="h-8 w-8" />
              ))}
              <span className="text-sm font-extrabold text-slate-600">{part.n}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (visual.type === "story_math") {
    const icon =
      visual.icon ||
      (visual.code
        ? `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${visual.code}.png`
        : "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26bd.png");
    const startUrls =
      visual.startUrls ||
      Array.from({ length: Math.min(visual.start || 0, 10) }, () => icon);
    const changeUrls =
      visual.changeUrls ||
      Array.from({ length: Math.min(visual.change || 0, 10) }, () => icon);
    return (
      <div className="mt-4 rounded-2xl bg-amber-50 px-3 py-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex flex-wrap justify-center gap-1">
            {startUrls.map((src, i) => (
              <img key={i} src={src} alt="" className="h-8 w-8 object-contain" />
            ))}
            {(visual.start || 0) > 10 && (
              <span className="text-sm font-black text-amber-800">×{visual.start}</span>
            )}
          </div>
          <span className="text-2xl font-black text-amber-700">
            {visual.op === "minus" ? "−" : "+"}
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            {changeUrls.map((src, i) => (
              <img key={i} src={src} alt="" className="h-8 w-8 object-contain opacity-90" />
            ))}
            {(visual.change || 0) > 10 && (
              <span className="text-sm font-black text-amber-800">×{visual.change}</span>
            )}
          </div>
          <span className="text-2xl font-black text-amber-700">= ?</span>
        </div>
      </div>
    );
  }

  if (visual.type === "groups") {
    const icon = visual.icon || "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1fa91.png";
    const g = Math.min(visual.groups || 1, 6);
    const e = Math.min(visual.each || 1, 6);
    return (
      <div className="mt-4 rounded-2xl bg-indigo-50 px-3 py-3">
        <p className="mb-2 text-center text-xs font-extrabold text-indigo-700">
          {visual.fullGroups || g} grupos com {visual.fullEach || e} cada
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: g }).map((_, gi) => (
            <div
              key={gi}
              className="flex flex-wrap gap-0.5 rounded-xl bg-white p-2 shadow-sm ring-2 ring-indigo-200"
            >
              {Array.from({ length: e }).map((_, ei) => (
                <img key={ei} src={icon} alt="" className="h-7 w-7 object-contain" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual.type === "math" && visual.expression) {
    return (
      <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-center">
        <span className="text-2xl font-black tracking-wide text-sky-700 sm:text-3xl">
          {visual.expression}
        </span>
      </div>
    );
  }

  return null;
}

export default function Player() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef(null);
  const { lang, t } = useLanguage();
  const { hasTutor, demo, token } = useAuth();
  const { slug } = usePersona();
  const pillId = location.state?.pillId || null;
  const orderedIds = location.state?.orderedIds || null;
  const backTo = location.state?.backTo || (hasTutor === null ? "/" : "/y");

  const [act, setAct] = useState(null);
  const [err, setErr] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [feedback, setFeedback] = useState(null); // null | 'ok' | 'bad'
  const [busy, setBusy] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  const reportRef = useRef({
    painelId: null,
    startedAt: null,
    correct: 0,
    errors: 0,
    finished: false,
    activityKey: null,
  });

  useEffect(() => {
    warmTtsVoices();
  }, []);

  const finishReport = useCallback(async () => {
    const r = reportRef.current;
    if (r.finished) return;
    r.finished = true;

    // Sequential unlock (memorização) — always local
    if (pillId && r.activityKey) {
      markCompleted(slug, pillId, r.activityKey);
    }

    if (demo || !token) return;
    const correct = r.correct;
    const errors = r.errors;
    const time_spent = Math.max(
      1,
      Math.round((Date.now() - (r.startedAt || Date.now())) / 1000)
    );
    const has_tutor = Boolean(hasTutor);
    const stats = {
      time_spent,
      correct_count: correct,
      errors_count: errors,
      completed_at: new Date().toISOString(),
      difficulty_perceived: difficultyFromStats(correct, errors),
      autonomy_level: autonomyFromStats(has_tutor, correct, errors),
      has_tutor,
    };
    try {
      await finishPainelActivity(r.painelId, stats);
    } catch {
      /* offline queue handled in client */
    }
  }, [demo, token, hasTutor, pillId, slug]);

  useEffect(() => {
    setAct(null);
    setErr(null);
    setStepIndex(0);
    setSelected([]);
    setFeedback(null);
    setBgFailed(false);
    stopSpeaking();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Finish previous activity report when navigating away
    if (reportRef.current.activityKey && !reportRef.current.finished) {
      finishReport();
    }

    reportRef.current = {
      painelId: null,
      startedAt: Date.now(),
      correct: 0,
      errors: 0,
      finished: false,
      activityKey: activityId,
    };

    api
      .activity(activityId)
      .then(async (a) => {
        setAct(a);
        if (demo || !token) return;
        const payload = {
          activity_id: toPainelActivityId(a),
          has_tutor: Boolean(hasTutor),
          started_at: new Date().toISOString(),
          difficulty_perceived: "medium",
          autonomy_level: hasTutor ? "medium" : "high",
          internal_id: a.id,
          language: a.language || "pt",
        };
        const started = await startPainelActivity(payload);
        if (started.ok && started.painelId) {
          reportRef.current.painelId = started.painelId;
        }
      })
      .catch((e) => setErr(e.message));
  }, [activityId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Stop speech when changing step / leaving
    stopSpeaking();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [stepIndex, activityId]);

  useEffect(() => {
    if (!act?.backgroundUrl) return;
    if (act.backgroundUrl.startsWith("http")) return;
    const img = new Image();
    img.onerror = () => setBgFailed(true);
    img.onload = () => setBgFailed(false);
    img.src = act.backgroundUrl;
  }, [act?.id, act?.backgroundUrl]);

  const step = act?.steps?.[stepIndex];
  const isMultiple = act?.choiceType === "multiple";

  function toggleOption(id) {
    if (feedback) return;
    if (isMultiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelected([id]);
    }
  }

  async function confirm() {
    if (!act || selected.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await api.validate(act.id, {
        stepIndex,
        selectedOptionIds: selected,
      });
      if (res.correct) {
        reportRef.current.correct += 1;
      } else {
        reportRef.current.errors += 1;
      }
      setFeedback(res.correct ? "ok" : "bad");
      if (res.correct) {
        setTimeout(async () => {
          if (stepIndex < act.steps.length - 1) {
            setStepIndex((s) => s + 1);
            setSelected([]);
            setFeedback(null);
          } else {
            await finishReport();
            // Next exercise in sequential list (memorização)
            let nextId = null;
            if (Array.isArray(orderedIds) && orderedIds.length) {
              const idx = orderedIds.indexOf(act.id);
              if (idx >= 0 && idx < orderedIds.length - 1) nextId = orderedIds[idx + 1];
            } else if (act.nextActivityId) {
              nextId = act.nextActivityId;
            }
            if (nextId) {
              navigate(`/play/${nextId}`, {
                state: { backTo, pillId, orderedIds },
              });
            } else {
              setFeedback("done");
            }
          }
        }, 900);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function playAudio() {
    // Text visible on screen (per-step when multi-step)
    const text =
      step?.prompt && String(step.prompt).trim()
        ? step.prompt
        : act?.statement;
    if (!text) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopSpeaking();

    // ALWAYS neural TTS by language (pt/en/es). Cached on server.
    try {
      const ttsLang = act?.language || lang || "pt";
      const url = api.ttsUrl(text, ttsLang);
      const a = new Audio(url);
      audioRef.current = a;
      await a.play();
      return;
    } catch {
      /* fall through to browser only if neural TTS is down */
    }

    speakPortuguese(text, { rate: 0.92, pitch: 1.12, lang: act?.language || lang });
  }

  if (err) {
    return (
      <div className="min-h-screen bg-rose-50 p-6 font-display">
        <ErrorBox message={err} />
        <Link to={backTo} className="mt-4 inline-block font-bold text-rose-700">
          ← {t("back")}
        </Link>
      </div>
    );
  }

  if (!act) return <Loading />;

  const bg =
    !bgFailed && act.backgroundUrl
      ? act.backgroundUrl.startsWith("http") || act.backgroundUrl.startsWith("/")
        ? act.backgroundUrl
        : null
      : null;

  return (
    <div className="relative min-h-screen font-display">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: bg
            ? `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.65)), url(${bg})`
            : "linear-gradient(135deg, #a78bfa 0%, #38bdf8 50%, #fbbf24 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            to={backTo}
            className="flex h-11 items-center rounded-full bg-white px-4 text-sm font-extrabold text-slate-700 shadow-md"
          >
            ← {t("back")}
          </Link>
          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 shadow-md">
            {stepIndex + 1}/{act.stepsCount}
          </div>
        </div>

        <motion.div
          key={act.id + "-" + stepIndex}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-5 shadow-xl sm:p-7"
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={playAudio}
              className="btn-pop flex h-14 w-14 shrink-0 items-center justify-center bg-violet-500 text-2xl text-white"
              title="Ouvir enunciado (voz neural pt-BR)"
              aria-label="Ouvir enunciado"
            >
              🔊
            </button>
            <div className="min-w-0 flex-1">
              {/* Prefer per-step prompt when multi-step questions differ (e.g. SOM B then SOM M) */}
              <h1 className="text-xl font-black leading-snug text-slate-800 sm:text-2xl">
                {step?.prompt && String(step.prompt).trim()
                  ? step.prompt
                  : act.statement}
              </h1>
            </div>
          </div>

          {/* Counting / spatial / math visual helpers (prefer per-step) */}
          <StatementVisuals visual={step?.visuals || act.statementVisuals} />

          {/* Reference images (Unity img_ref) */}
          {step?.img_ref_urls?.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {step.img_ref_urls.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-md sm:h-24 sm:w-24"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ))}
            </div>
          )}

          {(() => {
            // Always A, B, C, D… — no icons/emojis on options
            const opts = step?.options || [];
            const allLetters = opts.every(
              (o) =>
                o.text &&
                String(o.text).trim().length === 1 &&
                /[A-Za-z0-9À-ú]/.test(String(o.text).trim())
            );
            const gridClass = allLetters ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2";

            return (
              <div className={`mt-6 grid gap-3 ${gridClass}`}>
                {opts.map((opt, idx) => {
                  const on = selected.includes(opt.id);
                  let ring = "border-slate-200 bg-white/95";
                  if (on && feedback === "ok") ring = "border-emerald-500 bg-emerald-100";
                  else if (on && feedback === "bad") ring = "border-rose-500 bg-rose-100";
                  else if (on) ring = "border-violet-500 bg-violet-100";

                  const letter = String.fromCharCode(65 + (idx % 26)); // A, B, C, D…
                  const label = String(opt.text ?? "").trim();

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={`rounded-2xl border-4 px-4 py-4 text-left text-lg font-extrabold text-slate-800 transition ${ring}`}
                      aria-label={`Opção ${letter}: ${label}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-black text-white shadow sm:h-14 sm:w-14 sm:text-2xl">
                          {letter}
                        </span>
                        <span className="leading-snug">{label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={selected.length === 0 || busy || feedback === "ok" || feedback === "done"}
              onClick={confirm}
              className="btn-pop bg-emerald-500 px-8 py-4 text-lg text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("confirm")}
            </button>
            {feedback === "bad" && (
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setSelected([]);
                }}
                className="btn-pop bg-amber-400 px-6 py-4 text-lg text-slate-900"
              >
                {t("tryAgain")}
              </button>
            )}
          </div>

          <AnimatePresence>
            {feedback === "ok" && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 text-center text-2xl font-black text-emerald-600"
              >
                Muito bem! ✓
              </motion.p>
            )}
            {feedback === "bad" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-xl font-black text-rose-600"
              >
                {t("almost")}
              </motion.p>
            )}
            {feedback === "done" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center"
              >
                <p className="text-2xl font-black text-emerald-700">Nível completo! 🎉</p>
                <Link to={backTo} className="mt-3 inline-block font-extrabold text-emerald-800 underline">
                  {t("back")}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
