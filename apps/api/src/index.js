import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { optionalAuth } from "./auth.js";
import { langFromRequest, matterLabel, yearLabel, t, normalizeLang } from "./lang.js";
import { mountPainelProxy } from "./painelProxy.js";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(optionalAuth);
mountPainelProxy(app);

async function countActivitiesForLevel(levelId, language) {
  return prisma.activity.count({ where: { levelId, language } });
}

async function sumActivitiesDeep(levels, language) {
  let n = 0;
  for (const lv of levels) {
    n += await countActivitiesForLevel(lv.id, language);
  }
  return n;
}

// Static backgrounds if present
const mediaRoot = process.env.MEDIA_ROOT || path.resolve(__dirname, "../../../content/media");
app.use("/media", express.static(mediaRoot));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "inclusiva-api" });
});

const TTS_URL = (process.env.TTS_URL || "http://tts:3002").replace(/\/$/, "");

/**
 * Neural TTS proxy. GET /api/tts?text=...&lang=pt|en|es
 */
app.get("/api/tts", async (req, res) => {
  const text = String(req.query.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "text required" });
  }
  const lang = normalizeLang(req.query.lang || langFromRequest(req));
  try {
    const url = `${TTS_URL}/tts?text=${encodeURIComponent(text.slice(0, 800))}&lang=${encodeURIComponent(lang)}`;
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return res.status(502).json({
        error: "tts_upstream",
        status: r.status,
        detail: body.slice(0, 300),
      });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", r.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (r.headers.get("x-tts-voice")) {
      res.setHeader("X-TTS-Voice", r.headers.get("x-tts-voice"));
    }
    res.setHeader("X-TTS-Lang", lang);
    res.send(buf);
  } catch (e) {
    res.status(503).json({ error: "tts_unavailable", detail: String(e.message || e) });
  }
});

app.get("/api/meta/languages", (req, res) => {
  const lang = langFromRequest(req);
  res.json({
    current: lang,
    supported: [
      { code: "pt", label: "Português", flag: "🇧🇷", tts: "pt-BR-FranciscaNeural" },
      { code: "en", label: "English", flag: "🇺🇸", tts: "en-US-JennyNeural" },
      { code: "es", label: "Español", flag: "🇪🇸", tts: "es-MX-DaliaNeural" },
    ],
    ui: {
      appTitle: t(lang, "appTitle"),
      pickTrack: t(lang, "pickTrack"),
      langHint: t(lang, "langHint"),
    },
  });
});

/**
 * Unity money codes → currency of each locale (pt BR, en US, es ES).
 * 1r → R$ 1 / $1 / €1 | 50c → 50 centavos / 50¢ / 50 céntimos
 */
function formatMoneyLabel(text, lang = "pt") {
  const raw = String(text ?? "").trim();
  if (!raw) return raw;
  let m = raw.match(/^(\d+)\s*([rRcC])$/);
  if (m) {
    const n = m[1];
    const unit = m[2].toLowerCase();
    if (unit === "r") {
      if (lang === "en") return `$${n}`;
      if (lang === "es") return `€${n}`;
      return `R$ ${n}`;
    }
    if (lang === "en") return `${n}¢`;
    if (lang === "es") return `${n} céntimos`;
    return `${n} centavos`;
  }
  m = raw.match(/^(\d+)\s*REAIS?$/i);
  if (m) {
    const n = m[1];
    if (lang === "en") return `$${n}`;
    if (lang === "es") return `€${n}`;
    return `R$ ${n}`;
  }
  m = raw.match(/^(\d+)\s*REAL$/i);
  if (m) {
    const n = m[1];
    if (lang === "en") return `$${n}`;
    if (lang === "es") return `€${n}`;
    return `R$ ${n}`;
  }
  m = raw.match(/^(\d+)\s*CENTAVOS?$/i);
  if (m) {
    const n = m[1];
    if (lang === "en") return `${n}¢`;
    if (lang === "es") return `${n} céntimos`;
    return `${n} centavos`;
  }
  return raw;
}

/** Strip correct flags for client payload */
function publicSteps(steps, randomize = true, language = "pt") {
  const list = Array.isArray(steps) ? steps : [];
  return list.map((st) => {
    let options = (st.options || []).map((o) => ({
      id: o.id,
      text: formatMoneyLabel(o.text, language),
      image_url: o.image_url ?? null,
    }));
    if (randomize) {
      options = [...options].sort(() => Math.random() - 0.5);
    }
    return {
      prompt: st.prompt ?? null,
      img_ref_urls: Array.isArray(st.img_ref_urls) ? st.img_ref_urls : [],
      visuals: st.visuals || null,
      options,
    };
  });
}

/** Official JWT persona order from inclusivamente panel (0..4) */
const PERSONA_JWT_ORDER = ["padrao", "tea", "di_tea", "di_severa", "visual"];

app.get("/api/personas", async (req, res) => {
  const language = langFromRequest(req);
  const personas = await prisma.persona.findMany({
    include: {
      years: {
        include: {
          matters: {
            include: {
              pills: {
                include: {
                  levels: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const result = [];
  for (const p of personas) {
    let activities = 0;
    for (const y of p.years) {
      for (const m of y.matters) {
        for (const pill of m.pills) {
          activities += await sumActivitiesDeep(pill.levels, language);
        }
      }
    }
    const jwtIdx = PERSONA_JWT_ORDER.indexOf(p.slug);
    result.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      color: p.color,
      description: p.description,
      yearsCount: p.years.length,
      activitiesCount: activities,
      language,
      jwtPersona: jwtIdx >= 0 ? jwtIdx : null,
    });
  }

  result.sort((a, b) => {
    const ia = a.jwtPersona ?? 99;
    const ib = b.jwtPersona ?? 99;
    return ia - ib;
  });

  res.json(result);
});

app.get("/api/personas/:slug/years", async (req, res) => {
  const language = langFromRequest(req);
  const persona = await prisma.persona.findUnique({
    where: { slug: req.params.slug },
    include: {
      years: {
        orderBy: { code: "asc" },
        include: {
          matters: {
            include: {
              pills: {
                include: {
                  levels: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!persona) return res.status(404).json({ error: "Persona not found" });

  const out = [];
  for (const y of persona.years) {
    let activities = 0;
    for (const m of y.matters) {
      for (const pill of m.pills) {
        activities += await sumActivitiesDeep(pill.levels, language);
      }
    }
    out.push({
      id: y.id,
      code: y.code,
      label: yearLabel(language, y.code, y.label),
      mattersCount: y.matters.length,
      activitiesCount: activities,
      language,
    });
  }
  res.json(out);
});

app.get("/api/personas/:slug/years/:yearCode/matters", async (req, res) => {
  const language = langFromRequest(req);
  const persona = await prisma.persona.findUnique({ where: { slug: req.params.slug } });
  if (!persona) return res.status(404).json({ error: "Persona not found" });

  const year = await prisma.year.findUnique({
    where: { personaId_code: { personaId: persona.id, code: req.params.yearCode } },
    include: {
      matters: {
        orderBy: { code: "asc" },
        include: {
          pills: {
            include: {
              levels: true,
            },
          },
        },
      },
    },
  });
  if (!year) return res.status(404).json({ error: "Year not found" });

  const out = [];
  for (const m of year.matters) {
    let activities = 0;
    for (const pill of m.pills) {
      activities += await sumActivitiesDeep(pill.levels, language);
    }
    out.push({
      id: m.id,
      code: m.code,
      label: matterLabel(language, m.code) || m.label,
      pillsCount: m.pills.length,
      activitiesCount: activities,
      language,
    });
  }
  res.json(out);
});

app.get("/api/matters/:id/pills", async (req, res) => {
  const language = langFromRequest(req);
  const matter = await prisma.matter.findUnique({
    where: { id: req.params.id },
    include: {
      year: { select: { code: true, label: true } },
    },
  });
  if (!matter) return res.status(404).json({ error: "Matter not found" });

  const pills = await prisma.pill.findMany({
    where: { matterId: req.params.id },
    orderBy: { index: "asc" },
    include: {
      levels: {
        orderBy: { index: "asc" },
      },
    },
  });
  const out = [];
  for (const p of pills) {
    const activitiesCount = await sumActivitiesDeep(p.levels, language);
    out.push({
      id: p.id,
      index: p.index,
      name: p.name,
      bncc: p.bncc,
      iconUrl: p.iconUrl,
      levelsCount: p.levels.length,
      activitiesCount,
      language,
      matterCode: matter.code,
      matterLabel: matterLabel(language, matter.code) || matter.label,
      yearCode: matter.year?.code,
      yearLabel: matter.year?.label,
    });
  }
  // Keep array shape for compatibility; also attach meta on first item
  res.json(out);
});

app.get("/api/pills/:id/levels", async (req, res) => {
  const language = langFromRequest(req);
  const levels = await prisma.level.findMany({
    where: { pillId: req.params.id },
    orderBy: { index: "asc" },
  });
  const out = [];
  for (const l of levels) {
    out.push({
      id: l.id,
      index: l.index,
      activitiesCount: await countActivitiesForLevel(l.id, language),
      language,
    });
  }
  res.json(out);
});

app.get("/api/levels/:id/activities", async (req, res) => {
  const language = langFromRequest(req);
  const activities = await prisma.activity.findMany({
    where: { levelId: req.params.id, language },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      choiceType: true,
      needsReview: true,
      sortOrder: true,
      language: true,
      familyId: true,
    },
  });
  res.json(activities);
});

app.get("/api/activities/:id", async (req, res) => {
  const act = await prisma.activity.findUnique({
    where: { id: req.params.id },
    include: {
      level: {
        include: {
          pill: {
            include: {
              matter: {
                include: {
                  year: { include: { persona: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!act) return res.status(404).json({ error: "Activity not found" });

  const language = act.language || "pt";
  // Sibling activities for next navigation (same language only)
  const siblings = await prisma.activity.findMany({
    where: { levelId: act.levelId, language },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const idx = siblings.findIndex((s) => s.id === act.id);
  const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;

  res.json({
    id: act.id,
    language,
    familyId: act.familyId || act.id,
    title: act.title,
    statement: act.statement,
    audioUrl: act.audioUrl,
    backgroundUrl: act.backgroundUrl,
    choiceType: act.choiceType,
    randomizeOptions: act.randomizeOptions,
    needsReview: act.needsReview,
    statementVisuals: act.statementVisuals || null,
    steps: publicSteps(act.steps, act.randomizeOptions, language),
    stepsCount: Array.isArray(act.steps) ? act.steps.length : 0,
    nextActivityId: nextId,
    breadcrumb: {
      persona: act.level.pill.matter.year.persona.slug,
      personaName: act.level.pill.matter.year.persona.name,
      year: act.level.pill.matter.year.code,
      yearCode: act.level.pill.matter.year.code,
      yearLabel: yearLabel(language, act.level.pill.matter.year.code, act.level.pill.matter.year.label),
      matter: act.level.pill.matter.code,
      matterCode: act.level.pill.matter.code,
      matterLabel: matterLabel(language, act.level.pill.matter.code) || act.level.pill.matter.label,
      pill: act.level.pill.name,
      pillIndex: act.level.pill.index,
      level: act.level.index,
      levelIndex: act.level.index,
    },
  });
});

app.post("/api/activities/:id/validate", async (req, res) => {
  const act = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!act) return res.status(404).json({ error: "Activity not found" });

  const stepIndex = Number(req.body?.stepIndex ?? 0);
  const selected = Array.isArray(req.body?.selectedOptionIds)
    ? req.body.selectedOptionIds.map(String)
    : [];

  const steps = Array.isArray(act.steps) ? act.steps : [];
  const step = steps[stepIndex];
  if (!step) return res.status(400).json({ error: "Invalid stepIndex" });

  const correctIds = (step.options || []).filter((o) => o.correct).map((o) => o.id);
  const selectedSet = new Set(selected);
  const correctSet = new Set(correctIds);

  let correct = selectedSet.size === correctSet.size;
  if (correct) {
    for (const id of correctSet) {
      if (!selectedSet.has(id)) {
        correct = false;
        break;
      }
    }
  }

  // For single, also reject multi-select
  if (act.choiceType === "single" && selected.length !== 1) {
    correct = false;
  }

  res.json({
    correct,
    correctIds,
    choiceType: act.choiceType,
    stepIndex,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on ${PORT}`);
});
