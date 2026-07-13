/**
 * Strict quality gate for ALL activities.
 * - Kill planilha/bncc/SO junk that confuses kids
 * - Fix fruit/count visuals
 * - Fix "qual frase" without context
 *
 * Run: node scripts/fix-strict-quality.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sanitizeText } from "./sanitize-text.mjs";
import { audioUrlFromStatement } from "./enunciado-formatter.mjs";
import { iconForOption, twemoji } from "./option-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");

function optId(i) {
  return String.fromCharCode(97 + (i % 26));
}

function cleanText(t) {
  return sanitizeText(String(t || "").replace(/[“”]/g, '"').trim());
}

function isPlaceholder(t) {
  const s = cleanText(t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return (
    !s ||
    s === "-" ||
    s === "—" ||
    s === "sim" ||
    s === "nao" ||
    s === "talvez" ||
    s === "em revisao" ||
    /^opcao\s*[a-z0-9]?$/i.test(s) ||
    /^opção\s*[a-z0-9]?$/i.test(s) ||
    /movimento correto|movimento errado|movimento incompleto|solto no meio|solto fora|encaixe correto/i.test(
      s
    )
  );
}

function allNumeric(opts) {
  return (
    opts.length >= 2 &&
    opts.every((o) => /^\d{1,3}$/.test(String(o.text || "").trim()))
  );
}

function looksLikeMetaOption(t) {
  const s = String(t || "");
  return (
    /Pergunta\s*:/i.test(s) ||
    /ENUNCIADO\s*:/i.test(s) ||
    /\//.test(s) && /VOC[EÊ]|TERMINOU|QUER |PRECISA/i.test(s) ||
    s.length > 48
  );
}

function statementAsksNounChoice(st) {
  return /QUAL (FRUTA|ANIMAL|OBJETO|PALAVRA|FIGURA|COR|ALIMENTO|BRINQUEDO)\b/i.test(
    st
  );
}

function statementIsCount(st) {
  return /QUANTOS|QUANTAS|CONTE |QUANTIDADE|MENOR QUANTIDADE|MAIOR QUANTIDADE/i.test(
    st
  );
}

function hasCorrect(opts) {
  return opts.some((o) => o.correct);
}

/**
 * @returns {'ok'|'kill'|object} object = replacement activity fields
 */
function evaluate(activity) {
  const st = cleanText(activity.statement || "");
  const upper = st.toUpperCase();
  const steps = activity.steps || [];
  if (!st || steps.length === 0) return "kill";

  // Hard kill: still drag language
  if (/ARRASTE|ARRASTAR/i.test(st)) return "kill";
  if (/ARRASTE|ARRASTAR/i.test(steps.map((s) => s.prompt || "").join(" ")))
    return "kill";

  const newSteps = [];
  for (const step of steps) {
    let opts = (step.options || [])
      .map((o) => ({
        ...o,
        text: cleanText(o.text),
        correct: !!o.correct,
      }))
      .filter((o) => o.text);

    if (opts.length < 2 || !hasCorrect(opts)) return "kill";
    if (opts.filter((o) => isPlaceholder(o.text)).length >= 2) return "kill";

    // Meta options like 'Pergunta: "Você terminou?" / JÁ TERMINEI'
    if (opts.some((o) => looksLikeMetaOption(o.text))) {
      // Try salvage: extract answer after /
      const salvaged = [];
      for (const o of opts) {
        const m = String(o.text).match(/\/\s*([^/]+)$/);
        if (m && !looksLikeMetaOption(m[1]) && m[1].trim().length < 30) {
          salvaged.push({
            text: cleanText(m[1]),
            correct: o.correct,
          });
        } else if (!looksLikeMetaOption(o.text) && o.text.length <= 40) {
          salvaged.push({ text: o.text, correct: o.correct });
        }
      }
      // Need a question context
      const qMatch = opts
        .map((o) => String(o.text).match(/Pergunta:\s*[""]?([^""\/]+)/i))
        .find((x) => x);
      if (salvaged.length >= 2 && hasCorrect(salvaged.map((o, i) => ({ ...o, correct: o.correct }))) && qMatch) {
        const question = cleanText(qMatch[1]);
        const prompt = `A pergunta foi: "${question}" QUAL RESPOSTA USAMOS?`;
        opts = salvaged.slice(0, 4).map((o, i) => ({
          id: optId(i),
          text: o.text,
          image_url: null,
          correct: !!o.correct,
        }));
        // ensure one correct
        if (!opts.some((o) => o.correct)) opts[0].correct = true;
        newSteps.push({ prompt, options: opts });
        continue;
      }
      // Can't salvage meta mess
      return "kill";
    }

    // "QUAL FRUTA TEM MENOR QUANTIDADE?" with only numbers + soccer balls → fix to fruit bars
    if (/FRUTA.*MENOR|MENOR QUANTIDADE.*FRUTA|QUAL FRUTA TEM/i.test(upper)) {
      if (allNumeric(opts) || /bola|26bd/i.test(JSON.stringify(step.visuals || {}))) {
        return {
          statement: "QUAL FRUTA TEM MENOR QUANTIDADE?",
          steps: [
            {
              prompt: "QUAL FRUTA TEM MENOR QUANTIDADE? Veja o gráfico.",
              options: [
                { id: "a", text: "UVA", image_url: twemoji("1f347"), correct: true },
                { id: "b", text: "MAÇÃ", image_url: twemoji("1f34e"), correct: false },
                { id: "c", text: "BANANA", image_url: twemoji("1f34c"), correct: false },
              ],
              visuals: {
                type: "bars",
                bars: [
                  { label: "UVA", n: 2, icon: twemoji("1f347") },
                  { label: "MAÇÃ", n: 5, icon: twemoji("1f34e") },
                  { label: "BANANA", n: 8, icon: twemoji("1f34c") },
                ],
              },
            },
          ],
          needs_review: false,
          choice_type: "single",
        };
      }
    }

    // Noun choice but options are pure numbers (and not a count-answer style)
    if (
      statementAsksNounChoice(st) &&
      allNumeric(opts) &&
      !/QUANTOS|QUANTAS|N[UÚ]MERO/i.test(upper)
    ) {
      return "kill";
    }

    // QUAL FRASE without any sensible short answers
    if (/QUAL FRASE/i.test(upper)) {
      const tooLong = opts.filter((o) => o.text.length > 42).length;
      if (tooLong >= 1 && opts.every((o) => o.text.length > 25 || looksLikeMetaOption(o.text))) {
        return "kill";
      }
      // short phrase options OK if no meta
    }

    // Vague mission leftovers
    if (/^MISS[AÃ]O:|^COMPLETE O DESENHO/i.test(upper)) return "kill";

    // Cap options 6
    if (opts.length > 6) {
      const corrects = opts.filter((o) => o.correct);
      const wrongs = opts.filter((o) => !o.correct);
      opts = [...corrects, ...wrongs].slice(0, Math.max(3, corrects.length + 2));
    }

    opts = opts.map((o, i) => {
      const t = o.text;
      let image_url = null;
      if (/^[A-Za-zÀ-ÿ]$/.test(t)) image_url = null;
      else image_url = iconForOption(t);
      return { id: optId(i), text: t, image_url, correct: !!o.correct };
    });

    // Fix visuals: fruit never bola
    let visuals = step.visuals;
    if (visuals?.type === "count" && /FRUTA|MA[CÇ][AÃ]|BANANA|UVA/i.test(upper + (step.prompt || ""))) {
      const n = visuals.n || 2;
      const icon = twemoji("1f34e");
      visuals = {
        type: "count",
        n,
        fullN: n,
        noun: "maçã",
        urls: Array.from({ length: Math.min(n, 12) }, () => icon),
      };
    }
    if (visuals?.type === "count" && /DEDO|M[AÃ]O/i.test(upper + (step.prompt || ""))) {
      const n = visuals.n || 5;
      const icon = twemoji("1f446");
      visuals = {
        type: "count",
        n,
        fullN: n,
        noun: "dedo",
        urls: Array.from({ length: Math.min(n, 12) }, () => icon),
      };
    }
    // Pure math "quanto é" should not show bolas
    if (
      visuals?.noun === "bola" &&
      /QUANTO [EÉ]|MAIS|MENOS|DOBRO/i.test(upper) &&
      !/QUANTOS|QUANTAS|CONTE /i.test(upper)
    ) {
      visuals = undefined;
    }

    const prompt = cleanText(step.prompt || st);
    newSteps.push(visuals ? { prompt, options: opts, visuals } : { prompt, options: opts });
  }

  if (!newSteps.length) return "kill";
  // multi-step with identical vague prompts and messy — if first step ok keep all cleaned
  return {
    statement: st,
    steps: newSteps,
    needs_review: false,
    choice_type:
      newSteps.some((s) => (s.options || []).filter((o) => o.correct).length > 1)
        ? "multiple"
        : "single",
    audio_url: audioUrlFromStatement(st) || activity.audio_url,
  };
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const report = { scanned: 0, fixed: 0, killed: 0, kept: 0, byKill: {} };

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            const keep = [];
            for (const a of lv.activities || []) {
              report.scanned++;
              const src = String(a.layout_source || a.source_path || "");

              // Aggressive: drop ALL raw planilha:DEV poorly structured if fails eval
              const result = evaluate(a);

              if (result === "kill") {
                report.killed++;
                // track planilha kills
                const k = src.startsWith("planilha")
                  ? "planilha"
                  : src.startsWith("bncc")
                    ? "bncc"
                    : src.includes("scriptable")
                      ? "so"
                      : "other";
                report.byKill[k] = (report.byKill[k] || 0) + 1;
                continue;
              }

              if (result === "ok") {
                keep.push(a);
                report.kept++;
                continue;
              }

              // replacement object
              keep.push({
                ...a,
                ...result,
                notes: [...(a.notes || []), "strict-quality"],
              });
              report.fixed++;
            }
            lv.activities = keep;
          }
        }
      }
    }
  }

  // Second pass: kill remaining planilha activities that still look weak
  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            lv.activities = (lv.activities || []).filter((a) => {
              const src = String(a.layout_source || "");
              if (!src.startsWith("planilha") && !src.startsWith("bncc")) return true;
              const st = (a.statement || "").toUpperCase();
              const opts = (a.steps || []).flatMap((s) => s.options || []);
              // planilha fruit with numbers already fixed; kill empty context frase
              if (/QUAL FRASE USAMOS PARA/i.test(st)) {
                const ok = opts.every((o) => String(o.text).length <= 40 && !looksLikeMetaOption(o.text));
                if (!ok) {
                  report.killed++;
                  report.byKill.planilha2 = (report.byKill.planilha2 || 0) + 1;
                  return false;
                }
                // require statement to include the question asked
                if (!/A PERGUNTA FOI|PERGUNTA:/i.test(st) && !/A PERGUNTA FOI/i.test(JSON.stringify(a.steps))) {
                  // salvage if steps have good prompt
                  const pr = a.steps?.[0]?.prompt || "";
                  if (!/A PERGUNTA FOI/i.test(pr)) {
                    report.killed++;
                    report.byKill.planilha_frase = (report.byKill.planilha_frase || 0) + 1;
                    return false;
                  }
                }
              }
              return true;
            });
          }
        }
      }
    }
  }

  let total = 0;
  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) total += (lv.activities || []).length;
        }
      }
    }
  }

  catalog.strict_quality_at = new Date().toISOString();
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  console.log({ ...report, total });

  // verify the two reported bugs
  for (const id of [
    "xc_di_tea_05_lp_p3_n1_9_QUAL_FRASE_USAMOS_PARA_RESPONDER",
    "xc_di_tea_05_ma_p1_n1_5_QUAL_FRUTA_TEM_MENOR_QUANTIDADE",
  ]) {
    let found = null;
    for (const p of catalog.personas || []) {
      for (const y of p.years || []) {
        for (const m of y.matters || []) {
          for (const pill of m.pills || []) {
            for (const lv of pill.levels || []) {
              const a = (lv.activities || []).find((x) => x.id === id);
              if (a) found = a;
            }
          }
        }
      }
    }
    console.log(id, found ? "STILL THERE: " + found.statement : "REMOVED_OR_FIXED");
    if (found) console.log(JSON.stringify(found.steps?.[0], null, 2).slice(0, 500));
  }
}

main();
