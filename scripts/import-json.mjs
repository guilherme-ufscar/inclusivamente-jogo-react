/**
 * Import StreamingAssets JSON activities → content/import/catalog.json
 * Run: node scripts/import-json.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { audioUrlFromStatement, backgroundUrl } from "./enunciado-formatter.mjs";
import { reformulateSteps } from "./reformulate.mjs";
import { sanitizeText } from "./sanitize-text.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JSON_ROOT = path.join(ROOT, "content", "json");
const OUT = path.join(ROOT, "content", "import", "catalog.json");
const REPORT = path.join(ROOT, "content", "import", "import-report.json");

const PERSONA_META = {
  di_tea: { name: "DI + TEA", color: "#7C3AED", description: "1º ao 5º ano" },
  tea_di: { name: "TEA + DI", color: "#2563EB", description: "Trilha TEA + DI" },
  pedro: { name: "Pedro", color: "#059669", description: "Trilha especial" },
  tea: { name: "TEA", color: "#DB2777", description: "Perfil TEA" },
  default: { name: "Padrão", color: "#EA580C", description: "Trilha padrão" },
  infantil_di: { name: "Infantil", color: "#0891B2", description: "4 e 5 anos" },
};

const MATTER_LABELS = {
  lp: "Português",
  ma: "Matemática",
  pt: "Português",
  mt: "Matemática",
  portuguese: "Português",
  math: "Matemática",
};

function yearLabel(code) {
  const c = String(code).replace(/^0+/, "") || code;
  if (/anos?/i.test(code)) return String(code);
  if (/^\d+$/.test(c)) return `${c}º Ano`;
  return String(code);
}

function walkJsonFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJsonFiles(p, files);
    else if (ent.name.endsWith(".json") && !ent.name.endsWith(".meta")) files.push(p);
  }
  return files;
}

function parsePath(absFile) {
  // content/json/{persona}/{ano}/{materia}/pill_N/nvl_N/i.json
  const rel = path.relative(JSON_ROOT, absFile).replace(/\\/g, "/");
  const parts = rel.split("/");
  if (parts.length < 6) return null;
  const [persona, ano, materia, pillPart, nvlPart, file] = parts;
  const pillMatch = /pill_(\d+)/i.exec(pillPart);
  const nvlMatch = /nvl_(\d+)/i.exec(nvlPart);
  const actMatch = /^(\d+)\.json$/i.exec(file);
  return {
    rel,
    persona: persona.toLowerCase(),
    ano,
    materia: materia.toLowerCase(),
    pillIndex: pillMatch ? parseInt(pillMatch[1], 10) : 0,
    levelIndex: nvlMatch ? parseInt(nvlMatch[1], 10) : 1,
    activityIndex: actMatch ? parseInt(actMatch[1], 10) : 0,
  };
}

function ensureTree(catalog, meta) {
  let persona = catalog.personas.find((p) => p.slug === meta.persona);
  if (!persona) {
    const pm = PERSONA_META[meta.persona] || {
      name: meta.persona,
      color: "#6366F1",
      description: "",
    };
    persona = {
      slug: meta.persona,
      name: pm.name,
      color: pm.color,
      description: pm.description,
      years: [],
    };
    catalog.personas.push(persona);
  }

  let year = persona.years.find((y) => y.code === meta.ano);
  if (!year) {
    year = { code: meta.ano, label: yearLabel(meta.ano), matters: [] };
    persona.years.push(year);
  }

  const matterCode = meta.materia;
  let matter = year.matters.find((m) => m.code === matterCode);
  if (!matter) {
    matter = {
      code: matterCode,
      label: MATTER_LABELS[matterCode] || matterCode.toUpperCase(),
      pills: [],
    };
    year.matters.push(matter);
  }

  let pill = matter.pills.find((p) => p.index === meta.pillIndex);
  if (!pill) {
    pill = {
      index: meta.pillIndex,
      name: `Pílula ${meta.pillIndex}`,
      levels: [],
    };
    matter.pills.push(pill);
  }

  let level = pill.levels.find((l) => l.index === meta.levelIndex);
  if (!level) {
    level = { index: meta.levelIndex, activities: [] };
    pill.levels.push(level);
  }

  return level;
}

function main() {
  console.log("JSON root:", JSON_ROOT);
  const files = walkJsonFiles(JSON_ROOT);
  console.log("Found JSON files:", files.length);

  const catalog = { version: 1, source: "streamingassets-json", personas: [] };
  const report = {
    total: 0,
    imported: 0,
    needsReview: 0,
    byPersona: {},
    byChoiceType: { single: 0, multiple: 0 },
    errors: [],
  };

  for (const file of files) {
    report.total++;
    const meta = parsePath(file);
    if (!meta) {
      report.errors.push({ file, error: "path parse failed" });
      continue;
    }
    try {
      // Read as buffer and decode as UTF-8 (files may mix encodings)
      const buf = fs.readFileSync(file);
      let text = buf.toString("utf8");
      if (text.includes("\uFFFD")) {
        // fallback windows-1252
        text = new TextDecoder("latin1").decode(buf);
      }
      const raw = JSON.parse(text);
      const statement = sanitizeText(raw.statement || "");
      // sanitize options before reformulate
      if (Array.isArray(raw.steps)) {
        for (const st of raw.steps) {
          if (Array.isArray(st.options)) {
            for (const o of st.options) {
              if (o.text != null) o.text = sanitizeText(o.text);
              if (o.img != null && typeof o.img === "string") o.img = sanitizeText(o.img);
            }
          }
          if (Array.isArray(st.txt_ref)) st.txt_ref = st.txt_ref.map((t) => sanitizeText(t));
        }
      }
      const { steps, choiceType, needsReview, notes } = reformulateSteps(
        raw.steps,
        statement
      );

      const level = ensureTree(catalog, meta);
      // Prefer stable path-based id to avoid collisions when filenames repeat
      const pathId = meta.rel
        .replace(/\.json$/i, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .toLowerCase();
      const id = pathId || [
        meta.persona,
        meta.ano,
        meta.materia,
        `p${meta.pillIndex}`,
        `n${meta.levelIndex}`,
        `a${meta.activityIndex}`,
      ].join("_");

      if (level.activities.some((a) => a.id === id)) {
        report.errors.push({ file, error: "duplicate id " + id });
        continue;
      }

      level.activities.push({
        id,
        source_path: meta.rel,
        title: `Atividade ${meta.activityIndex}`,
        statement,
        audio_url: audioUrlFromStatement(statement),
        background_url: backgroundUrl(raw.background),
        background_id: raw.background || null,
        choice_type: choiceType,
        layout_source: raw.layoutID || null,
        randomize_options: raw.random !== false,
        needs_review: needsReview,
        notes,
        sort_order: meta.activityIndex,
        steps,
      });

      report.imported++;
      report.byPersona[meta.persona] = (report.byPersona[meta.persona] || 0) + 1;
      report.byChoiceType[choiceType]++;
      if (needsReview) report.needsReview++;
    } catch (e) {
      report.errors.push({ file, error: String(e.message || e) });
    }
  }

  // Sort tree
  for (const p of catalog.personas) {
    p.years.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    for (const y of p.years) {
      for (const m of y.matters) {
        m.pills.sort((a, b) => a.index - b.index);
        for (const pill of m.pills) {
          pill.levels.sort((a, b) => a.index - b.index);
          for (const lv of pill.levels) {
            lv.activities.sort((a, b) => a.sort_order - b.sort_order);
          }
        }
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(catalog));
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log("Wrote", OUT);
  console.log("Report", REPORT);
  console.log(JSON.stringify(report, null, 2));
}

main();
