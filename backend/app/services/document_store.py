import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from app.config import settings
from app.models.schemas import Chapter
from app.services.pdf_service import PageText


@dataclass
class StoredDocument:
    document_id: str
    filename: str
    pdf_path: str
    chapters: list[Chapter]
    total_pages: int
    pages: list[PageText] = field(default_factory=list)


class DocumentStore:
    def __init__(self) -> None:
        settings.ensure_dirs()
        self._docs: dict[str, StoredDocument] = {}
        self._meta_path = Path(settings.upload_dir) / "documents.json"
        self._load()

    def _load(self) -> None:
        if not self._meta_path.exists():
            return
        try:
            data = json.loads(self._meta_path.read_text())
            for item in data:
                doc = StoredDocument(
                    document_id=item["document_id"],
                    filename=item["filename"],
                    pdf_path=item["pdf_path"],
                    chapters=[Chapter(**c) for c in item["chapters"]],
                    total_pages=item["total_pages"],
                )
                if Path(doc.pdf_path).exists():
                    self._docs[doc.document_id] = doc
        except (json.JSONDecodeError, KeyError):
            pass

    def _save(self) -> None:
        data = [
            {
                "document_id": d.document_id,
                "filename": d.filename,
                "pdf_path": d.pdf_path,
                "chapters": [c.model_dump() for c in d.chapters],
                "total_pages": d.total_pages,
            }
            for d in self._docs.values()
        ]
        self._meta_path.write_text(json.dumps(data, indent=2))

    def add(self, doc: StoredDocument) -> None:
        self._docs[doc.document_id] = doc
        self._save()

    def get(self, document_id: str) -> StoredDocument | None:
        return self._docs.get(document_id)

    def list_all(self) -> list[StoredDocument]:
        return list(self._docs.values())


document_store = DocumentStore()
