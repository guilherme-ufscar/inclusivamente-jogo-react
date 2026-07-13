/**
 * Client for painel Inclusivamente activity reporting.
 * Prefer proxy via our API (CORS-safe); fallback direct if VITE_PAINEL_DIRECT=1.
 */

const JWT_KEY = "inclusiva_jwt";
const PENDING_KEY = "inclusiva_pending_reports";

function getStoredToken() {
  try {
    return (
      localStorage.getItem(JWT_KEY) ||
      localStorage.getItem("token") ||
      sessionStorage.getItem(JWT_KEY) ||
      ""
    );
  } catch {
    return "";
  }
}

function painelBase() {
  return (
    import.meta.env.VITE_PAINEL_API ||
    "https://painel.inclusivamentemaiseduca.com.br/api"
  ).replace(/\/$/, "");
}

function useProxy() {
  // Default: proxy through our API to avoid CORS in local/dev
  return import.meta.env.VITE_PAINEL_DIRECT !== "1";
}

function localApiBase() {
  return import.meta.env.VITE_API_URL || "";
}

async function painelFetch(path, { method = "GET", body } = {}) {
  const token = getStoredToken();
  if (!token) {
    return { ok: false, demo: true, error: "no_token" };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  let url;
  if (useProxy()) {
    url = `${localApiBase()}/api/painel${path.startsWith("/") ? path : `/${path}`}`;
  } else {
    url = `${painelBase()}${path.startsWith("/") ? path : `/${path}`}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data.message || data.error || res.statusText,
        data,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message || "network_error" };
  }
}

export async function painelMe() {
  return painelFetch("/auth/me");
}

function queuePending(entry) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    list.push({ ...entry, queuedAt: Date.now() });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* ignore */
  }
}

export async function flushPendingReports() {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return;
  }
  if (!list.length) return;
  const remain = [];
  for (const item of list) {
    const r = await painelFetch(item.path, { method: item.method, body: item.body });
    if (!r.ok && !r.demo) remain.push(item);
  }
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(remain));
  } catch {
    /* ignore */
  }
}

/**
 * Start / create activity on painel.
 * Tries POST /activities then /activities/start.
 * @returns {{ ok, painelId?, demo?, error? }}
 */
export async function startPainelActivity(payload) {
  const attempts = [
    { path: "/activities", method: "POST" },
    { path: "/activities/start", method: "POST" },
    { path: "/activities/create", method: "POST" },
  ];

  let last = null;
  for (const a of attempts) {
    const r = await painelFetch(a.path, { method: a.method, body: payload });
    last = r;
    if (r.demo) return { ok: false, demo: true };
    if (r.ok) {
      const d = r.data?.data ?? r.data;
      const id = d?.id ?? d?.activity?.id ?? d?.activityId ?? null;
      return { ok: true, painelId: id, raw: r.data };
    }
    // 404 path → try next; 401/403 stop
    if (r.status === 401 || r.status === 403) break;
  }

  queuePending({ path: "/activities", method: "POST", body: payload });
  return { ok: false, error: last?.error || "start_failed", queued: true };
}

/**
 * Finish activity on painel.
 */
export async function finishPainelActivity(painelId, stats) {
  if (!painelId) {
    // Try finish-by activity_id if no internal id
    const r = await painelFetch("/activities", {
      method: "POST",
      body: { ...stats, completed: true },
    });
    if (r.demo) return { ok: false, demo: true };
    if (r.ok) return { ok: true, raw: r.data };
    queuePending({
      path: "/activities",
      method: "POST",
      body: { ...stats, completed: true },
    });
    return { ok: false, error: r.error, queued: true };
  }

  const path = `/activities/${painelId}/finish`;
  const r = await painelFetch(path, { method: "POST", body: stats });
  if (r.demo) return { ok: false, demo: true };
  if (r.ok) return { ok: true, raw: r.data };

  // Fallback: full POST with complete flag
  const r2 = await painelFetch("/activities", {
    method: "POST",
    body: { id: painelId, ...stats, completed: true },
  });
  if (r2.ok) return { ok: true, raw: r2.data };

  queuePending({ path, method: "POST", body: stats });
  return { ok: false, error: r.error || r2.error, queued: true };
}
