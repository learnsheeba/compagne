import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.models.schemas import UploadResponse
from app.services.document_store import StoredDocument, document_store
from app.services.pdf_service import detect_chapters, extract_pages
from app.services.vector_store import vector_store

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    document_id = str(uuid.uuid4())
    save_path = Path(settings.upload_dir) / f"{document_id}.pdf"

    content = await file.read()
    save_path.write_bytes(content)

    pages = extract_pages(str(save_path))
    if not pages:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    chapters = detect_chapters(pages)
    chunk_count = vector_store.create_index(document_id, pages, chapters)

    doc = StoredDocument(
        document_id=document_id,
        filename=file.filename,
        pdf_path=str(save_path),
        chapters=chapters,
        total_pages=pages[-1].page_num,
        pages=pages,
    )
    document_store.add(doc)

    return UploadResponse(
        document_id=document_id,
        filename=file.filename,
        chapters=chapters,
        total_pages=pages[-1].page_num,
        message=f"Document indexed successfully with {chunk_count} chunks across {len(chapters)} chapters.",
    )


@router.get("/{document_id}")
async def get_document(document_id: str):
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "document_id": doc.document_id,
        "filename": doc.filename,
        "chapters": doc.chapters,
        "total_pages": doc.total_pages,
    }
