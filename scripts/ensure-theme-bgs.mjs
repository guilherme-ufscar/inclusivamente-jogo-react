/**
 * Generate thematic backgrounds one-by-one (avoids Cloudflare 524 timeout).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "content", "import", "theme-bgs.json");
const PASS = process.env.INCLUSIVA_API_PASSWORD || "Inclusivamente#2026";
const AUTH = "https://automacao.inclusivamentemaiseduca.com.br/api/auth";
const GEN = "https://automacao.inclusivamentemaiseduca.com.br/api/generate";

const THEMES = [
  { key: "sala_aula", scene: "Colorful elementary classroom with wooden desks and soft window light, cheerful empty scene, flat illustration for kids, no text" },
  { key: "parque", scene: "Bright playground with slide and swings, green grass, blue sky, trees, flat kids illustration, no text" },
  { key: "fazenda", scene: "Friendly farm with red barn and green fields, soft hills, daytime, flat illustration, no text" },
  { key: "feira", scene: "Colorful fruit market stand with baskets of fruits, striped awning, sunny day, flat illustration, no text or price tags" },
  { key: "cozinha", scene: "Warm family kitchen with wooden table and fruit bowl, window light, cozy bright flat illustration, no text" },
  { key: "biblioteca", scene: "Cozy children reading corner with cushions and bookshelf, warm lamp light, flat illustration, no readable titles" },
  { key: "natureza", scene: "Sunny forest path with trees flowers butterflies, soft light, flat kids illustration, no text" },
  { key: "praia", scene: "Cheerful beach with sand gentle waves shells blue sky, flat illustration, no text" },
  { key: "corpo", scene: "Friendly pediatric clinic waiting room soft colors toys plants, welcoming calm flat illustration, no text" },
  { key: "numeros", scene: "Playful math corner with colorful counting blocks and beads, bright table, flat illustration, no numerals" },
  { key: "animais", scene: "Open zoo park path with trees blue sky family friendly, flat illustration, no signs with writing" },
  { key: "cidade", scene: "Colorful neighborhood street with houses trees sidewalk clear sky, flat illustration, no street text" },
  { key: "espaco", scene: "Friendly outer space soft planets and stars pastel nebula dreamy educational flat style, no text" },
  { key: "musica", scene: "Music room with colorful drums and xylophone soft curtains, flat illustration, no sheet music text" },
  { key: "esporte", scene: "Sunny school sports court with balls and cones green field edge, flat illustration, no scoreboards" },
];

async function auth() {
  const r = await fetch(AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASS }),
  });
  const data = await r.json();
  if (!data.token) throw new Error("Auth failed");
  return data.token;
}

async function generateOne(token, theme) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 180000);
  try {
    const res = await fetch(GEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        session: `web-theme-${theme.key}`,
        mode: "image",
        assets: [{ name: theme.key, text: theme.key, scene: theme.scene }],
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(JSON.stringify(data));
    const img = data.results?.[0]?.image;
    if (!img) throw new Error(data.results?.[0]?.imageError || "no image");
    return img;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  let pack = { themes: {}, generatedAt: null };
  if (fs.existsSync(OUT)) {
    try {
      pack = JSON.parse(fs.readFileSync(OUT, "utf8").replace(/^\uFEFF/, ""));
      pack.themes = pack.themes || {};
    } catch {
      pack = { themes: {} };
    }
  }

  const missing = THEMES.filter((t) => !pack.themes[t.key]);
  if (missing.length === 0) {
    console.log("All theme BGs present:", Object.keys(pack.themes).length);
    return;
  }

  console.log("Need to generate", missing.length, "themes");
  let token = await auth();
  let i = 0;
  for (const theme of missing) {
    i++;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${i}/${missing.length}] ${theme.key} attempt ${attempt}...`);
        if (attempt > 1) token = await auth();
        const url = await generateOne(token, theme);
        pack.themes[theme.key] = url;
        pack.generatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(OUT), { recursive: true });
        fs.writeFileSync(OUT, JSON.stringify(pack, null, 2));
        console.log("  OK", url);
        break;
      } catch (e) {
        console.warn("  FAIL", e.message);
        if (attempt === 3) console.error("  Giving up on", theme.key);
        else await new Promise((r) => setTimeout(r, 5000));
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("Theme pack keys:", Object.keys(pack.themes).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
