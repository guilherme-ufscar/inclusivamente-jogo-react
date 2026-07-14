/**
 * Full catalog quality audit — reports issue buckets.
 * Run: node scripts/full-quality-audit.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");
const OUT = path.join(__dirname, "..", "content", "import", "_full-audit.json");

const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const issues = [];
let total = 0;
let pt = 0;

function push(kind, a, extra = {}) {
  issues.push({
    kind,
    id: a.id,
    lang: a.language || "pt",
    st: String(a.statement || "").slice(0, 140),
    ...extra,
  });
}

function walk(cb) {
  for (const p of cat.personas || [])
    for (const y of p.years || [])
      for (const m of y.matters || [])
        for (const pill of m.pills || [])
          for (const lv of pill.levels || [])
            for (const a of lv.activities || []) cb(a, p.slug, y.code, m.code);
}

function up(s) {
  return String(s || "").toUpperCase();
}

walk((a) => {
  total++;
  if ((a.language || "pt") === "pt") pt++;
  const st = String(a.statement || "");
  const steps = a.steps || [];
  if (!steps.length) push("no_steps", a);

  for (let si = 0; si < steps.length; si++) {
    const s = steps[si];
    const pr = String(s.prompt || st);
    const opts = s.options || [];
    const texts = opts.map((o) => String(o.text || "").trim());
    const correct = opts.filter((o) => o.correct);
    const blob = up(st + " " + pr);

    if (opts.length < 2) push("few_opts", a, { si, n: opts.length });
    if (!correct.length) push("no_correct", a, { si, texts });
    if (correct.length > 1 && (a.choiceType || "single") === "single") {
      push("multi_correct_single", a, { si, correct: correct.map((o) => o.text) });
    }
    if (texts.some((t) => /^index:\s*\d+$/i.test(t))) push("index_opt", a, { si, texts });
    if (texts.filter((t) => !t || t === "-" || /^op[cç][aã]o/i.test(t)).length >= 2) {
      push("placeholder_opts", a, { si, texts });
    }

    // money codes leftover 1r 50c
    if (texts.some((t) => /^\d+\s*[rRcC]$/.test(t))) {
      push("money_code", a, { si, texts });
    }
    // Only flag money questions that ask WHICH COIN but options are bare numbers
    // (NOT "how many coins of R$1 make R$3" — those should be numbers)
    if (
      /QUAL [EÉ] A MOEDA|WHICH COIN|QU[EÉ] MONEDA|TOQUE NA MOEDA/i.test(blob) &&
      texts.length >= 2 &&
      texts.every((t) => /^\d+$/.test(t))
    ) {
      push("money_numeric_only", a, { si, texts, pr: pr.slice(0, 80) });
    }

    // count visual on literacy / default bola
    if (
      s.visuals?.type === "count" &&
      /S[IÍ]LAB|PALAVRA|LETRA|SOM |ESCRITA|FRASE/i.test(blob)
    ) {
      push("count_on_literacy", a, { si, noun: s.visuals.noun, pr: pr.slice(0, 80) });
    }
    if (
      s.visuals?.type === "count" &&
      s.visuals.noun === "bola" &&
      !/BOLA|FUTEBOL|BRINQUEDO/i.test(blob)
    ) {
      push("default_bola_visual", a, { si, pr: pr.slice(0, 90), n: s.visuals.n });
    }

    // vague
    if (
      /^QUAL [EÉ] A PALAVRA CORRETA\??$/i.test(pr.trim()) ||
      /^QUAL [EÉ] A PALAVRA\??$/i.test(pr.trim()) ||
      /^WHAT IS THE CORRECT WORD\??$/i.test(pr.trim()) ||
      /^CU[AÁ]L ES LA PALABRA CORRECTA\??$/i.test(pr.trim())
    ) {
      push("vague_word", a, { si, texts });
    }
    if (/^RESPONDA CORRETAMENTE\.?$/i.test(st.trim())) {
      push("respond_only", a, { si, pr: pr.slice(0, 80) });
    }
    if (
      /^COMPLETE A PALAVRA:?$/i.test(pr.trim()) ||
      /^COMPLETE A PALAVRA:?$/i.test(st.trim())
    ) {
      push("complete_empty", a, { si, pr });
    }

    // math sum/sub — use STEP prompt only (not statement+prompt; multi-step differs)
    const prOnly = up(pr);
    const mSum = prOnly.match(/(\d+)\s*\+\s*(\d+)/);
    if (mSum && correct[0] && /^\d+$/.test(String(correct[0].text))) {
      const exp = Number(mSum[1]) + Number(mSum[2]);
      if (Number(correct[0].text) !== exp) {
        push("math_sum_wrong", a, {
          si,
          exp,
          got: correct[0].text,
          pr: pr.slice(0, 80),
        });
      }
    }
    const mSub = prOnly.match(/(\d+)\s*[–\-−]\s*(\d+)/);
    if (mSub && correct[0] && /^\d+$/.test(String(correct[0].text)) && !mSum) {
      const exp = Number(mSub[1]) - Number(mSub[2]);
      if (exp >= 0 && Number(correct[0].text) !== exp) {
        push("math_sub_wrong", a, {
          si,
          exp,
          got: correct[0].text,
          pr: pr.slice(0, 80),
        });
      }
    }

    // hyphenated syllable count
    if (/QUANTAS S[IÍ]LABAS|HOW MANY SYLLABLES|CU[AÁ]NTAS S[IÍ]LABAS/i.test(blob)) {
      const wm =
        (pr + " " + st).match(/PALAVRA\s+([A-Za-zÀ-ú\-]+)/i) ||
        (pr + " " + st).match(/PALABRA\s+([A-Za-zÀ-ú\-]+)/i) ||
        (pr + " " + st).match(/["']([A-Za-zÀ-ú]+(?:-[A-Za-zÀ-ú]+)+)["']/);
      if (wm && correct[0] && /^\d+$/.test(String(correct[0].text))) {
        const w = wm[1];
        if (w.includes("-")) {
          const n = w.split("-").filter(Boolean).length;
          if (Number(correct[0].text) !== n) {
            push("syll_count_mismatch", a, { si, w, n, got: correct[0].text });
          }
        }
      }
    }

    // quantas palavras: visual balls or same phrase wrong count
    if (/QUANTAS PALAVRAS|HOW MANY WORDS|CU[AÁ]NTAS PALABRAS/i.test(blob)) {
      if (s.visuals?.type === "count") {
        push("wordcount_count_visual", a, { si, noun: s.visuals.noun });
      }
      const fm =
        pr.match(/FRASE:\s*([^.?]+)/i) ||
        pr.match(/["']([^"']+)["']/);
      if (fm && correct[0] && /^\d+$/.test(String(correct[0].text))) {
        const words = fm[1].trim().split(/\s+/).filter(Boolean);
        if (words.length && Number(correct[0].text) !== words.length) {
          push("wordcount_mismatch", a, {
            si,
            phrase: fm[1].trim().slice(0, 60),
            n: words.length,
            got: correct[0].text,
          });
        }
      }
    }

    if (/ARRASTE|ARRASTAR|ENCAIXE AS PE[CÇ]AS/i.test(blob)) {
      push("drag_language", a, { si, pr: pr.slice(0, 80) });
    }

    if (texts.length >= 2 && new Set(texts.map((t) => t.toLowerCase())).size === 1) {
      push("identical_opts", a, { si, texts });
    }

    if (!st.trim()) push("empty_statement", a);

    // "qual a moeda" without currency-like options
    if (/QUAL [EÉ] A MOEDA|WHICH COIN|QU[EÉ] MONEDA/i.test(blob)) {
      const moneyish = texts.some(
        (t) =>
          /R\$|\$|€|REAL|REAIS|CENTAVO|¢|C[EÉ]NTIMO|\d+\s*[rc]/i.test(t) ||
          /^\d+$/.test(t)
      );
      if (!moneyish) push("money_q_bad_opts", a, { si, texts });
    }

    // count question but options not numbers
    if (
      /QUANTOS|QUANTAS|CONTE |HOW MANY|CU[AÁ]NTOS|CU[AÁ]NTAS/i.test(blob) &&
      !/QUANTAS S[IÍ]LABAS|QUANTAS PALAVRAS|QUANTAS LETRAS|QUAL /i.test(blob) &&
      texts.length >= 2 &&
      !texts.every((t) => /^\d{1,4}/.test(t) || /R\$|\$|€|REAL|CENTAVO/i.test(t))
    ) {
      // if looks like object count
      if (/MA[CÇ]|BOLA|DEDO|L[AÁ]PIS|ESTRELA|FIGURA|OBJETO|FRUTA/i.test(blob)) {
        push("count_q_non_numeric", a, { si, texts: texts.slice(0, 4), pr: pr.slice(0, 70) });
      }
    }
  }
});

const by = {};
for (const i of issues) by[i.kind] = (by[i.kind] || 0) + 1;

console.log("total", total, "pt", pt);
console.log("issues", issues.length);
console.log(JSON.stringify(by, null, 2));

for (const k of Object.keys(by).sort((a, b) => by[b] - by[a])) {
  console.log("\n##", k, by[k]);
  console.log(JSON.stringify(issues.filter((i) => i.kind === k).slice(0, 4), null, 2));
}

fs.writeFileSync(OUT, JSON.stringify({ total, pt, by, issues }, null, 2));
console.log("\nwrote", OUT);
