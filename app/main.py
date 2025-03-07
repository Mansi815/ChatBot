import os
import json
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Form, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
import uvicorn
import base64
import requests
from io import BytesIO

from app.models import ConversationRequest, SpeechRequest, Message, FeedbackRequest
from app.conversation import ConversationManager
from functions.config import settings

# Load environment variables
load_dotenv()

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

app = FastAPI(title="Sales Conversation Training Assistant")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize conversation manager
conversation_manager = ConversationManager()

@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    """Render the main application page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/start-conversation")
async def start_conversation(request: ConversationRequest):
    """Initialize a new conversation with specified roles and scenario"""
    conversation_manager.init_conversation(
        system_role=request.system_role,
        assistant_role=request.assistant_role,
        scenario=request.scenario
    )
    
    role_guidance = conversation_manager.get_role_guidance()
    
    return {
        "status": "success",
        "system_role": request.system_role,
        "assistant_role": request.assistant_role,
        "scenario": request.scenario,
        "role_guidance": role_guidance
    }

@app.post("/api/send-message")
async def process_message(message: Message):
    """Process a user message and get AI response"""
    ai_response = conversation_manager.get_ai_response(message.content)
    return {
        "status": "success",
        "response": ai_response,
        "system_role": conversation_manager.system_role,
        "assistant_role": conversation_manager.assistant_role
    }

@app.post("/api/switch-roles")
async def switch_roles():
    """Switch the roles between system and assistant"""
    conversation_manager.switch_roles()
    role_guidance = conversation_manager.get_role_guidance()
    
    return {
        "status": "success",
        "system_role": conversation_manager.system_role,
        "assistant_role": conversation_manager.assistant_role,
        "role_guidance": role_guidance
    }

@app.post("/api/switch-scenario")
async def switch_scenario(request: ConversationRequest):
    """Switch to a different conversation scenario"""
    conversation_manager.switch_scenario(request.scenario)
    role_guidance = conversation_manager.get_role_guidance()
    
    return {
        "status": "success",
        "scenario": request.scenario,
        "role_guidance": role_guidance
    }

@app.post("/api/reset-conversation")
async def reset_conversation():
    """Reset the current conversation"""
    conversation_manager.reset_conversation()
    return {"status": "success"}

@app.post("/api/analyze-conversation")
async def analyze_conversation(request: FeedbackRequest):
    """Analyze the conversation and provide feedback"""
    feedback = conversation_manager.analyze_conversation()
    return {
        "status": "success",
        "feedback": feedback
    }

@app.post("/api/text-to-speech")
async def text_to_speech(request: SpeechRequest):
    """Convert text to speech audio with female voice"""
    try:
        # Try using local TTS server if available
        try:
            url = 'http://localhost:5000/synthesize'
            # Explicitly set voice to af_heart (female voice)
            data = {'text': request.text, 'voice': "af_heart"}
            response = requests.post(url, json=data, timeout=5)
            audio_data = response.content
        except:
            # Fallback to OpenAI TTS with a female voice
            response = openai.audio.speech.create(
                model="tts-1",
                voice="nova",  # Using 'nova' as it's a female voice
                input=request.text
            )
            audio_data = response.content
        
        # Convert audio data to base64 for sending to client
        base64_audio = base64.b64encode(audio_data).decode('utf-8')
        return {"status": "success", "audio": base64_audio}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
@app.post("/api/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """Convert speech audio to text"""
    try:
        # Read audio file
        audio_data = await file.read()
        
        # Use OpenAI's Whisper API for transcription
        with open("temp_audio.wav", "wb") as f:
            f.write(audio_data)
        
        with open("temp_audio.wav", "rb") as f:
            transcription = openai.audio.transcriptions.create(
                model="whisper-1",
                file=f
            )
        
        # Clean up temp file
        os.remove("temp_audio.wav")
        
        return {"status": "success", "text": transcription.text}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Process the received data
            data_json = json.loads(data)
            
            if data_json["action"] == "message":
                # Handle new message
                ai_response = conversation_manager.get_ai_response(data_json["content"])
                await websocket.send_json({
                    "type": "response",
                    "content": ai_response,
                    "system_role": conversation_manager.system_role,
                    "assistant_role": conversation_manager.assistant_role
                })
            
            elif data_json["action"] == "switch_roles":
                # Handle role switching
                conversation_manager.switch_roles()
                await websocket.send_json({
                    "type": "roles_updated",
                    "system_role": conversation_manager.system_role,
                    "assistant_role": conversation_manager.assistant_role
                })
                
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
                
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
