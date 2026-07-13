/**
 * Quality pass over ALL activities:
 * - remove / reformulate vague drag, Sim/Não/Talvez, "toque na letra correta" sem contexto
 * - fix number-maior with wrong correct option
 * - rebuild sensible single-choice from ARRASTE/MONTE patterns
 * - re-apply option icons + statement visuals
 *
 * Run: node scripts/fix-quality-pass.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sanitizeText } from "./sanitize-text.mjs";
import { audioUrlFromStatement } from "./enunciado-formatter.mjs";
import { iconForOption, twemoji } from "./option-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");

const WORD_START = {
  A: "ABACAXI", B: "BOLA", C: "CASA", D: "DADO", E: "ELEFANTE", F: "FACA",
  G: "GATO", H: "HELICÓPTERO", I: "IGREJA", J: "JANELA", L: "LUA", M: "MALA",
  N: "NAVIO", O: "OVO", P: "PATO", Q: "QUEIJO", R: "RATO", S: "SOL", T: "TATU",
  U: "UVA", V: "VACA", X: "XÍCARA", Z: "ZEBRA",
};

function optId(i) {
  return String.fromCharCode(97 + (i % 26));
}

function isPlaceholderText(t) {
  const s = String(t || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return (
    !s ||
    s === "—" ||
    s === "-" ||
    s === "sim" ||
    s === "nao" ||
    s === "talvez" ||
    s === "em revisao" ||
    /^opca[oõ]\s*[abc0-9]/i.test(s) ||
    /^opcao\s*[abc0-9]/i.test(s)
  );
}

function allPlaceholders(opts) {
  if (!opts || opts.length < 2) return true;
  const n = opts.filter((o) => isPlaceholderText(o.text)).length;
  return n >= Math.min(2, opts.length);
}

function letterOpts(correct, wrongs) {
  const L = String(correct).toUpperCase();
  const set = new Set([L, ...wrongs.map((w) => String(w).toUpperCase())]);
  while (set.size < 3) {
    const r = "ABCDEFGHLMNOPRSTUV"[Math.floor(Math.random() * 18)];
    if (r !== L) set.add(r);
  }
  return [...set].slice(0, 3).map((t, i) => ({
    id: optId(i),
    text: t,
    image_url: null,
    correct: t === L,
  }));
}

function numOpts(correct, distractors) {
  const c = Number(correct);
  const vals = [c, ...distractors.map(Number)].filter((n) => !Number.isNaN(n));
  const set = new Set(vals);
  let d = 1;
  while (set.size < 3) {
    set.add(Math.max(0, c + d));
    set.add(Math.max(0, c - d));
    d++;
  }
  return [...set].slice(0, 3).map((t, i) => ({
    id: optId(i),
    text: String(t),
    image_url: null,
    correct: Number(t) === c,
  }));
}

function wordSequenceOpts(word) {
  const w = String(word).toUpperCase().replace(/[^A-ZÀ-Ú]/g, "");
  if (w.length < 2) return null;
  // syllables crude: pairs
  const parts = [];
  for (let i = 0; i < w.length; i += 2) parts.push(w.slice(i, i + 2));
  const correct = parts.join("-");
  const wrong1 = [...parts].reverse().join("-");
  const wrong2 = parts.length > 1 ? parts[0] + "-" + parts[0] : w[0] + "-" + w;
  return [
    { id: "a", text: correct, image_url: null, correct: true },
    { id: "b", text: wrong1, image_url: null, correct: false },
    { id: "c", text: wrong2.slice(0, 12), image_url: null, correct: false },
  ];
}

/**
 * Try reformulate a broken activity into a sensible single-choice.
 * Returns { statement, steps } or null to kill.
 */
function reformulate(activity) {
  let st = sanitizeText(String(activity.statement || "").replace(/[“”"]/g, "").trim());
  const upper = st.toUpperCase();
  const step0 = (activity.steps || [])[0] || {};
  const opts = step0.options || [];

  // --- Letter: vague "toque na letra correta" with letter options ---
  if (
    opts.length >= 2 &&
    opts.every((o) => /^[A-Za-zÀ-ÿ]$/.test(String(o.text || "").trim()))
  ) {
    const correct = opts.find((o) => o.correct);
    if (correct) {
      const L = String(correct.text).toUpperCase().normalize("NFD").replace(/\p{M}/gu, "");
      const word = WORD_START[L] || "BOLA";
      // If statement already names a word matching letter, keep/fix format
      const m = upper.match(/PALAVRA\s+([A-ZÀ-Ú]{2,})/);
      if (m && m[1][0] === L && /COME[CÇ]A|COMECO|IN[IÍ]CIO|PRIMEIRA|QUAL LETRA/i.test(upper)) {
        return {
          statement: `QUAL LETRA COMEÇA A PALAVRA ${m[1]}?`,
          steps: [{ prompt: `QUAL LETRA COMEÇA A PALAVRA ${m[1]}?`, options: opts.map((o, i) => ({ ...o, id: optId(i), image_url: null })) }],
          needs_review: false,
        };
      }
      if (/TOQUE NA LETRA CORRETA|LETRA CORRETA\.?$|RESPONDA CORRETAMENTE/i.test(upper) || !/PALAVRA|SOM |COME/i.test(upper)) {
        return {
          statement: `QUAL LETRA COMEÇA A PALAVRA ${word}?`,
          steps: [
            {
              prompt: `QUAL LETRA COMEÇA A PALAVRA ${word}?`,
              options: letterOpts(L, opts.filter((o) => !o.correct).map((o) => o.text)),
            },
          ],
          needs_review: false,
        };
      }
    }
  }

  // --- ARRASTE AS LETRAS QUE FORMAM X / PARA FORMAR X ---
  let m = upper.match(/LETRAS?\s+(?:QUE\s+FORMAM|PARA\s+FORMAR)\s+([A-ZÀ-Ú]{2,})/);
  if (m || /ARRASTE AS LETRAS|MONTE.*PALAVRA|FORMAM\s+[A-ZÀ-Ú]+/i.test(upper)) {
    const word =
      (m && m[1]) ||
      (upper.match(/FORMAR\s+([A-ZÀ-Ú]{2,})/) || [])[1] ||
      (upper.match(/FORMAM\s+([A-ZÀ-Ú]{2,})/) || [])[1] ||
      "BOLA";
    const seq = wordSequenceOpts(word);
    if (seq) {
      return {
        statement: `QUAL SEQUÊNCIA FORMA A PALAVRA ${word}?`,
        steps: [{ prompt: `QUAL SEQUÊNCIA FORMA A PALAVRA ${word}?`, options: seq }],
        needs_review: false,
      };
    }
  }

  // --- MENORES QUE N ---
  m = upper.match(/MENORES QUE\s*(\d+)/i);
  if (m) {
    const lim = parseInt(m[1], 10);
    return {
      statement: `QUAL NÚMERO É MENOR QUE ${lim}?`,
      steps: [
        {
          prompt: `QUAL NÚMERO É MENOR QUE ${lim}?`,
          options: [
            { id: "a", text: String(Math.max(1, lim - 5)), image_url: null, correct: true },
            { id: "b", text: String(lim + 2), image_url: null, correct: false },
            { id: "c", text: String(lim + 5), image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- ARRASTE O RESULTADO CORRETO (sem conta no texto) ---
  if (/ARRASTE O RESULTADO CORRETO/i.test(upper)) {
    // try extract from options if two numbers - pick larger as sum demo? better fixed simple
    const nums = opts.map((o) => parseInt(String(o.text), 10)).filter((n) => !Number.isNaN(n));
    if (nums.length >= 2) {
      // assume correct is already marked
      const c = opts.find((o) => o.correct);
      const ans = c ? parseInt(c.text, 10) : nums[0];
      return {
        statement: `QUANTO É O RESULTADO CORRETO? TOQUE NO NÚMERO.`,
        steps: [
          {
            prompt: `TOQUE NO RESULTADO CORRETO.`,
            options: opts.map((o, i) => ({
              id: optId(i),
              text: String(o.text).trim(),
              image_url: null,
              correct: !!o.correct,
            })),
          },
        ],
        needs_review: false,
      };
    }
  }

  // --- ORDEM DO DIA ---
  if (/ORDEM DO DIA|ACORDAR|IR [AÀ] ESCOLA/i.test(upper) && opts.length >= 2) {
    return {
      statement: "O QUE FAZEMOS PRIMEIRO NO DIA?",
      steps: [
        {
          prompt: "O QUE FAZEMOS PRIMEIRO NO DIA?",
          options: [
            { id: "a", text: "ACORDAR", image_url: null, correct: true },
            { id: "b", text: "IR À ESCOLA", image_url: null, correct: false },
            { id: "c", text: "BRINCAR", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- FORMAR PALAVRA com sílabas nas opções ---
  if (/S[IÍ]LABAS PARA FORMAR|FORMAR A PALAVRA/i.test(upper) && opts.length >= 2) {
    const syls = opts.map((o) => String(o.text).toUpperCase());
    // if BO LO present → BOLO
    const joined = syls.slice(0, 2).join("");
    if (joined.length >= 2) {
      return {
        statement: `QUAL SEQUÊNCIA FORMA A PALAVRA ${joined}?`,
        steps: [
          {
            prompt: `QUAL SEQUÊNCIA FORMA A PALAVRA ${joined}?`,
            options: [
              { id: "a", text: syls.slice(0, 2).join("-"), image_url: null, correct: true },
              { id: "b", text: [...syls.slice(0, 2)].reverse().join("-"), image_url: null, correct: false },
              { id: "c", text: (syls[2] || "MA") + "-" + (syls[0] || "CA"), image_url: null, correct: false },
            ],
          },
        ],
        needs_review: false,
      };
    }
  }

  // --- FORMAR FRASE ---
  if (/FORMAR A FRASE/i.test(upper) && opts.length >= 2) {
    const words = opts.map((o) => String(o.text).toUpperCase());
    const phrase = words.join(" ");
    return {
      statement: "QUAL FRASE ESTÁ NA ORDEM CERTA?",
      steps: [
        {
          prompt: "QUAL FRASE ESTÁ NA ORDEM CERTA?",
          options: [
            { id: "a", text: phrase, image_url: null, correct: true },
            { id: "b", text: [...words].reverse().join(" "), image_url: null, correct: false },
            { id: "c", text: words.slice().sort().join(" "), image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- COMEÇO DA HISTÓRIA ---
  if (/COME[CÇ]O DA HIST[OÓ]RIA/i.test(upper) && opts.length >= 2) {
    const c = opts.find((o) => /ERA UMA VEZ|COME[CÇ]O/i.test(String(o.text))) || opts[0];
    return {
      statement: "QUAL É O COMEÇO DA HISTÓRIA?",
      steps: [
        {
          prompt: "QUAL É O COMEÇO DA HISTÓRIA?",
          options: opts.map((o, i) => ({
            id: optId(i),
            text: String(o.text),
            image_url: null,
            correct: String(o.text) === String(c.text),
          })),
        },
      ],
      needs_review: false,
    };
  }

  // --- DIREITA / ESQUERDA / CIMA / BAIXO ---
  if (/PARA A DIREITA|ARRASTE PARA A DIREITA/i.test(upper)) {
    return {
      statement: "QUAL LADO É A DIREITA?",
      steps: [
        {
          prompt: "QUAL LADO É A DIREITA?",
          options: [
            { id: "a", text: "DIREITA", image_url: null, correct: true },
            { id: "b", text: "ESQUERDA", image_url: null, correct: false },
            { id: "c", text: "CIMA", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }
  if (/PARA A ESQUERDA|ARRASTE PARA A ESQUERDA/i.test(upper)) {
    return {
      statement: "QUAL LADO É A ESQUERDA?",
      steps: [
        {
          prompt: "QUAL LADO É A ESQUERDA?",
          options: [
            { id: "a", text: "ESQUERDA", image_url: null, correct: true },
            { id: "b", text: "DIREITA", image_url: null, correct: false },
            { id: "c", text: "BAIXO", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }
  if (/ARRASTE PARA CIMA/i.test(upper)) {
    return {
      statement: "QUAL DIREÇÃO É PARA CIMA?",
      steps: [
        {
          prompt: "QUAL DIREÇÃO É PARA CIMA?",
          options: [
            { id: "a", text: "CIMA", image_url: null, correct: true },
            { id: "b", text: "BAIXO", image_url: null, correct: false },
            { id: "c", text: "LADO", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }
  if (/ARRASTE PARA BAIXO/i.test(upper)) {
    return {
      statement: "QUAL DIREÇÃO É PARA BAIXO?",
      steps: [
        {
          prompt: "QUAL DIREÇÃO É PARA BAIXO?",
          options: [
            { id: "a", text: "BAIXO", image_url: null, correct: true },
            { id: "b", text: "CIMA", image_url: null, correct: false },
            { id: "c", text: "LADO", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- ARRASTE animal ATÉ A CASA / peça ---
  if (/ARRASTE O (CACHORRO|GATO|.*?) AT[EÉ] A CASA|ARRASTE A PE[CÇ]A/i.test(upper)) {
    return {
      statement: "ONDE O ANIMAL DEVE FICAR?",
      steps: [
        {
          prompt: "ONDE O ANIMAL DEVE FICAR?",
          options: [
            { id: "a", text: "NA CASA", image_url: null, correct: true },
            { id: "b", text: "NO MEIO DO CAMINHO", image_url: null, correct: false },
            { id: "c", text: "FORA DA TELA", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- PALAVRAS DA COZINHA ---
  if (/COZINHA/i.test(upper) && opts.length >= 2) {
    const kitchen = /FOG[AÃ]O|PANELA|PRATO|GARFO|FACA|COPO|MESA/i;
    return {
      statement: "QUAL OBJETO É DA COZINHA?",
      steps: [
        {
          prompt: "QUAL OBJETO É DA COZINHA?",
          options: opts.slice(0, 4).map((o, i) => ({
            id: optId(i),
            text: String(o.text),
            image_url: null,
            correct: kitchen.test(String(o.text)),
          })),
        },
      ],
      needs_review: false,
    };
  }

  // --- ARRASTE O NÚMERO MAIOR / MENOR ---
  if (/N[UÚ]MERO MAIOR|MAIOR N[UÚ]MERO/i.test(upper)) {
    return {
      statement: "QUAL É O NÚMERO MAIOR?",
      steps: [
        {
          prompt: "QUAL É O NÚMERO MAIOR?",
          options: [
            { id: "a", text: "9", image_url: null, correct: true },
            { id: "b", text: "3", image_url: null, correct: false },
            { id: "c", text: "5", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }
  if (/N[UÚ]MERO MENOR|MENOR N[UÚ]MERO/i.test(upper)) {
    return {
      statement: "QUAL É O NÚMERO MENOR?",
      steps: [
        {
          prompt: "QUAL É O NÚMERO MENOR?",
          options: [
            { id: "a", text: "2", image_url: null, correct: true },
            { id: "b", text: "7", image_url: null, correct: false },
            { id: "c", text: "9", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- ARRASTE O RESULTADO / math in statement ---
  m = upper.match(/(\d+)\s*([+\-x×*÷/])\s*(\d+)/);
  if (m && (/RESULTADO|QUANTO|ARRASTE|CALCULE/i.test(upper) || allPlaceholders(opts))) {
    const a = parseInt(m[1], 10);
    const op = m[2];
    const b = parseInt(m[3], 10);
    let r = a + b;
    let label = `${a} MAIS ${b}`;
    if (op === "-" || op === "−") {
      r = a - b;
      label = `${a} MENOS ${b}`;
    } else if (/[x×*]/.test(op)) {
      r = a * b;
      label = `${a} VEZES ${b}`;
    }
    return {
      statement: `QUANTO É ${label}?`,
      steps: [{ prompt: `QUANTO É ${label}?`, options: numOpts(r, [r + 1, r - 1 === r ? r + 2 : r - 1]) }],
      needs_review: false,
    };
  }

  // --- ARRASTE AS PALAVRAS QUE COMEÇAM COM X ---
  m = upper.match(/COME[CÇ]AM COM\s+([A-ZÀ-Ú])/);
  if (m) {
    const L = m[1];
    const word = WORD_START[L] || "BOLA";
    const wrong1 = WORD_START[L === "B" ? "C" : "B"] || "CASA";
    const wrong2 = WORD_START[L === "P" ? "M" : "P"] || "PATO";
    return {
      statement: `QUAL PALAVRA COMEÇA COM A LETRA ${L}?`,
      steps: [
        {
          prompt: `QUAL PALAVRA COMEÇA COM A LETRA ${L}?`,
          options: [
            { id: "a", text: word, image_url: null, correct: true },
            { id: "b", text: wrong1, image_url: null, correct: false },
            { id: "c", text: wrong2, image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- ORDEM 1,2,3,4 ---
  if (/ORDEM CORRETA|1\s*,\s*2\s*,\s*3/i.test(upper)) {
    return {
      statement: "QUAL SEQUÊNCIA ESTÁ EM ORDEM CRESCENTE?",
      steps: [
        {
          prompt: "QUAL SEQUÊNCIA ESTÁ EM ORDEM CRESCENTE?",
          options: [
            { id: "a", text: "1, 2, 3, 4", image_url: null, correct: true },
            { id: "b", text: "4, 3, 2, 1", image_url: null, correct: false },
            { id: "c", text: "2, 4, 1, 3", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- SEPARE EM GRUPOS DE 10 ---
  if (/GRUPOS DE\s*(\d+)/i.test(upper)) {
    const g = parseInt(upper.match(/GRUPOS DE\s*(\d+)/i)[1], 10);
    return {
      statement: `SE VOCÊ TEM ${g * 2} ITENS E SEPARA EM GRUPOS DE ${g}, QUANTOS GRUPOS FICA?`,
      steps: [
        {
          prompt: `SE VOCÊ TEM ${g * 2} ITENS E SEPARA EM GRUPOS DE ${g}, QUANTOS GRUPOS FICA?`,
          options: numOpts(2, [3, 1]),
        },
      ],
      needs_review: false,
    };
  }

  // --- COLOQUE LIVRO EM CIMA DA MESA → spatial choice ---
  if (/EM CIMA DA MESA|LIVRO.*MESA/i.test(upper)) {
    return {
      statement: "QUAL OBJETO ESTÁ EM CIMA DA MESA?",
      steps: [
        {
          prompt: "QUAL OBJETO ESTÁ EM CIMA DA MESA?",
          options: [
            { id: "a", text: "LIVRO", image_url: null, correct: true },
            { id: "b", text: "BOLA", image_url: null, correct: false },
            { id: "c", text: "SAPATO", image_url: null, correct: false },
          ],
        },
      ],
      needs_review: false,
    };
  }

  // --- COMPLETE O DESENHO / MISSÃO vaga / ARRASTE sem conteúdo extra ---
  if (
    /COMPLETE O DESENHO|MISS[AÃ]O:|ARRASTE O DINHEIRO|ARRASTE A CABE[CÇ]A|ARRASTE O BRINQUEDO|SIGA AS SETAS|ORGANIZE DO MAIS|COMPLETE A FRASE COM DUAS|ENCONTRE A PALAVRA DIFERENTE(?!\s+\w)/i.test(
      upper
    ) &&
    allPlaceholders(opts)
  ) {
    // Try ENCONTRE A PALAVRA DIFERENTE with real words
    if (/PALAVRA DIFERENTE/i.test(upper)) {
      return {
        statement: "QUAL PALAVRA É DIFERENTE?",
        steps: [
          {
            prompt: "QUAL PALAVRA É DIFERENTE?",
            options: [
              { id: "a", text: "GATO", image_url: null, correct: false },
              { id: "b", text: "CACHORRO", image_url: null, correct: false },
              { id: "c", text: "MESA", image_url: null, correct: true },
            ],
          },
        ],
        needs_review: false,
      };
    }
    return null; // kill unsalvageable
  }

  // --- Number options where correct is NOT the max but statement says MAIOR ---
  if (/MAIOR/i.test(upper) && opts.every((o) => /^\d+$/.test(String(o.text).trim()))) {
    const nums = opts.map((o) => parseInt(o.text, 10));
    const max = Math.max(...nums);
    return {
      statement: "QUAL É O NÚMERO MAIOR?",
      steps: [
        {
          prompt: "QUAL É O NÚMERO MAIOR?",
          options: opts.map((o, i) => ({
            id: optId(i),
            text: String(o.text).trim(),
            image_url: null,
            correct: parseInt(o.text, 10) === max,
          })),
        },
      ],
      needs_review: false,
    };
  }

  // --- Placeholder options with otherwise ok statement ---
  if (allPlaceholders(opts)) {
    // Can't invent without context
    if (/ARRASTE|MONTE |ORDENE|COMPLETE O DESENHO|MISS[AÃ]O/i.test(upper)) return null;
    // Keep only if we can build from statement keywords
    if (/QUANTOS DEDOS.*M[AÃ]O/i.test(upper) && !/DUAS/i.test(upper)) {
      return {
        statement: "QUANTOS DEDOS TEMOS EM UMA MÃO?",
        steps: [{ prompt: "QUANTOS DEDOS TEMOS EM UMA MÃO?", options: numOpts(5, [4, 10]) }],
        needs_review: false,
      };
    }
    if (/QUANTOS DEDOS.*DUAS/i.test(upper)) {
      return {
        statement: "QUANTOS DEDOS TEMOS NAS DUAS MÃOS?",
        steps: [{ prompt: "QUANTOS DEDOS TEMOS NAS DUAS MÃOS?", options: numOpts(10, [5, 8]) }],
        needs_review: false,
      };
    }
    return null;
  }

  // Fix wrong "maior" already handled; fix Sim/Não mixed
  if (opts.some((o) => isPlaceholderText(o.text)) && opts.some((o) => !isPlaceholderText(o.text))) {
    // drop placeholder-only noise
    const cleaned = opts.filter((o) => !isPlaceholderText(o.text));
    if (cleaned.length >= 2 && cleaned.some((o) => o.correct)) {
      return {
        statement: st,
        steps: [
          {
            prompt: step0.prompt || st,
            options: cleaned.map((o, i) => ({ ...o, id: optId(i) })),
          },
        ],
        needs_review: false,
      };
    }
  }

  return { statement: st, steps: activity.steps, needs_review: !!activity.needs_review, untouched: true };
}

function applyIcons(activity) {
  for (const st of activity.steps || []) {
    for (const o of st.options || []) {
      const t = String(o.text || "").trim();
      // letters → null (UI tile)
      if (/^[A-Za-zÀ-ÿ]$/.test(t)) {
        o.image_url = null;
        continue;
      }
      o.image_url = iconForOption(t);
    }
  }
}

function applyCountVisual(activity) {
  const stmt = activity.statement || "";
  for (const st of activity.steps || []) {
    const q = st.prompt || stmt;
    const combined = `${stmt} ${q}`;
    if (!/QUANTOS DEDOS|QUANTAS? .*M[AÃ]O/i.test(combined)) {
      // clear wrong bola counts on pure math
      if (/QUANTO [EÉ]|MAIS|MENOS|DOBRO/i.test(combined) && st.visuals?.noun === "bola") {
        delete st.visuals;
      }
      continue;
    }
    const correct = (st.options || []).find((o) => o.correct);
    const n = correct ? parseInt(String(correct.text).replace(/\D/g, ""), 10) : NaN;
    if (!n || n > 12) continue;
    const icon = twemoji("1f446"); // 👆 finger
    st.visuals = {
      type: "count",
      n,
      fullN: n,
      noun: "dedo",
      urls: Array.from({ length: n }, () => icon),
    };
  }
}

function needsPass(activity) {
  const st = String(activity.statement || "").toUpperCase();
  const opts = activity.steps?.[0]?.options || [];
  if (activity.needs_review) return true;
  if (allPlaceholders(opts)) return true;
  if (/ARRASTE|MONTE |ORDENE|COMPLETE O DESENHO|TOQUE NA LETRA CORRETA\.?$/i.test(st)) return true;
  if (/N[UÚ]MERO MAIOR/i.test(st) && opts.every((o) => /^\d+$/.test(String(o.text).trim()))) {
    const nums = opts.map((o) => parseInt(o.text, 10));
    const max = Math.max(...nums);
    const c = opts.find((o) => o.correct);
    if (c && parseInt(c.text, 10) !== max) return true;
  }
  if (opts.every((o) => /^[A-Za-zÀ-ÿ]$/.test(String(o.text || "").trim())) && /TOQUE NA LETRA CORRETA/i.test(st))
    return true;
  return false;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const report = {
    scanned: 0,
    fixed: 0,
    killed: 0,
    icons: 0,
    fingerVisuals: 0,
  };

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            const keep = [];
            for (const a of lv.activities || []) {
              report.scanned++;
              let act = a;

              if (needsPass(a) || /bncc|planilha|scriptable/i.test(String(a.layout_source || a.source_path || ""))) {
                const r = reformulate(a);
                if (r === null) {
                  report.killed++;
                  continue;
                }
                if (!r.untouched) {
                  act = {
                    ...a,
                    statement: r.statement,
                    steps: r.steps,
                    needs_review: !!r.needs_review,
                    choice_type: "single",
                    audio_url: audioUrlFromStatement(r.statement) || a.audio_url,
                    notes: [...(a.notes || []), "quality-pass"],
                  };
                  report.fixed++;
                }
              }

              // Always re-icon and finger visuals for everyone
              applyIcons(act);
              report.icons++;
              const before = JSON.stringify(act.steps?.[0]?.visuals || null);
              applyCountVisual(act);
              if (JSON.stringify(act.steps?.[0]?.visuals || null) !== before && act.steps?.[0]?.visuals?.noun === "dedo") {
                report.fingerVisuals++;
              }

              // Drop still-placeholder
              const opts = act.steps?.[0]?.options || [];
              if (allPlaceholders(opts)) {
                report.killed++;
                continue;
              }
              // Must have a correct option
              if (!opts.some((o) => o.correct)) {
                report.killed++;
                continue;
              }

              keep.push(act);
            }
            lv.activities = keep;
          }
        }
      }
    }
  }

  catalog.quality_pass_at = new Date().toISOString();
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  console.log(report);

  // samples
  for (const id of [
    "xc_di_tea_01_lp_p99_n1_3_QUAL_LETRA_COME_A_A_PALAVRA",
    "xc_di_tea_01_ma_p99_n1_1_QUANTOS_DEDOS_TEMOS_EM_UMA",
    "xc_di_tea_01_ma_p1_n1_1_ARRASTE_O_N_MERO_MAIOR",
  ]) {
    for (const p of catalog.personas) {
      for (const y of p.years || []) {
        for (const m of y.matters || []) {
          for (const pill of m.pills || []) {
            for (const lv of pill.levels || []) {
              const a = (lv.activities || []).find((x) => x.id === id);
              if (a) {
                console.log("SAMPLE", id);
                console.log(" ", a.statement);
                console.log(" ", (a.steps?.[0]?.options || []).map((o) => `${o.text}${o.correct ? "*" : ""}`));
                console.log(" ", "vis", a.steps?.[0]?.visuals?.noun, a.steps?.[0]?.visuals?.n);
              }
            }
          }
        }
      }
    }
  }
}

main();
