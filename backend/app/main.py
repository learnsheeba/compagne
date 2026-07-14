from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, documents, quiz

settings.ensure_dirs()

app = FastAPI(
    title="Compagne API",
    description="PDF RAG, quiz generation, and chat for study companions",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(quiz.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
