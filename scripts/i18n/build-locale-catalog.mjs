/**
 * Build EN/ES sibling activities for every PT activity (culturally adapted).
 * Run: node scripts/i18n/build-locale-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");

const NAMES = {
  en: {
    JOÃO: "John",
    JOAO: "John",
    MARIA: "Mary",
    ANA: "Anna",
    PEDRO: "Peter",
    CARLA: "Carla",
    BECA: "Becky",
    LUCAS: "Lucas",
    SOFIA: "Sophia",
    GABRIEL: "Gabriel",
    BRUNA: "Bruna",
    PAULO: "Paul",
    TICO: "Tim",
    TOBI: "Toby",
    POLO: "Paul",
    DUDU: "Danny",
    BETE: "Betty",
    JOCA: "Joe",
  },
  es: {
    JOÃO: "Juan",
    JOAO: "Juan",
    MARIA: "María",
    ANA: "Ana",
    PEDRO: "Pedro",
    CARLA: "Carla",
    BECA: "Beca",
    LUCAS: "Lucas",
    SOFIA: "Sofía",
    GABRIEL: "Gabriel",
    BRUNA: "Bruna",
    PAULO: "Pablo",
    TICO: "Tico",
    TOBI: "Tobi",
    POLO: "Polo",
    DUDU: "Dudu",
    BETE: "Bety",
    JOCA: "Joca",
  },
};

const WORD_MAP = {
  en: {
    // common UI / pedagogy
    QUAL: "WHICH",
    QUANTO: "HOW MUCH",
    QUANTOS: "HOW MANY",
    QUANTAS: "HOW MANY",
    É: "IS",
    ESTA: "IS",
    ESTÁ: "IS",
    TEM: "HAS",
    TÊM: "HAVE",
    SÃO: "ARE",
    FOI: "WAS",
    LETRA: "LETTER",
    LETRAS: "LETTERS",
    PALAVRA: "WORD",
    PALAVRAS: "WORDS",
    SÍLABA: "SYLLABLE",
    SILABA: "SYLLABLE",
    SÍLABAS: "SYLLABLES",
    NÚMERO: "NUMBER",
    NUMERO: "NUMBER",
    NÚMEROS: "NUMBERS",
    MAIOR: "GREATER",
    MENOR: "SMALLER",
    MAIS: "PLUS",
    MENOS: "MINUS",
    VEZES: "TIMES",
    IGUAL: "EQUAL",
    DIFERENTE: "DIFFERENT",
    CORRETO: "CORRECT",
    CORRETA: "CORRECT",
    ERRADO: "WRONG",
    ERRADA: "WRONG",
    TOQUE: "TAP",
    NA: "ON",
    NO: "ON",
    DA: "OF",
    DO: "OF",
    DE: "OF",
    COM: "WITH",
    PARA: "FOR",
    UMA: "A",
    UM: "A",
    OS: "THE",
    AS: "THE",
    O: "THE",
    A: "THE",
    E: "AND",
    OU: "OR",
    SIM: "YES",
    NÃO: "NO",
    NAO: "NO",
    BOLA: "BALL",
    BOLAS: "BALLS",
    GATO: "CAT",
    CASA: "HOUSE",
    MESA: "TABLE",
    CADEIRA: "CHAIR",
    LIVRO: "BOOK",
    CACHORRO: "DOG",
    PATO: "DUCK",
    SOL: "SUN",
    LUA: "MOON",
    MAÇÃ: "APPLE",
    MACA: "APPLE",
    BANANA: "BANANA",
    UVA: "GRAPE",
    FRUTA: "FRUIT",
    FRUTAS: "FRUITS",
    DEDO: "FINGER",
    DEDOS: "FINGERS",
    MÃO: "HAND",
    MAO: "HAND",
    MÃOS: "HANDS",
    ESQUERDA: "LEFT",
    DIREITA: "RIGHT",
    CIMA: "UP",
    BAIXO: "DOWN",
    ENTRE: "BETWEEN",
    OBJETO: "OBJECT",
    OBJETOS: "OBJECTS",
    FIGURA: "PICTURE",
    IMAGEM: "IMAGE",
    TEXTO: "TEXT",
    FRASE: "SENTENCE",
    LEIA: "READ",
    CONTE: "COUNT",
    COMPLETE: "COMPLETE",
    ESCOLHA: "CHOOSE",
    RESPOSTA: "ANSWER",
    PERGUNTA: "QUESTION",
    SEQUÊNCIA: "SEQUENCE",
    SEQUENCIA: "SEQUENCE",
    ORDEM: "ORDER",
    CRESCENTE: "ASCENDING",
    REAL: "DOLLAR",
    REAIS: "DOLLARS",
    CENTAVO: "CENT",
    CENTAVOS: "CENTS",
    DINHEIRO: "MONEY",
    MOEDA: "COIN",
    MOEDAS: "COINS",
    ALUNO: "STUDENT",
    ESCOLA: "SCHOOL",
    PARQUE: "PARK",
    BRINQUEDO: "TOY",
    BRINQUEDOS: "TOYS",
    SOM: "SOUND",
    COMEÇA: "STARTS",
    COMECA: "STARTS",
    TERMINA: "ENDS",
    ÚLTIMA: "LAST",
    ULTIMA: "LAST",
    PRIMEIRA: "FIRST",
    AGORA: "NOW",
    AQUI: "HERE",
    FORMA: "FORMS",
    FORMAM: "FORM",
    COR: "COLOR",
    AZUL: "BLUE",
    VERDE: "GREEN",
    VERMELHO: "RED",
    AMARELO: "YELLOW",
    PRETO: "BLACK",
    BRANCO: "WHITE",
  },
  es: {
    QUAL: "CUÁL",
    QUANTO: "CUÁNTO",
    QUANTOS: "CUÁNTOS",
    QUANTAS: "CUÁNTAS",
    É: "ES",
    ESTA: "ESTÁ",
    ESTÁ: "ESTÁ",
    TEM: "TIENE",
    TÊM: "TIENEN",
    SÃO: "SON",
    FOI: "FUE",
    LETRA: "LETRA",
    LETRAS: "LETRAS",
    PALAVRA: "PALABRA",
    PALAVRAS: "PALABRAS",
    SÍLABA: "SÍLABA",
    SILABA: "SÍLABA",
    SÍLABAS: "SÍLABAS",
    NÚMERO: "NÚMERO",
    NUMERO: "NÚMERO",
    NÚMEROS: "NÚMEROS",
    MAIOR: "MAYOR",
    MENOR: "MENOR",
    MAIS: "MÁS",
    MENOS: "MENOS",
    VEZES: "VECES",
    IGUAL: "IGUAL",
    DIFERENTE: "DIFERENTE",
    CORRETO: "CORRECTO",
    CORRETA: "CORRECTA",
    ERRADO: "INCORRECTO",
    ERRADA: "INCORRECTA",
    TOQUE: "TOCA",
    NA: "EN",
    NO: "EN",
    DA: "DE",
    DO: "DE",
    DE: "DE",
    COM: "CON",
    PARA: "PARA",
    UMA: "UNA",
    UM: "UN",
    OS: "LOS",
    AS: "LAS",
    O: "EL",
    A: "LA",
    E: "Y",
    OU: "O",
    SIM: "SÍ",
    NÃO: "NO",
    NAO: "NO",
    BOLA: "PELOTA",
    BOLAS: "PELOTAS",
    GATO: "GATO",
    CASA: "CASA",
    MESA: "MESA",
    CADEIRA: "SILLA",
    LIVRO: "LIBRO",
    CACHORRO: "PERRO",
    PATO: "PATO",
    SOL: "SOL",
    LUA: "LUNA",
    MAÇÃ: "MANZANA",
    MACA: "MANZANA",
    BANANA: "PLÁTANO",
    UVA: "UVA",
    FRUTA: "FRUTA",
    FRUTAS: "FRUTAS",
    DEDO: "DEDO",
    DEDOS: "DEDOS",
    MÃO: "MANO",
    MAO: "MANO",
    MÃOS: "MANOS",
    ESQUERDA: "IZQUIERDA",
    DIREITA: "DERECHA",
    CIMA: "ARRIBA",
    BAIXO: "ABAJO",
    ENTRE: "ENTRE",
    OBJETO: "OBJETO",
    OBJETOS: "OBJETOS",
    FIGURA: "FIGURA",
    IMAGEM: "IMAGEN",
    TEXTO: "TEXTO",
    FRASE: "FRASE",
    LEIA: "LEE",
    CONTE: "CUENTA",
    COMPLETE: "COMPLETA",
    ESCOLHA: "ELIGE",
    RESPOSTA: "RESPUESTA",
    PERGUNTA: "PREGUNTA",
    SEQUÊNCIA: "SECUENCIA",
    SEQUENCIA: "SECUENCIA",
    ORDEM: "ORDEN",
    CRESCENTE: "ASCENDENTE",
    REAL: "PESO",
    REAIS: "PESOS",
    CENTAVO: "CENTAVO",
    CENTAVOS: "CENTAVOS",
    DINHEIRO: "DINERO",
    MOEDA: "MONEDA",
    MOEDAS: "MONEDAS",
    ALUNO: "ESTUDIANTE",
    ESCOLA: "ESCUELA",
    PARQUE: "PARQUE",
    BRINQUEDO: "JUGUETE",
    BRINQUEDOS: "JUGUETES",
    SOM: "SONIDO",
    COMEÇA: "EMPIEZA",
    COMECA: "EMPIEZA",
    TERMINA: "TERMINA",
    ÚLTIMA: "ÚLTIMA",
    ULTIMA: "ÚLTIMA",
    PRIMEIRA: "PRIMERA",
    AGORA: "AHORA",
    AQUI: "AQUÍ",
    FORMA: "FORMA",
    FORMAM: "FORMAN",
    COR: "COLOR",
    AZUL: "AZUL",
    VERDE: "VERDE",
    VERMELHO: "ROJO",
    AMARELO: "AMARILLO",
    PRETO: "NEGRO",
    BRANCO: "BLANCO",
  },
};

const PHRASE_MAP = {
  en: [
    [/QUAL LETRA FAZ O SOM\s+([A-ZÀ-Ü])\??/gi, "WHICH LETTER MAKES THE SOUND $1?"],
    [/QUAL LETRA COMEÇA A PALAVRA\s+([A-ZÀ-Ü]+)\??/gi, "WHICH LETTER STARTS THE WORD $1?"],
    [/QUAL PALAVRA COMEÇA COM A LETRA\s+([A-ZÀ-Ü])\??/gi, "WHICH WORD STARTS WITH THE LETTER $1?"],
    [/QUAL É A ÚLTIMA LETRA DE\s+([A-ZÀ-Ü]+)\??/gi, "WHAT IS THE LAST LETTER OF $1?"],
    [/TOQUE NA LETRA QUE ESTÁ NO COMEÇO DE\s+([A-ZÀ-Ü]+)/gi, "TAP THE LETTER AT THE START OF $1"],
    [/QUANTO É\s+(\d+)\s+MAIS\s+(\d+)\??/gi, "WHAT IS $1 PLUS $2?"],
    [/QUANTO É\s+(\d+)\s+MENOS\s+(\d+)\??/gi, "WHAT IS $1 MINUS $2?"],
    [/QUAL É O NÚMERO MAIOR\??/gi, "WHICH NUMBER IS GREATER?"],
    [/QUAL É O NÚMERO MENOR\??/gi, "WHICH NUMBER IS SMALLER?"],
    [/QUAL FRUTA TEM MENOR QUANTIDADE\??/gi, "WHICH FRUIT HAS THE SMALLEST AMOUNT?"],
    [/QUAL FRUTA TEM MAIOR QUANTIDADE\??/gi, "WHICH FRUIT HAS THE LARGEST AMOUNT?"],
    [/QUANTOS DEDOS TEMOS EM UMA MÃO\??/gi, "HOW MANY FINGERS DO WE HAVE ON ONE HAND?"],
    [/QUANTOS DEDOS TEMOS NAS DUAS MÃOS\??/gi, "HOW MANY FINGERS DO WE HAVE ON BOTH HANDS?"],
    [/QUAL OBJETO ESTÁ À ESQUERDA/gi, "WHICH OBJECT IS TO THE LEFT"],
    [/QUAL OBJETO ESTÁ À DIREITA/gi, "WHICH OBJECT IS TO THE RIGHT"],
    [/QUAL OBJETO ESTÁ EM CIMA/gi, "WHICH OBJECT IS ON TOP"],
    [/QUAL SEQUÊNCIA FORMA A PALAVRA/gi, "WHICH SEQUENCE FORMS THE WORD"],
    [/QUAL SEQUÊNCIA ESTÁ EM ORDEM CRESCENTE\??/gi, "WHICH SEQUENCE IS IN ASCENDING ORDER?"],
    [/A PERGUNTA FOI:\s*"([^"]+)"\s*QUAL RESPOSTA USAMOS\??/gi, 'THE QUESTION WAS: "$1" WHICH ANSWER DO WE USE?'],
    [/QUAL FRASE USAMOS PARA RESPONDER\??/gi, "WHICH SENTENCE DO WE USE TO ANSWER?"],
    [/CONTE E TOQUE NO NÚMERO/gi, "COUNT AND TAP THE NUMBER"],
    [/TOQUE NO NÚMERO/gi, "TAP THE NUMBER"],
    [/(\d+)\s*REAIS?/gi, "$$$1"],
    [/R\$\s*(\d+)/gi, "$$$1"],
    [/1 REAL/gi, "$1"],
  ],
  es: [
    [/QUAL LETRA FAZ O SOM\s+([A-ZÀ-Ü])\??/gi, "¿QUÉ LETRA HACE EL SONIDO $1?"],
    [/QUAL LETRA COMEÇA A PALAVRA\s+([A-ZÀ-Ü]+)\??/gi, "¿QUÉ LETRA EMPIEZA LA PALABRA $1?"],
    [/QUAL PALAVRA COMEÇA COM A LETRA\s+([A-ZÀ-Ü])\??/gi, "¿QUÉ PALABRA EMPIEZA CON LA LETRA $1?"],
    [/QUAL É A ÚLTIMA LETRA DE\s+([A-ZÀ-Ü]+)\??/gi, "¿CUÁL ES LA ÚLTIMA LETRA DE $1?"],
    [/TOQUE NA LETRA QUE ESTÁ NO COMEÇO DE\s+([A-ZÀ-Ü]+)/gi, "TOCA LA LETRA AL COMIENZO DE $1"],
    [/QUANTO É\s+(\d+)\s+MAIS\s+(\d+)\??/gi, "¿CUÁNTO ES $1 MÁS $2?"],
    [/QUANTO É\s+(\d+)\s+MENOS\s+(\d+)\??/gi, "¿CUÁNTO ES $1 MENOS $2?"],
    [/QUAL É O NÚMERO MAIOR\??/gi, "¿CUÁL ES EL NÚMERO MAYOR?"],
    [/QUAL É O NÚMERO MENOR\??/gi, "¿CUÁL ES EL NÚMERO MENOR?"],
    [/QUAL FRUTA TEM MENOR QUANTIDADE\??/gi, "¿QUÉ FRUTA TIENE MENOR CANTIDAD?"],
    [/QUAL FRUTA TEM MAIOR QUANTIDADE\??/gi, "¿QUÉ FRUTA TIENE MAYOR CANTIDAD?"],
    [/QUANTOS DEDOS TEMOS EM UMA MÃO\??/gi, "¿CUÁNTOS DEDOS TENEMOS EN UNA MANO?"],
    [/QUANTOS DEDOS TEMOS NAS DUAS MÃOS\??/gi, "¿CUÁNTOS DEDOS TENEMOS EN LAS DOS MANOS?"],
    [/QUAL OBJETO ESTÁ À ESQUERDA/gi, "¿QUÉ OBJETO ESTÁ A LA IZQUIERDA"],
    [/QUAL OBJETO ESTÁ À DIREITA/gi, "¿QUÉ OBJETO ESTÁ A LA DERECHA"],
    [/QUAL OBJETO ESTÁ EM CIMA/gi, "¿QUÉ OBJETO ESTÁ ARRIBA"],
    [/QUAL SEQUÊNCIA FORMA A PALAVRA/gi, "¿QUÉ SECUENCIA FORMA LA PALABRA"],
    [/QUAL SEQUÊNCIA ESTÁ EM ORDEM CRESCENTE\??/gi, "¿QUÉ SECUENCIA ESTÁ EN ORDEN ASCENDENTE?"],
    [/A PERGUNTA FOI:\s*"([^"]+)"\s*QUAL RESPOSTA USAMOS\??/gi, 'LA PREGUNTA FUE: "$1" ¿QUÉ RESPUESTA USAMOS?'],
    [/QUAL FRASE USAMOS PARA RESPONDER\??/gi, "¿QUÉ FRASE USAMOS PARA RESPONDER?"],
    [/CONTE E TOQUE NO NÚMERO/gi, "CUENTA Y TOCA EL NÚMERO"],
    [/TOQUE NO NÚMERO/gi, "TOCA EL NÚMERO"],
    [/(\d+)\s*REAIS?/gi, "$$$1"],
    [/R\$\s*(\d+)/gi, "$$$1"],
    [/1 REAL/gi, "$1"],
  ],
};

/** Literacy rewrites: PT-specific orthography → equivalent skill */
const LITERACY_REWRITES = {
  en: [
    {
      test: /ACENTO|TIL|CEDILHA|Ç|Ã|Õ|Á|É|Í|Ó|Ú/i,
      apply: (act) => ({
        statement: "WHICH WORD IS SPELLED CORRECTLY?",
        steps: [
          {
            prompt: "WHICH WORD IS SPELLED CORRECTLY?",
            options: [
              { id: "a", text: "CAT", correct: true },
              { id: "b", text: "KAT", correct: false },
              { id: "c", text: "CAAT", correct: false },
            ],
          },
        ],
        title: "Spelling",
        class: "L",
      }),
    },
    {
      test: /S[IÍ]LABA|SEPARA.*S[IÍ]LAB/i,
      apply: () => ({
        statement: "HOW MANY SYLLABLES ARE IN THE WORD HAPPY?",
        steps: [
          {
            prompt: "HOW MANY SYLLABLES ARE IN THE WORD HAPPY?",
            options: [
              { id: "a", text: "2", correct: true },
              { id: "b", text: "1", correct: false },
              { id: "c", text: "3", correct: false },
            ],
          },
        ],
        title: "Syllables",
        class: "L",
      }),
    },
  ],
  es: [
    {
      test: /ACENTO|TIL|CEDILHA|Ç|Ã|Õ/i,
      apply: () => ({
        statement: "¿QUÉ PALABRA LLEVA TILDE CORRECTA?",
        steps: [
          {
            prompt: "¿QUÉ PALABRA LLEVA TILDE CORRECTA?",
            options: [
              { id: "a", text: "MAMÁ", correct: true },
              { id: "b", text: "MAMA", correct: false },
              { id: "c", text: "MAMÁA", correct: false },
            ],
          },
        ],
        title: "Tildes",
        class: "L",
      }),
    },
    {
      test: /S[IÍ]LABA|SEPARA.*S[IÍ]LAB/i,
      apply: () => ({
        statement: "¿CUÁNTAS SÍLABAS TIENE LA PALABRA CASA?",
        steps: [
          {
            prompt: "¿CUÁNTAS SÍLABAS TIENE LA PALABRA CASA?",
            options: [
              { id: "a", text: "2", correct: true },
              { id: "b", text: "1", correct: false },
              { id: "c", text: "3", correct: false },
            ],
          },
        ],
        title: "Sílabas",
        class: "L",
      }),
    },
  ],
};

function classify(statement, matter) {
  const s = String(statement || "");
  if (/ACENTO|TIL|CEDILHA|\bÇ\b|Ã|Õ|ORTOGRAF|FONEM|S[IÍ]LABA/i.test(s)) return "L";
  if (/REAL|REAIS|CENTAVO|R\$|BNCC|JOÃO|MARIA|ANA |PEDRO|REAL/i.test(s)) return "C";
  if ((matter === "lp" || matter === "pt") && /LETRA|PALAVRA|TEXTO|FRASE|LEIA/i.test(s)) return "L";
  return "U";
}

function mapNames(text, lang) {
  let t = text;
  const map = NAMES[lang] || {};
  for (const [from, to] of Object.entries(map)) {
    t = t.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
  }
  return t;
}

function translateToken(word, lang) {
  const w = word.toUpperCase();
  const map = WORD_MAP[lang] || {};
  if (map[w]) return map[w];
  // keep numbers and short tokens
  if (/^[\d.,+\-x×÷=/?!]+$/.test(word)) return word;
  if (word.length <= 1) return word;
  return word; // leave unknown (better partial PT than wrong word) — cleaned later
}

function translateText(text, lang) {
  if (!text) return text;
  let t = String(text);
  t = mapNames(t, lang);

  // phrase-level first
  for (const [re, rep] of PHRASE_MAP[lang] || []) {
    t = t.replace(re, rep);
  }

  // currency
  if (lang === "en") {
    t = t.replace(/\b(\d+)\s*REAIS?\b/gi, "$$$1");
    t = t.replace(/\b1\s*REAL\b/gi, "$1");
    t = t.replace(/R\$\s*/g, "$");
  }
  if (lang === "es") {
    t = t.replace(/\b(\d+)\s*REAIS?\b/gi, "$$$1");
    t = t.replace(/\b1\s*REAL\b/gi, "$1");
    t = t.replace(/R\$\s*/g, "$");
  }

  // word-by-word for remaining ALLCAPS educational style
  t = t
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      // keep already localized mixed case phrases
      if (/[a-z]/.test(part) && /[A-Z]/.test(part) === false) return part;
      const punct = part.match(/^([^A-Za-zÀ-ÿ0-9]*)(.*?)([^A-Za-zÀ-ÿ0-9]*)$/);
      if (!punct) return translateToken(part, lang);
      const [, pre, core, post] = punct;
      if (!core) return part;
      return pre + translateToken(core, lang) + post;
    })
    .join("");

  return t;
}

function localizeVisuals(vis, lang) {
  if (!vis || typeof vis !== "object") return vis;
  const v = JSON.parse(JSON.stringify(vis));
  if (v.noun) v.noun = translateText(String(v.noun), lang).toLowerCase();
  if (v.caption) v.caption = translateText(v.caption, lang);
  if (Array.isArray(v.items)) {
    v.items = v.items.map((it) => ({
      ...it,
      label: it.label ? translateText(String(it.label), lang) : it.label,
    }));
  }
  if (Array.isArray(v.bars)) {
    v.bars = v.bars.map((b) => ({
      ...b,
      label: b.label ? translateText(String(b.label), lang) : b.label,
    }));
  }
  return v;
}

function localizeSteps(steps, lang) {
  return (steps || []).map((st) => ({
    ...st,
    prompt: st.prompt ? translateText(st.prompt, lang) : st.prompt,
    options: (st.options || []).map((o) => ({
      ...o,
      text: translateText(o.text, lang),
      image_url: null,
    })),
    visuals: st.visuals ? localizeVisuals(st.visuals, lang) : st.visuals,
  }));
}

function applyLiteracyRewrite(act, lang, matter) {
  const s = `${act.statement} ${JSON.stringify(act.steps || [])}`;
  for (const rule of LITERACY_REWRITES[lang] || []) {
    if (rule.test.test(s)) {
      const r = rule.apply(act);
      return {
        ...act,
        statement: r.statement,
        steps: r.steps,
        title: r.title || act.title,
        needs_review: false,
        layout_source: `i18n-${lang}-literacy`,
      };
    }
  }
  return null;
}

function localizeActivity(act, lang, matterCode) {
  const familyId = act.family_id || act.familyId || act.id.replace(/__(pt|en|es)$/i, "");
  const cls = classify(act.statement, matterCode);

  let out = {
    ...act,
    id: `${familyId}__${lang}`,
    family_id: familyId,
    language: lang,
    source_path: act.source_path || act.layout_source,
  };

  if (cls === "L") {
    const rew = applyLiteracyRewrite(act, lang, matterCode);
    if (rew) {
      out = {
        ...out,
        statement: rew.statement,
        steps: rew.steps,
        title: rew.title || translateText(act.title || "Activity", lang),
        layout_source: rew.layout_source,
        statement_visuals: null,
        needs_review: false,
      };
      return out;
    }
  }

  out.title = translateText(act.title || "Atividade", lang);
  out.statement = translateText(act.statement || "", lang);
  out.steps = localizeSteps(act.steps, lang);
  out.statement_visuals = act.statement_visuals
    ? localizeVisuals(act.statement_visuals, lang)
    : act.statement_visuals;
  out.layout_source = `i18n-${lang}-${cls.toLowerCase()}`;
  out.needs_review = cls === "X";
  out.audio_url = null; // neural TTS only
  return out;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  let added = 0;
  let ptTagged = 0;
  const byLang = { en: 0, es: 0 };

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        // localize matter labels in tree for display fallback
        if (m.code === "lp" || m.code === "pt") {
          m.labels = { pt: "Português", en: "Language", es: "Lengua" };
        }
        if (m.code === "ma" || m.code === "mt") {
          m.labels = { pt: "Matemática", en: "Math", es: "Matemáticas" };
        }
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            const existing = lv.activities || [];
            const ptActs = existing.filter((a) => !a.language || a.language === "pt");
            // tag PT
            for (const a of ptActs) {
              if (!a.language) {
                a.language = "pt";
                a.family_id = a.family_id || a.id;
                ptTagged++;
              }
            }
            const have = new Set(existing.map((a) => a.id));
            const extras = [];
            for (const a of ptActs) {
              for (const lang of ["en", "es"]) {
                const id = `${(a.family_id || a.id).replace(/__(pt|en|es)$/i, "")}__${lang}`;
                if (have.has(id)) continue;
                const loc = localizeActivity(a, lang, m.code);
                extras.push(loc);
                have.add(id);
                added++;
                byLang[lang]++;
              }
            }
            lv.activities = [...existing, ...extras];
          }
        }
      }
    }
  }

  catalog.i18n_built_at = new Date().toISOString();
  catalog.i18n_variants = { pt: "pt-BR", en: "en-US", es: "es-419" };
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));

  let total = 0;
  const byL = { pt: 0, en: 0, es: 0 };
  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              total++;
              const L = a.language || "pt";
              byL[L] = (byL[L] || 0) + 1;
            }
          }
        }
      }
    }
  }
  console.log({ ptTagged, added, byLang, total, byL });
}

main();
