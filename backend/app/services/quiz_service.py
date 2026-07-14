import json
import re
import uuid

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from app.config import settings
from app.models.schemas import Chapter, QuizMode, QuizQuestion
from app.services.vector_store import vector_store


class QuizService:
    def __init__(self) -> None:
        self._quizzes: dict[str, list[QuizQuestion]] = {}
        self.llm = ChatOpenAI(
            model=settings.llm_model,
            openai_api_key=settings.openai_api_key or None,
            temperature=0.7,
        )

    def _questions_per_chapter(self, num_chapters: int) -> int:
        if num_chapters <= 1:
            return 5
        if num_chapters <= 3:
            return 4
        return 3

    def _build_fallback_questions(
        self,
        context: str,
        chapter: Chapter,
        count: int,
    ) -> list[QuizQuestion]:
        cleaned = re.sub(r"\s+", " ", context).strip()
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if s.strip()]
        if not sentences:
            sentences = [chapter.title]

        questions: list[QuizQuestion] = []
        for idx in range(min(count, len(sentences))):
            sentence = sentences[idx]
            if len(sentence) > 180:
                sentence = sentence[:180].rsplit(" ", 1)[0] + "…"

            question_text = (
                f"Which option best matches the passage from {chapter.title}?"
            )
            options = [
                sentence,
                f"A statement unrelated to {chapter.title}",
                "A statement that contradicts the passage",
                "A broad claim that is not supported by the excerpt",
            ]
            questions.append(
                QuizQuestion(
                    id=str(uuid.uuid4()),
                    question=question_text,
                    options=options,
                    correct_index=0,
                    explanation="The first option is the closest match to the passage excerpt.",
                    chapter_id=chapter.id,
                    chapter_title=chapter.title,
                )
            )

        if len(questions) < count:
            for _ in range(count - len(questions)):
                questions.append(
                    QuizQuestion(
                        id=str(uuid.uuid4()),
                        question=f"What is the main topic of {chapter.title}?",
                        options=[
                            chapter.title,
                            "An unrelated topic",
                            "A contradictory topic",
                            "A topic outside the excerpt",
                        ],
                        correct_index=0,
                        explanation="The chapter title provides the clearest topic cue when excerpt text is unavailable.",
                        chapter_id=chapter.id,
                        chapter_title=chapter.title,
                    )
                )

        return questions

    async def generate_quiz(
        self,
        document_id: str,
        chapters: list[Chapter],
        chapter_ids: list[str],
        mode: QuizMode,
    ) -> tuple[str, list[QuizQuestion]]:
        selected = [c for c in chapters if c.id in chapter_ids]
        if not selected:
            raise ValueError("No valid chapters selected")

        per_chapter = self._questions_per_chapter(len(selected))
        all_questions: list[QuizQuestion] = []

        for chapter in selected:
            context_rows = vector_store.get_context_for_chapters(
                document_id, [chapter.id], limit=8
            )
            context = "\n\n".join(r["text"] for r in context_rows)
            if not context.strip():
                all_questions.extend(
                    self._build_fallback_questions("", chapter, per_chapter)
                )
                continue

            prompt = f"""Generate exactly {per_chapter} multiple-choice quiz questions based ONLY on this text from "{chapter.title}".

TEXT:
{context[:6000]}

Return a JSON array with objects having:
- "question": string
- "options": array of exactly 4 strings
- "correct_index": integer 0-3
- "explanation": string explaining why the correct answer is right

Return ONLY valid JSON, no markdown."""

            try:
                response = await self.llm.ainvoke([HumanMessage(content=prompt)])
                content = response.content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

                parsed = json.loads(content)
            except Exception:
                parsed = None

            if isinstance(parsed, list):
                for item in parsed[:per_chapter]:
                    all_questions.append(
                        QuizQuestion(
                            id=str(uuid.uuid4()),
                            question=item["question"],
                            options=item["options"],
                            correct_index=item["correct_index"],
                            explanation=item["explanation"],
                            chapter_id=chapter.id,
                            chapter_title=chapter.title,
                        )
                    )
            else:
                all_questions.extend(
                    self._build_fallback_questions(context, chapter, per_chapter)
                )

        if not all_questions:
            raise ValueError("Could not generate quiz questions")

        quiz_id = str(uuid.uuid4())
        self._quizzes[quiz_id] = all_questions
        return quiz_id, all_questions

    def get_questions(self, quiz_id: str) -> list[QuizQuestion]:
        return self._quizzes.get(quiz_id, [])

    def get_question(self, quiz_id: str, question_id: str) -> QuizQuestion | None:
        questions = self._quizzes.get(quiz_id, [])
        return next((q for q in questions if q.id == question_id), None)


quiz_service = QuizService()
