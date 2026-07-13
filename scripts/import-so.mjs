/**
 * Import Unity ScriptableObject .asset activities (TEA, Infantil, Default)
 * into content/import/catalog.json (merge).
 *
 * Run: node scripts/import-so.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { audioUrlFromStatement, backgroundUrl } from "./enunciado-formatter.mjs";
import { reformulateSteps } from "./reformulate.mjs";
import { sanitizeText, decodeEscapes } from "./sanitize-text.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "content", "import", "catalog.json");
const SO_ROOTS = [
  path.join(ROOT, "content", "unity-so"),
  path.join(ROOT, "_audio_check", "repo", "Assets", "Scriptables", "Education"),
];

const PERSONA_META = {
  tea: { name: "TEA", color: "#DB2777", description: "Perfil TEA" },
  tea_di: { name: "TEA + DI", color: "#BE185D", description: "Perfil TEA + DI" },
  di_tea: { name: "DI + TEA", color: "#7C3AED", description: "1º ao 5º ano" },
  default: { name: "Padrão", color: "#EA580C", description: "Trilha padrão" },
  infantil_di: { name: "Infantil", color: "#0891B2", description: "4 e 5 anos" },
};

function decodeUnityString(s) {
  if (!s) return s;
  return sanitizeText(decodeEscapes(s));
}

function extractQuotedOrBare(content, key) {
  // Multiline quoted: key: "....\n    cont"
  const multi = content.match(
    new RegExp(`${key}:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s")
  );
  if (multi) return decodeUnityString(multi[1]);

  const bare = content.match(new RegExp(`${key}:\\s*(.+)`));
  if (bare) {
    let v = bare[1].trim();
    if (v.startsWith('"')) return null;
    return decodeUnityString(v);
  }
  return null;
}

function walkAssets(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkAssets(p, files);
    else if (
      ent.name.endsWith(".asset") &&
      !/Pill|List|Trilha|Matter|Empty/i.test(ent.name) &&
      !/_LP\.asset$|_MA\.asset$/i.test(ent.name)
    ) {
      files.push(p);
    }
  }
  return files;
}

/**
 * Parse TEA-style: text + result
 * Parse Default-style: activities: - options: - A - B (order lists → first correct)
 * Parse quests/alts if present
 */
function parseActivityAsset(content) {
  let statement = extractQuotedOrBare(content, "statement");
  if (!statement || statement === "-empty-" || statement === "") {
    statement = extractQuotedOrBare(content, "tip");
  }
  if (!statement || statement === "-empty-") return null;

  const title =
    decodeUnityString(extractQuotedOrBare(content, "title") || "") ||
    content.match(/m_Name:\s*(.+)/)?.[1]?.trim() ||
    "Atividade";

  let bg_url = extractQuotedOrBare(content, "bg_url");
  if (!bg_url || bg_url.includes("fileID")) bg_url = null;

  const steps = [];

  // 1) text: "..." result: 0|1  (TEA / ActivityTxtBool)
  {
    const options = [];
    const optRegex = /text:\s*"((?:\\.|[^"\\])*)"\s*\r?\n\s*result:\s*(\d+)/g;
    let m;
    while ((m = optRegex.exec(content)) !== null) {
      options.push({
        text: decodeUnityString(m[1]),
        img: "",
        result: m[2] === "1",
      });
    }
    if (options.length > 0) {
      steps.push({ txt_ref: [], img_ref: [], options });
    }
  }

  // 2) Default order lists: blocks of "options:" then "- X"
  if (steps.length === 0) {
    const blocks = content.split(/^\s*-\s*options:\s*$/m).slice(1);
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const opts = [];
      for (const line of lines) {
        const om = line.match(/^\s*-\s+(.+)$/);
        if (!om) {
          // stop at next major key that isn't a list item
          if (/^\s{0,2}\w+:/.test(line) && !/^\s*-\s/.test(line)) break;
          continue;
        }
        let val = om[1].trim();
        if (val.startsWith('"')) {
          val = decodeUnityString(val.replace(/^"|"$/g, ""));
        } else {
          val = decodeUnityString(val);
        }
        // skip nested structure markers
        if (!val || val === "options:" || val.startsWith("fileID")) continue;
        if (/^(text|result|img|value|quests|alts):/.test(val)) continue;
        opts.push(val);
      }
      if (opts.length >= 2) {
        // Reformulate order game → single choice: first item is correct
        steps.push({
          txt_ref: ["Qual item deve vir primeiro nesta sequência?"],
          img_ref: [],
          options: opts.map((text, i) => ({
            text,
            img: "",
            result: i === 0,
          })),
        });
      }
    }
  }

  // 3) quests / alts (SimpleActivityTxtSO)
  if (steps.length === 0 && /quests:|alts:/.test(content)) {
    const quests = [];
    const alts = [];
    const valRegex = /value:\s*"((?:\\.|[^"\\])*)"/g;
    // crude split
    const qPart = content.split(/quests:/)[1]?.split(/alts:/)[0] || "";
    const aPart = content.split(/alts:/)[1] || "";
    let m;
    while ((m = valRegex.exec(qPart)) !== null) {
      quests.push(decodeUnityString(m[1]));
    }
    valRegex.lastIndex = 0;
    while ((m = valRegex.exec(aPart)) !== null) {
      alts.push(decodeUnityString(m[1]));
    }
    if (quests.length || alts.length) {
      const options = [
        ...quests.map((text) => ({ text, img: "", result: true })),
        ...alts.map((text) => ({ text, img: "", result: false })),
      ];
      if (options.length) {
        steps.push({ txt_ref: [], img_ref: [], options });
      }
    }
  }

  if (steps.length === 0) return null;

  return {
    title: title.replace(/<br\s*\/?>/gi, " "),
    statement,
    background: bg_url,
    steps,
  };
}

function detectPersona(filePath) {
  const p = filePath.replace(/\\/g, "/");
  // Order matters: more specific paths first
  if (p.includes("Persona TEA + DI")) return "tea_di";
  if (p.includes("/Infantil/") || p.includes("Infantil\\")) return "infantil_di";
  if (p.includes("Persona DI + TEA")) return "di_tea";
  if (p.includes("Persona TEA/") || p.includes("Persona TEA\\")) return "tea";
  if (p.includes("/Default/") || p.includes("\\Default\\") || p.includes("/Default\\"))
    return "default";
  return null;
}

function detectYear(filePath) {
  const p = filePath.replace(/\\/g, "/");
  let m = p.match(/\/(\d+)\s*Ano\//i);
  if (m) return m[1].padStart(2, "0");
  m = p.match(/\/(\d+)\s*Anos\//i);
  if (m) return `${m[1]}anos`;
  return "01";
}

function detectMatter(filePath) {
  const p = filePath.replace(/\\/g, "/");
  if (/\/lp\//i.test(p) || /Portuguese/i.test(p) || /_LP/i.test(p)) return "lp";
  if (/\/ma\//i.test(p) || /Math/i.test(p) || /_MA/i.test(p)) return "ma";
  if (/SOMAR|NUMERO|MATEM|QUANT|FRAC|CONTAR|ADICAO|SUBTR/i.test(p)) return "ma";
  return "lp";
}

function detectPillIndex(filePath) {
  const p = filePath.replace(/\\/g, "/");
  let m = p.match(/Pill_(\d+)/i);
  if (m) return parseInt(m[1], 10);
  m = p.match(/\/(\d+)\s*Pill\//i);
  if (m) return parseInt(m[1], 10);
  m = p.match(/\/(\d+)\s*Pill\b/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}

function detectLevelIndex(filePath) {
  const p = filePath.replace(/\\/g, "/");
  let m = p.match(/\/(\d+)\s*Lvl\//i);
  if (m) return parseInt(m[1], 10) + 1;
  m = p.match(/\/Nvl\s*(\d+)\//i);
  if (m) return parseInt(m[1], 10);
  return 1;
}

function pillNameFromPath(filePath) {
  const p = filePath.replace(/\\/g, "/");
  let m = p.match(/Pill_\d+_([^/]+)/i);
  if (m) return m[1].replace(/_/g, " ").slice(0, 48);
  m = p.match(/\/(\d+)\s*Pill\//i);
  if (m) return `Pílula ${m[1]}`;
  return null;
}

function ensurePersona(catalog, slug) {
  let persona = catalog.personas.find((p) => p.slug === slug);
  if (!persona) {
    const pm = PERSONA_META[slug] || { name: slug, color: "#6366F1", description: "" };
    persona = { slug, name: pm.name, color: pm.color, description: pm.description, years: [] };
    catalog.personas.push(persona);
  }
  return persona;
}

function ensureLevel(catalog, personaSlug, yearCode, matterCode, pillIndex, levelIndex, pillName) {
  const persona = ensurePersona(catalog, personaSlug);
  let year = persona.years.find((y) => y.code === yearCode);
  if (!year) {
    const label = /anos/i.test(yearCode)
      ? yearCode
      : `${String(yearCode).replace(/^0+/, "")}º Ano`;
    year = { code: yearCode, label, matters: [] };
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
    pill = { index: pillIndex, name: pillName || `Pílula ${pillIndex}`, levels: [] };
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
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error("Run import-json.mjs first");
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const soRoot = SO_ROOTS.find((r) => fs.existsSync(r));
  if (!soRoot) {
    console.warn("No Unity SO root found. Skipping.");
    process.exit(0);
  }
  console.log("SO root:", soRoot);

  // Scenario C: import ALL personas (DI+TEA fund, TEA+DI, TEA, Infantil, Default)
  const targets = [];
  const personasDir = path.join(soRoot, "Personas");
  for (const name of [
    "Persona DI + TEA",
    "Persona TEA + DI",
    "Persona TEA",
  ]) {
    const p = path.join(personasDir, name);
    if (fs.existsSync(p)) targets.push(p);
  }
  const def = path.join(soRoot, "Default");
  if (fs.existsSync(def)) targets.push(def);
  if (targets.length === 0) targets.push(soRoot);

  let imported = 0;
  let skipped = 0;
  let needsReview = 0;
  const seenIds = new Set();
  const seenKeys = new Set(); // statement audio keys already in catalog
  // collect existing ids + statement keys
  for (const p of catalog.personas) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              seenIds.add(a.id);
              const k = audioUrlFromStatement(a.statement || "");
              if (k) seenKeys.add(k);
              // also key from first step prompt
              const pr = a.steps?.[0]?.prompt;
              if (pr) {
                const k2 = audioUrlFromStatement(pr);
                if (k2) seenKeys.add(k2);
              }
            }
          }
        }
      }
    }
  }

  for (const root of targets) {
    const files = walkAssets(root);
    console.log(root, "→", files.length, "candidates");
    for (const file of files) {
      const persona = detectPersona(file);
      if (!persona) {
        skipped++;
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        skipped++;
        continue;
      }
      if (!/statement:/.test(content) && !/tip:/.test(content)) {
        skipped++;
        continue;
      }

      const parsed = parseActivityAsset(content);
      if (!parsed) {
        skipped++;
        continue;
      }

      // skip if same enunciado already published (any persona) — avoid exact dups
      const stmtKey = audioUrlFromStatement(parsed.statement);
      if (stmtKey && seenKeys.has(stmtKey)) {
        skipped++;
        continue;
      }

      const { steps, choiceType, needsReview: nr, notes } = reformulateSteps(
        parsed.steps,
        parsed.statement
      );
      // drop placeholder-only activities
      if (
        !steps?.length ||
        steps.every((s) =>
          (s.options || []).every((o) => /^(Em revisão|—|-)$/i.test(o.text || ""))
        )
      ) {
        skipped++;
        continue;
      }

      const year = detectYear(file);
      const matter = detectMatter(file);
      const pIdx = detectPillIndex(file);
      const levelIndex = detectLevelIndex(file);
      const level = ensureLevel(
        catalog,
        persona,
        year,
        matter,
        pIdx,
        levelIndex,
        pillNameFromPath(file)
      );

      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      const hash = Buffer.from(rel).toString("base64url").slice(0, 16);
      const base = path.basename(file, ".asset").replace(/[^a-zA-Z0-9]+/g, "_");
      let id = `so_${persona}_${year}_${matter}_p${pIdx}_n${levelIndex}_${base}_${hash}`;
      id = id.replace(/[^a-zA-Z0-9_]/g, "_");

      if (seenIds.has(id)) {
        skipped++;
        continue;
      }
      seenIds.add(id);
      if (stmtKey) seenKeys.add(stmtKey);

      level.activities.push({
        id,
        source_path: rel,
        title: parsed.title || base,
        statement: parsed.statement,
        audio_url: audioUrlFromStatement(parsed.statement),
        background_url: backgroundUrl(parsed.background),
        background_id: parsed.background,
        choice_type: choiceType,
        layout_source: "scriptable_object",
        randomize_options: true,
        needs_review: nr,
        notes,
        sort_order: level.activities.length + 1,
        steps,
      });
      imported++;
      if (nr) needsReview++;
    }
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
  const report = { imported, skipped, needsReview };
  fs.writeFileSync(
    path.join(ROOT, "content", "import", "so-import-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("SO import done", report);
}

main();
