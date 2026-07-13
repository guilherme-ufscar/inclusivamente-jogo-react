/**
 * Build bg-url-map.json from automacao sessions (public PNGs on painel).
 * Password from env INCLUSIVA_API_PASSWORD or default from project docs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "content", "import", "bg-url-map.json");
const PASS = process.env.INCLUSIVA_API_PASSWORD || "Inclusivamente#2026";
const AUTH = "https://automacao.inclusivamentemaiseduca.com.br/api/auth";
const SESSIONS = "https://automacao.inclusivamentemaiseduca.com.br/api/sessions";
const PANEL = "https://painel.inclusivamentemaiseduca.com.br/uploads/game-assets";

async function main() {
  const auth = await fetch(AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASS }),
  }).then((r) => r.json());
  if (!auth.token) throw new Error("Auth failed");

  const sessions = await fetch(SESSIONS, {
    headers: { Authorization: `Bearer ${auth.token}` },
  }).then((r) => r.json());

  const map = {};
  for (const s of sessions) {
    if (!s || s === "audios") continue;
    const url = `${PANEL}/${s}/links_${s}.txt`;
    let txt;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      txt = await res.text();
    } catch {
      continue;
    }
    const re = /\[([^\]]+)\][\s\S]*?IMAGEM:\s*(\S+)/g;
    let m;
    while ((m = re.exec(txt))) {
      const name = m[1].trim();
      const img = m[2].trim();
      if (!/^https?:\/\//.test(img)) continue;
      map[name] = img;
      map[name.replace(/-/g, "_")] = img;
      map[name.replace(/_/g, "-")] = img;
      // also match Unity slug style 01-lp-pill_1-nvl_1-1
      const unity = name
        .replace(/-pill-/g, "-pill_")
        .replace(/-nvl-/g, "-nvl_")
        .replace(/-(\d+)$/g, "_$1");
      // simpler: replace pill-N with pill_N
      const u2 = name.replace(/pill-(\d+)/g, "pill_$1").replace(/nvl-(\d+)/g, "nvl_$1");
      map[u2] = img;
      map[u2.replace(/-/g, "_")] = img;
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  console.log("Wrote", OUT, "keys:", Object.keys(map).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
