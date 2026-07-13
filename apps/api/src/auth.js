/**
 * optionalAuth — JWT from painel (when present).
 * Extracts language from claims: lang | locale | language
 */
import { normalizeLang } from "./lang.js";

function decodeJwtPayload(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    req.token = header.slice(7);
    // TODO: verify signature with painel public key when available
    const payload = decodeJwtPayload(req.token) || {};
    const lang = normalizeLang(
      payload.lang || payload.locale || payload.language || payload.preferred_language
    );
    req.user = {
      anonymous: false,
      tokenPresent: true,
      language: lang,
      ...payload,
    };
  } else {
    req.user = { anonymous: true, tokenPresent: false, language: "pt" };
  }
  next();
}
