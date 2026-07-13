/**
 * Proxy requests to painel API (avoids CORS for localhost / new game host).
 * Web calls: /api/painel/auth/me  →  PAINEL/auth/me
 * Env: PAINEL_API_URL
 */
const PAINEL = (
  process.env.PAINEL_API_URL || "https://painel.inclusivamentemaiseduca.com.br/api"
).replace(/\/$/, "");

export function mountPainelProxy(app) {
  app.use("/api/painel", async (req, res) => {
    // req.url is path after /api/painel, e.g. /auth/me or /activities
    const sub = req.url.startsWith("/") ? req.url : `/${req.url}`;
    const url = `${PAINEL}${sub}`;

    const headers = {
      Accept: "application/json",
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      headers["Content-Type"] = "application/json";
    }

    try {
      const init = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body != null) {
        init.body = JSON.stringify(req.body);
      }
      const r = await fetch(url, init);
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text, success: false };
      }
      res.status(r.status).json(data);
    } catch (e) {
      console.error("painel proxy error", url, e.message);
      res.status(502).json({ success: false, message: e.message || "painel_proxy_error" });
    }
  });
}
