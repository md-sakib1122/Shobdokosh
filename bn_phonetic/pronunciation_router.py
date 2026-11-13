"""FastAPI router: English → Bangla pronunciation for EnglishJoy.

Mount in your app:
    from contextlib import asynccontextmanager
    import bn_phonetic
    from pronunciation_router import router as pronunciation_router

    @asynccontextmanager
    async def lifespan(app):
        bn_phonetic.warmup()          # ~0.2 s: loads CMUdict + neural model once
        yield

    app = FastAPI(lifespan=lifespan)
    app.include_router(pronunciation_router, prefix="/api")

Endpoints are plain `def` (CPU-bound, sub-millisecond per word), so FastAPI runs them
in its thread pool; bn_phonetic is thread-safe and caches up to 100k words.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

import bn_phonetic as bn

router = APIRouter(prefix="/pronunciation", tags=["pronunciation"])
log = logging.getLogger("pronunciation")


class WordPronunciation(BaseModel):
    word: str
    bangla: str
    source: str = Field(description="override | cmudict | british | morphology | "
                                    "compound | neural | acronym | rules | passthrough")
    reliable: bool = Field(description="False for model guesses (neural / rules)")


class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)


class TextOut(BaseModel):
    bangla: str
    words: list[WordPronunciation]


def _out(p: bn.Pronunciation) -> WordPronunciation:
    if not p.reliable:
        # Review these periodically and add the good spellings to overrides.json
        log.info("unreliable pronunciation word=%r bangla=%r source=%s", p.word, p.bangla, p.source)
    return WordPronunciation(word=p.word, bangla=p.bangla, source=p.source, reliable=p.reliable)


@router.get("/word", response_model=WordPronunciation)
def pronounce_word(w: str = Query(min_length=1, max_length=64, description="English word")):
    return _out(bn.pronounce(w.strip()))


@router.post("/text", response_model=TextOut)
def pronounce_text(body: TextIn):
    """Whole sentence/essay: Bangla rendering plus per-word details for tooltips."""
    words = bn.analyze_text(body.text)
    return TextOut(bangla=bn.transliterate_text(body.text), words=[_out(p) for p in words])
