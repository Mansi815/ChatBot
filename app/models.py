from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ConversationRequest(BaseModel):
    """Request model for starting or switching a conversation"""
    system_role: str
    assistant_role: Optional[str] = None
    scenario: str

class Message(BaseModel):
    """Message model for user input"""
    content: str

class SpeechRequest(BaseModel):
    """Request model for text-to-speech conversion"""
    text: str
    voice: Optional[str] = "default"

class FeedbackRequest(BaseModel):
    """Request model for conversation analysis"""
    include_suggestions: Optional[bool] = True