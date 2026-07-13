/**
 * Merge content/import/scenario-c-extra.json into catalog.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { audioUrlFromStatement, backgroundUrl, enunciadoFormatter } from "./enunciado-formatter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");
const EXTRA = path.join(ROOT, "content", "import", "scenario-c-extra.json");

const PERSONA_META = {
  di_tea: { name: "DI + TEA", color: "#7C3AED", description: "1º ao 5º ano" },
  tea_di: { name: "TEA + DI", color: "#BE185D", description: "Perfil TEA + DI" },
  tea: { name: "TEA", color: "#DB2777", description: "Perfil TEA" },
  infantil_di: { name: "Infantil", color: "#0891B2", description: "4 e 5 anos" },
  pedro: { name: "Pedro", color: "#059669", description: "" },
  default: { name: "Padrão", color: "#EA580C", description: "Trilha padrão" },
};

function ensureLevel(catalog, personaSlug, yearCode, matterCode, pillIndex, levelIndex, pillName, bncc) {
  let persona = catalog.personas.find((p) => p.slug === personaSlug);
  if (!persona) {
    const pm = PERSONA_META[personaSlug] || { name: personaSlug, color: "#6366F1", description: "" };
    persona = { slug: personaSlug, name: pm.name, color: pm.color, description: pm.description, years: [] };
    catalog.personas.push(persona);
  }
  let year = persona.years.find((y) => String(y.code) === String(yearCode));
  if (!year) {
    const label = /anos/i.test(String(yearCode))
      ? String(yearCode)
      : `${String(yearCode).replace(/^0+/, "") || "1"}º Ano`;
    year = { code: String(yearCode), label, matters: [] };
    persona.years.push(year);
  }
  let matter = year.matters.find((m) => m.code === matterCode);
  if (!matter) {
    matter = {
      code: matterCode,
      label: matterCode === "ma" ? "Matemática" : "Português",
      pills: [],
    };
    year.matters.push(matter);
  }
  let pill = matter.pills.find((p) => p.index === pillIndex);
  if (!pill) {
    pill = {
      index: pillIndex,
      name: pillName || `Pílula ${pillIndex}`,
      bncc: bncc?.length ? bncc.join(", ") : null,
      levels: [],
    };
    matter.pills.push(pill);
  }
  let level = pill.levels.find((l) => l.index === levelIndex);
  if (!level) {
    level = { index: levelIndex, activities: [] };
    pill.levels.push(level);
  }
  return level;
}

function main() {
  if (!fs.existsSync(EXTRA)) {
    console.error("Missing", EXTRA, "— run import-planilhas-bncc.py first");
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const extra = JSON.parse(fs.readFileSync(EXTRA, "utf8"));
  const acts = extra.activities || [];

  const seenIds = new Set();
  const seenKeys = new Set();
  let existing = 0;
  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              existing++;
              seenIds.add(a.id);
              const k = enunciadoFormatter(a.statement || "");
              if (k) seenKeys.add(k);
            }
          }
        }
      }
    }
  }

  let added = 0;
  let skipped = 0;
  for (const a of acts) {
    const key = a.dedupe_key || enunciadoFormatter(a.statement || "");
    if (seenIds.has(a.id) || (key && seenKeys.has(key))) {
      skipped++;
      continue;
    }
    const level = ensureLevel(
      catalog,
      a.persona,
      a.year,
      a.matter,
      a.pill_index ?? 1,
      a.level ?? 1,
      a.pill_name,
      a.bncc
    );
    level.activities.push({
      id: a.id,
      source_path: a.source_path || "scenario-c",
      title: a.title || "Atividade",
      statement: a.statement,
      audio_url: audioUrlFromStatement(a.statement),
      background_url: backgroundUrl(null),
      background_id: null,
      choice_type: a.choice_type || "single",
      layout_source: a.layout_source || "scenario-c",
      randomize_options: a.randomize_options !== false,
      needs_review: !!a.needs_review,
      notes: a.notes || [],
      sort_order: level.activities.length + 1,
      steps: a.steps,
      bncc: a.bncc || null,
    });
    seenIds.add(a.id);
    if (key) seenKeys.add(key);
    added++;
  }

  catalog.scenario_c_merged_at = new Date().toISOString();
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  console.log({ existing, added, skipped, totalApprox: existing + added });
}

main();
