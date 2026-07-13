/**
 * Keep ALL catalog activities. Prefer local OmniVoice WAV when present.
 * Writes missing names to omnivoice/workspace/missing_queue.json for batch TTS.
 *
 * Run: node scripts/resolve-audio-local.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { enunciadoFormatter } from "./enunciado-formatter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "content", "import", "catalog.json");
const LOCAL_AUDIO = path.join(ROOT, "content", "media", "audios");
const PAINEL = "https://painel.inclusivamentemaiseduca.com.br/uploads/audios";
const QUEUE = path.join(ROOT, "omnivoice", "workspace", "missing_queue.json");

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  fs.mkdirSync(LOCAL_AUDIO, { recursive: true });

  const missing = [];
  const seenNames = new Set();
  let total = 0;
  let localHits = 0;
  let painelUrl = 0;

  for (const p of catalog.personas || []) {
    for (const y of p.years || []) {
      for (const m of y.matters || []) {
        for (const pill of m.pills || []) {
          for (const lv of pill.levels || []) {
            for (const a of lv.activities || []) {
              total++;
              const name = enunciadoFormatter(a.statement || a.steps?.[0]?.prompt || "");
              if (!name) continue;
              const localPath = path.join(LOCAL_AUDIO, `${name}.wav`);
              if (fs.existsSync(localPath) && fs.statSync(localPath).size > 1000) {
                a.audio_url = `/media/audios/${name}.wav`;
                localHits++;
              } else {
                a.audio_url = `${PAINEL}/${name}.wav`;
                painelUrl++;
                if (!seenNames.has(name)) {
                  seenNames.add(name);
                  missing.push({
                    name,
                    text: a.statement || name.replace(/_/g, " "),
                    tts_text: (a.statement || name.replace(/_/g, " "))
                      .replace(/\/([A-Za-zÀ-ü])\//g, "som $1")
                      .replace(/\s+/g, " ")
                      .trim(),
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  catalog.audio_resolved_at = new Date().toISOString();
  catalog.audio_local_dir = "content/media/audios";
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));

  fs.mkdirSync(path.dirname(QUEUE), { recursive: true });
  fs.writeFileSync(
    QUEUE,
    JSON.stringify(
      {
        total_unique_statements: total,
        with_local_audio: localHits,
        missing: missing.length,
        items: missing,
        note: "Gerar com omnivoice/workspace/gerar_faltantes.py",
      },
      null,
      2
    )
  );

  console.log({
    total,
    localHits,
    painelUrl,
    uniqueMissingForTts: missing.length,
    queue: QUEUE,
  });
}

main();
