#!/usr/bin/env python3
"""Generate knowledge center locale TS files from Polish source."""
import json
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/knowledgeCenter/articleDefinitions.ts"
OUT = ROOT / "data/knowledgeCenter/locales"

TOPICS_PL = [
    "Konflikty i kłótnie",
    "Komunikacja",
    "Emocje i uczucia",
    "Zaufanie",
    "Intymność",
    "Praca nad sobą",
    "Codzienność i rutyna",
    "Wsparcie partnera",
    "Granice",
    "Długoterminowa relacja",
]

TOPICS = {
    "en": [
        "Conflicts and arguments",
        "Communication",
        "Emotions and feelings",
        "Trust",
        "Intimacy",
        "Personal growth",
        "Daily life and routine",
        "Supporting your partner",
        "Boundaries",
        "Long-term relationship",
    ],
    "de": [
        "Konflikte und Streit",
        "Kommunikation",
        "Emotionen und Gefühle",
        "Vertrauen",
        "Intimität",
        "Persönliche Entwicklung",
        "Alltag und Routine",
        "Partner unterstützen",
        "Grenzen",
        "Langfristige Beziehung",
    ],
    "fr": [
        "Conflits et disputes",
        "Communication",
        "Émotions et sentiments",
        "Confiance",
        "Intimité",
        "Travail sur soi",
        "Quotidien et routine",
        "Soutenir son partenaire",
        "Limites",
        "Relation à long terme",
    ],
    "es": [
        "Conflictos y discusiones",
        "Comunicación",
        "Emociones y sentimientos",
        "Confianza",
        "Intimidad",
        "Trabajo personal",
        "Vida diaria y rutina",
        "Apoyar a la pareja",
        "Límites",
        "Relación a largo plazo",
    ],
    "it": [
        "Conflitti e litigi",
        "Comunicazione",
        "Emozioni e sentimenti",
        "Fiducia",
        "Intimità",
        "Crescita personale",
        "Vita quotidiana e routine",
        "Sostenere il partner",
        "Confini",
        "Relazione a lungo termine",
    ],
}

LANG_TARGETS = ["en", "de", "fr", "es", "it"]


def log(msg: str) -> None:
    print(msg, flush=True)


def parse_articles_node() -> list[dict]:
    script = """
const fs = require('fs');
const src = fs.readFileSync(process.argv[1], 'utf8');
const match = src.match(/export const KNOWLEDGE_ARTICLE_DEFINITIONS[^=]*=\\s*(\\[[\\s\\S]*\\]);/);
const articles = eval(match[1]);
process.stdout.write(JSON.stringify(articles));
"""
    result = subprocess.run(
        ["node", "-e", script, str(SRC)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def ts_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{escaped}'"


def write_pl(articles: list[dict]) -> None:
    lines = ["export const KNOWLEDGE_ARTICLES_PL = ["]
    for art in articles:
        lines.append("  {")
        lines.append(f"    topic: {ts_string(art['topic'])},")
        lines.append(f"    title: {ts_string(art['title'])},")
        lines.append(f"    contentOn: {ts_string(art['contentOn'])},")
        lines.append(f"    contentOna: {ts_string(art['contentOna'])},")
        lines.append("  },")
    lines.append("];\n")
    (OUT / "pl.ts").write_text("\n".join(lines), encoding="utf-8")


def split_chunks(text: str, max_len: int = 3500) -> list[str]:
    parts = text.split("\n\n")
    chunks: list[str] = []
    for part in parts:
        chunk = part.strip()
        if not chunk:
            continue
        if len(chunk) <= max_len:
            chunks.append(chunk)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", chunk)
        buf = ""
        for s in sentences:
            if len(buf) + len(s) + 1 <= max_len:
                buf = (buf + " " + s).strip()
            else:
                if buf:
                    chunks.append(buf)
                buf = s
        if buf:
            chunks.append(buf)
    return chunks


def translate_chunk(args: tuple[str, str, str]) -> tuple[str, str]:
    chunk, target, key = args
    translator = GoogleTranslator(source="pl", target=target)
    for attempt in range(6):
        try:
            return key, translator.translate(chunk)
        except Exception:
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed translating chunk for {target}: {chunk[:80]}...")


def translate_text(text: str, target: str, cache: dict[tuple[str, str], str]) -> str:
    chunks = split_chunks(text)
    if not chunks:
        return text
    jobs = []
    for i, chunk in enumerate(chunks):
        key = f"{target}:{hash(chunk)}:{i}"
        if (chunk, target) in cache:
            continue
        jobs.append((chunk, target, key))

    if jobs:
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(translate_chunk, job) for job in jobs]
            for fut in as_completed(futures):
                key, translated = fut.result()
                orig = next(j[0] for j in jobs if j[2] == key)
                cache[(orig, target)] = translated

    return "\n\n".join(cache[(c, target)] for c in chunks)


def translate_articles(articles: list[dict], target: str) -> list[dict]:
    topic_map = dict(zip(TOPICS_PL, TOPICS[target]))
    cache: dict[tuple[str, str], str] = {}
    translated = []
    total = len(articles)
    for i, art in enumerate(articles):
        log(f"  [{target}] article {i + 1}/{total}")
        translated.append(
            {
                "topic": topic_map[art["topic"]],
                "title": translate_text(art["title"], target, cache),
                "contentOn": translate_text(art["contentOn"], target, cache),
                "contentOna": translate_text(art["contentOna"], target, cache),
            }
        )
    return translated


def write_lang(lang: str, articles: list[dict]) -> None:
    const = f"KNOWLEDGE_ARTICLES_{lang.upper()}"
    lines = [f"export const {const} = ["]
    for art in articles:
        lines.append("  {")
        lines.append(f"    topic: {ts_string(art['topic'])},")
        lines.append(f"    title: {ts_string(art['title'])},")
        lines.append(f"    contentOn: {ts_string(art['contentOn'])},")
        lines.append(f"    contentOna: {ts_string(art['contentOna'])},")
        lines.append("  },")
    lines.append("];\n")
    (OUT / f"{lang}.ts").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    articles = parse_articles_node()
    log(f"Parsed {len(articles)} articles")

    write_pl(articles)
    log("Wrote pl.ts")

    requested = sys.argv[1:] if len(sys.argv) > 1 else LANG_TARGETS
    for lang in requested:
        log(f"Translating to {lang}...")
        translated = translate_articles(articles, lang)
        write_lang(lang, translated)
        log(f"Wrote {lang}.ts ({len(translated)} articles)")


if __name__ == "__main__":
    main()
