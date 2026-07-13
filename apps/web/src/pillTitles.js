/**
 * Human-friendly pill/theme titles — pt / en / es.
 */

const LP_BY_INDEX = {
  pt: {
    0: "Sons e letras",
    1: "Conhecendo o alfabeto",
    2: "Brincando com sílabas",
    3: "Construindo palavras",
    4: "Escuta de histórias",
    5: "Descobrindo a leitura",
    6: "Organizando frases",
    7: "Leitura e compreensão",
    8: "Produção de textos",
    9: "Gêneros do cotidiano",
    10: "Expressão oral",
    11: "Noção de dinheiro",
    12: "Corpo humano",
    13: "Cuidados com o corpo",
    14: "Regras de convivência",
    15: "Identidade e pertencimento",
    16: "Localização espacial",
    17: "Higiene e saúde",
    18: "Expressão artística",
    19: "Jogos simbólicos",
    99: "Reforço BNCC",
  },
  en: {
    0: "Sounds and letters",
    1: "Learning the alphabet",
    2: "Playing with syllables",
    3: "Building words",
    4: "Listening to stories",
    5: "Discovering reading",
    6: "Organizing sentences",
    7: "Reading and comprehension",
    8: "Writing texts",
    9: "Everyday text types",
    10: "Oral expression",
    11: "Money basics",
    12: "Human body",
    13: "Taking care of the body",
    14: "Living together rules",
    15: "Identity and belonging",
    16: "Spatial location",
    17: "Hygiene and health",
    18: "Artistic expression",
    19: "Symbolic play",
    99: "Curriculum boost",
  },
  es: {
    0: "Sonidos y letras",
    1: "Conociendo el abecedario",
    2: "Jugando con sílabas",
    3: "Construyendo palabras",
    4: "Escucha de historias",
    5: "Descubriendo la lectura",
    6: "Organizando frases",
    7: "Lectura y comprensión",
    8: "Producción de textos",
    9: "Géneros del día a día",
    10: "Expresión oral",
    11: "Noción del dinero",
    12: "Cuerpo humano",
    13: "Cuidados del cuerpo",
    14: "Reglas de convivencia",
    15: "Identidad y pertenencia",
    16: "Localización espacial",
    17: "Higiene y salud",
    18: "Expresión artística",
    19: "Juegos simbólicos",
    99: "Refuerzo curricular",
  },
};

const MA_BY_INDEX = {
  pt: {
    0: "Descobrindo os números",
    1: "Contando com sentido",
    2: "Explorando quantidades",
    3: "Brincando de somar",
    4: "Separar e juntar",
    5: "Padrões e sequências",
    6: "Espaço e formas",
    7: "Medidas e vida real",
    8: "Problemas do dia a dia",
    9: "Multiplicando ideias",
    10: "Divisão intuitiva",
    11: "Comparar e escolher",
    12: "Organizar e classificar",
    99: "Reforço BNCC",
  },
  en: {
    0: "Discovering numbers",
    1: "Counting with meaning",
    2: "Exploring quantities",
    3: "Playing with addition",
    4: "Split and join",
    5: "Patterns and sequences",
    6: "Space and shapes",
    7: "Measures in real life",
    8: "Everyday problems",
    9: "Multiplying ideas",
    10: "Intuitive division",
    11: "Compare and choose",
    12: "Sort and classify",
    99: "Curriculum boost",
  },
  es: {
    0: "Descubriendo los números",
    1: "Contando con sentido",
    2: "Explorando cantidades",
    3: "Jugando a sumar",
    4: "Separar y juntar",
    5: "Patrones y secuencias",
    6: "Espacio y formas",
    7: "Medidas y vida real",
    8: "Problemas del día a día",
    9: "Multiplicando ideas",
    10: "División intuitiva",
    11: "Comparar y elegir",
    12: "Organizar y clasificar",
    99: "Refuerzo curricular",
  },
};

/** PT canonical title → { en, es } (keys are PT labels from KNOWN / tables) */
const I18N = {
  "Noção de dinheiro": { en: "Money basics", es: "Noción del dinero" },
  "Corpo humano": { en: "Human body", es: "Cuerpo humano" },
  "Localização espacial": { en: "Spatial location", es: "Localización espacial" },
  "Higiene e saúde": { en: "Hygiene and health", es: "Higiene y salud" },
  "Expressão artística": { en: "Artistic expression", es: "Expresión artística" },
  "Jogos simbólicos": { en: "Symbolic play", es: "Juegos simbólicos" },
  "Sistema alfabético": { en: "Alphabet system", es: "Sistema alfabético" },
  "Reconhecimento do próprio nome": {
    en: "Recognizing your own name",
    es: "Reconocimiento del propio nombre",
  },
  "Produção de bilhete": { en: "Writing a note", es: "Producción de billete" },
  "Pontuação básica": { en: "Basic punctuation", es: "Puntuación básica" },
  "Divisão intuitiva": { en: "Intuitive division", es: "División intuitiva" },
  "Linha do tempo": { en: "Timeline", es: "Línea del tiempo" },
  Arte: { en: "Art", es: "Arte" },
  "Uso de conectivos": { en: "Using connectives", es: "Uso de conectores" },
  "Interpretação de gráfico": { en: "Reading charts", es: "Interpretación de gráficos" },
  "Problemas com duas operações": {
    en: "Two-step problems",
    es: "Problemas con dos operaciones",
  },
  "Múltiplos e divisores": { en: "Multiples and divisors", es: "Múltiplos y divisores" },
  "Sistema respiratório": { en: "Respiratory system", es: "Sistema respiratorio" },
  "Cadeia alimentar": { en: "Food chain", es: "Cadena alimentaria" },
  "Sistema digestório": { en: "Digestive system", es: "Sistema digestivo" },
  "Ampliação de vocabulário": { en: "Building vocabulary", es: "Ampliación de vocabulario" },
  "Brasil Império": { en: "Imperial Brazil", es: "Brasil Imperio" },
  "Brincando com sílabas": { en: "Playing with syllables", es: "Jugando con sílabas" },
  "Brincando de somar": { en: "Playing with addition", es: "Jugando a sumar" },
  "Classificação por cores": { en: "Sorting by color", es: "Clasificación por colores" },
  "Classificação por formas": { en: "Sorting by shape", es: "Clasificación por formas" },
  Comparação: { en: "Comparison", es: "Comparación" },
  "Comparando sons e palavras": {
    en: "Comparing sounds and words",
    es: "Comparando sonidos y palabras",
  },
  "Comparar e escolher": { en: "Compare and choose", es: "Comparar y elegir" },
  "Conhecendo o alfabeto": { en: "Learning the alphabet", es: "Conociendo el abecedario" },
  "Consciência fonológica": { en: "Phonological awareness", es: "Conciencia fonológica" },
  "Construindo palavras": { en: "Building words", es: "Construyendo palabras" },
  "Construindo significados": { en: "Building meaning", es: "Construyendo significados" },
  "Contando com sentido": { en: "Counting with meaning", es: "Contando con sentido" },
  "Coordenação motora ampla": { en: "Gross motor skills", es: "Coordinación motora gruesa" },
  "Coordenação motora fina": { en: "Fine motor skills", es: "Coordinación motora fina" },
  "Cuidados com o corpo": { en: "Taking care of the body", es: "Cuidados del cuerpo" },
  "Descobrindo a leitura": { en: "Discovering reading", es: "Descubriendo la lectura" },
  "Descobrindo as palavras": { en: "Discovering words", es: "Descubriendo las palabras" },
  "Descobrindo os números": { en: "Discovering numbers", es: "Descubriendo los números" },
  Emoções: { en: "Emotions", es: "Emociones" },
  "Escrita em ação": { en: "Writing in action", es: "Escritura en acción" },
  "Escuta de histórias": { en: "Listening to stories", es: "Escucha de historias" },
  "Espaço e formas": { en: "Space and shapes", es: "Espacio y formas" },
  "Exploração da natureza": { en: "Exploring nature", es: "Exploración de la naturaleza" },
  "Explorando quantidades": { en: "Exploring quantities", es: "Explorando cantidades" },
  "Explorando sons e sílabas": {
    en: "Exploring sounds and syllables",
    es: "Explorando sonidos y sílabas",
  },
  "Expressão oral espontânea": {
    en: "Spontaneous oral expression",
    es: "Expresión oral espontánea",
  },
  "Expressão oral estruturada": {
    en: "Structured oral expression",
    es: "Expresión oral estructurada",
  },
  "Gêneros do cotidiano": { en: "Everyday text types", es: "Géneros del día a día" },
  "Identidade e pertencimento": {
    en: "Identity and belonging",
    es: "Identidad y pertenencia",
  },
  "Interpretação textual": { en: "Text comprehension", es: "Interpretación textual" },
  "Leitura e compreensão": { en: "Reading and comprehension", es: "Lectura y comprensión" },
  "Lendo e entendendo textos": {
    en: "Reading and understanding texts",
    es: "Leyendo y entendiendo textos",
  },
  "Matemática no mundo": { en: "Math in the world", es: "Matemáticas en el mundo" },
  "Medidas e vida real": { en: "Measures in real life", es: "Medidas y vida real" },
  "Migrações e território": { en: "Migrations and territory", es: "Migraciones y territorio" },
  "Multiplicando ideias": { en: "Multiplying ideas", es: "Multiplicando ideas" },
  "Noções espaciais": { en: "Spatial ideas", es: "Nociones espaciales" },
  "Noções temporais": { en: "Time ideas", es: "Nociones temporales" },
  "Organizando a escrita": { en: "Organizing writing", es: "Organizando la escritura" },
  "Organizando frases": { en: "Organizing sentences", es: "Organizando frases" },
  "Organizar e classificar": { en: "Sort and classify", es: "Organizar y clasificar" },
  "Padrões e sequências": { en: "Patterns and sequences", es: "Patrones y secuencias" },
  "Planejamento de tarefas": { en: "Task planning", es: "Planificación de tareas" },
  "Primeiros passos na escrita": {
    en: "First steps in writing",
    es: "Primeros pasos en la escritura",
  },
  "Problemas do dia a dia": { en: "Everyday problems", es: "Problemas del día a día" },
  "Produção de textos": { en: "Writing texts", es: "Producción de textos" },
  "Produzindo textos": { en: "Producing texts", es: "Produciendo textos" },
  Quantidade: { en: "Quantity", es: "Cantidad" },
  "Regras de convivência": { en: "Living together rules", es: "Reglas de convivencia" },
  "Sentido das palavras": { en: "Word meaning", es: "Sentido de las palabras" },
  "Separar e juntar": { en: "Split and join", es: "Separar y juntar" },
  "Separar e resolver": { en: "Split and solve", es: "Separar y resolver" },
  "Sons do ambiente": { en: "Sounds around us", es: "Sonidos del ambiente" },
  "Sons e letras": { en: "Sounds and letters", es: "Sonidos y letras" },
  "Transformações da matéria": {
    en: "Changes in matter",
    es: "Transformaciones de la materia",
  },
  "Linguagem no dia a dia": { en: "Everyday language", es: "Lenguaje en el día a día" },
  "Reforço BNCC": { en: "Curriculum boost", es: "Refuerzo curricular" },
  "Reforço BNCC (EI)": { en: "Early years boost", es: "Refuerzo curricular (EI)" },
  "Expressão oral": { en: "Oral expression", es: "Expresión oral" },
};

/** Accent / casing fixes for uppercase Unity names → PT title */
const KNOWN = {
  "NOCAO DE DINHEIRO": "Noção de dinheiro",
  "CORPO HUMANO": "Corpo humano",
  "LOCALIZACAO ESPACIAL": "Localização espacial",
  "HIGIENE E SAUDE": "Higiene e saúde",
  "EXPRESSAO ARTISTICA": "Expressão artística",
  "JOGOS SIMBOLICOS": "Jogos simbólicos",
  "RECONHECIMENTO DO SISTEMA AL": "Sistema alfabético",
  "RECONHECIMENTO DO PROPRIO": "Reconhecimento do próprio nome",
  "PRODUCAO DE BILHETE": "Produção de bilhete",
  "PONTUACAO BASICA": "Pontuação básica",
  "DIVISAO INTUITIVA": "Divisão intuitiva",
  "LINHA DO TEMPO": "Linha do tempo",
  ARTE: "Arte",
  "USO DE CONECTIVOS": "Uso de conectivos",
  "INTERPRETACAO DE GRAFICO": "Interpretação de gráfico",
  "PROBLEMAS COM DUAS OPERACOES": "Problemas com duas operações",
  "MULTIPLOS E DIVISORES": "Múltiplos e divisores",
  "SISTEMA RESPIRATORIO": "Sistema respiratório",
  "CADEIA ALIMENTAR": "Cadeia alimentar",
  "SISTEMA DIGESTORIO": "Sistema digestório",
  "AMPLIACAO DE VOCABULARIO": "Ampliação de vocabulário",
  "BRASIL IMPERIO": "Brasil Império",
  "BRINCANDO COM SILABAS": "Brincando com sílabas",
  "BRINCANDO DE SOMAR": "Brincando de somar",
  "CLASSIFICACAO POR CORES": "Classificação por cores",
  "CLASSIFICACAO POR FORMAS": "Classificação por formas",
  COMPARACAO: "Comparação",
  "COMPARANDO SONS E PALAVRA": "Comparando sons e palavras",
  "COMPARAR E ESCOLHER": "Comparar e escolher",
  "CONHECENDO O ALFABETO": "Conhecendo o alfabeto",
  "CONSCIENCIA FONOLOGICA IN": "Consciência fonológica",
  "CONSTRUINDO PALAVRAS": "Construindo palavras",
  "CONSTRUINDO SIGNIFICADOS": "Construindo significados",
  "CONTANDO COM SENTIDO": "Contando com sentido",
  "COORDENACAO MOTORA AMPLA": "Coordenação motora ampla",
  "COORDENACAO MOTORA FINA": "Coordenação motora fina",
  "CUIDADOS COM O CORPO": "Cuidados com o corpo",
  "DESCOBRINDO A LEITURA": "Descobrindo a leitura",
  "DESCOBRINDO AS PALAVRAS": "Descobrindo as palavras",
  "DESCOBRINDO OS NUMEROS": "Descobrindo os números",
  EMOCOES: "Emoções",
  "ESCRITA EM ACAO": "Escrita em ação",
  "ESCUTA DE HISTORIAS": "Escuta de histórias",
  "ESPACO E FORMAS": "Espaço e formas",
  "EXPLORACAO DA NATUREZA": "Exploração da natureza",
  "EXPLORANDO QUANTIDADES": "Explorando quantidades",
  "EXPLORANDO SONS E SILABAS": "Explorando sons e sílabas",
  "EXPRESSAO ORAL ESPONTANEA": "Expressão oral espontânea",
  "EXPRESSAO ORAL ESTRUTURAD": "Expressão oral estruturada",
  "EXPRESSÃO ORAL ESTRUTURADA": "Expressão oral estruturada",
  "GENEROS DO COTIDIANO": "Gêneros do cotidiano",
  "IDENTIDADE E PERTENCIMENT": "Identidade e pertencimento",
  "INTERPRETACAO TEXTUAL": "Interpretação textual",
  "LEITURA E COMPREENSAO": "Leitura e compreensão",
  "LENDO E ENTENDENDO TEXTOS": "Lendo e entendendo textos",
  "MATEMATICA NO MUNDO": "Matemática no mundo",
  "MEDIDAS E VIDA REAL": "Medidas e vida real",
  "MIGRACOES E TERRITORIO": "Migrações e território",
  "MULTIPLICANDO IDEIAS": "Multiplicando ideias",
  "NOCOES ESPACIAIS": "Noções espaciais",
  "NOCOES TEMPORAIS": "Noções temporais",
  "ORGANIZANDO A ESCRITA": "Organizando a escrita",
  "ORGANIZANDO FRASES": "Organizando frases",
  "ORGANIZAR E CLASSIFICAR": "Organizar e classificar",
  "PADROES E SEQUENCIAS": "Padrões e sequências",
  "PLANEJAMENTO DE TAREFAS": "Planejamento de tarefas",
  "PRIMEIROS PASSOS NA ESCRI": "Primeiros passos na escrita",
  "PROBLEMAS DO DIA A DIA": "Problemas do dia a dia",
  "PRODUCAO DE TEXTOS": "Produção de textos",
  "PRODUZINDO TEXTOS": "Produzindo textos",
  QUANTIDADE: "Quantidade",
  "REGRAS DE CONVIVENCIA": "Regras de convivência",
  "SENTIDO DAS PALAVRAS": "Sentido das palavras",
  "SEPARAR E JUNTAR": "Separar e juntar",
  "SEPARAR E RESOLVER": "Separar e resolver",
  "SONS DO AMBIENTE": "Sons do ambiente",
  "SONS E LETRAS": "Sons e letras",
  "TRANSFORMACOES DA MATERIA": "Transformações da matéria",
  "USANDO A LINGUAGEM NO DIA": "Linguagem no dia a dia",
  "USANDO LINGUAGEM NO DIA A": "Linguagem no dia a dia",
  "BNCC — REFORÇO": "Reforço BNCC",
  "BNCC — REFORCO": "Reforço BNCC",
  "BNCC EI — REFORÇO": "Reforço BNCC (EI)",
};

function titleCaseFallback(s) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function normKey(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}

function localizePtTitle(ptTitle, lang) {
  if (!lang || lang === "pt") return ptTitle;
  const map = I18N[ptTitle];
  if (map?.[lang]) return map[lang];
  // also match index tables
  for (const table of [LP_BY_INDEX.pt, MA_BY_INDEX.pt]) {
    for (const [idx, t] of Object.entries(table)) {
      if (t === ptTitle) {
        const other = (table === LP_BY_INDEX.pt ? LP_BY_INDEX : MA_BY_INDEX)[lang];
        if (other?.[idx]) return other[idx];
      }
    }
  }
  return ptTitle;
}

export function isGenericPillName(name) {
  const raw = String(name || "").trim();
  return !raw || /^p[ií]lula\s*\d+$/i.test(raw) || /^pill\s*\d+$/i.test(raw);
}

/**
 * @param {{ name?: string, index?: number }} pill
 * @param {string} [matterCode] lp|ma|pt|mt
 * @param {string} [lang] pt|en|es
 */
export function resolvePillTitle(pill, matterCode = "lp", lang = "pt") {
  const L = lang === "en" || lang === "es" ? lang : "pt";
  const raw = String(pill?.name || "").trim();
  const idx = Number(pill?.index ?? 0);
  const code = matterCode === "mt" ? "ma" : matterCode === "pt" ? "lp" : matterCode;

  if (isGenericPillName(raw)) {
    const table = (code === "ma" ? MA_BY_INDEX : LP_BY_INDEX)[L] || LP_BY_INDEX.pt;
    if (table[idx]) return table[idx];
    if (L === "en") return code === "ma" ? `Math ${idx}` : `Reading & writing ${idx}`;
    if (L === "es") return code === "ma" ? `Matemáticas ${idx}` : `Lectura y escritura ${idx}`;
    return code === "ma" ? `Matemática ${idx}` : `Leitura e escrita ${idx}`;
  }

  const up = raw.toUpperCase();
  let ptTitle = KNOWN[up] || null;
  if (!ptTitle) {
    const key = normKey(raw);
    for (const [k, v] of Object.entries(KNOWN)) {
      if (normKey(k) === key) {
        ptTitle = v;
        break;
      }
    }
  }
  if (!ptTitle) {
    ptTitle =
      raw === raw.toUpperCase() || raw === raw.toLowerCase()
        ? titleCaseFallback(raw)
        : raw;
  }

  return localizePtTitle(ptTitle, L);
}
