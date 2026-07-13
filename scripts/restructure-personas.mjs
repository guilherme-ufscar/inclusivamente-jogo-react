/**
 * Collapse catalog personas into the 5 official JWT personas from
 * guilherme-ufscar/inclusivamente:
 *   0 Padrão | 1 TEA Nível 2 | 2 DI Leve+TEA | 3 DI Severa+Motora | 4 Def. Visual
 *
 * Run: node scripts/restructure-personas.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");

/** Official personas (order = home display / JWT code) */
const TARGETS = [
  {
    jwt: 0,
    slug: "padrao",
    name: "Padrão",
    color: "#EA580C",
    description: "Trilha padrão · baixa complexidade",
    sources: ["default", "pedro", "padrao"],
  },
  {
    jwt: 1,
    slug: "tea",
    name: "TEA Nível 2",
    color: "#DB2777",
    description: "Trilha TEA · suporte moderado",
    sources: ["tea"],
  },
  {
    jwt: 2,
    slug: "di_tea",
    name: "DI Leve + TEA",
    color: "#7C3AED",
    description: "Trilha DI leve com TEA · 1º ao 5º ano",
    sources: ["di_tea", "tea_di"],
  },
  {
    jwt: 3,
    slug: "di_severa",
    name: "DI Severa + Motora",
    color: "#2563EB",
    description: "Trilha DI severa / motora · etapas iniciais e infantil",
    sources: ["infantil_di"],
  },
  {
    jwt: 4,
    slug: "visual",
    name: "Deficiência Visual",
    color: "#0891B2",
    description: "Trilha acessível · base na trilha padrão",
    sources: [], // filled by clone of padrao after merge
    cloneFrom: "padrao",
  },
];

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function ensureYear(persona, year) {
  let y = persona.years.find((x) => String(x.code) === String(year.code));
  if (!y) {
    y = {
      code: year.code,
      label: year.label,
      matters: [],
    };
    persona.years.push(y);
  }
  return y;
}

function ensureMatter(year, matter) {
  let m = year.matters.find((x) => x.code === matter.code);
  if (!m) {
    m = {
      code: matter.code,
      label: matter.label,
      labels: matter.labels,
      pills: [],
    };
    year.matters.push(m);
  }
  return m;
}

function ensurePill(matter, pill) {
  let p = matter.pills.find((x) => x.index === pill.index);
  if (!p) {
    p = {
      index: pill.index,
      name: pill.name,
      bncc: pill.bncc || null,
      icon_url: pill.icon_url || pill.iconUrl || null,
      levels: [],
    };
    matter.pills.push(p);
  }
  return p;
}

function ensureLevel(pill, level) {
  let l = pill.levels.find((x) => x.index === level.index);
  if (!l) {
    l = { index: level.index, activities: [] };
    pill.levels.push(l);
  }
  return l;
}

function mergePersonaContent(target, source) {
  let moved = 0;
  for (const year of source.years || []) {
    const ty = ensureYear(target, year);
    for (const matter of year.matters || []) {
      // normalize pedro pt/mt → lp/ma
      const matterNorm = {
        ...matter,
        code:
          matter.code === "pt"
            ? "lp"
            : matter.code === "mt"
              ? "ma"
              : matter.code,
        label:
          matter.code === "pt" || matter.code === "lp"
            ? matter.label || "Português"
            : matter.code === "mt" || matter.code === "ma"
              ? matter.label || "Matemática"
              : matter.label,
      };
      if (matterNorm.code === "lp") {
        matterNorm.labels = { pt: "Português", en: "Language", es: "Lengua" };
      }
      if (matterNorm.code === "ma") {
        matterNorm.labels = { pt: "Matemática", en: "Math", es: "Matemáticas" };
      }
      const tm = ensureMatter(ty, matterNorm);
      for (const pill of matter.pills || []) {
        const tp = ensurePill(tm, pill);
        for (const level of pill.levels || []) {
          const tl = ensureLevel(tp, level);
          const seen = new Set((tl.activities || []).map((a) => a.id));
          for (const act of level.activities || []) {
            if (seen.has(act.id)) continue;
            tl.activities.push(act);
            seen.add(act.id);
            moved++;
          }
        }
      }
    }
  }
  // sort years
  target.years.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  for (const y of target.years) {
    y.matters.sort((a, b) => a.code.localeCompare(b.code));
    for (const m of y.matters) {
      m.pills.sort((a, b) => a.index - b.index);
      for (const p of m.pills) {
        p.levels.sort((a, b) => a.index - b.index);
      }
    }
  }
  return moved;
}

function clonePersonaContent(source, targetSlug) {
  const clone = deepClone(source);
  clone.slug = targetSlug;
  // rewrite activity ids to avoid collision
  for (const y of clone.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          lv.activities = (lv.activities || []).map((a) => {
            const lang = a.language || "pt";
            const base = (a.family_id || a.familyId || a.id)
              .replace(/__(pt|en|es)$/i, "")
              .replace(new RegExp(`^${targetSlug}_`), "");
            // prefix visual_
            let family = `visual_${base}`.replace(/[^a-zA-Z0-9_]/g, "_");
            if (family.length > 100) family = family.slice(0, 100);
            const id = lang === "pt" ? family : `${family}__${lang}`;
            return {
              ...a,
              id,
              family_id: family,
              language: lang,
              source_path: a.source_path || a.layout_source,
              layout_source: a.layout_source || "persona-visual-clone",
            };
          });
        }
      }
    }
  }
  return clone;
}

function countActs(persona) {
  let n = 0;
  for (const y of persona.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) n += (lv.activities || []).length;
      }
    }
  }
  return n;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const bySlug = Object.fromEntries((catalog.personas || []).map((p) => [p.slug, p]));

  const report = { merged: {}, created: [] };
  const newPersonas = [];

  for (const t of TARGETS) {
    const persona = {
      slug: t.slug,
      name: t.name,
      color: t.color,
      description: t.description,
      jwt_persona: t.jwt,
      years: [],
    };

    let moved = 0;
    for (const srcSlug of t.sources) {
      const src = bySlug[srcSlug];
      if (!src) continue;
      moved += mergePersonaContent(persona, src);
    }

    // Def. Visual: clone Padrão content (same curriculum, separate activity ids)
    if (t.cloneFrom) {
      // padrao may already be built in newPersonas
      const padrao =
        newPersonas.find((p) => p.slug === t.cloneFrom) || bySlug[t.cloneFrom] || bySlug.default;
      if (padrao && (padrao.years || []).length) {
        const cloned = clonePersonaContent(padrao, t.slug);
        moved += mergePersonaContent(persona, cloned);
        report.created.push({ slug: t.slug, from: t.cloneFrom, acts: countActs(persona) });
      }
    }

    report.merged[t.slug] = { jwt: t.jwt, sources: t.sources, acts: countActs(persona), moved };
    newPersonas.push(persona);
  }

  catalog.personas = newPersonas;
  catalog.personas_restructured_at = new Date().toISOString();
  catalog.personas_jwt_map = TARGETS.map((t) => ({
    jwt: t.jwt,
    slug: t.slug,
    name: t.name,
  }));

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));

  console.log(JSON.stringify(report, null, 2));
  console.log(
    "totals",
    newPersonas.map((p) => `${p.slug}:${countActs(p)}`).join(" | ")
  );
  console.log(
    "grand_total",
    newPersonas.reduce((s, p) => s + countActs(p), 0)
  );
}

main();
