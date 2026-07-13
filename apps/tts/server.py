"""
Neural TTS service (edge-tts / Microsoft Edge Read Aloud voices).
Open-source client; very natural pt-BR female voice, cached for instant replay.

GET /tts?text=...  → audio/mpeg
GET /health
GET /voices
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import re
from pathlib import Path

from aiohttp import web
import edge_tts

DEFAULT_VOICE = os.environ.get("VOICE", "pt-BR-FranciscaNeural")
CACHE_DIR = Path(os.environ.get("CACHE_DIR", "/cache"))
PORT = int(os.environ.get("PORT", "3002"))
# slight rate adjust: +0% default; negative = slower
RATE = os.environ.get("TTS_RATE", "+0%")
PITCH = os.environ.get("TTS_PITCH", "+0Hz")

VOICES = {
    "pt": os.environ.get("VOICE_PT", "pt-BR-FranciscaNeural"),
    "en": os.environ.get("VOICE_EN", "en-US-JennyNeural"),
    "es": os.environ.get("VOICE_ES", "es-MX-DaliaNeural"),
}


def voice_for_lang(lang: str | None) -> str:
    if not lang:
        return DEFAULT_VOICE
    key = str(lang).lower().split("-")[0]
    return VOICES.get(key, DEFAULT_VOICE)


def clean_text(text: str) -> str:
    t = str(text or "")
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    # keep short for TTS
    if len(t) > 800:
        t = t[:800]
    return t


def cache_path(text: str, voice: str) -> Path:
    h = hashlib.sha256(f"{voice}|{RATE}|{PITCH}|{text}".encode("utf-8")).hexdigest()[:32]
    return CACHE_DIR / f"{h}.mp3"


async def synth(text: str, out: Path, voice: str) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=RATE, pitch=PITCH)
    await communicate.save(str(out))


async def handle_tts(request: web.Request) -> web.Response:
    text = clean_text(request.query.get("text", ""))
    if not text:
        return web.json_response({"error": "text required"}, status=400)

    voice = voice_for_lang(request.query.get("lang"))
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = cache_path(text, voice)

    if not path.is_file() or path.stat().st_size < 100:
        tmp = path.with_suffix(".tmp.mp3")
        try:
            await synth(text, tmp, voice)
            tmp.replace(path)
        except Exception as e:
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            return web.json_response(
                {"error": "tts_failed", "detail": str(e), "voice": voice},
                status=502,
            )

    return web.FileResponse(
        path,
        headers={
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-TTS-Voice": voice,
            "X-TTS-Cache": "hit" if path.exists() else "miss",
        },
    )


async def handle_health(_request: web.Request) -> web.Response:
    return web.json_response(
        {"ok": True, "voices": VOICES, "default": DEFAULT_VOICE, "cache": str(CACHE_DIR)}
    )


async def handle_voices(_request: web.Request) -> web.Response:
    voices = await edge_tts.list_voices()
    pt = [v for v in voices if str(v.get("Locale", "")).startswith("pt-BR")]
    return web.json_response({"voice": VOICE, "pt_BR": pt})


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_get("/tts", handle_tts)
    app.router.add_get("/voices", handle_voices)
    # also under /api/tts for convenience when proxied
    app.router.add_get("/api/tts", handle_tts)
    print(f"TTS listening on {PORT} voices={VOICES} cache={CACHE_DIR}", flush=True)
    web.run_app(app, host="0.0.0.0", port=PORT)


if __name__ == "__main__":
    main()
