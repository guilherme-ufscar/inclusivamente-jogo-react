/**
 * Expand Unity money codes (1r, 50c, 2R…) into locale currency labels.
 * pt → R$ / centavos | en → $ / ¢ | es → € / céntimos
 *
 * Run: node scripts/fix-currency-labels.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");

/** @param {string} text @param {string} lang */
export function formatMoneyLabel(text, lang = "pt") {
  const raw = String(text ?? "").trim();
  if (!raw) return raw;

  // 1r / 50c / 2R / 10C
  let m = raw.match(/^(\d+)\s*([rRcC])$/);
  if (m) {
    const n = m[1];
    const unit = m[2].toLowerCase();
    if (unit === "r") {
      if (lang === "en") return `$${n}`;
      if (lang === "es") return `€${n}`;
      return `R$ ${n}`;
    }
    // cents
    if (lang === "en") return `${n}¢`;
    if (lang === "es") return `${n} céntimos`;
    return `${n} centavos`;
  }

  // Already verbose BR labels — adapt by lang when needed
  m = raw.match(/^(\d+)\s*REAIS?$/i);
  if (m) {
    const n = m[1];
    if (lang === "en") return n === "1" ? "$1" : `$${n}`;
    if (lang === "es") return n === "1" ? "€1" : `€${n}`;
    return n === "1" ? "R$ 1" : `R$ ${n}`;
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

  // R$ 10 style already ok for pt
  return raw;
}

function fixStatement(st, lang) {
  let s = String(st || "");
  // QUAL É A MOEDA DE 1 REAL? already adapted in i18n often
  if (lang === "en") {
    s = s
      .replace(/\b(\d+)\s*REAIS\b/gi, (_, n) => `$${n}`)
      .replace(/\b1\s*REAL\b/gi, "$1")
      .replace(/\b(\d+)\s*REAL\b/gi, "$$$1")
      .replace(/\b(\d+)\s*CENTAVOS?\b/gi, "$1¢");
  } else if (lang === "es") {
    s = s
      .replace(/\b(\d+)\s*REAIS\b/gi, (_, n) => `€${n}`)
      .replace(/\b1\s*REAL\b/gi, "€1")
      .replace(/\b(\d+)\s*REAL\b/gi, "€$1")
      .replace(/\b(\d+)\s*CENTAVOS?\b/gi, "$1 céntimos");
  } else {
    s = s
      .replace(/\b1\s*REAL\b/gi, "R$ 1")
      .replace(/\b(\d+)\s*REAIS\b/gi, "R$ $1")
      .replace(/\b(\d+)\s*REAL\b/gi, "R$ $1");
  }
  return s;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  let optN = 0;
  let stN = 0;

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              const lang = a.language || "pt";
              const before = a.statement;
              a.statement = fixStatement(a.statement, lang);
              if (a.statement !== before) stN++;

              for (const step of a.steps || []) {
                if (step.prompt) {
                  const bp = step.prompt;
                  step.prompt = fixStatement(step.prompt, lang);
                  if (step.prompt !== bp) stN++;
                }
                for (const o of step.options || []) {
                  const t0 = o.text;
                  o.text = formatMoneyLabel(o.text, lang);
                  if (o.text !== t0) optN++;
                }
              }
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  console.log(JSON.stringify({ options_fixed: optN, statements_fixed: stN }, null, 2));
}

// Only rewrite catalog when executed directly (not when imported)
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
