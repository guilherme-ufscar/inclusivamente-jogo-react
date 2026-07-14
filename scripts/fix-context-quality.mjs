/**
 * Fix repeated context bugs before production:
 * - "Quantas sílabas..." showing balls (count visual misuse)
 * - "Qual é a palavra?" / "Complete a palavra" without clue
 * - "Responda corretamente" as only statement
 * - multi-step prompts out of sync with answers
 * - garbage options like "index: 0"
 * - reading tasks without the phrase in the prompt
 *
 * Run: node scripts/fix-context-quality.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { iconForOption, twemoji } from "./option-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");

const stats = {
  syllVisualRemoved: 0,
  syllPromptFixed: 0,
  vagueWordFixed: 0,
  completeFixed: 0,
  respondFixed: 0,
  storyFixed: 0,
  readPhraseFixed: 0,
  killedIndex: 0,
  killedBroken: 0,
  multiStepPrompt: 0,
  total: 0,
  touched: 0,
};

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
                stats.killedBroken++;
                continue;
              }
              next.push(r);
            }
            lv.activities = next;
          }
}

function upper(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function clean(s) {
  return String(s || "")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isSyllableQ(text) {
  const u = upper(text);
  return /SILABA|SÍLABA|SYLLABLE|SILABA/.test(u) || /S[IÍ]LABAS?/.test(String(text || "").toUpperCase());
}

function extractSyllableWord(text) {
  const s = clean(text);
  // "PALAVRA BO-LA" / "palavra \"MA-CA-CO\"" / "\"CA-SA\""
  let m = s.match(/PALAVRA\s+[«"']?([A-Za-zÀ-ú]{2,}(?:-[A-Za-zÀ-ú]+)*)[»"']?/i);
  if (m) return m[1].toUpperCase();
  m = s.match(/[«"']([A-Za-zÀ-ú]{2,}(?:-[A-Za-zÀ-ú]+)*)[»"']/);
  if (m) return m[1].toUpperCase();
  m = s.match(/\b([A-ZÀ-Ú]{2,}(?:-[A-ZÀ-Ú]+)+)\b/);
  if (m) return m[1];
  return null;
}

function syllableCountFromWord(w) {
  if (!w) return null;
  if (w.includes("-")) return w.split("-").filter(Boolean).length;
  // crude PT: count vowel groups
  const n = w
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]/g, "");
  const groups = n.match(/[aeiouy]+/g);
  return groups ? groups.length : null;
}

function correctOpt(step) {
  return (step.options || []).find((o) => o.correct);
}

function allOptsNumeric(step) {
  const opts = step.options || [];
  return opts.length >= 2 && opts.every((o) => /^\d{1,3}$/.test(String(o.text || "").trim()));
}

function looksLikeSpellingChoice(opts) {
  // CASA / CAZA / CASSA — same length-ish, share prefix
  const texts = opts.map((o) => upper(o.text).replace(/[^A-Z]/g, ""));
  if (texts.length < 2) return false;
  const correct = opts.find((o) => o.correct);
  if (!correct) return false;
  const base = upper(correct.text).replace(/[^A-Z]/g, "");
  if (base.length < 3) return false;
  return texts.every((t) => t.length >= 3 && (t[0] === base[0] || levenshtein(t, base) <= 2));
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[m][n];
}

function buildSyllableVisual(word) {
  if (!word) return null;
  const parts = word.includes("-")
    ? word.split("-").filter(Boolean)
    : [word];
  const display = parts.join(" · ");
  return {
    type: "syllables",
    word: word.replace(/-/g, ""),
    parts,
    caption: display,
  };
}

function iconForWord(word) {
  const bare = String(word || "")
    .replace(/-/g, "")
    .toLowerCase();
  return iconForOption(bare) || iconForOption(word) || null;
}

/**
 * Fix one activity. Return activity or null to kill.
 */
function fixActivity(a) {
  let changed = false;
  const steps = Array.isArray(a.steps) ? a.steps.map((s) => ({ ...s, options: [...(s.options || [])] })) : [];
  if (!steps.length) return null;

  // Kill index: garbage
  for (const step of steps) {
    const bad = (step.options || []).filter((o) => /^index:\s*\d+$/i.test(String(o.text || "")));
    if (bad.length >= 1 && bad.length === (step.options || []).length) {
      stats.killedIndex++;
      return null;
    }
  }

  // --- Per-step fixes ---
  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    const prompt = clean(step.prompt || a.statement || "");
    const pu = upper(prompt);
    const opts = step.options || [];
    const correct = correctOpt(step);

    // 0) "Quantas palavras / quantas letras" must NOT show soccer balls
    if (
      /QUANTAS PALAVRAS|QUANTAS LETRAS|HOW MANY WORDS|CU[AÁ]NTAS PALABRAS/i.test(prompt) ||
      /QUANTAS PALAVRAS|QUANTAS LETRAS/i.test(a.statement || "")
    ) {
      if (step.visuals?.type === "count") {
        delete step.visuals;
        stats.syllVisualRemoved++;
        changed = true;
      }
      // Extract or assign a phrase matching the correct count
      let phrase = null;
      const mFr =
        prompt.match(/FRASE:\s*[«"']?([^"'.?]+)[»"']?/i) ||
        prompt.match(/em\s+[«"']([^"']+)[»"']/i) ||
        prompt.match(/"[^"]+"/i);
      if (mFr) phrase = clean(mFr[1] || mFr[0]).replace(/^["']|["']$/g, "");
      const nCorrect = correct ? parseInt(String(correct.text), 10) : NaN;
      if (Number.isFinite(nCorrect)) {
        const byN = {
          2: "O SAPO",
          3: "O SAPO PULA",
          4: "A MENINA BEBE ÁGUA",
          5: "O GATO DORME NA CAMA",
          6: "A MENINA CORRE NO PARQUE",
        };
        // If phrase word count mismatches correct answer, replace phrase
        if (phrase) {
          const wc = phrase.split(/\s+/).filter(Boolean).length;
          if (wc !== nCorrect && byN[nCorrect]) phrase = byN[nCorrect];
        } else if (byN[nCorrect]) {
          phrase = byN[nCorrect];
        }
      }
      if (phrase) {
        const words = phrase.split(/\s+/).filter(Boolean);
        step.prompt = `QUANTAS PALAVRAS TEM A FRASE? FRASE: ${phrase.toUpperCase()}.`;
        step.visuals = {
          type: "word_chips",
          caption: "Conte as palavras:",
          words,
        };
        stats.syllPromptFixed++;
        changed = true;
      }
    }

    // 0b) Reading phrase: each step must show the matching phrase (not the same for all steps)
    if (/LEIA A FRASE|TOQUE NA IMAGEM CORRETA|READ THE SENTENCE/i.test(prompt + a.statement)) {
      if (correct) {
        const ans = clean(correct.text).toUpperCase();
        // Map action options → readable phrase
        const map = {
          "GATO DORMINDO": "O GATO DORME",
          "GATO CORRENDO": "O GATO CORRE",
          "GATO COMENDO": "O GATO COME",
          "MENINO CORRENDO": "O MENINO CORRE",
          "MENINO DORMINDO": "O MENINO DORME",
          "MENINO NADANDO": "O MENINO NADA",
          GATO: "O GATO DORME",
          CASA: "A CASA É BONITA",
          BOLA: "A BOLA PULA",
          CORRENDO: "O MENINO CORRE",
          ACORDAR: "A MENINA ACORDA",
          ESCOVAR: "O MENINO ESCOVA OS DENTES",
        };
        const phrase =
          map[ans] ||
          (ans.includes(" ")
            ? `O ${ans}`
            : null);
        if (phrase) {
          step.prompt = `LEIA A FRASE E TOQUE NA OPÇÃO CERTA: "${phrase}"`;
          const icon = iconForWord(ans.split(/\s+/)[0]);
          if (icon) step.img_ref_urls = [icon];
          stats.readPhraseFixed++;
          changed = true;
        }
      }
    }

    // 1) Syllable questions: remove ball count visuals; add syllable visual; ensure word in prompt
    if (isSyllableQ(prompt) || isSyllableQ(a.statement)) {
      // Remove misleading count visuals (bolas)
      if (step.visuals?.type === "count") {
        delete step.visuals;
        stats.syllVisualRemoved++;
        changed = true;
      }
      if (a.statementVisuals?.type === "count" && isSyllableQ(a.statement)) {
        delete a.statementVisuals;
        changed = true;
      }

      let word = extractSyllableWord(prompt) || extractSyllableWord(a.statement);
      // Infer from correct numeric answer when multi-step lost the word
      if (!word && allOptsNumeric(step) && correct) {
        const n = parseInt(String(correct.text), 10);
        // common bank
        const byN = {
          1: "SOL",
          2: "BO-LA",
          3: "MA-CA-CO",
          4: "BOR-BO-LE-TA",
        };
        // if previous step had a word and this has different count, pick matching
        word = byN[n] || null;
      }

      // Fix second step of known pair BO-LA / MA-CA-CO when both prompts say BO-LA
      if (allOptsNumeric(step) && correct) {
        const n = parseInt(String(correct.text), 10);
        if (n === 3 && /BO-?LA/.test(upper(prompt)) && !/MA-?CA-?CO/.test(upper(prompt))) {
          step.prompt = "QUANTAS SÍLABAS TEM A PALAVRA MA-CA-CO?";
          word = "MA-CA-CO";
          stats.syllPromptFixed++;
          changed = true;
        } else if (n === 2 && !extractSyllableWord(prompt)) {
          step.prompt = "QUANTAS SÍLABAS TEM A PALAVRA BO-LA?";
          word = "BO-LA";
          stats.syllPromptFixed++;
          changed = true;
        } else if (n === 4 && !extractSyllableWord(prompt)) {
          step.prompt = "QUANTAS SÍLABAS TEM A PALAVRA BOR-BO-LE-TA?";
          word = "BOR-BO-LE-TA";
          stats.syllPromptFixed++;
          changed = true;
        }
      }

      if (word && !extractSyllableWord(step.prompt || "")) {
        step.prompt = `QUANTAS SÍLABAS TEM A PALAVRA ${word}?`;
        stats.syllPromptFixed++;
        changed = true;
      }

      word = extractSyllableWord(step.prompt || "") || word;
      if (word) {
        step.visuals = buildSyllableVisual(word);
        // optional small image of the concept (macaco, bola…) — not repeated count balls
        const icon = iconForWord(word.replace(/-/g, ""));
        if (icon) {
          step.img_ref_urls = [icon];
        }
        changed = true;
      }
    }

    // 2) Vague "qual a palavra correta?" (pt/en/es) → image + clear instruction
    const vagueWordRe =
      /^QUAL [EÉ] A PALAVRA CORRETA\??$/i.test(prompt) ||
      /^QUAL [EÉ] A PALAVRA CORRETA\??$/i.test(clean(a.statement)) ||
      /^CU[AÁ]L ES LA PALABRA CORRECTA\??$/i.test(prompt) ||
      /^WHAT IS THE CORRECT WORD\??$/i.test(prompt) ||
      /\(imagem de ([A-Za-zÀ-ú]+)\)/i.test(prompt) ||
      /\(imagem de ([A-Za-zÀ-ú]+)\)/i.test(a.statement || "");

    if (vagueWordRe && correct) {
      const imgHint =
        (prompt.match(/\(imagem de ([A-Za-zÀ-ú]+)\)/i) ||
          String(a.statement || "").match(/\(imagem de ([A-Za-zÀ-ú]+)\)/i) ||
          [])[1] || clean(correct.text);
      const w = clean(imgHint).toUpperCase();
      const icon = iconForWord(w);
      if (icon) step.img_ref_urls = [icon];
      const lang = a.language || "pt";
      if (lang === "en") {
        step.prompt = "LOOK AT THE PICTURE. WHICH WORD IS SPELLED CORRECTLY?";
      } else if (lang === "es") {
        step.prompt = "MIRA LA FIGURA. ¿QUÉ PALABRA ESTÁ ESCRITA CORRECTAMENTE?";
      } else {
        step.prompt = "OLHE A FIGURA. QUAL PALAVRA ESTÁ ESCRITA DE FORMA CORRETA?";
      }
      stats.vagueWordFixed++;
      changed = true;
    }

    // 3) COMPLETE A PALAVRA without blank in statement — lift blank from prompt
    if (/^COMPLETE A PALAVRA:?$/i.test(clean(a.statement)) || /^COMPLETE A PALAVRA:?$/i.test(prompt)) {
      const blank = prompt.match(/[A-ZÀ-Úa-zà-ú]{1,8}[_·.]{1,}[A-ZÀ-Úa-zà-ú]{0,8}|[A-ZÀ-Ú]{1,6}__+[A-ZÀ-Ú]?/);
      if (blank) {
        step.prompt = `COMPLETE A PALAVRA: ${blank[0].toUpperCase()}`;
        stats.completeFixed++;
        changed = true;
      } else if (correct && String(correct.text).length <= 4) {
        // Reconstruct from correct syllable + common patterns
        const syl = clean(correct.text).toUpperCase();
        // CA__A + SA → CASA
        if (syl.length === 2) {
          step.prompt = `COMPLETE A PALAVRA COM A SÍLABA QUE FALTA. OPÇÃO CERTA: ${syl} (exemplo: use as sílabas para formar a palavra).`;
          // Better reconstruct known pairs
          const known = {
            SA: "CA__A",
            PA: "SA__O",
            MA: "CA__A",
            BO: "CA__A",
            LA: "BO__A",
            TO: "GA__O",
            CA: "MA__ACO",
          };
          const pattern = known[syl] || `__${syl}__`;
          step.prompt = `COMPLETE A PALAVRA: ${pattern}`;
          stats.completeFixed++;
          changed = true;
        }
      }
    }

    // Per-step complete blanks only in prompt
    if (/COMPLETE A PALAVRA/i.test(a.statement || "") && /^[A-ZÀ-Ú_·.]{2,12}$/i.test(prompt.replace(/\s/g, ""))) {
      step.prompt = `COMPLETE A PALAVRA: ${prompt.toUpperCase()}`;
      stats.completeFixed++;
      changed = true;
    }

    // 4) Reading: prompt is the phrase, statement says touch image
    if (/LEIA A FRASE|TOQUE NA IMAGEM CORRETA/i.test(a.statement || "") && prompt && !/LEIA A FRASE/i.test(prompt)) {
      if (prompt.length >= 4 && prompt.length < 80 && !/^\d+$/.test(prompt)) {
        step.prompt = `LEIA A FRASE E TOQUE NA OPÇÃO CERTA: "${prompt.toUpperCase()}"`;
        stats.readPhraseFixed++;
        changed = true;
        if (correct) {
          const icon = iconForWord(correct.text);
          if (icon) {
            // options stay text; no need images if A B C D only UI
          }
        }
      }
    }

    // 5) Story without context
    if (/^O QUE ELA LEVOU\??$/i.test(prompt) || /^O QUE ELA LEVOU\??$/i.test(clean(a.statement))) {
      step.prompt =
        'LEIA: "ANA FOI AO PARQUE. ELA LEVOU SUA BOLA." O QUE ELA LEVOU?';
      stats.storyFixed++;
      changed = true;
    }
    if (/^O QUE ELE FAZ\??$/i.test(prompt) || /^O QUE ELE FAZ\??$/i.test(clean(a.statement))) {
      step.prompt = "O MENINO ESTÁ EM MOVIMENTO. O QUE ELE FAZ? TOQUE NA AÇÃO CERTA.";
      stats.storyFixed++;
      changed = true;
    }
  }

  // Statement-level: RESPONDA CORRETAMENTE → first real step prompt
  if (/^RESPONDA CORRETAMENTE\.?$/i.test(clean(a.statement))) {
    const p0 = clean(steps[0]?.prompt || "");
    if (p0 && !/^RESPONDA CORRETAMENTE/i.test(p0)) {
      a.statement = p0;
      stats.respondFixed++;
      changed = true;
    }
  }

  // Statement-level: COMPLETE A PALAVRA empty
  if (/^COMPLETE A PALAVRA:?$/i.test(clean(a.statement))) {
    const p0 = clean(steps[0]?.prompt || "");
    if (p0) {
      a.statement = p0;
      changed = true;
    }
  }

  // Statement-level vague word
  if (/^QUAL [EÉ] A PALAVRA CORRETA\??$/i.test(clean(a.statement))) {
    const p0 = clean(steps[0]?.prompt || "");
    if (p0 && p0 !== clean(a.statement)) {
      a.statement = p0;
      changed = true;
    } else if (steps[0]?.prompt) {
      a.statement = steps[0].prompt;
      changed = true;
    }
  }

  // Sync statement with first step for syllable
  if (isSyllableQ(steps[0]?.prompt || "") && !isSyllableQ(a.statement)) {
    a.statement = steps[0].prompt;
    changed = true;
  }
  if (isSyllableQ(a.statement) && a.statementVisuals?.type === "count") {
    delete a.statementVisuals;
    changed = true;
  }

  // Multi-step: ensure each step prompt not empty generic
  for (let si = 0; si < steps.length; si++) {
    if (!clean(steps[si].prompt)) {
      steps[si].prompt = a.statement;
      stats.multiStepPrompt++;
      changed = true;
    }
  }

  // Math "COMPLETE:" without expression — put options context
  for (const step of steps) {
    if (/^COMPLETE:?$/i.test(clean(step.prompt || a.statement))) {
      const c = correctOpt(step);
      if (c && /^\d+$/.test(String(c.text))) {
        // leave numbers as answer; ask clearly
        step.prompt = `COMPLETE A CONTA. QUAL É O NÚMERO QUE FALTA? (resposta entre as opções)`;
        // Better: don't spoil — generic
        step.prompt = "COMPLETE A CONTA: ESCOLHA O NÚMERO QUE FALTA.";
        changed = true;
        stats.completeFixed++;
      }
    }
  }

  // "Quantas palmas" literacy clap-count — no soccer balls
  for (const step of steps) {
    if (/QUANTAS PALMAS|PALMAS TEM A PALAVRA/i.test(step.prompt || a.statement || "")) {
      if (step.visuals?.type === "count") {
        delete step.visuals;
        changed = true;
        stats.syllVisualRemoved++;
      }
      if (!/PALAVRA\s+[A-Z]/i.test(step.prompt || "") && correctOpt(step)) {
        const n = parseInt(String(correctOpt(step).text), 10);
        const byN = { 1: "PÉ", 2: "CASA", 3: "MACACO", 4: "BORBOLETA" };
        const w = byN[n] || "CASA";
        step.prompt = `QUANTAS PALMAS (SÍLABAS) TEM A PALAVRA ${w}?`;
        step.visuals = buildSyllableVisual(w.length > 3 && n >= 2 ? w.match(/.{1,2}/g)?.join("-") || w : w);
        changed = true;
      }
    }
  }

  // "Toque na imagem" without image — reword to choose the word
  for (const step of steps) {
    if (/TOQUE NA IMAGEM/i.test(step.prompt || a.statement || "") && !step.img_ref_urls?.length) {
      const pr = clean(step.prompt || a.statement);
      step.prompt = pr.replace(/TOQUE NA IMAGEM/gi, "TOQUE NA OPÇÃO CERTA");
      changed = true;
    }
  }

  // Options must exist
  for (const step of steps) {
    if (!step.options || step.options.length < 2) return null;
    if (!step.options.some((o) => o.correct)) return null;
  }

  if (changed) {
    stats.touched++;
    a.steps = steps;
    a.needs_review = false;
    a.notes = [...new Set([...(a.notes || []), "context-quality-fix"])];
  }
  return a;
}

const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const bak = CATALOG.replace(/\.json$/, `.backup-pre-context-${Date.now()}.json`);
fs.copyFileSync(CATALOG, bak);
console.log("backup", bak);

walkMut(cat, fixActivity);
fs.writeFileSync(CATALOG, JSON.stringify(cat));
console.log(JSON.stringify(stats, null, 2));
