from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class QuizMode(str, Enum):
    STRICT = "strict"
    STUDY = "study"


class Chapter(BaseModel):
    id: str
    title: str
    page_start: int
    page_end: int


class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    chapters: list[Chapter]
    total_pages: int


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chapters: list[Chapter]
    total_pages: int
    message: str


class QuizRequest(BaseModel):
    document_id: str
    chapter_ids: list[str]
    mode: QuizMode = QuizMode.STRICT


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    correct_index: int
    explanation: str
    chapter_id: str
    chapter_title: str


class QuizQuestionPublic(BaseModel):
    id: str
    question: str
    options: list[str]
    chapter_id: str
    chapter_title: str


class QuizResponse(BaseModel):
    quiz_id: str
    mode: QuizMode
    questions: list[QuizQuestionPublic]


class ScoreAnswer(BaseModel):
    question_id: str
    selected_index: int


class ScoreRequest(BaseModel):
    quiz_id: str
    answers: list[ScoreAnswer]


class ScoreResult(BaseModel):
    question_id: str
    correct: bool
    correct_index: int
    explanation: str
    selected_index: int


class ScoreResponse(BaseModel):
    score: int
    total: int
    results: list[ScoreResult]


class VerifyAnswerRequest(BaseModel):
    quiz_id: str
    question_id: str


class VerifyAnswerResponse(BaseModel):
    question_id: str
    correct_index: int
    explanation: str
    selected_was_correct: Optional[bool] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    document_id: str
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = Field(default_factory=list)
