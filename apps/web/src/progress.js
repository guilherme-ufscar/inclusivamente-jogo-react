/**
 * Sequential unlock ("memorização") for play path only.
 * Keyed by persona + pill so order is per theme.
 */
const KEY = "inclusiva_progress_v1";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function scopeKey(personaSlug, pillId) {
  return `${personaSlug || "padrao"}::${pillId}`;
}

/** Set of completed activity ids (family-agnostic: we store exact activity id) */
export function getCompletedSet(personaSlug, pillId) {
  const all = readAll();
  const arr = all[scopeKey(personaSlug, pillId)]?.completed || [];
  return new Set(arr);
}

export function markCompleted(personaSlug, pillId, activityId) {
  if (!pillId || !activityId) return;
  const all = readAll();
  const k = scopeKey(personaSlug, pillId);
  const cur = all[k] || { completed: [] };
  if (!cur.completed.includes(activityId)) {
    cur.completed.push(activityId);
    all[k] = cur;
    writeAll(all);
  }
}

/**
 * First incomplete index in ordered list; all before are completed.
 * Index 0 always unlocked.
 */
export function firstUnlockedIndex(orderedIds, completedSet) {
  for (let i = 0; i < orderedIds.length; i++) {
    if (!completedSet.has(orderedIds[i])) return i;
  }
  return orderedIds.length; // all done
}

export function isUnlocked(index, orderedIds, completedSet) {
  if (index <= 0) return true;
  // previous must be completed
  return completedSet.has(orderedIds[index - 1]);
}
