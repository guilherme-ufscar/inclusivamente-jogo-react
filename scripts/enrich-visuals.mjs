/**
 * Ensure count / spatial questions always have sensible visuals.
 * - "QUANTOS TÊM?" → show N objects based on correct answer
 * - "à esquerda da cadeira" → show scene left-to-right with icons
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  iconForOption,
  statementVisuals,
  twemoji,
  moneyCoinDataUri,
} from "./option-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isLetter(t) {
  return /^[A-Za-zÀ-ÿ]$/.test(String(t || "").trim());
}

function correctOption(step) {
  return (step.options || []).find((o) => o.correct);
}

function parseCount(text) {
  const t = String(text || "").trim();
  // "8", "3m", "3 GRUPOS", "28"
  const m = t.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function nounFromContext(statement, prompt) {
  const s = `${statement} ${prompt}`;
  // Body / fingers first (avoid defaulting to "bola")
  if (/DEDOS?|M[ÃA]OS?/i.test(s)) return "dedo";
  if (/P[EÉ]S?|PEZINHO/i.test(s) && /QUANT/i.test(s)) return "pe";
  if (/OLHOS?/i.test(s) && /QUANT/i.test(s)) return "olho";
  // Fruit questions → never soccer ball
  if (/FRUTA|MA[CÇ][AÃ]|BANANA|UVA|PERA|MORANGO|LARANJA/i.test(s)) return "maçã";
  // If already has bars visual for fruits, caller should keep it
  const m = s.match(
    /(brinquedo|bichinho|ursinho|bandeirinha|figuri(?:nha)?|bola|maçã|maca|carro|gato|bala|livro|flor|estrela|moeda|pera|objeto|lápis|lapis|banana|cadeira|aluno|menina|menino|prato|grupo|unidade|dezena|dedo|mão|mao|peixe|maçã)s?/i
  );
  if (m) return m[1];
  if (/BRINQUEDO|BICHINHO|URSINHO/i.test(s)) return "brinquedo";
  if (/BANDEIRINHA/i.test(s)) return "estrela";
  if (/FIGURINHA/i.test(s)) return "estrela";
  if (/MOEDA/i.test(s)) return "moeda";
  if (/VOTO/i.test(s)) return "estrela";
  if (/CADEIRA/i.test(s)) return "cadeira";
  if (/ALUNO/i.test(s)) return "menino";
  if (/BALA/i.test(s)) return "bala";
  // Math "quanto é X mais Y" → no object row of bolas
  if (/QUANTO [EÉ]|MAIS|MENOS|DOBRO|SOMA|SUBTRA/i.test(s) && !/QUANTOS|QUANTAS|CONTE /i.test(s)) {
    return null;
  }
  return "bola";
}

function isCountQuestion(text) {
  const s = String(text || "").toUpperCase();
  // NEVER treat literacy (sílabas / palavras / letras) as object counting (was drawing balls)
  if (/S[IÍ]LABA|SYLLABLE|SEPAR(E|A) A PALAVRA|FORME AS PALAVRAS/.test(s)) {
    return false;
  }
  if (/QUANTAS PALAVRAS|QUANTAS LETRAS|QUANTOS SONS|HOW MANY WORDS|CU[AÁ]NTAS PALABRAS/.test(s)) {
    return false;
  }
  if (/QUAL LETRA|QUAL PALAVRA|COMPLETE A PALAVRA|ESCRITA/.test(s) && !/QUANTOS |QUANTAS [A-Z]* (MAÇ|BOLA|FRUT|OBJETO|DEDO)/.test(s)) {
    if (/QUANTAS S[IÍ]LABAS|QUANTOS SONS|QUANTAS LETRAS/.test(s)) return false;
  }
  return (
    /QUANTOS|QUANTAS|CONTE |VAMOS CONTAR|QUANTIDADE|TÊM AQUI|TEM AQUI|RESTARAM|AO TODO|CADA UM|CADA GRUPO|HÁ NA|HA NA|SOBRAM|SOBRA\?|TEM AGORA|RECEBEU|RECEBE\?/.test(
      s
    ) || /TINHA \d+.+(GANHOU|DEU|PERDEU|GASTOU)/.test(s)
  );
}

/** Icon URL for a label (word) */
function iconForLabel(label) {
  const clean = String(label || "")
    .replace(/À ESQUERDA|À DIREITA|A ESQUERDA|A DIREITA|ENTRE|NA FRENTE|ATRÁS|EM CIMA|EMBAIXO/gi, "")
    .trim();
  // Prefer first meaningful word
  const word = clean.split(/\s+/)[0] || clean;
  return iconForOption(word) || iconForOption(clean) || twemoji("2b50");
}

/**
 * Build left-to-right spatial scene from statement + options.
 */
function buildSpatialVisual(question, options) {
  const q = String(question || "").toUpperCase();
  const opts = options || [];
  const correct = opts.find((o) => o.correct);
  const correctLabel = String(correct?.text || "OBJETO").trim();

  // Reference furniture/person in the question
  let anchor = null;
  let m = q.match(
    /(?:ESQUERDA|DIREITA|CIMA|BAIXO|FRENTE|ATR[AÁ]S)\s+D[AOE]\s+([A-ZÀ-Ú]{3,})/
  );
  if (m) anchor = m[1];
  m = q.match(/ENTRE\s+A?\s*([A-ZÀ-Ú]+)\s+E\s+A?\s*([A-ZÀ-Ú]+)/);
  const between = m ? [m[1], m[2]] : null;

  // Other option nouns (not positional phrases only)
  const others = opts
    .map((o) => String(o.text || "").trim())
    .filter((t) => t && t !== correctLabel)
    .map((t) =>
      t
        .replace(/À ESQUERDA|À DIREITA|A ESQUERDA|A DIREITA|ENTRE|NA FRENTE|ATRÁS|EM CIMA|EMBAIXO/gi, "")
        .trim() || t
    )
    .filter(Boolean);

  let items = []; // left → right
  let caption = "Observe a posição dos objetos:";

  if (/À ESQUERDA|A ESQUERDA/.test(q) && anchor) {
    // [correct] [anchor] [other]
    items = [
      { label: correctLabel.replace(/À ESQUERDA.*$/i, "").trim() || correctLabel, role: "answer" },
      { label: anchor, role: "anchor" },
      { label: others[0] || "MESA", role: "other" },
    ];
    caption = `${items[0].label} está à ESQUERDA de ${anchor}`;
  } else if (/À DIREITA|A DIREITA/.test(q) && anchor) {
    items = [
      { label: others[0] || "MESA", role: "other" },
      { label: anchor, role: "anchor" },
      { label: correctLabel.replace(/À DIREITA.*$/i, "").trim() || correctLabel, role: "answer" },
    ];
    caption = `${items[2].label} está à DIREITA de ${anchor}`;
  } else if (between) {
    items = [
      { label: between[0], role: "anchor" },
      { label: correctLabel.replace(/ENTRE.*$/i, "").trim() || "BOLA", role: "answer" },
      { label: between[1], role: "anchor" },
    ];
    caption = `${items[1].label} está ENTRE ${between[0]} e ${between[1]}`;
  } else if (/EM CIMA/.test(q)) {
    items = [
      { label: correctLabel.replace(/EM CIMA.*$/i, "").trim() || "LIVRO", role: "answer" },
      { label: anchor || "MESA", role: "anchor" },
    ];
    caption = `${items[0].label} em CIMA de ${items[1].label}`;
    return {
      type: "spatial_stack",
      caption,
      items: items.map((it) => ({
        ...it,
        icon: iconForLabel(it.label),
      })),
    };
  } else if (/EMBAIXO/.test(q)) {
    items = [
      { label: anchor || "MESA", role: "anchor" },
      { label: correctLabel.replace(/EMBAIXO.*$/i, "").trim() || "BOLA", role: "answer" },
    ];
    caption = `${items[1].label} embaixo de ${items[0].label}`;
    return {
      type: "spatial_stack",
      caption,
      items: items.map((it) => ({
        ...it,
        icon: iconForLabel(it.label),
      })),
    };
  } else {
    // generic: show options as scene candidates with correct in middle
    items = [
      { label: others[0] || "A", role: "other" },
      { label: correctLabel, role: "answer" },
      { label: others[1] || others[0] || "B", role: "other" },
    ];
    caption = "Observe os objetos na cena:";
  }

  // Clean labels like "BOLA À DIREITA" → still show BOLA if possible
  items = items.map((it) => {
    let lab = it.label;
    const core = lab.match(
      /^(BOLA|MESA|CADEIRA|LIVRO|MENINO|MENINA|GATO|CACHORRO|CASA|CARRO)/i
    );
    if (core) lab = core[1].toUpperCase();
    return {
      label: lab,
      role: it.role,
      icon: iconForLabel(lab),
    };
  });

  return { type: "spatial_row", caption, items };
}

function buildCountFromCorrect(n, noun) {
  if (!noun) return null;
  const fullN = Math.max(1, n);
  const count = Math.min(fullN, 12);
  let icon = iconForOption(noun);
  if (!icon && /dedo/i.test(noun)) icon = twemoji("1f446");
  if (!icon && /m[aã]o/i.test(noun)) icon = twemoji("270b");
  const urls = Array.from({ length: count }, () => icon || twemoji("1f9f8"));
  return {
    type: "count",
    n: count,
    fullN,
    noun,
    urls,
  };
}

function buildStoryFromStatement(statement, correctN) {
  const s = String(statement || "");
  // TINHA X ... GANHOU/DEU/PERDEU/GASTOU Y
  let m = s.match(
    /TINHA\s+(\d+)\s+(\w+).{0,40}(?:GANHOU(?:\s+MAIS)?|RECEBEU)\s+(\d+)/i
  );
  if (m) {
    return {
      type: "story_math",
      start: +m[1],
      change: +m[3],
      op: "plus",
      noun: m[2],
      code: null,
      icon: iconForOption(m[2]),
      result: correctN,
    };
  }
  m = s.match(
    /TINHA\s+(\d+)\s+(\w+).{0,40}(?:DEU|PERDEU|GASTOU)\s+(\d+)/i
  );
  if (m) {
    return {
      type: "story_math",
      start: +m[1],
      change: +m[3],
      op: "minus",
      noun: m[2],
      icon: iconForOption(m[2]),
      result: correctN,
    };
  }
  // TEM X. GANHOU Y
  m = s.match(/TEM\s+(\d+)\s+(\w+)\.\s*GANHOU\s+(?:MAIS\s+)?(\d+)/i);
  if (m) {
    return {
      type: "story_math",
      start: +m[1],
      change: +m[3],
      op: "plus",
      noun: m[2],
      icon: iconForOption(m[2]),
      result: correctN,
    };
  }
  // N fileiras com M cada
  m = s.match(/(\d+)\s+(?:FILEIRAS|FILAS|SALAS|GRUPOS|PRATOS).{0,20}(\d+)\s+(\w+)/i);
  if (m) {
    const groups = +m[1];
    const each = +m[2];
    const noun = m[3];
    const icon = iconForOption(noun);
    return {
      type: "groups",
      groups: Math.min(groups, 8),
      each: Math.min(each, 8),
      noun,
      icon,
      fullGroups: groups,
      fullEach: each,
      result: correctN,
    };
  }
  return null;
}

function repairBrokenOptions(activity, step) {
  const opts = step.options || [];
  if (!opts.length) return;

  // true_false_0 / true_false_1 → Verdadeiro / Falso
  if (opts.every((o) => /^true_false_/i.test(String(o.text || "")))) {
    step.options = opts.map((o, i) => {
      const isTrue = /_1$/i.test(o.text) || o.correct;
      // keep correct flag from data
      return {
        ...o,
        text: o.correct ? "VERDADEIRO" : "FALSO",
        // if both wrong mapping, use index: often _1 is true in Unity
        // preserve o.correct
        image_url: o.correct
          ? twemoji("2705")
          : twemoji("274c"),
      };
    });
    // ensure labels match correct: find correct one
    step.options = opts.map((o) => ({
      ...o,
      text: o.correct ? "VERDADEIRO" : "FALSO",
      image_url: o.correct ? twemoji("2705") : twemoji("274c"),
    }));
  }

  // item_0 / img_ref → marine or generic animals by index
  if (opts.every((o) => /^(item|img_ref)/i.test(String(o.text || "").replace(/\s/g, "")))) {
    const marine = [
      { t: "PEIXE", e: "1f41f" },
      { t: "TUBARÃO", e: "1f988" },
      { t: "GOLFINHO", e: "1f42c" },
    ];
    const isMarine = /MARINH|OCEANO|MERGULHO|PEIXE/i.test(
      activity.statement + " " + (step.prompt || "")
    );
    step.options = opts.map((o, i) => {
      const pick = marine[i % marine.length];
      return {
        ...o,
        text: isMarine ? pick.t : `OPÇÃO ${i + 1}`,
        image_url: isMarine ? twemoji(pick.e) : iconForOption("bola"),
      };
    });
    // show count scene of fish
    step.visuals = {
      type: "bars",
      bars: [
        { label: "PEIXE", n: 8, icon: twemoji("1f41f") },
        { label: "TUBARÃO", n: 3, icon: twemoji("1f988") },
        { label: "GOLFINHO", n: 5, icon: twemoji("1f42c") },
      ],
    };
  }
}

function enrichStep(activity, step) {
  repairBrokenOptions(activity, step);

  const question = step.prompt || activity.statement || "";
  const q = question.toUpperCase();
  const stmt = activity.statement || "";
  const correct = correctOption(step);
  const correctText = correct?.text || "";
  const combinedQ = `${question} ${stmt}`;

  // 1) Story / groups first (richer than bare math expression)
  const nCorrect = parseCount(correctText);
  let vis = buildStoryFromStatement(stmt, nCorrect);

  // 2) Generic statementVisuals (count rows, simple math)
  if (!vis) {
    vis = statementVisuals(question) || statementVisuals(stmt);
  }

  // 2b) Division word problems: (10 ÷ 2) → groups
  if (
    (!vis || vis.type === "math") &&
    /CADA UM|CADA GRUPO|÷|DIVID/i.test(combinedQ)
  ) {
    const div = combinedQ.match(/(\d+)\s*[÷\/]\s*(\d+)/);
    if (div) {
      const total = +div[1];
      const parts = +div[2];
      const each = nCorrect || Math.floor(total / parts);
      vis = {
        type: "groups",
        groups: Math.min(parts, 8),
        each: Math.min(each, 8),
        fullGroups: parts,
        fullEach: each,
        noun: "item",
        icon: twemoji("2b50"),
        result: nCorrect,
      };
    }
  }

  // 3a) Fruit quantity questions → bars of fruit, never soccer balls
  if (/FRUTA|MA[CÇ][AÃ]|BANANA|UVA/i.test(combinedQ) && /MENOR|MAIOR|QUANTIDADE|GR[AÁ]FICO/i.test(combinedQ)) {
    const fruitOpts = (step.options || []).filter((o) =>
      /UVA|MA[CÇ]|BANANA|PERA|MORANGO|LARANJA|ABACAXI|MELANCIA/i.test(String(o.text || ""))
    );
    if (fruitOpts.length >= 2) {
      const heights = [2, 5, 8, 4, 6];
      const bars = fruitOpts.slice(0, 4).map((o, i) => {
        const lab = String(o.text).toUpperCase();
        const icon =
          iconForOption(lab) ||
          (/UVA/i.test(lab)
            ? twemoji("1f347")
            : /BANANA/i.test(lab)
              ? twemoji("1f34c")
              : twemoji("1f34e"));
        // smaller bar for correct if "menor"
        let n = heights[i % heights.length];
        if (/MENOR/i.test(combinedQ) && o.correct) n = 2;
        if (/MAIOR/i.test(combinedQ) && o.correct) n = 10;
        if (/MENOR/i.test(combinedQ) && !o.correct) n = 5 + i * 2;
        if (/MAIOR/i.test(combinedQ) && !o.correct) n = 2 + i;
        return { label: lab, n, icon };
      });
      vis = { type: "bars", bars };
    }
  }

  // 3) Any count-like question with numeric correct answer → show objects
  // Skip when fruit bar chart already set or question is "which fruit"
  else if (
    nCorrect != null &&
    nCorrect > 0 &&
    nCorrect <= 100 &&
    isCountQuestion(combinedQ) &&
    !/QUAL FRUTA/i.test(combinedQ)
  ) {
    // Prefer story/groups if we built one; else plain count
    if (!vis || vis.type === "math" || (vis.type === "count" && !vis.urls?.length)) {
      const noun = nounFromContext(stmt, question);
      const built = buildCountFromCorrect(nCorrect, noun);
      if (built) vis = built;
    }

    // Vague prompts — only rewrite if we know the noun
    if (
      /^QUANTOS T[EÊ]M\?$/i.test(String(question).trim()) ||
      /^QUANTAS T[EÊ]M\?$/i.test(String(question).trim()) ||
      /VAMOS CONTAR/i.test(stmt) ||
      /QUANTIDADE DE/i.test(stmt) ||
      /CONTE E TOQUE/i.test(combinedQ)
    ) {
      const noun = nounFromContext(stmt, question);
      if (noun) {
        const base = noun.toUpperCase().replace(/S$/, "");
        let plural = base + "S";
        if (base === "BRINQUEDO" || base === "BICHINHO" || base === "URSINHO")
          plural = base + "S";
        if (base === "DEDO") plural = "DEDOS";
        if (base === "MAO" || base === "MÃO") plural = "MÃOS";
        if (base.endsWith("L")) plural = base.slice(0, -1) + "IS";
        const fem = /a$|bola|maca|mesa|casa|flor|bala|figuri|cadeira|banana|estrela|moeda/i.test(
          noun
        );
        step.prompt = fem
          ? `QUANTAS ${plural} TÊM AQUI? Conte e toque no número.`
          : `QUANTOS ${plural} TÊM AQUI? Conte e toque no número.`;
      }
    }
  }

  // 4) Spatial — always scene (override count only if spatial keywords dominate)
  const isSpatial =
    /ESQUERDA|DIREITA|ENTRE A |ENTRE O |EM CIMA|EMBAIXO|AO LADO|NA FRENTE|ATR[AÁ]S D/.test(
      combinedQ.toUpperCase()
    );
  if (isSpatial) {
    vis = buildSpatialVisual(question || stmt, step.options);
  }

  // 5) Graph / list quantities: MAÇÃ=10, PERA=8, UVA=5
  {
    const list = [...combinedQ.matchAll(/([A-ZÀ-Úa-zà-úçãõáéíóúâêô]+)\s*=\s*(\d+)/gi)];
    if (list.length >= 2) {
      vis = {
        type: "bars",
        bars: list.slice(0, 5).map((m) => ({
          label: m[1].toUpperCase(),
          n: +m[2],
          icon: iconForLabel(m[1]),
        })),
      };
    }
  }

  // 5b) Fruits compare without numbers in options — invent demo bars
  if (
    !vis &&
    /MAIOR QUANTIDADE|MENOR QUANTIDADE/i.test(combinedQ) &&
    (step.options || []).some((o) =>
      /MA[CÇ]Ã|PERA|UVA|BANANA|MELANCIA|MORANGO/i.test(o.text || "")
    )
  ) {
    const fruits = (step.options || []).map((o) => String(o.text).trim());
    // assign demo quantities: correct gets highest or second based on question
    const isSecond = /SEGUNDA MAIOR/i.test(combinedQ);
    const isMenor = /MENOR/i.test(combinedQ);
    const base = [10, 8, 5, 3, 2];
    let amounts = fruits.map((_, i) => base[i] || 4);
    if (isMenor) {
      // correct should be smallest
      amounts = fruits.map((t, i) =>
        (step.options || [])[i]?.correct ? 3 : 8 + i * 2
      );
    } else if (isSecond) {
      amounts = fruits.map((t, i) =>
        (step.options || [])[i]?.correct ? 8 : t.match(/MA[CÇ]Ã/i) ? 10 : 5
      );
    } else {
      // maior: correct highest
      amounts = fruits.map((t, i) =>
        (step.options || [])[i]?.correct ? 12 : 5 + i * 2
      );
    }
    vis = {
      type: "bars",
      bars: fruits.map((label, i) => ({
        label,
        n: amounts[i],
        icon: iconForLabel(label),
      })),
    };
  }

  // 5c) Flowers V/F compare
  if (!vis && /FLORES|LIL[AÁ]S|AMARELAS|VERMELHAS/i.test(combinedQ)) {
    vis = {
      type: "bars",
      bars: [
        { label: "VERMELHAS", n: 4, icon: twemoji("1f339") },
        { label: "LILÁS", n: 6, icon: twemoji("1f33c") },
        { label: "AMARELAS", n: 9, icon: twemoji("1f33b") },
      ],
    };
  }

  // 5d) Word numbers: CINCO, TRÊS, DUAS
  if (!vis && /QUANTAS REGI|QUANTOS|QUANTAS/i.test(combinedQ)) {
    const words = {
      UMA: 1,
      UM: 1,
      DUAS: 2,
      DOIS: 2,
      TRES: 3,
      TRÊS: 3,
      QUATRO: 4,
      CINCO: 5,
      SEIS: 6,
      SETE: 7,
      OITO: 8,
      NOVE: 9,
      DEZ: 10,
    };
    const ct = String(correctText || "").toUpperCase().normalize("NFD").replace(/\p{M}/gu, "");
    for (const [w, n] of Object.entries(words)) {
      const wn = w.normalize("NFD").replace(/\p{M}/gu, "");
      if (ct.includes(wn) || ct === wn) {
        vis = buildCountFromCorrect(n, nounFromContext(stmt, question));
        break;
      }
    }
  }

  // 6) Money coins
  if (/QUANTAS MOEDAS|MOEDA DE \d|REAIS/i.test(combinedQ) && nCorrect) {
    if (/QUANTAS MOEDAS/i.test(combinedQ) || /MOEDA/i.test(combinedQ)) {
      vis = {
        type: "count",
        n: Math.min(nCorrect, 12),
        fullN: nCorrect,
        noun: "moeda",
        urls: Array.from({ length: Math.min(nCorrect, 12) }, () =>
          moneyCoinDataUri("R$1")
        ),
      };
    }
  }

  // 7) Options are item_0 / item_1 — still try count from statement numbers
  if (
    !vis &&
    (step.options || []).some((o) => /^item[_-]?\d+$/i.test(String(o.text || "")))
  ) {
    const nums = (stmt + " " + question).match(/\b(\d{1,2})\b/g);
    if (nums?.length) {
      const n = parseInt(nums[nums.length - 1], 10);
      vis = buildCountFromCorrect(n, nounFromContext(stmt, question));
    }
  }

  // 8) Arithmetic option steps (8+2=10) — show expression visual from correct
  if (
    !vis &&
    /[\+\-×x÷=]/.test(correctText) &&
    /\d/.test(correctText)
  ) {
    vis = { type: "math", expression: correctText };
  }

  if (vis) {
    // attach icon urls for story_math if using icon field
    if (vis.type === "story_math" && vis.icon && !vis.urls) {
      const show = Math.min(vis.start || 0, 10);
      const change = Math.min(vis.change || 0, 10);
      vis.startUrls = Array.from({ length: show }, () => vis.icon);
      vis.changeUrls = Array.from({ length: change }, () => vis.icon);
    }
    step.visuals = vis;
    return true;
  }
  return false;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  let enriched = 0;
  let spatial = 0;
  let count = 0;

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              // re-apply option icons (money data-uri etc.)
              for (const st of a.steps || []) {
                for (const o of st.options || []) {
                  if (isLetter(o.text)) {
                    o.image_url = null;
                  } else {
                    o.image_url = iconForOption(o.text);
                  }
                }
                if (enrichStep(a, st)) {
                  enriched++;
                  if (st.visuals?.type?.startsWith("spatial")) spatial++;
                  if (st.visuals?.type === "count") count++;
                }
              }
              // activity-level: first step visuals as statement_visuals
              if (a.steps?.[0]?.visuals) {
                a.statement_visuals = a.steps[0].visuals;
              } else {
                const v = statementVisuals(a.statement);
                if (v) a.statement_visuals = v;
              }
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  console.log({ enriched, spatial, count });

  // samples
  for (const id of [
    "di_tea_01_ma_pill_7_nvl_2_4",
    "di_tea_01_ma_pill_7_nvl_2_3",
    "di_tea_01_ma_pill_7_nvl_1_2",
  ]) {
    for (const p of catalog.personas) {
      for (const y of p.years || []) {
        for (const m of y.matters || []) {
          for (const pill of m.pills || []) {
            for (const lv of pill.levels || []) {
              const a = (lv.activities || []).find((x) => x.id === id);
              if (a) {
                console.log(
                  "\n",
                  id,
                  "\n stmt",
                  a.statement,
                  "\n s0",
                  a.steps[0].prompt,
                  a.steps[0].visuals?.type,
                  a.steps[0].visuals?.caption || a.steps[0].visuals?.n,
                  a.steps[0].options?.map((o) => o.text)
                );
              }
            }
          }
        }
      }
    }
  }
}

main();
