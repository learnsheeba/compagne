from fastapi import APIRouter, HTTPException

from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_service
from app.services.document_store import document_store

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    doc = document_store.get(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    reply, sources = await chat_service.chat(
        request.document_id,
        request.message,
        request.history,
    )
    return ChatResponse(reply=reply, sources=sources)
