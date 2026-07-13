/**
 * Fix content quality issues:
 * - multi-step letter questions with shared wrong statement (SOM B + options M N L)
 * - remove "Em revisão" / broken activities
 * - dedupe options in a step
 * - drop steps with <2 options
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sanitizeText } from "./sanitize-text.mjs";
import { audioUrlFromStatement } from "./enunciado-formatter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");

/** Common kids' words by starting letter */
const WORD_START = {
  A: "ABACAXI",
  B: "BOLA",
  C: "CASA",
  D: "DADO",
  E: "ELEFANTE",
  F: "FACA",
  G: "GATO",
  H: "HELICÓPTERO",
  I: "IGREJA",
  J: "JANELA",
  L: "LUA",
  M: "MALA",
  N: "NAVIO",
  O: "OVO",
  P: "PATO",
  Q: "QUEIJO",
  R: "RATO",
  S: "SOL",
  T: "TATU",
  U: "UVA",
  V: "VACA",
  X: "XÍCARA",
  Z: "ZEBRA",
};

/** Common words by ending letter */
const WORD_END = {
  A: "CASA",
  E: "PEIXE",
  O: "PATO",
  L: "SOL",
  M: "SOM",
  R: "MAR",
  S: "LÁPIS",
  U: "TATU",
};

function isSingleLetter(t) {
  return /^[A-Za-zÀ-ÿ]$/.test(String(t || "").trim());
}

function letterKey(t) {
  return String(t || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isPlaceholder(t) {
  const s = String(t || "")
    .trim()
    .toLowerCase();
  return (
    !s ||
    s === "—" ||
    s === "-" ||
    s === "–" ||
    s === "em revisão" ||
    s === "em revisao" ||
    s === "opção" ||
    /^opção\s*\d+$/i.test(s)
  );
}

function dedupeOptions(options) {
  const seen = new Map(); // text upper -> option (prefer correct)
  for (const o of options) {
    const key = String(o.text || "")
      .trim()
      .toUpperCase();
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev) seen.set(key, { ...o });
    else if (o.correct && !prev.correct) seen.set(key, { ...o });
  }
  // re-id
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return [...seen.values()].map((o, i) => ({
    ...o,
    id: letters[i] || `o${i}`,
    text: sanitizeText(o.text),
  }));
}

function buildLetterPrompt(statement, correctLetter) {
  const s = String(statement || "").toUpperCase();
  const L = letterKey(correctLetter);
  const wordStart = WORD_START[L] || L;
  const wordEnd = WORD_END[L] || wordStart;

  // Already a clear, self-contained question → keep (don't destroy with "toque na letra correta")
  if (
    /QUAL LETRA COME[CÇ]A A PALAVRA\s+\w+/.test(s) ||
    /QUAL É A [UÚ]LTIMA LETRA DE\s+\w+/.test(s) ||
    /TOQUE NA LETRA QUE EST[AÁ] NO COME[CÇ]O DE\s+\w+/.test(s) ||
    /QUAL LETRA FAZ O SOM\s+[A-ZÀ-Ú]/.test(s) ||
    /QUAL PALAVRA COME[CÇ]A COM A LETRA\s+[A-ZÀ-Ú]/.test(s)
  ) {
    // Prefer statement; ensure word matches correct letter when possible
    const mWord = s.match(/PALAVRA\s+([A-ZÀ-Ú]+)/);
    if (mWord && mWord[1][0] === L) return sanitizeText(statement);
    if (/QUAL LETRA FAZ O SOM/.test(s)) return `QUAL LETRA FAZ O SOM ${L}? TOQUE NA LETRA.`;
    if (/COME[CÇ]A COM A LETRA/.test(s)) return `QUAL PALAVRA COMEÇA COM A LETRA ${L}?`;
    if (/[UÚ]LTIMA LETRA DE/.test(s) && mWord) return sanitizeText(statement);
    if (/COME[CÇ]O DE/.test(s) && mWord && mWord[1][0] === L) return sanitizeText(statement);
  }

  if (/SOM(?:\s+DE)?\s+[A-ZÀ-Ú]/.test(s) || /FAZ O SOM/.test(s)) {
    return `QUAL LETRA FAZ O SOM ${L}? TOQUE NA LETRA.`;
  }
  // "COMEÇA A PALAVRA X" or generic start
  if (/COME[CÇ]A A PALAVRA|COME[CÇ]O DE|IN[IÍ]CIO DE|PRIMEIRA LETRA|COME[CÇ]A COM/.test(s)) {
    const m = s.match(/PALAVRA\s+([A-ZÀ-Ú]{2,})/);
    const w = m && m[1][0] === L ? m[1] : wordStart;
    return `QUAL LETRA COMEÇA A PALAVRA ${w}?`;
  }
  if (/[UÚ]LTIMA LETRA/.test(s)) {
    return `QUAL É A ÚLTIMA LETRA DE ${wordEnd}?`;
  }
  if (/COMPLETE.*LETRA|LETRA T OU D|LETRA B/.test(s)) {
    return `QUAL LETRA COMPLETA A PALAVRA? TOQUE EM ${L} SE FOR A CERTA — escolha entre as opções.`.replace(
      /TOQUE EM.*$/,
      `A palavra modelo começa com ${wordStart[0] === L ? wordStart : wordStart}.`
    );
  }
  // Generic: always include the target word so the child has context
  return `QUAL LETRA COMEÇA A PALAVRA ${wordStart}?`;
}

function isMoneyOption(t) {
  return /\b(real|reais|centavo|r\$)/i.test(String(t || ""));
}

function buildMoneyPrompt(correctText) {
  const t = String(correctText || "").trim();
  const n = t.toUpperCase();
  // CENTAVO / CENTAVOS
  let m = n.match(/(\d+)\s*CENTAVOS?\b/);
  if (m) {
    const v = m[1];
    return Number(v) === 1
      ? `QUAL É A MOEDA DE 1 CENTAVO?`
      : `QUAL É A MOEDA DE ${v} CENTAVOS?`;
  }
  // REAL / REAIS (not REAIS? which fails to match "REAL")
  m = n.match(/(\d+)\s*(REAIS|REAL)\b/);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v === 1) return `QUAL É A MOEDA DE 1 REAL?`;
    return `QUAL É A MOEDA (OU NOTA) DE ${v} REAIS?`;
  }
  return `QUAL OPÇÃO DE DINHEIRO ESTÁ CORRETA?`;
}

function buildMoneyCountPrompt(correctText, statement) {
  // "QUANTAS MOEDAS DE 1 REAL FAZEM 3 REAIS?" multi-step with answers 3 then 4
  const s = String(statement || "").toUpperCase();
  const ans = String(correctText || "").trim();
  if (/QUANTAS MOEDAS/.test(s) && /^\d+$/.test(ans)) {
    // try keep structure, adjust total if we can parse
    const unit = s.match(/MOEDAS DE ([^.?]+)/i);
    if (unit) {
      return `QUANTAS MOEDAS DE ${unit[1].trim()} SOMAM O VALOR CORRETO? (resposta: ${ans})`.replace(
        /\s*\(resposta:.*\)$/,
        ""
      );
    }
    return `QUANTAS MOEDAS FAZEM ESSE VALOR? TOQUE NO NÚMERO ${ans}.`.replace(
      ` ${ans}.`,
      "."
    );
  }
  return null;
}

function fixLetterSteps(activity) {
  let fixed = 0;
  const steps = activity.steps || [];
  for (const st of steps) {
    const opts = st.options || [];
    if (opts.length < 2) continue;
    if (!opts.every((o) => isSingleLetter(o.text))) continue;

    const corrects = opts.filter((o) => o.correct);
    if (corrects.length !== 1) continue;

    const correctLetter = letterKey(corrects[0].text);
    const prompt = buildLetterPrompt(activity.statement, correctLetter);

    // Always set per-step prompt so multi-step doesn't reuse wrong shared statement
    if (st.prompt !== prompt) {
      st.prompt = prompt;
      fixed++;
    }
  }

  // If all steps are single-letter single-correct, set activity.statement from step 0 prompt
  const allLetter =
    steps.length > 0 &&
    steps.every((st) => {
      const opts = st.options || [];
      return opts.length >= 2 && opts.every((o) => isSingleLetter(o.text));
    });
  if (allLetter && steps[0]?.prompt) {
    activity.statement = steps[0].prompt;
    activity.audio_url = audioUrlFromStatement(activity.statement);
  }

  return fixed;
}

/** Fix money multi-step: "1 REAL?" with step2 correct "2 REAIS" */
function fixMoneySteps(activity) {
  let fixed = 0;
  const steps = activity.steps || [];
  const stmt = activity.statement || "";
  const looksMoney =
    /REAL|REAIS|MOEDA|CENTAVO|DINHEIRO|R\$/i.test(stmt) ||
    steps.some((st) => (st.options || []).some((o) => isMoneyOption(o.text)));
  if (!looksMoney) return 0;

  for (const st of steps) {
    const opts = st.options || [];
    const corrects = opts.filter((o) => o.correct);
    if (corrects.length !== 1) continue;
    const cText = corrects[0].text;

    if (isMoneyOption(cText)) {
      const prompt = buildMoneyPrompt(cText);
      if (st.prompt !== prompt) {
        st.prompt = prompt;
        fixed++;
      }
    } else if (/QUANTAS MOEDAS/i.test(stmt) && /^\d+$/.test(String(cText).trim())) {
      // e.g. how many 1-real coins make N reais — use value from options context
      // Infer target from correct count * 1 if statement has "1 REAL"
      const unitMatch = stmt.match(/MOEDAS DE\s+(.+?)\s+FAZEM\s+(\d+)\s*REAIS?/i);
      if (unitMatch) {
        // multi-step may change the total; derive total from correct answer if unit is 1 real
        const unit = unitMatch[1];
        const n = parseInt(String(cText).trim(), 10);
        if (/1\s*REAL/i.test(unit)) {
          const prompt = `QUANTAS MOEDAS DE 1 REAL FAZEM ${n} REAIS?`;
          if (st.prompt !== prompt) {
            st.prompt = prompt;
            fixed++;
          }
        }
      }
    }
  }

  if (fixed && steps[0]?.prompt) {
    activity.statement = steps[0].prompt;
    activity.audio_url = audioUrlFromStatement(activity.statement);
  }
  return fixed;
}

function fixActivity(activity) {
  const report = { letterPrompts: 0, deduped: 0, stepsRemoved: 0, killed: false };

  // Sanitize texts
  activity.statement = sanitizeText(activity.statement || "");
  activity.title = sanitizeText(activity.title || activity.title);

  const newSteps = [];
  for (const st of activity.steps || []) {
    let opts = (st.options || []).map((o) => ({
      ...o,
      text: sanitizeText(o.text),
    }));

    // drop placeholder-only noise options if there are real ones
    const real = opts.filter((o) => !isPlaceholder(o.text));
    if (real.length >= 2) opts = real;
    else if (opts.every((o) => isPlaceholder(o.text))) {
      report.stepsRemoved++;
      continue; // drop step
    }

    const before = opts.length;
    opts = dedupeOptions(opts);
    if (opts.length < before) report.deduped += before - opts.length;

    // need at least 2 options and one correct
    const corrects = opts.filter((o) => o.correct);
    if (opts.length < 2 || corrects.length === 0) {
      report.stepsRemoved++;
      continue;
    }

    // cap corrects if somehow all correct after bad data
    if (corrects.length === opts.length) {
      // keep first as correct only
      opts = opts.map((o, i) => ({ ...o, correct: i === 0 }));
    }

    st.options = opts;
    if (st.prompt) st.prompt = sanitizeText(st.prompt);
    newSteps.push(st);
  }

  activity.steps = newSteps;
  if (newSteps.length === 0) {
    report.killed = true;
    return report;
  }

  report.letterPrompts = fixLetterSteps(activity);
  report.letterPrompts += fixMoneySteps(activity);

  // choice_type refresh
  let multi = false;
  for (const st of activity.steps) {
    if ((st.options || []).filter((o) => o.correct).length >= 2) multi = true;
  }
  activity.choice_type = multi ? "multiple" : "single";

  return report;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const stats = {
    activitiesBefore: 0,
    activitiesAfter: 0,
    killed: 0,
    letterPrompts: 0,
    deduped: 0,
    stepsRemoved: 0,
  };

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            const keep = [];
            for (const a of lv.activities || []) {
              stats.activitiesBefore++;
              const r = fixActivity(a);
              stats.letterPrompts += r.letterPrompts;
              stats.deduped += r.deduped;
              stats.stepsRemoved += r.stepsRemoved;
              if (r.killed || a.needs_review && (a.steps || []).every((st) =>
                (st.options || []).every((o) => isPlaceholder(o.text))
              )) {
                stats.killed++;
                continue;
              }
              // kill if still only placeholders
              const texts = (a.steps || []).flatMap((st) =>
                (st.options || []).map((o) => o.text)
              );
              if (
                texts.length === 0 ||
                texts.every(isPlaceholder) ||
                (texts.filter((t) => /em revisão/i.test(String(t))).length > 0 &&
                  texts.filter((t) => !isPlaceholder(t) && !/em revisão/i.test(String(t))).length === 0)
              ) {
                stats.killed++;
                continue;
              }
              keep.push(a);
              stats.activitiesAfter++;
            }
            lv.activities = keep;
          }
          pill.levels = (pill.levels || []).filter((lv) => (lv.activities || []).length > 0);
        }
        m.pills = (m.pills || []).filter((pill) => (pill.levels || []).length > 0);
      }
      y.matters = (y.matters || []).filter((m) => (m.pills || []).length > 0);
    }
    p.years = (p.years || []).filter((y) => (y.matters || []).length > 0);
  }
  catalog.personas = (catalog.personas || []).filter((p) => (p.years || []).length > 0);

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  fs.writeFileSync(
    path.join(ROOT, "content", "import", "fix-content-report.json"),
    JSON.stringify(stats, null, 2)
  );
  console.log("fix-content:", stats);

  // verify the famous case
  for (const p of catalog.personas) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              if (a.id?.includes("pill_1_nvl_1_1") && m.code === "lp") {
                console.log("SAMPLE", a.id, a.statement);
                for (const [i, st] of (a.steps || []).entries()) {
                  console.log(
                    "  step",
                    i,
                    "prompt:",
                    st.prompt,
                    "opts:",
                    (st.options || []).map((o) => `${o.text}${o.correct ? "*" : ""}`)
                  );
                }
              }
            }
          }
        }
      }
    }
  }
}

main();
