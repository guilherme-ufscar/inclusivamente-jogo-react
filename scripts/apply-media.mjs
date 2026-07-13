/**
 * Apply backgrounds + ALWAYS assign option icons + statement visuals for math/count.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { statementVisuals } from "./option-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");
const BG_MAP = path.join(ROOT, "content", "import", "bg-url-map.json");
const THEME_PACK = path.join(ROOT, "content", "import", "theme-bgs.json");

function pickTheme(statement = "", matter = "", pillName = "") {
  const raw = `${statement} ${pillName}`;
  const s = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const mat = String(matter || "").toLowerCase();
  const isMath = mat === "ma" || mat === "mt";
  const isPort = mat === "lp" || mat === "pt";

  const has = (...patterns) =>
    patterns.some((p) => {
      const re =
        typeof p === "string"
          ? new RegExp(`(?:^|[^\\p{L}\\p{N}])${p}(?:[^\\p{L}\\p{N}]|$)`, "iu")
          : p;
      return re.test(s);
    });

  if (
    has("PLANETA", "SISTEMA SOLAR", "ASTRONAUTA", "GALAXIA", "LUA") ||
    (has("ESTRELA") && has("SOLAR", "CEU", "NOITE", "PLANETA"))
  )
    return "espaco";
  if (has("PRAIA", "OCEANO", "AREIA", "ONDA", "CONCHA", "PEIXE") || /\bMAR\b/.test(s))
    return "praia";
  if (
    has(
      "CORPO",
      "CABECA",
      "BRACO",
      "MAO",
      "OLHO",
      "ORELHA",
      "DENTE",
      "SAUDE",
      "MEDICO",
      "HIGIENE",
      "ESCOVAR"
    )
  )
    return "corpo";
  if (
    has(
      "ANIMAL",
      "ANIMAIS",
      "CACHORRO",
      "GATO",
      "PASSARO",
      "VACA",
      "CAVALO",
      "GALINHA",
      "LEAO",
      "TIGRE",
      "FAZENDA",
      "ZOOLOGICO"
    )
  )
    return "animais";
  if (
    has(
      "FRUTA",
      "FRUTAS",
      "COMIDA",
      "ALMOCO",
      "FEIRA",
      "COZINHA",
      "BOLO",
      "SORVETE",
      "COMER",
      "MACA"
    )
  )
    return "feira";
  if (has("NATUREZA", "FLORESTA", "ARVORE", "FLOR", "RECICLA", "MEIO AMBIENTE"))
    return "natureza";
  if (has("CIDADE", "BAIRRO", "COMUNIDADE", "RUA", "ESPACO PUBLICO", "HOSPITAL"))
    return "cidade";
  if (has("PARQUE", "ESPORTE", "FUTEBOL", "BRINCAR") && !has("PROBLEMA", "SOMA"))
    return "parque";
  if (has("MUSICA", "CANTO", "CANTAR", "INSTRUMENTO")) return "musica";
  if (
    isPort ||
    has("LETRA", "PALAVRA", "FRASE", "TEXTO", "SILABA", "LEITURA", "ESCREVER")
  ) {
    if (has("LER", "LEITURA", "TEXTO", "HISTORIA", "LIVRO")) return "biblioteca";
    if (isPort) return "sala_aula";
  }
  if (
    isMath ||
    has("NUMERO", "SOMA", "SUBTR", "MULTIPLIC", "DIVIS", "FRACAO", "QUANTOS", "CONTE", "RESULTADO")
  ) {
    if (has("MAIS COMPLETA", "MAIS ADEQUADA")) return "sala_aula";
    return "numeros";
  }
  if (isMath) return "numeros";
  if (isPort) return "sala_aula";
  return "sala_aula";
}

function resolveBg(id, map) {
  if (!id) return null;
  if (String(id).startsWith("http")) return id;
  const variants = [
    id,
    id.replace(/_/g, "-"),
    id.replace(/-/g, "_"),
    id.replace(/pill_(\d+)/g, "pill-$1").replace(/nvl_(\d+)/g, "nvl-$1"),
    id.replace(/pill-(\d+)/g, "pill_$1").replace(/nvl-(\d+)/g, "nvl_$1"),
  ];
  for (const v of variants) {
    if (map[v]) return map[v];
  }
  return null;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  let bgMap = {};
  if (fs.existsSync(BG_MAP)) {
    bgMap = JSON.parse(fs.readFileSync(BG_MAP, "utf8").replace(/^\uFEFF/, ""));
  }
  let themes = {};
  if (fs.existsSync(THEME_PACK)) {
    const pack = JSON.parse(fs.readFileSync(THEME_PACK, "utf8").replace(/^\uFEFF/, ""));
    themes = pack.themes || {};
  }

  let exactBg = 0;
  let themeBg = 0;
  let optIcons = 0;
  let stmtVisuals = 0;
  let letterTiles = 0;

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              // Background
              let url = resolveBg(a.background_id, bgMap);
              if (url) {
                exactBg++;
                a.background_theme = "exact_original";
              } else {
                const theme = pickTheme(a.statement, m.code, pill.name);
                url = themes[theme] || themes.sala_aula || null;
                a.background_theme = theme;
                if (url) themeBg++;
              }
              if (url) a.background_url = url;

              // Statement visuals (count / math)
              const vis = statementVisuals(a.statement);
              if (vis) {
                a.statement_visuals = vis;
                stmtVisuals++;
              } else {
                delete a.statement_visuals;
              }

              // Options: no icons — player shows A, B, C, D only
              for (const st of a.steps || []) {
                if (Array.isArray(st.img_ref)) st.img_ref_urls = [];
                for (const o of st.options || []) {
                  o.image_url = null;
                  letterTiles++;
                }
              }
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  const report = {
    exactBg,
    themeBg,
    optIcons,
    letterTiles,
    stmtVisuals,
    themeCount: Object.keys(themes).length,
  };
  fs.writeFileSync(
    path.join(ROOT, "content", "import", "media-apply-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("Applied media:", report);
}

main();
