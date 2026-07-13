/**
 * Full catalog build: JSON + SO + dedupe + summary
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function run(script) {
  console.log("\n>>", script);
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", script)], {
    stdio: "inherit",
    cwd: ROOT,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("import-json.mjs");
run("import-so.mjs");

const catalogPath = path.join(ROOT, "content", "import", "catalog.json");
const c = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const seen = new Set();
let removed = 0;
const by = {};

for (const p of c.personas) {
  by[p.slug] = 0;
  for (const y of p.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          const keep = [];
          for (const a of lv.activities || []) {
            if (seen.has(a.id)) {
              removed++;
              continue;
            }
            seen.add(a.id);
            keep.push(a);
            by[p.slug]++;
          }
          lv.activities = keep;
        }
      }
    }
  }
}

fs.writeFileSync(catalogPath, JSON.stringify(c));
console.log("\n=== After dedupe ===", { total: seen.size, removedDuplicates: removed, by });

// Only keep activities with audio on the painel CDN
run("filter-with-audio.mjs");

// Fix accents / Unity escapes / broken characters
run("sanitize-text.mjs");

// Fix mismatched letter questions, remove broken activities, dedupe options
run("fix-content.mjs");

// Backgrounds + option icons
run("fetch-bg-map.mjs");
run("ensure-theme-bgs.mjs");
run("apply-media.mjs");

// Count / spatial scenes (QUANTOS TÊM?, à esquerda da cadeira, etc.)
run("enrich-visuals.mjs");


const final = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const finalBy = {};
let finalTotal = 0;
for (const p of final.personas || []) {
  finalBy[p.slug] = 0;
  for (const y of p.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          finalBy[p.slug] += (lv.activities || []).length;
          finalTotal += (lv.activities || []).length;
        }
      }
    }
  }
}
const summary = {
  total: finalTotal,
  removedDuplicates: removed,
  byPersona: finalBy,
  audioFiltered: true,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(ROOT, "content", "import", "summary.json"),
  JSON.stringify(summary, null, 2)
);
console.log("\n=== FINAL CATALOG (with audio only) ===");
console.log(JSON.stringify(summary, null, 2));
