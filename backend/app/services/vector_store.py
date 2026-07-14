import json
import uuid
from pathlib import Path

import lancedb
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.config import settings
from app.models.schemas import Chapter
from app.services.pdf_service import PageText, get_chapter_text


class VectorStoreService:
    def __init__(self) -> None:
        settings.ensure_dirs()
        self.db = lancedb.connect(settings.lancedb_path)
        self.embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            openai_api_key=settings.openai_api_key or None,
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )

    def _table_name(self, document_id: str) -> str:
        return f"doc_{document_id.replace('-', '_')}"

    def create_index(
        self,
        document_id: str,
        pages: list[PageText],
        chapters: list[Chapter],
    ) -> int:
        chapter_map = {c.id: c.title for c in chapters}
        docs: list[Document] = []

        for chapter in chapters:
            text = get_chapter_text(pages, chapter)
            if not text.strip():
                continue
            for chunk in self.splitter.split_text(text):
                docs.append(
                    Document(
                        page_content=chunk,
                        metadata={
                            "document_id": document_id,
                            "chapter_id": chapter.id,
                            "chapter_title": chapter.title,
                            "page_start": chapter.page_start,
                            "page_end": chapter.page_end,
                        },
                    )
                )

        if not docs:
            raise ValueError("No text content found in the PDF")

        texts = [d.page_content for d in docs]
        vectors = self.embeddings.embed_documents(texts)
        records = [
            {
                "id": str(uuid.uuid4()),
                "vector": vec,
                "text": doc.page_content,
                "document_id": doc.metadata["document_id"],
                "chapter_id": doc.metadata["chapter_id"],
                "chapter_title": doc.metadata["chapter_title"],
                "page_start": doc.metadata["page_start"],
                "page_end": doc.metadata["page_end"],
            }
            for doc, vec in zip(docs, vectors)
        ]

        table_name = self._table_name(document_id)
        if table_name in self.db.table_names():
            self.db.drop_table(table_name)

        self.db.create_table(table_name, data=records)
        return len(records)

    def search(
        self,
        document_id: str,
        query: str,
        chapter_ids: list[str] | None = None,
        limit: int = 5,
    ) -> list[dict]:
        table_name = self._table_name(document_id)
        if table_name not in self.db.table_names():
            return []

        query_vector = self.embeddings.embed_query(query)
        table = self.db.open_table(table_name)
        results = table.search(query_vector).limit(limit * 3).to_list()

        if chapter_ids:
            results = [r for r in results if r["chapter_id"] in chapter_ids]

        return results[:limit]

    def get_context_for_chapters(
        self,
        document_id: str,
        chapter_ids: list[str],
        limit: int = 12,
    ) -> list[dict]:
        table_name = self._table_name(document_id)
        if table_name not in self.db.table_names():
            return []

        table = self.db.open_table(table_name)
        try:
            table_data = table.to_arrow()
            rows = table_data.to_pylist()
            filtered = [r for r in rows if r.get("chapter_id") in chapter_ids]
            return filtered[:limit]
        except Exception:
            return []


vector_store = VectorStoreService()
