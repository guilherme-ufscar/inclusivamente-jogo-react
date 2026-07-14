/**
 * Comprehensive production quality fix for the entire catalog.
 *
 * Fixes:
 * - multi-step math prompts out of sync with correct answers
 * - multi correct flags on single-choice (keep one OR switch to multiple)
 * - default "bola" count visuals on non-ball questions
 * - syllable / word-count literacy visuals
 * - money labels (1r → R$ / $ / €)
 * - identical option junk → kill
 * - vague statements still leftover
 * - drag language → kill if unsalvageable
 *
 * Run: node scripts/fix-full-quality.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatMoneyLabel } from "./fix-currency-labels.mjs";
import { iconForOption, twemoji } from "./option-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");

const stats = {
  total: 0,
  killed: 0,
  touched: 0,
  mathPromptFixed: 0,
  multiCorrectFixed: 0,
  multiTypeSet: 0,
  bolaVisualRemoved: 0,
  literacyVisualFixed: 0,
  moneyFixed: 0,
  identicalKilled: 0,
  vagueFixed: 0,
  optionIds: 0,
};

function optId(i) {
  return String.fromCharCode(97 + (i % 26));
}

function clean(s) {
  return String(s || "")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function up(s) {
  return clean(s).toUpperCase();
}

function walkMut(cat, fn) {
  for (const p of cat.personas || [])
    for (const y of p.years || [])
      for (const m of y.matters || [])
        for (const pill of m.pills || [])
          for (const lv of pill.levels || []) {
            const next = [];
            for (const a of lv.activities || []) {
              stats.total++;
              const r = fn(a);
              if (r === null) {
                stats.killed++;
                continue;
              }
              next.push(r);
            }
            lv.activities = next;
          }
}

function correctOpts(step) {
  return (step.options || []).filter((o) => o.correct);
}

function allNumeric(opts) {
  return (
    opts.length >= 2 &&
    opts.every((o) => /^\d{1,4}$/.test(String(o.text || "").trim()))
  );
}

function allSingleLetters(opts) {
  return (
    opts.length >= 2 &&
    opts.every((o) => /^[A-Za-zÀ-ÿ]$/.test(String(o.text || "").trim()))
  );
}

function makeSumExpr(result) {
  const r = Math.max(0, Number(result) || 0);
  if (r <= 1) return { a: 0, b: r, text: `0 + ${r}` };
  const a = Math.max(1, Math.floor(r / 2));
  const b = r - a;
  return { a, b, text: `${a} + ${b}` };
}

function makeSubExpr(result) {
  const r = Math.max(0, Number(result) || 0);
  const a = r + Math.max(1, Math.min(5, r || 2));
  const b = a - r;
  return { a, b, text: `${a} – ${b}` };
}

function iconForWord(word) {
  const bare = String(word || "")
    .replace(/-/g, "")
    .toLowerCase();
  return iconForOption(bare) || iconForOption(word) || null;
}

function buildSyllableVisual(word) {
  if (!word) return null;
  const parts = String(word).includes("-")
    ? String(word).split("-").filter(Boolean)
    : [String(word)];
  return {
    type: "syllables",
    word: String(word).replace(/-/g, ""),
    parts,
    caption: parts.join(" · "),
  };
}

function buildWordChips(phrase) {
  const words = clean(phrase).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  return {
    type: "word_chips",
    caption: "Conte as palavras:",
    words,
  };
}

function isLiteracyCount(blob) {
  return /S[IÍ]LAB|SYLLABLE|QUANTAS PALAVRAS|HOW MANY WORDS|CU[AÁ]NTAS PALABRAS|QUANTAS LETRAS|QUANTAS PARTES|PARTES TEM/i.test(
    blob
  );
}

function isObjectCount(blob) {
  return (
    /QUANTOS|QUANTAS|CONTE |HOW MANY|CU[AÁ]NTOS|CU[AÁ]NTAS/i.test(blob) &&
    !isLiteracyCount(blob) &&
    !/MOEDA|REAL|R\$|DINHEIRO|CENTAVO/i.test(blob)
  );
}

/**
 * Fix one activity. null = kill.
 */
function fixActivity(a) {
  let changed = false;
  const lang = a.language || "pt";
  let steps = Array.isArray(a.steps)
    ? a.steps.map((s) => ({
        ...s,
        options: (s.options || []).map((o) => ({ ...o })),
      }))
    : [];

  if (!steps.length) return null;

  // --- kill identical options ---
  for (const step of steps) {
    const texts = (step.options || []).map((o) => clean(o.text).toLowerCase());
    if (texts.length >= 2 && new Set(texts).size === 1) {
      stats.identicalKilled++;
      return null;
    }
    if ((step.options || []).every((o) => /^index:\s*\d+$/i.test(String(o.text || "")))) {
      return null;
    }
  }

  // --- kill pure drag leftovers ---
  const allText = [a.statement, ...steps.map((s) => s.prompt)].join(" ");
  if (/ARRASTE|ARRASTAR/i.test(allText) && !/TOQUE|ESCOLHA|QUAL /i.test(allText)) {
    return null;
  }

  // Normalize option ids + money labels
  for (const step of steps) {
    step.options = (step.options || []).map((o, i) => {
      let text = clean(o.text);
      const money = formatMoneyLabel(text, lang);
      if (money !== text) {
        text = money;
        stats.moneyFixed++;
        changed = true;
      }
      const id = o.id || optId(i);
      if (o.id !== id) {
        stats.optionIds++;
        changed = true;
      }
      return { ...o, id, text, correct: !!o.correct };
    });
  }

  // --- multi correct on single ---
  for (const step of steps) {
    const corrects = correctOpts(step);
    if (corrects.length <= 1) continue;

    const blob = up((step.prompt || a.statement) + " " + a.statement);
    const opts = step.options || [];

    // Letter assembly "TOQUE NAS LETRAS QUE FORMAM X" → multiple choice
    if (
      /LETRAS QUE FORMAM|TOQUE NAS LETRAS|TAP.*LETTERS|TOCA NAS LETRAS/i.test(blob) ||
      (/FORMAM|FORM /i.test(blob) && allSingleLetters(opts))
    ) {
      a.choiceType = "multiple";
      stats.multiTypeSet++;
      changed = true;
      continue;
    }

    // "complete with two words" → multiple
    if (/DUAS PALAVRAS|TWO WORDS|DOS PALABRAS|COMPLETE A FRASE COM/i.test(blob)) {
      a.choiceType = "multiple";
      stats.multiTypeSet++;
      changed = true;
      continue;
    }

    // Single letter question but multiple marked correct → keep only matching
    if (/COME[CÇ]O DE|COMECA COM|COMEÇA COM|NO COME[CÇ]O/i.test(blob) && allSingleLetters(opts)) {
      const m = blob.match(/DE\s+([A-ZÀ-Ú]{2,})/);
      const word = m?.[1];
      const want = word ? word[0] : null;
      for (const o of opts) {
        const t = clean(o.text).toUpperCase();
        o.correct = want ? t === want : o === corrects[0];
      }
      // ensure one correct
      if (!opts.some((o) => o.correct) && want) {
        const hit = opts.find((o) => clean(o.text).toUpperCase() === want);
        if (hit) hit.correct = true;
        else opts[0].correct = true;
      } else if (!opts.some((o) => o.correct)) {
        corrects[0].correct = true;
        for (const o of opts) if (o !== corrects[0]) o.correct = false;
      }
      a.choiceType = "single";
      stats.multiCorrectFixed++;
      changed = true;
      continue;
    }

    // Default: single choice keeps first correct only (or preferred by text match)
    if ((a.choiceType || "single") === "single") {
      // Prefer numeric match from expression if present
      let keep = null;
      const sum = blob.match(/(\d+)\s*\+\s*(\d+)/);
      const sub = blob.match(/(\d+)\s*[–\-−]\s*(\d+)/);
      if (sum) {
        const exp = String(Number(sum[1]) + Number(sum[2]));
        keep = opts.find((o) => clean(o.text) === exp);
      } else if (sub) {
        const exp = String(Number(sub[1]) - Number(sub[2]));
        keep = opts.find((o) => clean(o.text) === exp);
      }
      if (!keep) keep = corrects[0];
      for (const o of opts) o.correct = o === keep || o.id === keep.id;
      // de-dupe if same id
      let found = false;
      for (const o of opts) {
        if (o.correct && !found) {
          found = true;
        } else if (o.correct && found) {
          o.correct = false;
        }
      }
      stats.multiCorrectFixed++;
      changed = true;
    }
  }

  // --- multi-step math: sync prompt expression with correct answer ---
  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    const pr = clean(step.prompt || a.statement || "");
    const blob = up(pr);
    const c = correctOpts(step)[0];
    if (!c || !/^\d+$/.test(clean(c.text))) continue;

    const got = Number(clean(c.text));
    const sum = pr.match(/(\d+)\s*\+\s*(\d+)/);
    const sub = pr.match(/(\d+)\s*[–\-−]\s*(\d+)/);
    const isSumQ =
      /\+/.test(pr) &&
      /IGUAL|RESULTADO|SOMA|MAIS|EQUAL|RESULT|RESOLVA|COMPLETE|COMPLETA|CALCULA|QUANTO|HOW MUCH|CU[AÁ]NTO|=/i.test(
        blob + " " + up(a.statement)
      );
    const isSubQ =
      /[–\-−]/.test(pr) &&
      /IGUAL|RESULTADO|MENOS|SUBTRA|EQUAL|RESULT|RESOLVA|COMPLETE|COMPLETA|CALCULA|QUANTO|HOW MUCH|CU[AÁ]NTO|=/i.test(
        blob + " " + up(a.statement)
      );

    if (sum && isSumQ) {
      const exp = Number(sum[1]) + Number(sum[2]);
      if (exp !== got) {
        const { text } = makeSumExpr(got);
        step.prompt = pr
          .replace(/(\d+)\s*\+\s*(\d+)/, text)
          .replace(/\s+/g, " ")
          .trim();
        // also fix statement if same wrong expr on first step only when multi
        if (si === 0 && up(a.statement).includes(up(`${sum[1]} + ${sum[2]}`))) {
          a.statement = clean(a.statement).replace(/(\d+)\s*\+\s*(\d+)/, text);
        }
        // clear misleading count visual
        if (step.visuals?.type === "count") delete step.visuals;
        step.visuals = { type: "math", expression: text };
        stats.mathPromptFixed++;
        changed = true;
      } else if (!step.visuals || step.visuals.type === "count") {
        step.visuals = { type: "math", expression: `${sum[1]} + ${sum[2]}` };
        changed = true;
      }
    } else if (sub && isSubQ) {
      const exp = Number(sub[1]) - Number(sub[2]);
      if (exp !== got) {
        const { text } = makeSubExpr(got);
        step.prompt = pr
          .replace(/(\d+)\s*[–\-−]\s*(\d+)/, text)
          .replace(/\s+/g, " ")
          .trim();
        if (si === 0 && /[–\-−]/.test(a.statement || "")) {
          a.statement = clean(a.statement).replace(/(\d+)\s*[–\-−]\s*(\d+)/, text);
        }
        if (step.visuals?.type === "count") delete step.visuals;
        step.visuals = { type: "math", expression: text };
        stats.mathPromptFixed++;
        changed = true;
      } else if (!step.visuals || step.visuals.type === "count") {
        step.visuals = { type: "math", expression: `${sub[1]} – ${sub[2]}` };
        changed = true;
      }
    } else if (
      /QUAL [EÉ] O RESULTADO|QUANTO [EÉ]|HOW MUCH|CU[AÁ]NTO ES/i.test(blob) &&
      allNumeric(step.options) &&
      !sum &&
      !sub
    ) {
      // Result without expression: invent sum matching correct
      const { text } = makeSumExpr(got);
      step.prompt = `QUAL É O RESULTADO? ${text}`;
      step.visuals = { type: "math", expression: text };
      if (si === 0) a.statement = step.prompt;
      stats.mathPromptFixed++;
      changed = true;
    }
  }

  // --- literacy / bola visuals ---
  for (const step of steps) {
    const pr = clean(step.prompt || a.statement || "");
    const blob = up(pr + " " + a.statement);

    if (isLiteracyCount(blob)) {
      // syllable
      if (/S[IÍ]LAB|SYLLABLE|PARTES TEM|PARTES\b/i.test(blob)) {
        let word =
          (pr.match(/PALAVRA\s+([A-Za-zÀ-ú\-]+)/i) ||
            pr.match(/["']([A-Za-zÀ-ú]+(?:-[A-Za-zÀ-ú]+)+)["']/) ||
            pr.match(/([A-ZÀ-Ú]{2,}(?:-[A-ZÀ-Ú]+)+)/) ||
            [])[1] || null;
        if (word) {
          if (step.visuals?.type === "count") {
            stats.bolaVisualRemoved++;
          }
          step.visuals = buildSyllableVisual(word);
          const icon = iconForWord(word.replace(/-/g, ""));
          if (icon) step.img_ref_urls = [icon];
          stats.literacyVisualFixed++;
          changed = true;
        } else if (step.visuals?.type === "count") {
          delete step.visuals;
          stats.bolaVisualRemoved++;
          changed = true;
        }
      } else if (/PALAVRAS|WORDS|PALABRAS/i.test(blob)) {
        let phrase =
          (pr.match(/FRASE:\s*([^.?]+)/i) ||
            pr.match(/["']([^"']+)["']/) ||
            [])[1] || null;
        // strip leftover
        if (phrase) phrase = clean(phrase);
        const c = correctOpts(step)[0];
        const n = c && /^\d+$/.test(clean(c.text)) ? Number(clean(c.text)) : null;
        if (phrase && n) {
          const wc = phrase.split(/\s+/).filter(Boolean).length;
          if (wc !== n) {
            const byN = {
              2: "O SAPO",
              3: "O SAPO PULA",
              4: "A MENINA BEBE ÁGUA",
              5: "O GATO DORME NA CAMA",
            };
            phrase = byN[n] || phrase;
            step.prompt = `QUANTAS PALAVRAS TEM A FRASE? FRASE: ${phrase}.`;
          }
        }
        if (phrase) {
          if (step.visuals?.type === "count") stats.bolaVisualRemoved++;
          step.visuals = buildWordChips(phrase);
          stats.literacyVisualFixed++;
          changed = true;
        } else if (step.visuals?.type === "count") {
          delete step.visuals;
          stats.bolaVisualRemoved++;
          changed = true;
        }
      }
    } else if (
      step.visuals?.type === "count" &&
      step.visuals.noun === "bola" &&
      !/BOLA|FUTEBOL|BALL|PELOTA/i.test(blob)
    ) {
      // Math-like → expression visual; else remove default bola
      const sum = pr.match(/(\d+)\s*\+\s*(\d+)/);
      const sub = pr.match(/(\d+)\s*[–\-−]\s*(\d+)/);
      if (sum) {
        step.visuals = { type: "math", expression: `${sum[1]} + ${sum[2]}` };
      } else if (sub) {
        step.visuals = { type: "math", expression: `${sub[1]} – ${sub[2]}` };
      } else if (/IGUAL|RESULTADO|SOMA|MAIS|MENOS|\+|\-/i.test(blob)) {
        delete step.visuals;
      } else if (isObjectCount(blob)) {
        // try better noun from context
        const noun =
          (blob.match(
            /(MA[CÇ][AÃ]|BANANA|UVA|DEDO|L[AÁ]PIS|ESTRELA|CARRO|GATO|LIVRO|GELEIA|MOEDA|ALUNO|MENINA|MENINO)S?/
          ) || [])[1] || null;
        if (noun) {
          const n = step.visuals.n || Number(correctOpts(step)[0]?.text) || 3;
          const icon = iconForWord(noun) || twemoji("2b50");
          const count = Math.min(Math.max(1, n), 12);
          step.visuals = {
            type: "count",
            n: count,
            fullN: n,
            noun: noun.toLowerCase(),
            urls: Array.from({ length: count }, () => icon),
          };
        } else {
          delete step.visuals;
        }
      } else {
        delete step.visuals;
      }
      stats.bolaVisualRemoved++;
      changed = true;
    }
  }

  // --- vague word leftover ---
  for (const step of steps) {
    const pr = clean(step.prompt || "");
    if (
      /^QUAL [EÉ] A PALAVRA CORRETA\??$/i.test(pr) ||
      /^CU[AÁ]L ES LA PALABRA CORRECTA\??$/i.test(pr) ||
      /^WHAT IS THE CORRECT WORD\??$/i.test(pr)
    ) {
      const c = correctOpts(step)[0];
      if (c) {
        const w = clean(c.text);
        const icon = iconForWord(w);
        if (icon) step.img_ref_urls = [icon];
        if (lang === "en") {
          step.prompt = "LOOK AT THE PICTURE. WHICH WORD IS SPELLED CORRECTLY?";
        } else if (lang === "es") {
          step.prompt = "MIRA LA FIGURA. ¿QUÉ PALABRA ESTÁ ESCRITA CORRECTAMENTE?";
        } else {
          step.prompt = "OLHE A FIGURA. QUAL PALAVRA ESTÁ ESCRITA DE FORMA CORRETA?";
        }
        if (/^QUAL [EÉ] A PALAVRA CORRETA/i.test(clean(a.statement))) {
          a.statement = step.prompt;
        }
        stats.vagueFixed++;
        changed = true;
      }
    }
  }

  // statement RESPONDA → first step prompt
  if (/^RESPONDA CORRETAMENTE\.?$/i.test(clean(a.statement))) {
    const p0 = clean(steps[0]?.prompt || "");
    if (p0 && !/^RESPONDA/i.test(p0)) {
      a.statement = p0;
      changed = true;
    }
  }

  // Ensure each step has prompt
  for (const step of steps) {
    if (!clean(step.prompt)) {
      step.prompt = a.statement;
      changed = true;
    }
  }

  // Graph / broken option text containing whole statement
  for (const step of steps) {
    step.options = (step.options || []).filter((o) => {
      const t = clean(o.text);
      if (t.length > 60 && /GR[AÁ]FICO|ENUNCIADO|PROBLEMA DIGITAL/i.test(t)) {
        changed = true;
        return false;
      }
      return true;
    });
    // if we filtered correct away, kill
    if (!step.options.some((o) => o.correct) && step.options.length >= 2) {
      // try mark first pure number as correct if question asks quantity
      const num = step.options.find((o) => /^\d+$/.test(clean(o.text)));
      if (num) num.correct = true;
    }
  }

  // "Quantos votos teve a maçã" multi-step: rebuild clean numeric step
  for (const step of steps) {
    const pr = clean(step.prompt || a.statement || "");
    if (/QUANTOS VOTOS|MA[CÇ][AÃ].*=\s*\d/i.test(pr)) {
      const m = pr.match(/MA[CÇ][AÃ]\s*=\s*(\d+)/i) || pr.match(/MA[CÇ]à=\s*(\d+)/i);
      if (m) {
        const n = m[1];
        const vals = new Set([n, String(Math.max(0, +n - 1)), String(+n + 2)]);
        step.options = [...vals].slice(0, 3).map((t, i) => ({
          id: optId(i),
          text: t,
          image_url: null,
          correct: t === n,
        }));
        step.prompt = pr
          .replace(/MA[CÇ]à/gi, "MAÇÃ")
          .replace(/NO GR[AÁ]FICO:.*QUANTOS/i, "NO GRÁFICO. QUANTOS");
        // ensure readable
        if (!/QUANTOS VOTOS TEVE A MA[CÇ]Ã/i.test(step.prompt)) {
          step.prompt = `NO GRÁFICO: MAÇÃ = ${n}. QUANTOS VOTOS TEVE A MAÇÃ?`;
        }
        changed = true;
      }
    }
  }

  // Final validity
  for (const step of steps) {
    const opts = step.options || [];
    if (opts.length < 2) return null;
    if (!opts.some((o) => o.correct)) return null;
  }

  // choiceType consistency
  if (a.choiceType === "multiple") {
    // ok
  } else {
    a.choiceType = "single";
    for (const step of steps) {
      const cs = correctOpts(step);
      if (cs.length > 1) {
        // shouldn't happen after fix; force one
        for (let i = 0; i < step.options.length; i++) {
          step.options[i].correct = i === step.options.findIndex((o) => o.correct);
        }
      }
    }
  }

  if (changed) {
    stats.touched++;
    a.steps = steps;
    a.needs_review = false;
    a.notes = [...new Set([...(a.notes || []), "full-quality-fix"])];
  } else {
    a.steps = steps;
  }
  return a;
}

// --- run ---
const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const bak = CATALOG.replace(/\.json$/, `.backup-pre-fullq-${Date.now()}.json`);
fs.copyFileSync(CATALOG, bak);
console.log("backup", path.basename(bak));

walkMut(cat, fixActivity);
fs.writeFileSync(CATALOG, JSON.stringify(cat));
console.log(JSON.stringify(stats, null, 2));
