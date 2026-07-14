import re
import uuid
from dataclasses import dataclass

import fitz

from app.models.schemas import Chapter


CHAPTER_PATTERNS = [
    re.compile(r"^(?:chapter|chap\.?)\s+(\d+|[ivxlcdm]+)[:\.\s\-]*(.*)$", re.I),
    re.compile(r"^(\d+)\.\s+([A-Z].+)$"),
    re.compile(r"^part\s+(\d+|[ivxlcdm]+)[:\.\s\-]*(.*)$", re.I),
]


@dataclass
class PageText:
    page_num: int
    text: str


def extract_pages(pdf_path: str) -> list[PageText]:
    doc = fitz.open(pdf_path)
    pages: list[PageText] = []
    for i, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            pages.append(PageText(page_num=i + 1, text=text))
    doc.close()
    return pages


def _looks_like_chapter_heading(line: str) -> bool:
    line = line.strip()
    if len(line) < 3 or len(line) > 120:
        return False
    return any(p.match(line) for p in CHAPTER_PATTERNS)


def _normalize_title(line: str) -> str:
    line = line.strip()
    for pattern in CHAPTER_PATTERNS:
        match = pattern.match(line)
        if match:
            suffix = match.group(2).strip() if match.lastindex and match.lastindex >= 2 else ""
            prefix = match.group(1)
            return f"Chapter {prefix}" + (f": {suffix}" if suffix else "")
    return line[:100]


def detect_chapters(pages: list[PageText]) -> list[Chapter]:
    headings: list[tuple[int, str]] = []

    for page in pages:
        for line in page.text.split("\n"):
            stripped = line.strip()
            if _looks_like_chapter_heading(stripped):
                headings.append((page.page_num, _normalize_title(stripped)))

    if not headings:
        chunk_size = max(1, len(pages) // 5)
        chapters: list[Chapter] = []
        for i in range(0, len(pages), chunk_size):
            end_idx = min(i + chunk_size, len(pages)) - 1
            chapters.append(
                Chapter(
                    id=str(uuid.uuid4()),
                    title=f"Section {len(chapters) + 1} (pp. {pages[i].page_num}–{pages[end_idx].page_num})",
                    page_start=pages[i].page_num,
                    page_end=pages[end_idx].page_num,
                )
            )
        return chapters

    chapters: list[Chapter] = []
    for idx, (page_start, title) in enumerate(headings):
        page_end = (
            headings[idx + 1][0] - 1
            if idx + 1 < len(headings)
            else pages[-1].page_num
        )
        chapters.append(
            Chapter(
                id=str(uuid.uuid4()),
                title=title,
                page_start=page_start,
                page_end=max(page_start, page_end),
            )
        )
    return chapters


def get_chapter_text(pages: list[PageText], chapter: Chapter) -> str:
    parts = [
        p.text
        for p in pages
        if chapter.page_start <= p.page_num <= chapter.page_end
    ]
    return "\n\n".join(parts)
