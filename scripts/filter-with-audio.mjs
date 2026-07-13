/**
 * Keep only activities whose audio WAV exists on the painel CDN.
 * Updates content/import/catalog.json in place.
 *
 * Run: node scripts/filter-with-audio.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { enunciadoFormatter } from "./enunciado-formatter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");
const BASE = "https://painel.inclusivamentemaiseduca.com.br/uploads/audios";
const CONCURRENCY = 25;
const CACHE_PATH = path.join(ROOT, "content", "import", "audio-exists-cache.json");

function loadGeradosSet() {
  const candidates = [
    path.join(ROOT, "_audio_check", "repo", "atividadesnova", "audios_gerados.json"),
    path.join(ROOT, "content", "audios_gerados.json"),
  ];
  const set = new Set();
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const arr = JSON.parse(fs.readFileSync(p, "utf8"));
      for (const n of arr) set.add(String(n));
      console.log("Loaded", set.size, "names from", p);
    } catch {
      /* ignore */
    }
  }
  return set;
}

function audioNameFromActivity(a) {
  if (a.audio_url) {
    const file = a.audio_url.split("/").pop() || "";
    return file.replace(/\.wav$/i, "") || null;
  }
  return enunciadoFormatter(a.statement || "");
}

async function headExists(name) {
  const url = `${BASE}/${name}.wav`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return true;
    // some servers dislike HEAD
    if (res.status === 405 || res.status === 501) {
      const r2 = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
      return r2.ok || r2.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  if (!fs.existsSync(CATALOG)) {
    console.error("catalog.json missing — run build-catalog first");
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const gerados = loadGeradosSet();

  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    } catch {
      cache = {};
    }
  }

  // Collect unique audio names used by activities
  const nameSet = new Set();
  let totalBefore = 0;
  for (const p of catalog.personas) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              totalBefore++;
              const n = audioNameFromActivity(a);
              if (n) nameSet.add(n);
            }
          }
        }
      }
    }
  }

  const names = [...nameSet];
  console.log(`Activities: ${totalBefore} | Unique audio names: ${names.length}`);

  // Resolve existence
  const existsMap = new Map();
  const toCheck = [];

  for (const n of names) {
    if (gerados.has(n)) {
      existsMap.set(n, true);
      continue;
    }
    if (cache[n] === true || cache[n] === false) {
      existsMap.set(n, cache[n]);
      continue;
    }
    toCheck.push(n);
  }

  console.log(
    `Already known: ${names.length - toCheck.length} | Need HTTP check: ${toCheck.length}`
  );

  let checked = 0;
  await mapPool(toCheck, CONCURRENCY, async (n) => {
    const ok = await headExists(n);
    existsMap.set(n, ok);
    cache[n] = ok;
    checked++;
    if (checked % 50 === 0 || checked === toCheck.length) {
      process.stdout.write(`\r  HTTP checked ${checked}/${toCheck.length}`);
    }
  });
  if (toCheck.length) process.stdout.write("\n");

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));

  // Filter activities
  const byPersonaBefore = {};
  const byPersonaAfter = {};
  let kept = 0;
  let removed = 0;

  for (const p of catalog.personas) {
    byPersonaBefore[p.slug] = 0;
    byPersonaAfter[p.slug] = 0;
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            const next = [];
            for (const a of lv.activities || []) {
              byPersonaBefore[p.slug]++;
              const n = audioNameFromActivity(a);
              if (n && existsMap.get(n) === true) {
                // ensure audio_url is set
                a.audio_url = `${BASE}/${n}.wav`;
                next.push(a);
                kept++;
                byPersonaAfter[p.slug]++;
              } else {
                removed++;
              }
            }
            lv.activities = next;
          }
          // drop empty levels
          pill.levels = (pill.levels || []).filter((lv) => (lv.activities || []).length > 0);
        }
        m.pills = (m.pills || []).filter((pill) => (pill.levels || []).length > 0);
      }
      y.matters = (y.matters || []).filter((m) => (m.pills || []).length > 0);
    }
    p.years = (p.years || []).filter((y) => (y.matters || []).length > 0);
  }
  catalog.personas = (catalog.personas || []).filter((p) => (p.years || []).length > 0);
  catalog.audio_filtered = true;
  catalog.audio_filter_at = new Date().toISOString();

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));

  const report = {
    totalBefore,
    kept,
    removed,
    uniqueNames: names.length,
    namesWithAudio: [...existsMap.values()].filter(Boolean).length,
    byPersonaBefore,
    byPersonaAfter,
  };
  fs.writeFileSync(
    path.join(ROOT, "content", "import", "audio-filter-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("\n=== AUDIO FILTER ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
