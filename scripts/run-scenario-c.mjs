/**
 * Scenario C pipeline:
 * 1) Backup catalog
 * 2) Re-import JSON base (optional if catalog healthy)
 * 3) Full SO import (all personas)
 * 4) Planilhas + BNCC generation
 * 5) Merge extras
 * 6) Resolve local audio + queue TTS
 * 7) Media + visuals (best effort)
 *
 * Run: node scripts/run-scenario-c.mjs
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function runNode(script) {
  console.log("\n>> node", script);
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", script)], {
    stdio: "inherit",
    cwd: ROOT,
  });
  if (r.status !== 0) {
    console.error("FAILED", script, r.status);
    process.exit(r.status || 1);
  }
}

function runPy(script, args = []) {
  console.log("\n>> python", script, ...args);
  const py = path.join(ROOT, "omnivoice", ".venv", "Scripts", "python.exe");
  const bin = fs.existsSync(py) ? py : "python";
  const r = spawnSync(bin, [path.join(ROOT, "scripts", script), ...args], {
    stdio: "inherit",
    cwd: ROOT,
  });
  if (r.status !== 0) {
    console.error("FAILED", script, r.status);
    process.exit(r.status || 1);
  }
}

function countActs() {
  const c = JSON.parse(
    fs.readFileSync(path.join(ROOT, "content", "import", "catalog.json"), "utf8")
  );
  let n = 0;
  const by = {};
  for (const p of c.personas || []) {
    by[p.slug] = 0;
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            const k = (lv.activities || []).length;
            n += k;
            by[p.slug] += k;
          }
        }
      }
    }
  }
  return { n, by };
}

// backup
const cat = path.join(ROOT, "content", "import", "catalog.json");
const bak = path.join(
  ROOT,
  "content",
  "import",
  `catalog.backup-pre-scenario-c-${Date.now()}.json`
);
if (fs.existsSync(cat)) {
  fs.copyFileSync(cat, bak);
  console.log("Backup:", bak);
}

console.log("BEFORE", countActs());

// Fresh base from JSON (keeps di_tea core clean), then full SO, then extras
runNode("import-json.mjs");
console.log("After JSON", countActs());

runNode("import-so.mjs");
console.log("After SO full", countActs());

runPy("import-planilhas-bncc.py");
runNode("merge-scenario-c.mjs");
console.log("After planilhas+BNCC", countActs());

runNode("resolve-audio-local.mjs");

// content polish (best effort)
for (const s of ["sanitize-text.mjs", "fix-content.mjs", "apply-media.mjs", "enrich-visuals.mjs"]) {
  try {
    runNode(s);
  } catch {
    console.warn("skip", s);
  }
}

const final = countActs();
console.log("\n=== SCENARIO C DONE ===");
console.log(final);
fs.writeFileSync(
  path.join(ROOT, "content", "import", "scenario-c-summary.json"),
  JSON.stringify({ finishedAt: new Date().toISOString(), ...final, backup: bak }, null, 2)
);
