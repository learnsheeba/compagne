from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.config import settings
from app.models.schemas import ChatMessage
from app.services.vector_store import vector_store


SYSTEM_PROMPT = """You are a helpful study assistant for a book the user uploaded.
Answer questions based ONLY on the provided context from the book.
If the context does not contain enough information, say so clearly.
Be concise but thorough. Reference chapter titles when relevant."""


class ChatService:
    def __init__(self) -> None:
        self.llm = ChatOpenAI(
            model=settings.llm_model,
            openai_api_key=settings.openai_api_key or None,
            temperature=0.3,
        )

    async def chat(
        self,
        document_id: str,
        message: str,
        history: list[ChatMessage],
    ) -> tuple[str, list[str]]:
        results = vector_store.search(document_id, message, limit=5)
        context_parts = []
        sources: list[str] = []

        for r in results:
            context_parts.append(
                f"[{r['chapter_title']} (pp. {r['page_start']}-{r['page_end']})]\n{r['text']}"
            )
            source_label = f"{r['chapter_title']} (pp. {r['page_start']}-{r['page_end']})"
            if source_label not in sources:
                sources.append(source_label)

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found."

        messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for msg in history[-6:]:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))

        user_content = f"""Context from the book:
{context}

User question: {message}"""
        messages.append(HumanMessage(content=user_content))

        response = await self.llm.ainvoke(messages)
        return response.content, sources


chat_service = ChatService()
