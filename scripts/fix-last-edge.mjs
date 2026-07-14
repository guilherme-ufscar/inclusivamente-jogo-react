import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CATALOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "content",
  "import",
  "catalog.json"
);
const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
let n = 0;

for (const p of cat.personas || [])
  for (const y of p.years || [])
    for (const m of y.matters || [])
      for (const pill of m.pills || [])
        for (const lv of pill.levels || [])
          for (const a of lv.activities || []) {
            for (const s of a.steps || []) {
              const pr = String(s.prompt || a.statement || "");
              if (
                /CU[AÁ]NTAS.*palavras|QUANTAS PALAVRAS|HOW MANY WORDS|CU[AÁ]NTAS PALABRAS/i.test(
                  pr
                ) &&
                s.visuals?.type === "count"
              ) {
                const m1 =
                  pr.match(/"([^"]+)"/) ||
                  pr.match(/'([^']+)'/) ||
                  pr.match(/FRASE:\s*([^.?]+)/i);
                const phrase = (m1 && m1[1] ? m1[1] : "").trim();
                if (phrase) {
                  s.visuals = {
                    type: "word_chips",
                    caption: "Conte as palavras:",
                    words: phrase.split(/\s+/).filter(Boolean),
                  };
                } else {
                  delete s.visuals;
                }
                n++;
              }
            }

            if (
              /PROBLEMA DIGITAL|QUANTAS BOLAS AO TODO|HOW MANY BALLS|CU[AÁ]NTAS PELOTAS/i.test(
                a.statement || ""
              )
            ) {
              const cleanSt =
                "HÁ 4 CAIXAS COM 2 BOLAS CADA. DEPOIS CHEGARAM MAIS 2 BOLAS. QUANTAS BOLAS AO TODO? QUAL CONTA ESTÁ CERTA?";
              if (/ENUNCIADO:|PROBLEMA DIGITAL/i.test(a.statement || "")) {
                a.statement = cleanSt;
                n++;
              }
              for (const s of a.steps || []) {
                if (/ENUNCIADO:|PROBLEMA DIGITAL/i.test(s.prompt || "")) {
                  s.prompt = cleanSt;
                  n++;
                }
              }
            }
          }

fs.writeFileSync(CATALOG, JSON.stringify(cat));
console.log("extra fixes", n);
