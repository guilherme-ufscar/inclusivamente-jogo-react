/**
 * Broader scan for kid-confusing activities without context.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cat = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "content", "import", "catalog.json"), "utf8")
);

const buckets = {
  tooShort: [],
  onlyResponda: [],
  completeNoBlank: [],
  whatWithoutStory: [],
  touchImageNoClue: [],
  countVisualOnLiteracy: [],
};

function hasImg(step, a) {
  return !!(
    step.img_ref_urls?.length ||
    step.img_ref?.length ||
    step.visuals ||
    a.statementVisuals
  );
}

for (const p of cat.personas || [])
  for (const y of p.years || [])
    for (const m of y.matters || [])
      for (const pill of m.pills || [])
        for (const lv of pill.levels || [])
          for (const a of lv.activities || []) {
            if (a.language && a.language !== "pt") continue;
            const st = String(a.statement || "").trim();
            for (const step of a.steps || []) {
              const pr = String(step.prompt || st).trim();
              if (pr.length > 0 && pr.length < 12 && !/^\d+\s*[+\-x×÷]/.test(pr)) {
                buckets.tooShort.push({ id: a.id, pr });
              }
              if (/^COMPLETE A PALAVRA/i.test(pr) && !/[_·.]{2,}|[A-Z]{1,8}_+/i.test(pr)) {
                buckets.completeNoBlank.push({ id: a.id, pr });
              }
              if (
                /^(O QUE ELA|O QUE ELE|QUEM FOI|ONDE FOI|O QUE LEVOU)/i.test(pr) &&
                !/TEXTO:|ANA |LEIA|FOI AO|ESTÁ|IMPERADOR|BRASIL/i.test(pr)
              ) {
                buckets.whatWithoutStory.push({ id: a.id, pr });
              }
              if (/TOQUE NA IMAGEM/i.test(pr) && !hasImg(step, a) && !/"/.test(pr)) {
                buckets.touchImageNoClue.push({ id: a.id, pr });
              }
              if (
                step.visuals?.type === "count" &&
                /LETRA|PALAVRA|S[IÍ]LABA|SOM |ESCRITA/i.test(pr)
              ) {
                buckets.countVisualOnLiteracy.push({ id: a.id, pr, n: step.visuals.n, noun: step.visuals.noun });
              }
            }
          }

for (const [k, v] of Object.entries(buckets)) {
  console.log(k, v.length);
  if (v.length) console.log(JSON.stringify(v.slice(0, 5), null, 2));
}
