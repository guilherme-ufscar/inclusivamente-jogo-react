/**
 * Rebalance catalog content across the 5 JWT personas using atividades/ planilha rules.
 *
 * Why di_tea had ~1432 pt:
 *   - Unity dump di_tea_* (01–05) + tea_di_* (03–05) + xc planilhas tagged di_tea
 *   - Planilhas "3º/4º/5º DI+TEA" and "TEA+DI DEV 1–5" all landed on di_tea after merge
 *
 * Spread rules (share by clone — keeps DI+TEA full 1º–5º, fills empty personas):
 *   tea      ← years 01–02 from di_tea  (planilhas "1/2 Ano Perfil TEA")
 *   padrao   ← years 01–02 level 1 from di_tea  (trilha padrão / baixa complexidade)
 *   di_severa← year 01 level 1 from di_tea as EF bridge (+ keeps infantil 4/5 anos)
 *   visual   ← full re-clone of expanded padrao
 *   di_tea   ← unchanged (core 03–05 DI+TEA + 01–02 continuity)
 *
 * Run: node scripts/rebalance-personas.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, "..", "content", "import", "catalog.json");

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function countActs(persona, lang = null) {
  let n = 0;
  for (const y of persona.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          for (const a of lv.activities || []) {
            if (lang && (a.language || "pt") !== lang) continue;
            n++;
          }
        }
      }
    }
  }
  return n;
}

function ensureYear(persona, year) {
  let y = persona.years.find((x) => String(x.code) === String(year.code));
  if (!y) {
    y = { code: year.code, label: year.label, matters: [] };
    persona.years.push(y);
  }
  if (year.label && !y.label) y.label = year.label;
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

function sortPersona(persona) {
  persona.years.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  for (const y of persona.years) {
    y.matters.sort((a, b) => a.code.localeCompare(b.code));
    for (const m of y.matters) {
      m.pills.sort((a, b) => a.index - b.index);
      for (const p of m.pills) {
        p.levels.sort((a, b) => a.index - b.index);
      }
    }
  }
}

/** Filter years/levels from a persona tree (deep clone of matching structure only). */
function slicePersona(source, { years = null, levelIndexes = null } = {}) {
  const yearSet = years ? new Set(years.map(String)) : null;
  const lvlSet = levelIndexes ? new Set(levelIndexes.map(Number)) : null;
  const out = { slug: source.slug, years: [] };

  for (const year of source.years || []) {
    if (yearSet && !yearSet.has(String(year.code))) continue;
    const y = { code: year.code, label: year.label, matters: [] };
    for (const matter of year.matters || []) {
      const m = {
        code: matter.code,
        label: matter.label,
        labels: matter.labels,
        pills: [],
      };
      for (const pill of matter.pills || []) {
        const p = {
          index: pill.index,
          name: pill.name,
          bncc: pill.bncc || null,
          icon_url: pill.icon_url || pill.iconUrl || null,
          levels: [],
        };
        for (const level of pill.levels || []) {
          if (lvlSet && !lvlSet.has(Number(level.index))) continue;
          p.levels.push({
            index: level.index,
            activities: deepClone(level.activities || []),
          });
        }
        if (p.levels.length) m.pills.push(p);
      }
      if (m.pills.length) y.matters.push(m);
    }
    if (y.matters.length) out.years.push(y);
  }
  return out;
}

/**
 * Rewrite activity ids/family_ids so they belong to target persona and never collide.
 * prefix e.g. "tea_share", "padrao_share"
 */
function rekeyActivities(tree, prefix) {
  for (const y of tree.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          lv.activities = (lv.activities || []).map((a) => {
            const lang = a.language || "pt";
            const oldFamily = (a.family_id || a.familyId || a.id)
              .replace(/__(pt|en|es)$/i, "")
              .replace(new RegExp(`^${prefix}_`), "");
            let family = `${prefix}_${oldFamily}`.replace(/[^a-zA-Z0-9_]/g, "_");
            if (family.length > 110) family = family.slice(0, 110);
            const id = lang === "pt" ? family : `${family}__${lang}`;
            return {
              ...a,
              id,
              family_id: family,
              language: lang,
              layout_source: a.layout_source || "persona-rebalance-share",
              notes: [...(a.notes || []), "rebalance-share"].filter(
                (v, i, arr) => arr.indexOf(v) === i
              ),
            };
          });
        }
      }
    }
  }
  return tree;
}

function mergePersonaContent(target, source) {
  let moved = 0;
  for (const year of source.years || []) {
    const ty = ensureYear(target, year);
    for (const matter of year.matters || []) {
      const matterNorm = {
        ...matter,
        code:
          matter.code === "pt"
            ? "lp"
            : matter.code === "mt"
              ? "ma"
              : matter.code,
      };
      if (matterNorm.code === "lp") {
        matterNorm.label = matterNorm.label || "Português";
        matterNorm.labels = { pt: "Português", en: "Language", es: "Lengua" };
      }
      if (matterNorm.code === "ma") {
        matterNorm.label = matterNorm.label || "Matemática";
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
  sortPersona(target);
  return moved;
}

function clonePersonaContent(source, targetSlug) {
  const clone = deepClone(source);
  clone.slug = targetSlug;
  for (const y of clone.years || []) {
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          lv.activities = (lv.activities || []).map((a) => {
            const lang = a.language || "pt";
            const base = (a.family_id || a.familyId || a.id)
              .replace(/__(pt|en|es)$/i, "")
              .replace(/^visual_/, "")
              .replace(/^padrao_share_/, "")
              .replace(/^padrao_/, "");
            let family = `visual_${base}`.replace(/[^a-zA-Z0-9_]/g, "_");
            if (family.length > 100) family = family.slice(0, 100);
            const id = lang === "pt" ? family : `${family}__${lang}`;
            return {
              ...a,
              id,
              family_id: family,
              language: lang,
              layout_source: a.layout_source || "persona-visual-clone",
              notes: [...(a.notes || []), "visual-clone"].filter(
                (v, i, arr) => arr.indexOf(v) === i
              ),
            };
          });
        }
      }
    }
  }
  return clone;
}

function yearCounts(persona) {
  const out = {};
  for (const y of persona.years || []) {
    let n = 0;
    for (const m of y.matters || []) {
      for (const pill of m.pills || []) {
        for (const lv of pill.levels || []) {
          n += (lv.activities || []).filter((a) => (a.language || "pt") === "pt").length;
        }
      }
    }
    out[String(y.code)] = n;
  }
  return out;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const backup = CATALOG.replace(
    /\.json$/,
    `.backup-pre-rebalance-${Date.now()}.json`
  );
  fs.writeFileSync(backup, JSON.stringify(catalog));

  const bySlug = Object.fromEntries((catalog.personas || []).map((p) => [p.slug, p]));
  const diTea = bySlug.di_tea;
  const tea = bySlug.tea;
  const padrao = bySlug.padrao;
  const diSevera = bySlug.di_severa;
  const visual = bySlug.visual;

  if (!diTea || !tea || !padrao || !diSevera || !visual) {
    throw new Error(
      "Missing personas — expected padrao, tea, di_tea, di_severa, visual. Run restructure-personas.mjs first."
    );
  }

  const before = Object.fromEntries(
    catalog.personas.map((p) => [p.slug, { pt: countActs(p, "pt"), all: countActs(p) }])
  );

  const report = { backup, before, shares: {}, after: {} };

  // 1) TEA ← di_tea years 01–02 (Perfil TEA planilhas)
  {
    const slice = rekeyActivities(
      slicePersona(diTea, { years: ["01", "02"] }),
      "tea_share"
    );
    const n = mergePersonaContent(tea, slice);
    report.shares.tea_from_di_tea_y01_y02 = n;
  }

  // 2) PADRÃO ← di_tea years 01–02 level 1 only (baixa complexidade)
  {
    const slice = rekeyActivities(
      slicePersona(diTea, { years: ["01", "02"], levelIndexes: [1] }),
      "padrao_share"
    );
    const n = mergePersonaContent(padrao, slice);
    report.shares.padrao_from_di_tea_y01_y02_n1 = n;
  }

  // 3) DI SEVERA ← di_tea year 01 level 1 (etapas iniciais / bridge EF)
  {
    const slice = rekeyActivities(
      slicePersona(diTea, { years: ["01"], levelIndexes: [1] }),
      "di_severa_share"
    );
    const n = mergePersonaContent(diSevera, slice);
    report.shares.di_severa_from_di_tea_y01_n1 = n;
  }

  // 4) VISUAL ← rebuild as full clone of expanded padrao
  {
    visual.years = [];
    const cloned = clonePersonaContent(padrao, "visual");
    const n = mergePersonaContent(visual, cloned);
    report.shares.visual_from_padrao = n;
  }

  // di_tea untouched
  report.shares.di_tea = "kept full (planilhas DI+TEA 3–5 + DEV 1–5)";

  for (const p of catalog.personas) {
    sortPersona(p);
    report.after[p.slug] = {
      pt: countActs(p, "pt"),
      all: countActs(p),
      years_pt: yearCounts(p),
    };
  }

  catalog.personas_rebalanced_at = new Date().toISOString();
  catalog.personas_rebalance_rules = {
    tea: "clone di_tea years 01–02 (planilhas 1/2 Ano Perfil TEA)",
    padrao: "clone di_tea years 01–02 level 1 (baixa complexidade)",
    di_severa: "clone di_tea year 01 level 1 + keep infantil 4/5 anos",
    di_tea: "keep all (DI+TEA 1–5)",
    visual: "full clone of expanded padrao",
  };

  fs.writeFileSync(CATALOG, JSON.stringify(catalog));

  console.log(JSON.stringify(report, null, 2));
  console.log(
    "\nPT summary:",
    catalog.personas.map((p) => `${p.slug}:${countActs(p, "pt")}`).join(" | ")
  );
  console.log(
    "ALL summary:",
    catalog.personas.map((p) => `${p.slug}:${countActs(p)}`).join(" | ")
  );
}

main();
