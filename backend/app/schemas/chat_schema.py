# app/schemas/chat_schema.py
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str