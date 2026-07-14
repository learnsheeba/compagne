from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    QuizQuestionPublic,
    QuizRequest,
    QuizResponse,
    ScoreRequest,
    ScoreResponse,
    ScoreResult,
    VerifyAnswerRequest,
    VerifyAnswerResponse,
)
from app.services.document_store import document_store
from app.services.quiz_service import quiz_service

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    doc = document_store.get(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        quiz_id, questions = await quiz_service.generate_quiz(
            request.document_id,
            doc.chapters,
            request.chapter_ids,
            request.mode,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    public = [
        QuizQuestionPublic(
            id=q.id,
            question=q.question,
            options=q.options,
            chapter_id=q.chapter_id,
            chapter_title=q.chapter_title,
        )
        for q in questions
    ]
    return QuizResponse(quiz_id=quiz_id, mode=request.mode, questions=public)


@router.post("/verify", response_model=VerifyAnswerResponse)
async def verify_answer(request: VerifyAnswerRequest):
    question = quiz_service.get_question(request.quiz_id, request.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return VerifyAnswerResponse(
        question_id=question.id,
        correct_index=question.correct_index,
        explanation=question.explanation,
    )


@router.post("/score", response_model=ScoreResponse)
async def score_quiz(request: ScoreRequest):
    questions = quiz_service.get_questions(request.quiz_id)
    if not questions:
        raise HTTPException(status_code=404, detail="Quiz not found")

    answer_map = {a.question_id: a.selected_index for a in request.answers}
    results: list[ScoreResult] = []
    score = 0

    for q in questions:
        selected = answer_map.get(q.id, -1)
        correct = selected == q.correct_index
        if correct:
            score += 1
        results.append(
            ScoreResult(
                question_id=q.id,
                correct=correct,
                correct_index=q.correct_index,
                explanation=q.explanation,
                selected_index=selected,
            )
        )

    return ScoreResponse(score=score, total=len(questions), results=results)
