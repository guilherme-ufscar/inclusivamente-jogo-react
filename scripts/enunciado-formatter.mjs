/**
 * Mirrors Unity GameFunctions.EnunciadoFormatter
 */
export function enunciadoFormatter(enunciado) {
  if (!enunciado || typeof enunciado !== "string") return null;
  let resultado = enunciado.toUpperCase();
  resultado = resultado.replace(/<BR>/gi, " ");
  // Keep A-Z, 0-9, underscore, Portuguese accents, space
  resultado = resultado.replace(/[^A-Z0-9_ÁÀÂÃÉÊÍÓÔÕÚÇÜ ]/gi, "");
  // Normalize to uppercase again for accented lowercase if any slipped
  resultado = resultado.toUpperCase();
  let palavras = resultado.split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return null;
  if (palavras.length > 5) palavras = palavras.slice(0, 5);
  return palavras.join("_");
}

export function audioUrlFromStatement(statement) {
  const name = enunciadoFormatter(statement);
  if (!name) return null;
  return `https://painel.inclusivamentemaiseduca.com.br/uploads/audios/${name}.wav`;
}

export function backgroundUrl(backgroundId) {
  if (!backgroundId) return null;
  const id = String(backgroundId).trim();
  if (id.startsWith("http")) return id;
  // Local static (content/media/bgs) when present
  // Painel may also host some assets; player falls back to gradient if 404
  return `/media/bgs/${id}.jpg`;
}
