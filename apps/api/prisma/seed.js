import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.resolve(__dirname, "../../../content/import/catalog.json"),
  path.resolve("/app/content/import/catalog.json"),
  path.resolve(process.cwd(), "content/import/catalog.json"),
];

function loadCatalog() {
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("Loading catalog from", p);
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
  throw new Error("catalog.json not found in: " + candidates.join(", "));
}

async function main() {
  const catalog = loadCatalog();
  console.time("seed");

  await prisma.activity.deleteMany();
  await prisma.level.deleteMany();
  await prisma.pill.deleteMany();
  await prisma.matter.deleteMany();
  await prisma.year.deleteMany();
  await prisma.persona.deleteMany();

  let activityCount = 0;
  const BATCH = 100;

  for (const p of catalog.personas || []) {
    const persona = await prisma.persona.create({
      data: {
        slug: p.slug,
        name: p.name,
        color: p.color || "#6366F1",
        description: p.description || "",
      },
    });

    for (const y of p.years || []) {
      const year = await prisma.year.create({
        data: {
          code: String(y.code),
          label: y.label,
          personaId: persona.id,
        },
      });

      for (const m of y.matters || []) {
        const matter = await prisma.matter.create({
          data: {
            code: m.code,
            label: m.label,
            yearId: year.id,
          },
        });

        for (const pill of m.pills || []) {
          const pillRow = await prisma.pill.create({
            data: {
              index: pill.index,
              name: pill.name,
              bncc: pill.bncc || null,
              iconUrl: pill.icon_url || null,
              matterId: matter.id,
            },
          });

          for (const lv of pill.levels || []) {
            const level = await prisma.level.create({
              data: {
                index: lv.index,
                pillId: pillRow.id,
              },
            });

            const acts = lv.activities || [];
            for (let i = 0; i < acts.length; i += BATCH) {
              const chunk = acts.slice(i, i + BATCH);
              const data = chunk.map((act) => {
                const lang = act.language || act.lang || "pt";
                const familyId = act.family_id || act.familyId || act.id.replace(/__(pt|en|es)$/i, "");
                return {
                  id: act.id,
                  language: lang,
                  familyId,
                  sourcePath: act.source_path || null,
                  title: act.title || "Atividade",
                  statement: act.statement || "",
                  audioUrl: act.audio_url || null,
                  backgroundUrl: act.background_url || null,
                  backgroundId: act.background_id || null,
                  choiceType: act.choice_type || "single",
                  layoutSource: act.layout_source || null,
                  randomizeOptions: act.randomize_options !== false,
                  needsReview: !!act.needs_review,
                  sortOrder: act.sort_order || 0,
                  steps: act.steps,
                  statementVisuals: act.statement_visuals || null,
                  levelId: level.id,
                };
              });
              // skipDuplicates for safety
              const result = await prisma.activity.createMany({
                data,
                skipDuplicates: true,
              });
              activityCount += result.count;
            }
          }
        }
      }
    }
  }

  console.log(`Seed complete: ${activityCount} activities`);
  console.timeEnd("seed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
