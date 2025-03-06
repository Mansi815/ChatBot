class SpeechManager {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingModal = document.getElementById('recording-modal');
        
        // Setup event listener for recording modal
        this.recordingModal.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            }
        });
    }
    
    async startRecording() {
        return new Promise(async (resolve, reject) => {
            try {
                // Request microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                this.isRecording = true;
                this.audioChunks = [];
                
                // Create media recorder
                this.mediaRecorder = new MediaRecorder(stream);
                
                // Collect audio chunks
                this.mediaRecorder.addEventListener('dataavailable', (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                });
                
                // Handle recording stop
                this.mediaRecorder.addEventListener('stop', async () => {
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Process recorded audio
                    if (this.audioChunks.length > 0) {
                        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                        
                        // Send to server for transcription
                        try {
                            const transcribedText = await this.transcribeAudio(audioBlob);
                            resolve(transcribedText);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error('No audio recorded'));
                    }
                    
                    this.isRecording = false;
                });
                
                // Start recording
                this.mediaRecorder.start();
                
                // Automatically stop recording after 30 seconds
                setTimeout(() => {
                    if (this.isRecording) {
                        this.stopRecording();
                    }
                }, 30000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }
    
    async transcribeAudio(audioBlob) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        
        // Send to server for transcription
        const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.text;
        } else {
            throw new Error(data.message || 'Transcription failed');
        }
    }
    
    async speakText(text) {
        try {
            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Play the audio
                const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
                audio.play();
            } else {
                throw new Error(data.message || 'Text-to-speech failed');
            }
        } catch (error) {
            console.error('Text-to-speech error:', error);
        }
    }
}