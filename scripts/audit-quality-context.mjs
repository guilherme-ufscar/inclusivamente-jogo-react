/**
 * Post-fix audit: remaining context issues
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");
const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

const issues = [];
let total = 0;
let syllBalls = 0;
let vague = 0;
let indexOpts = 0;

for (const p of cat.personas || [])
  for (const y of p.years || [])
    for (const m of y.matters || [])
      for (const pill of m.pills || [])
        for (const lv of pill.levels || [])
          for (const a of lv.activities || []) {
            total++;
            const st = String(a.statement || "");
            const steps = a.steps || [];
            for (const step of steps) {
              const pr = String(step.prompt || st);
              const blob = `${st} ${pr}`;
              if (/s[ií]lab/i.test(blob) && step.visuals?.type === "count") {
                syllBalls++;
                issues.push({ kind: "syll_balls", id: a.id, pr });
              }
              if (
                /^QUAL [EÉ] A PALAVRA CORRETA\??$/i.test(pr.trim()) ||
                /^WHAT IS THE CORRECT WORD\??$/i.test(pr.trim()) ||
                /^CU[AÁ]L ES LA PALABRA CORRECTA\??$/i.test(pr.trim())
              ) {
                vague++;
                issues.push({ kind: "vague_word", id: a.id, pr, lang: a.language });
              }
              if (/^RESPONDA CORRETAMENTE/i.test(st.trim())) {
                issues.push({ kind: "respond", id: a.id, st, pr });
              }
              if (/^COMPLETE A PALAVRA:?$/i.test(st.trim())) {
                issues.push({ kind: "complete_empty", id: a.id, st, pr });
              }
              for (const o of step.options || []) {
                if (/^index:\s*\d+$/i.test(String(o.text || ""))) indexOpts++;
              }
            }
          }

console.log({ total, syllBalls, vague, indexOpts, issueCount: issues.length });
console.log(JSON.stringify(issues.slice(0, 30), null, 2));
