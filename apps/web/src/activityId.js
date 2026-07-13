/**
 * Map our catalog activity → painel activity_id format:
 *   {ano}_{disciplina}_{pilula}_{nivel}_{atividade}
 * Parser no painel (zB): split("_") → year, matter, pill, level, rest...
 */

function slugPart(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "atividade";
}

function yearCode(code) {
  const m = String(code || "").match(/(\d+)/);
  if (m) return String(Number(m[1])); // "01" → "1" (painel aceita)
  return slugPart(code).slice(0, 12) || "1";
}

function matterCode(code) {
  const c = String(code || "lp").toLowerCase();
  if (c === "pt") return "lp";
  if (c === "mt") return "ma";
  return c || "lp";
}

/**
 * @param {object} act - activity from our API (with breadcrumb)
 */
export function toPainelActivityId(act) {
  const b = act?.breadcrumb || {};
  const ano = yearCode(b.yearCode || b.year || "1");
  const disc = matterCode(b.matterCode || b.matter || "lp");
  const pilula = Number(b.pillIndex ?? b.pill ?? 1) || 1;
  const nivel = Number(b.levelIndex ?? b.level ?? 1) || 1;

  let rest = act?.family_id || act?.familyId || act?.id || "atividade";
  rest = String(rest)
    .replace(/__(pt|en|es)$/i, "")
    .replace(/^(so_|xc_|visual_|tea_share_|padrao_share_|di_severa_share_)/i, "")
    .replace(/^(padrao|tea|di_tea|di_severa|visual|tea_di|infantil_di)_/i, "");

  // Prefer last meaningful segment of path-like ids
  const parts = rest.split(/[/_-]+/).filter(Boolean);
  const tail = parts.slice(-3).join("_") || rest;
  const atividade = slugPart(tail);

  return `${ano}_${disc}_${pilula}_${nivel}_${atividade}`;
}

export function difficultyFromStats(correct, errors) {
  const total = correct + errors;
  if (total <= 0) return "medium";
  const ratio = errors / total;
  if (ratio < 0.25) return "easy";
  if (ratio > 0.6) return "hard";
  return "medium";
}

export function autonomyFromStats(hasTutor, correct, errors) {
  if (hasTutor) return "medium";
  const total = correct + errors;
  if (total <= 0) return "medium";
  const ratio = errors / total;
  if (ratio < 0.25) return "high";
  if (ratio > 0.6) return "low";
  return "medium";
}
