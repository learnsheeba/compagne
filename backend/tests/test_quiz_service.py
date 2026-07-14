import unittest

from app.models.schemas import Chapter
from app.services.quiz_service import QuizService


class QuizServiceFallbackTests(unittest.TestCase):
    def test_fallback_questions_are_generated_from_context(self):
        service = QuizService()
        chapter = Chapter(id="chapter-1", title="Chapter 1", page_start=1, page_end=1)

        questions = service._build_fallback_questions(
            "The capital of France is Paris and it is known for its museums.",
            chapter,
            3,
        )

        self.assertEqual(len(questions), 3)
        self.assertTrue(all(q.question for q in questions))
        self.assertTrue(all(len(q.options) == 4 for q in questions))
        self.assertTrue(all(q.correct_index in range(4) for q in questions))


if __name__ == "__main__":
    unittest.main()
