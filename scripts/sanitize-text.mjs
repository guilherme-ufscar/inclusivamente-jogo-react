/**
 * Normalize Portuguese educational text from Unity/JSON sources.
 * Fixes \xHH escapes, mojibake, braces, and broken leetspeak options.
 */

/** Decode Unity / C-style escapes in a string */
export function decodeEscapes(input) {
  if (input == null) return input;
  let s = String(input);

  // \xHH (Unity YAML)
  s = s.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  // \uHHHH
  s = s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  // literal \n \t
  s = s.replace(/\\n/g, " ").replace(/\\t/g, " ");
  // \" 
  s = s.replace(/\\"/g, '"');

  return s;
}

/** Fix UTF-8 interpreted as Latin-1 (Ã£ → ã, etc.) */
export function fixMojibake(s) {
  if (!s || !/Ã.|Â.|â€/.test(s)) return s;
  try {
    // Only attempt if it looks like mojibake
    const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    // Prefer decoded if it reduced mojibake markers
    if (
      decoded &&
      decoded !== s &&
      (decoded.match(/[À-ÿ]/g) || []).length >= (s.match(/[À-ÿ]/g) || []).length &&
      !decoded.includes("\uFFFD")
    ) {
      return decoded;
    }
  } catch {
    /* keep */
  }
  // Manual common sequences
  const map = {
    "Ã¡": "á",
    "Ã ": "à",
    "Ã¢": "â",
    "Ã£": "ã",
    "Ã¤": "ä",
    "Ã©": "é",
    "Ã¨": "è",
    "Ãª": "ê",
    "Ã­": "í",
    "Ã³": "ó",
    "Ã´": "ô",
    "Ãµ": "õ",
    "Ãº": "ú",
    "Ã¼": "ü",
    "Ã§": "ç",
    "Ã": "Á",
    "Ã‰": "É",
    "Ã": "Í",
    "Ã“": "Ó",
    "Ãš": "Ú",
    "Ã‡": "Ç",
    "Ãƒ": "Ã",
    "Âº": "º",
    "Âª": "ª",
    "Â«": "«",
    "Â»": "»",
    "â€™": "'",
    "â€œ": '"',
    "â€": '"',
    "â€“": "–",
    "â€”": "—",
  };
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v);
  }
  return s;
}

/** Known broken Unity leetspeak / corrupted options → readable leetspeak */
const LEET_FIX = {
  "L3Ã%": "L34O", // fake LEÃO
  "L3Ãƒ%": "L34O",
  "L3A%": "L34O",
  "L3%": "L34O",
  "C#BR4": "C0BR4",
  "Z3BR4": "Z3BR4",
  "GIR4F@": "G1R4F@",
};

/**
 * Main sanitizer for any user-visible string
 */
export function sanitizeText(input) {
  if (input == null || input === "") return input;
  let s = String(input);

  s = decodeEscapes(s);
  s = fixMojibake(s);

  // Exact leet fixes
  if (LEET_FIX[s.trim()]) s = LEET_FIX[s.trim()];
  // Partial
  for (const [bad, good] of Object.entries(LEET_FIX)) {
    if (s.includes(bad)) s = s.split(bad).join(good);
  }

  // Remove Unity template braces: {LETRAS} → LETRAS, {5ª, 6ª} keep content
  s = s.replace(/\{([^{}]+)\}/g, "$1");

  // Phonetic slashes: SOM /B/ → SOM B, SOM DE /Z/ → SOM DE Z
  s = s.replace(/\/([A-Za-zÀ-ÿ0-9]{1,4})\//g, "$1");

  // HTML breaks
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = s.replace(/<[^>]+>/g, "");

  // Checkmarks / crosses that may not render → clear markers
  s = s.replace(/[✔✓]/g, "✓ ");
  s = s.replace(/[✖✗×]/g, "✗ ");

  // Replacement char
  s = s.replace(/\uFFFD/g, "");

  // Collapse whitespace
  s = s.replace(/[ \t]+/g, " ").replace(/\s+\n/g, "\n").trim();

  // Clean "SOM B ?" / "SOM B/?" leftovers → "SOM B?"
  s = s.replace(/\?\s*\?/g, "?");
  s = s.replace(/\s+\?/g, "?");
  s = s.replace(/\.\?+/g, "?");
  s = s.replace(/\?\./g, "?");
  // "EM QUAL ... Z?." trailing
  s = s.replace(/\?\.+$/g, "?");
  s = s.replace(/\.+$/g, (m) => (m.length > 1 ? "." : m));

  // NFC for Portuguese
  try {
    s = s.normalize("NFC");
  } catch {
    /* ignore */
  }

  // Fix common broken pairs left from bad escapes
  s = s.replace(/Ã%/g, "ÃO");
  s = s.replace(/Ãƒ%/g, "ÃO");

  return s;
}

/** Apply to whole catalog object in place */
export function sanitizeCatalog(catalog) {
  let changed = 0;
  const fix = (v) => {
    if (typeof v !== "string") return v;
    const n = sanitizeText(v);
    if (n !== v) changed++;
    return n;
  };

  for (const p of catalog.personas || []) {
    p.name = fix(p.name);
    p.description = fix(p.description);
    for (const y of p.years || []) {
      y.label = fix(y.label);
      for (const m of y.matters || []) {
        m.label = fix(m.label);
        for (const pill of m.pills || []) {
          pill.name = fix(pill.name);
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              a.title = fix(a.title);
              a.statement = fix(a.statement);
              for (const st of a.steps || []) {
                st.prompt = fix(st.prompt);
                for (const o of st.options || []) {
                  o.text = fix(o.text);
                }
              }
            }
          }
        }
      }
    }
  }
  return changed;
}

// CLI: sanitize content/import/catalog.json
if (process.argv[1] && process.argv[1].endsWith("sanitize-text.mjs")) {
  import("fs").then((fs) => {
    import("path").then((path) => {
      const root = path.resolve(path.dirname(process.argv[1]), "..");
      const catPath = path.join(root, "content", "import", "catalog.json");
      const catalog = JSON.parse(fs.readFileSync(catPath, "utf8"));
      const n = sanitizeCatalog(catalog);
      fs.writeFileSync(catPath, JSON.stringify(catalog));
      console.log("Sanitized fields changed:", n);
      // sample LEAO / JOAO
      let samples = [];
      for (const p of catalog.personas) {
        for (const y of p.years || []) {
          for (const m of y.matters || []) {
            for (const pill of m.pills || []) {
              for (const lv of pill.levels || []) {
                for (const a of lv.activities || []) {
                  if (/LE[AÃ4]|JO[AÃ]|ON[CÇ]|JACAR/.test(a.statement + JSON.stringify(a.steps))) {
                    if (samples.length < 8) {
                      samples.push({
                        stmt: a.statement,
                        opts: (a.steps || []).flatMap((s) => (s.options || []).map((o) => o.text)).slice(0, 6),
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
      console.log(JSON.stringify(samples, null, 2));
    });
  });
}
