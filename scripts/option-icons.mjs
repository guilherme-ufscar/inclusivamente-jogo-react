/**
 * Resolve a visual for every option text: emoji (twemoji) or public SVG (Iconify).
 * Exact word match first — avoid wrong icons (mesa≠cadeira, tatu≠formas).
 */

export function twemoji(code) {
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code}.png`;
}

export function iconify(collection, name) {
  return `https://api.iconify.design/${collection}/${name}.svg?color=%236d28d9&height=64`;
}

export function realCoinIcon() {
  return moneyCoinDataUri("R$");
}

/**
 * Distinct coin SVG (data URI) so 1 REAL ≠ 2 REAIS ≠ 5 REAIS and always loads.
 */
export function moneyCoinDataUri(label, color = "#E8B923") {
  const text = String(label || "R$")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .slice(0, 8);
  // font-size scales with label length
  const fs = text.length <= 2 ? 13 : text.length <= 4 ? 10 : 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#C49212"/>
    </linearGradient>
  </defs>
  <circle cx="48" cy="48" r="44" fill="url(#g)" stroke="#8B6914" stroke-width="4"/>
  <circle cx="48" cy="48" r="36" fill="none" stroke="#FFF3C4" stroke-width="2" opacity="0.7"/>
  <text x="48" y="53" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fs}" font-weight="800" fill="#5C3B00">${text}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Parse "1 REAL", "5 REAIS", "50 CENTAVOS", "R$ 10" → coin visual */
export function moneyIconForText(text) {
  const raw = String(text || "").trim();
  const n = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  // 50 centavos, 25 centavos
  let m = n.match(/(\d+)\s*centavos?/);
  if (m) {
    return moneyCoinDataUri(`${m[1]}c`, "#C0C0C0");
  }
  // 1 real, 2 reais, 5 reais
  m = n.match(/(\d+)\s*reais?/);
  if (m) {
    const colors = {
      1: "#E8B923",
      2: "#5B9BD5",
      5: "#70AD47",
      10: "#ED7D31",
      20: "#9B59B6",
      50: "#E74C3C",
      100: "#2ECC71",
    };
    const v = parseInt(m[1], 10);
    return moneyCoinDataUri(`R$${v}`, colors[v] || "#E8B923");
  }
  // r$ 10
  m = n.match(/r\$\s*(\d+)/);
  if (m) {
    return moneyCoinDataUri(`R$${m[1]}`, "#E8B923");
  }
  if (/centavo/.test(n)) return moneyCoinDataUri("¢", "#C0C0C0");
  if (/real|dinheiro|moeda/.test(n)) return moneyCoinDataUri("R$", "#E8B923");
  return moneyCoinDataUri("R$", "#E8B923");
}

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Exact dictionary: word → { type: 'emoji'|'iconify', value: code or 'set/name' }
 */
const DICT = {
  // —— animals ——
  gato: { t: "e", v: "1f431" },
  cachorro: { t: "e", v: "1f436" },
  cao: { t: "e", v: "1f436" },
  peixe: { t: "e", v: "1f41f" },
  passaro: { t: "e", v: "1f426" },
  vaca: { t: "e", v: "1f404" },
  porco: { t: "e", v: "1f437" },
  cavalo: { t: "e", v: "1f434" },
  galinha: { t: "e", v: "1f414" },
  leao: { t: "e", v: "1f981" },
  tigre: { t: "e", v: "1f405" },
  urso: { t: "e", v: "1f43b" },
  coelho: { t: "e", v: "1f430" },
  rato: { t: "e", v: "1f42d" },
  sapo: { t: "e", v: "1f438" },
  cobra: { t: "e", v: "1f40d" },
  abelha: { t: "e", v: "1f41d" },
  borboleta: { t: "e", v: "1f98b" },
  elefante: { t: "e", v: "1f418" },
  macaco: { t: "e", v: "1f435" },
  onca: { t: "e", v: "1f406" },
  jacare: { t: "e", v: "1f40a" },
  lobo: { t: "e", v: "1f43a" },
  foca: { t: "e", v: "1f9ad" },
  aguia: { t: "e", v: "1f985" },
  zebra: { t: "e", v: "1f993" },
  girafa: { t: "e", v: "1f992" },
  // tatu (armadillo) — no solid twemoji; use animal icon
  tatu: { t: "i", v: "mdi:armadillo" },
  // if armadillo missing on some iconify builds, mdi has paw:
  // keep armadillo; fallback handled in resolve

  // —— food ——
  maca: { t: "e", v: "1f34e" },
  banana: { t: "e", v: "1f34c" },
  uva: { t: "e", v: "1f347" },
  laranja: { t: "e", v: "1f34a" },
  morango: { t: "e", v: "1f353" },
  abacaxi: { t: "e", v: "1f34d" },
  pera: { t: "e", v: "1f350" },
  pao: { t: "e", v: "1f35e" },
  leite: { t: "e", v: "1f95b" },
  queijo: { t: "e", v: "1f9c0" },
  bolo: { t: "e", v: "1f382" },
  sorvete: { t: "e", v: "1f366" },
  ovo: { t: "e", v: "1f95a" },
  fruta: { t: "e", v: "1f353" },
  frutas: { t: "e", v: "1f353" },
  comida: { t: "e", v: "1f37d" },
  alface: { t: "e", v: "1f96c" },
  tomate: { t: "e", v: "1f345" },
  cenoura: { t: "e", v: "1f955" },

  // —— furniture / house (careful!) ——
  // mesa was wrongly 1f4ba (seat/chair-like) → table SVG
  mesa: { t: "i", v: "mdi:table-furniture" },
  cadeira: { t: "e", v: "1fa91" },
  cama: { t: "e", v: "1f6cf" },
  sofa: { t: "i", v: "mdi:sofa" },
  sofá: { t: "i", v: "mdi:sofa" },
  armario: { t: "i", v: "mdi:wardrobe" },
  porta: { t: "e", v: "1f6aa" },
  janela: { t: "i", v: "mdi:window-closed-variant" },
  casa: { t: "e", v: "1f3e0" },

  // —— school ——
  bola: { t: "e", v: "26bd" },
  bolas: { t: "e", v: "26bd" },
  livro: { t: "e", v: "1f4d6" },
  livros: { t: "e", v: "1f4d6" },
  caderno: { t: "i", v: "mdi:notebook" },
  lapis: { t: "e", v: "270f" },
  caneta: { t: "e", v: "1f58a" },
  borracha: { t: "i", v: "mdi:eraser" },
  mochila: { t: "e", v: "1f392" },
  escola: { t: "e", v: "1f3eb" },
  quadro: { t: "i", v: "mdi:chalkboard" },
  lousa: { t: "i", v: "mdi:chalkboard" },

  // —— transport ——
  carro: { t: "e", v: "1f697" },
  onibus: { t: "e", v: "1f68c" },
  barco: { t: "e", v: "26f5" },
  aviao: { t: "e", v: "2708" },
  trem: { t: "e", v: "1f682" },
  bicicleta: { t: "e", v: "1f6b2" },

  // —— tech / objects ——
  relogio: { t: "e", v: "1f550" },
  telefone: { t: "e", v: "1f4f1" },
  computador: { t: "e", v: "1f4bb" },
  sapato: { t: "e", v: "1f45f" },
  chapeu: { t: "e", v: "1f3a9" },
  camisa: { t: "e", v: "1f455" },
  brinquedo: { t: "e", v: "1f9f8" },
  pedra: { t: "i", v: "mdi:rock" }, // or stone
  // mdi:rock may not exist — use mountain/stone
  // will use mdi:image-filter-hdr as stone-like or game-icons stone

  // —— nature ——
  sol: { t: "e", v: "2600" },
  lua: { t: "e", v: "1f319" },
  estrela: { t: "e", v: "2b50" },
  flor: { t: "e", v: "1f33c" },
  flores: { t: "e", v: "1f33c" },
  arvore: { t: "e", v: "1f333" },
  agua: { t: "e", v: "1f4a7" },
  fogo: { t: "e", v: "1f525" },
  terra: { t: "e", v: "1f30d" },
  chuva: { t: "e", v: "1f327" },
  nuvem: { t: "e", v: "2601" },
  marte: { t: "e", v: "1fa90" },

  // —— body ——
  mao: { t: "e", v: "270b" },
  maos: { t: "e", v: "270b" },
  dedo: { t: "e", v: "1f446" },
  dedos: { t: "e", v: "1f446" },
  pe: { t: "e", v: "1f9b6" },
  pes: { t: "e", v: "1f9b6" },
  pe: { t: "e", v: "1f9b6" },
  olho: { t: "e", v: "1f441" },
  olhos: { t: "e", v: "1f440" },
  boca: { t: "e", v: "1f444" },
  nariz: { t: "e", v: "1f443" },
  orelha: { t: "e", v: "1f442" },
  ouvido: { t: "e", v: "1f442" },
  cabeca: { t: "i", v: "mdi:head" },
  dente: { t: "e", v: "1f9b7" },
  dentes: { t: "e", v: "1f9b7" },
  coracao: { t: "e", v: "2764" },
  braco: { t: "e", v: "1f4aa" },
  estomago: { t: "i", v: "mdi:stomach" },
  pulmao: { t: "i", v: "mdi:lungs" },
  pulmoes: { t: "i", v: "mdi:lungs" },
  cranio: { t: "e", v: "1f480" },
  osso: { t: "e", v: "1f9b4" },

  // —— people / emotions / actions ——
  menino: { t: "e", v: "1f466" },
  menina: { t: "e", v: "1f467" },
  crianca: { t: "e", v: "1f9d2" },
  professor: { t: "i", v: "mdi:human-male-board" },
  amiga: { t: "e", v: "1f469" },
  amigo: { t: "e", v: "1f466" },
  feliz: { t: "e", v: "1f60a" },
  triste: { t: "e", v: "1f622" },
  bravo: { t: "e", v: "1f620" },
  medo: { t: "e", v: "1f628" },
  dormir: { t: "e", v: "1f634" },
  acordar: { t: "e", v: "1f304" },
  comer: { t: "e", v: "1f37d" },
  beber: { t: "e", v: "1f964" },
  brincar: { t: "e", v: "1f3ae" },
  correr: { t: "e", v: "1f3c3" },
  pular: { t: "i", v: "mdi:jump-rope" },
  gritar: { t: "e", v: "1f4e2" },
  empurrar: { t: "i", v: "mdi:human-handsdown" },
  estudar: { t: "e", v: "1f4d6" },
  ler: { t: "e", v: "1f4d6" },
  escrever: { t: "e", v: "270d" },
  brigar: { t: "e", v: "1f624" },
  desistir: { t: "e", v: "1f614" },
  jantar: { t: "e", v: "1f37d" },

  // —— places ——
  parque: { t: "e", v: "1f3a1" },
  praia: { t: "e", v: "1f3d6" },
  fazenda: { t: "e", v: "1f33e" },
  cidade: { t: "e", v: "1f3d9" },
  bairro: { t: "e", v: "1f3e1" },
  hospital: { t: "e", v: "1f3e5" },
  mercado: { t: "e", v: "1f3ea" },
  cozinha: { t: "e", v: "1f373" },
  banheiro: { t: "e", v: "1f6bd" },
  cinema: { t: "e", v: "1f3a5" },
  futebol: { t: "e", v: "26bd" },

  // —— colors ——
  azul: { t: "e", v: "1f535" },
  vermelho: { t: "e", v: "1f534" },
  verde: { t: "e", v: "1f7e2" },
  amarelo: { t: "e", v: "1f7e1" },
  preto: { t: "e", v: "26ab" },
  branco: { t: "e", v: "26aa" },
  rosa: { t: "e", v: "1f338" },
  roxo: { t: "e", v: "1f7e3" },
  laranja_cor: { t: "e", v: "1f7e0" },

  // —— shapes ——
  circulo: { t: "e", v: "2b55" },
  quadrado: { t: "e", v: "1f7e6" },
  triangulo: { t: "e", v: "1f53a" },
  retangulo: { t: "i", v: "mdi:rectangle" },

  // —— money ——
  real: { t: "i", v: "mdi:currency-brl" },
  reais: { t: "i", v: "mdi:currency-brl" },
  dinheiro: { t: "e", v: "1f4b0" },
  moeda: { t: "e", v: "1fa99" },
  moedas: { t: "e", v: "1fa99" },
  centavo: { t: "e", v: "1fa99" },
  barato: { t: "i", v: "mdi:cash-minus" },
  caro: { t: "i", v: "mdi:cash-plus" },

  // —— size / compare ——
  grande: { t: "i", v: "mdi:arrow-expand-all" },
  pequeno: { t: "i", v: "mdi:arrow-collapse-all" },
  menor: { t: "i", v: "mdi:less-than" },
  maior: { t: "i", v: "mdi:greater-than" },

  // —— directions / regions BR ——
  norte: { t: "i", v: "mdi:compass" },
  sul: { t: "i", v: "mdi:compass" },
  leste: { t: "i", v: "mdi:compass" },
  oeste: { t: "i", v: "mdi:compass" },
  nordeste: { t: "i", v: "mdi:map-marker-radius" },
  sudeste: { t: "i", v: "mdi:map-marker-radius" },
  "centro-oeste": { t: "i", v: "mdi:map" },
  "centro oeste": { t: "i", v: "mdi:map" },

  // —— weekdays ——
  segunda: { t: "i", v: "mdi:calendar" },
  terca: { t: "i", v: "mdi:calendar" },
  quarta: { t: "i", v: "mdi:calendar" },
  quinta: { t: "i", v: "mdi:calendar" },
  sexta: { t: "i", v: "mdi:calendar" },
  sabado: { t: "i", v: "mdi:calendar-weekend" },
  domingo: { t: "i", v: "mdi:calendar-weekend" },

  // —— connectives (grammar) ——
  mas: { t: "i", v: "mdi:swap-horizontal" },
  porem: { t: "i", v: "mdi:swap-horizontal" },
  entao: { t: "i", v: "mdi:arrow-right-bold" },
  porque: { t: "i", v: "mdi:help-circle" },
  "por isso": { t: "i", v: "mdi:lightbulb-on" },
  e: { t: "i", v: "mdi:plus" },
  ou: { t: "i", v: "mdi:slash-forward" },

  // —— yes/no ——
  sim: { t: "e", v: "2705" },
  nao: { t: "e", v: "274c" },
  certo: { t: "e", v: "2705" },
  errado: { t: "e", v: "274c" },
  "nao sei": { t: "e", v: "1f937" },

  // —— time of day ——
  dia: { t: "e", v: "2600" },
  noite: { t: "e", v: "1f319" },
  manha: { t: "e", v: "1f305" },
  tarde: { t: "e", v: "1f307" },
  depois: { t: "i", v: "mdi:skip-next" },
  antes: { t: "i", v: "mdi:skip-previous" },

  // —— names ——
  ana: { t: "e", v: "1f467" },
  joao: { t: "e", v: "1f466" },
  maria: { t: "e", v: "1f467" },
  pedro: { t: "e", v: "1f466" },
  carla: { t: "e", v: "1f467" },
  beca: { t: "e", v: "1f467" },

  // —— hygiene ——
  "lavar as maos": { t: "e", v: "1f9fc" },
  "nao comer": { t: "e", v: "1f37d" },
  "nao beber": { t: "e", v: "1f964" },
  "nao escovar": { t: "e", v: "1f9b7" },

  // —— abstract school ——
  letra: { t: "e", v: "1f524" },
  letras: { t: "e", v: "1f524" },
  numero: { t: "e", v: "1f522" },
  palavra: { t: "i", v: "mdi:format-letter-case" },
  frase: { t: "i", v: "mdi:format-text" },
  texto: { t: "i", v: "mdi:text-box" },
  historia: { t: "i", v: "mdi:book-open-page-variant" },
  silaba: { t: "i", v: "mdi:alphabetical" },
};

// Aliases with accents already stripped by norm()
// Fix pedra icon — mdi:rock might not exist
DICT.pedra = { t: "i", v: "mdi:image-filter-hdr" }; // stone/mountain
DICT.tatu = { t: "i", v: "mdi:paw" }; // better than shape; or game-icons:armadillo

// Prefer more specific icons where mdi has better names
DICT.mesa = { t: "i", v: "mdi:table-furniture" };
DICT.cadeira = { t: "i", v: "mdi:chair-rolling" }; // or keep emoji chair
// Actually keep cadeira as emoji 1fa91 which is correct chair
DICT.cadeira = { t: "e", v: "1fa91" };

const KEYCAPS = {
  0: "30-20e3",
  1: "31-20e3",
  2: "32-20e3",
  3: "33-20e3",
  4: "34-20e3",
  5: "35-20e3",
  6: "36-20e3",
  7: "37-20e3",
  8: "38-20e3",
  9: "39-20e3",
  10: "1f51f",
};

function resolveEntry(entry) {
  if (!entry) return null;
  if (entry.t === "e") return twemoji(entry.v);
  if (entry.t === "i") {
    const [set, name] = entry.v.includes(":")
      ? entry.v.split(":")
      : ["mdi", entry.v];
    return iconify(set, name);
  }
  return null;
}

function lookupWord(word) {
  const n = norm(word);
  if (DICT[n]) return resolveEntry(DICT[n]);
  // singularize crude: bolas→bola, maçãs already stripped accents
  if (n.endsWith("s") && n.length > 3) {
    const sing = n.slice(0, -1);
    if (DICT[sing]) return resolveEntry(DICT[sing]);
  }
  if (n.endsWith("es") && n.length > 4) {
    const sing = n.slice(0, -2);
    if (DICT[sing]) return resolveEntry(DICT[sing]);
  }
  return null;
}

/**
 * High-confidence icon only. Prefer null over a wrong/random icon.
 * null → UI draws letter tile (1 char) or monogram (text).
 */
export function iconForOption(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  // Pure number 0–20 → keycap / numeric
  if (/^\d{1,2}$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (KEYCAPS[n] != null) return twemoji(KEYCAPS[n]);
    return monogramDataUri(String(n));
  }

  // Single letter / digit → letter tile in UI (no image)
  if (/^[A-Za-zÀ-ÿ0-9]$/.test(raw)) {
    return null;
  }

  // Money
  if (/\b(real|reais|r\$|centavo)/i.test(raw) || /^r\$/i.test(raw)) {
    return moneyIconForText(raw);
  }

  // Math expression e.g. 7-2, 3+4
  if (/^[\d\s+\-x×÷=./]+$/.test(raw) && /\d/.test(raw) && /[+\-x×÷=]/.test(raw)) {
    return monogramDataUri("=");
  }

  // Fraction
  if (/^\d+\s*\/\s*\d+$/.test(raw)) {
    return monogramDataUri(raw.replace(/\s/g, ""));
  }

  // Ordinals
  if (/^\d+[º°o]$/i.test(raw)) {
    return monogramDataUri(raw.replace(/[º°o]/i, "º"));
  }

  // Exact dictionary match only (full option text or singular)
  const full = lookupWord(raw);
  if (full) return full;

  // "1 REAL", "3 BOLAS" — number + known noun
  let m = norm(raw).match(/^(\d+)\s+(.+)$/);
  if (m) {
    const hit = lookupWord(m[2]);
    if (hit) return hit;
    if (/reais?|centavos?/.test(m[2])) return moneyIconForText(raw);
  }

  // Very safe phrase keywords (whole-word, educational)
  const SAFE = [
    [/\bfeliz\b/i, "1f60a"],
    [/\btriste\b/i, "1f622"],
    [/\bescola\b/i, "1f3eb"],
    [/\bparque\b/i, "1f3de"],
    [/\bsol\b/i, "2600"],
    [/\blua\b/i, "1f319"],
    [/\bestrela\b/i, "2b50"],
    [/\brecicla|\bnatureza\b/i, "1f333"],
    [/\blixo\b/i, "1f5d1"],
    [/\bmao\b|\bm[aã]os\b/i, "270b"],
    [/\bdedo/i, "1f446"],
    [/\bsim\b|^sim[,!.]?$/i, "2705"],
    [/\bn[aã]o\b|^n[aã]o[,!.]?$/i, "274c"],
  ];
  for (const [re, code] of SAFE) {
    if (re.test(raw) || re.test(norm(raw))) return twemoji(code);
  }

  // NO partial multi-word dictionary scan (was causing "random" icons)
  // Unknown phrase → monogram (consistent, not wrong emoji)
  return monogramDataUri(raw);
}

/** Stable purple badge with 1–2 letters — same family for all unknown options */
export function monogramDataUri(text) {
  const label = String(text || "?")
    .trim()
    .slice(0, 2)
    .toUpperCase()
    .replace(/&/g, "")
    .replace(/</g, "")
    .replace(/>/g, "");
  const fs = label.length <= 1 ? 36 : 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#D946EF"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="88" height="88" rx="22" fill="url(#g)"/>
  <text x="48" y="62" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fs}" font-weight="800" fill="#ffffff">${label || "?"}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Standardize icons for a whole option set (same step).
 * Avoids mixing random styles within one question.
 */
export function iconsForOptionSet(options) {
  const list = Array.isArray(options) ? options : [];
  const texts = list.map((o) => String(o?.text ?? o ?? "").trim());

  const allLetters =
    texts.length >= 2 &&
    texts.every((t) => t.length === 1 && /^[A-Za-zÀ-ÿ0-9]$/.test(t));
  if (allLetters) {
    return texts.map(() => null); // UI letter tiles
  }

  const allNums =
    texts.length >= 2 && texts.every((t) => /^\d{1,3}$/.test(t));
  if (allNums) {
    return texts.map((t) => iconForOption(t));
  }

  const allMoney =
    texts.length >= 2 &&
    texts.every((t) => /\b(real|reais|r\$|centavo)/i.test(t) || /^r\$/i.test(t));
  if (allMoney) {
    return texts.map((t) => moneyIconForText(t));
  }

  // Per-option icons, then force set consistency
  const icons = texts.map((t) => iconForOption(t));
  const monogramCount = icons.filter(
    (u) => u && String(u).startsWith("data:image/svg+xml")
  ).length;

  // Any monogram in the set → ALL monograms (no mix of ✅ + purple badge)
  if (texts.length >= 2 && monogramCount >= 1 && monogramCount < texts.length) {
    return texts.map((t) => monogramDataUri(t));
  }

  return icons;
}

// Keep EMOJI_MAP export name for any old imports
export const EMOJI_MAP = Object.fromEntries(
  Object.entries(DICT)
    .filter(([, v]) => v.t === "e")
    .map(([k, v]) => [k, v.v])
);

/**
 * Build visual row for counting / arithmetic statements.
 */
export function statementVisuals(statement) {
  if (!statement) return null;
  const s = String(statement);
  const su = s.toUpperCase();

  let m = s.match(/imagem\s+com\s+(\d+)\s+(\w+)/i);
  if (m) return buildCountVisual(+m[1], m[2]);

  m = s.match(
    /\b(\d{1,2})\s+(bolas?|maçãs?|macas?|lápis|lapis|carros?|gatos?|cachorros?|livros?|flores?|estrelas?|objetos?|balas?|frutas?|peixes?|moedas?|peras?)/i
  );
  if (m) return buildCountVisual(+m[1], m[2]);

  m = s.match(/\((\d+)\s+(\w+)\s*\+\s*(\d+)\s+(\w+)/i);
  if (m) {
    return {
      type: "add",
      parts: [
        { n: +m[1], noun: m[2], code: nounCode(m[2]) },
        { n: +m[3], noun: m[4], code: nounCode(m[4]) },
      ],
    };
  }

  m = s.match(/retire\s+(\d+)\s+(\w+)/i);
  if (m) return buildCountVisual(+m[1], m[2], "minus");

  if (/\d+\s*[\+\-x×÷]\s*(\d+|__|_____)/i.test(s) || /COMPLETE:\s*\d+/i.test(s)) {
    return {
      type: "math",
      expression: s.match(/(\d+\s*[\+\-x×÷]\s*(?:\d+|__+))/i)?.[1] || null,
    };
  }

  if (/CONTE|QUANTOS|QUANTAS|N[UÚ]MERO/.test(su) && /\d/.test(s)) {
    const nums = s.match(/\b(\d{1,2})\b/g);
    if (nums && nums.length === 1) {
      return buildCountVisual(+nums[0], "estrela");
    }
  }

  m = s.match(/tem\s+(\d{1,2})\s+(\w+)/i);
  if (m) return buildCountVisual(+m[1], m[2]);

  m = s.match(/(ganhou\s+mais|perdeu|deu)\s+(\d{1,2})/i);
  if (m && /tem\s+(\d+)/i.test(s)) {
    const a = s.match(/tem\s+(\d+)/i);
    const b = m[2];
    const noun = (s.match(/tem\s+\d+\s+(\w+)/i) || [])[1] || "bola";
    return {
      type: "story_math",
      start: +a[1],
      change: +b,
      op: /perdeu|deu/i.test(m[1]) ? "minus" : "plus",
      noun,
      code: nounCode(noun),
    };
  }

  return null;
}

function nounCode(noun) {
  const n = norm(noun);
  if (DICT[n]?.t === "e") return DICT[n].v;
  const sing = n.endsWith("s") ? n.slice(0, -1) : n;
  if (DICT[sing]?.t === "e") return DICT[sing].v;
  const map = {
    bola: "26bd",
    bolas: "26bd",
    maca: "1f34e",
    macas: "1f34e",
    carro: "1f697",
    carros: "1f697",
    gato: "1f431",
    bala: "1f36c",
    balas: "1f36c",
    lapis: "270f",
    livro: "1f4d6",
    flor: "1f33c",
    flores: "1f33c",
    estrela: "2b50",
    estrelas: "2b50",
    peixe: "1f41f",
    moeda: "1fa99",
    pera: "1f350",
    peras: "1f350",
  };
  return map[n] || map[sing] || "2b50";
}

function buildCountVisual(n, noun, mode = "count") {
  const count = Math.min(Math.max(0, n), 12);
  const code = nounCode(noun);
  return {
    type: mode === "minus" ? "minus_count" : "count",
    n: count,
    fullN: n,
    noun,
    code,
    urls: Array.from({ length: count }, () => twemoji(code)),
  };
}

// legacy export
export function iconForText(text) {
  return iconForOption(text);
}
