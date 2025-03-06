import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    """Application settings"""
    app_name: str = "Sales Conversation Training Assistant"
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    tts_server_url: str = os.getenv("TTS_SERVER_URL", "http://localhost:5000")
    
    # Available scenarios
    scenarios: list = ["product_pitch", "objection_handling", "negotiation", "upselling"]
    
    # Available roles
    roles: list = ["sales specialist", "customer"]
    
    class Config:
        env_file = ".env"

# Create settings instance
settings = Settings()