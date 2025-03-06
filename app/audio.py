import os
import requests
import openai
import io
import tempfile
import base64
from typing import Optional, Dict, Any

class AudioProcessor:
    """Handles speech recognition and synthesis"""
    
    def __init__(self, tts_server_url: str = "http://localhost:5000"):
        self.tts_server_url = tts_server_url
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def speech_to_text(self, audio_data: bytes) -> Dict[str, Any]:
        """Convert speech audio to text using OpenAI's Whisper API"""
        try:
            # Save audio data to a temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file_path = temp_file.name
                temp_file.write(audio_data)
            
            # Use OpenAI Whisper for transcription
            with open(temp_file_path, "rb") as audio_file:
                transcription = self.openai_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            
            # Clean up
            os.unlink(temp_file_path)
            
            return {"status": "success", "text": transcription.text}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def text_to_speech(self, text: str, voice: str = "alloy") -> Dict[str, Any]:
        """Convert text to speech using either local TTS server or OpenAI TTS"""
        try:
            # Try local TTS server first
            try:
                response = requests.post(
                    f"{self.tts_server_url}/synthesize",
                    json={"text": text, "voice": "af_heart"},
                    timeout=5
                )
                if response.status_code == 200:
                    audio_data = response.content
                else:
                    raise Exception("Local TTS server failed")
            except:
                # Fallback to OpenAI TTS
                response = self.openai_client.audio.speech.create(
                    model="tts-1",
                    voice=voice,
                    input=text
                )
                audio_data = response.content
            
            # Convert to base64 for easy transport
            audio_base64 = base64.b64encode(audio_data).decode("utf-8")
            
            return {
                "status": "success", 
                "audio_base64": audio_base64
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e)}