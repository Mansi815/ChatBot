class ConversationManager {
    constructor() {
        this.conversationBox = document.getElementById('conversation-box');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.micButton = document.getElementById('mic-button');
        
        this.typingAnimator = new TypingAnimator();
        this.speechManager = new SpeechManager();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (but allow Shift+Enter for new lines)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Microphone button for speech input
        this.micButton.addEventListener('click', () => this.startSpeechRecognition());
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        // Clear input field
        this.messageInput.value = '';
        
        // Add user message to UI
        this.addUserMessage(message);
        
        // Get AI response
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: message
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Add AI response with typing animation
                this.addAssistantMessage(data.response, true);
                
                // Check if TTS is enabled and speak the response
                if (document.getElementById('tts-toggle').checked) {
                    this.speechManager.speakText(data.response);
                }
            } else {
                throw new Error(data.message || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addSystemMessage(`Error: ${error.message}`);
        }
    }
    
    addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        
        const headerElement = document.createElement('div');
        headerElement.className = 'message-header';
        headerElement.textContent = 'You';
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.textContent = message;
        
        messageElement.appendChild(headerElement);
        messageElement.appendChild(contentElement);
        
        this.conversationBox.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    addAssistantMessage(message, withAnimation = false) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant-message';
        
        const headerElement = document.createElement('div');
        headerElement.className = 'message-header';
        headerElement.textContent = 'Assistant';
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        messageElement.appendChild(headerElement);
        messageElement.appendChild(contentElement);
        
        this.conversationBox.appendChild(messageElement);
        
        if (withAnimation) {
            // Add typing indicator temporarily
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                typingIndicator.appendChild(dot);
            }
            headerElement.appendChild(typingIndicator);
            
            // Animate typing with a slight delay
            setTimeout(() => {
                headerElement.removeChild(typingIndicator);
                this.typingAnimator.animateTyping(contentElement, message, () => {
                    this.scrollToBottom();
                });
            }, 500);
        } else {
            contentElement.textContent = message;
            this.scrollToBottom();
        }
    }
    
    addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        messageElement.textContent = message;
        
        this.conversationBox.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    clearConversation() {
        while (this.conversationBox.firstChild) {
            this.conversationBox.removeChild(this.conversationBox.firstChild);
        }
    }
    
    messageCount() {
        return this.conversationBox.querySelectorAll('.message:not(.system-message)').length;
    }
    
    scrollToBottom() {
        this.conversationBox.scrollTop = this.conversationBox.scrollHeight;
    }
    
    async startSpeechRecognition() {
        // Show recording modal
        const recordingModal = document.getElementById('recording-modal');
        recordingModal.style.display = 'block';
        
        try {
            // Start speech recognition
            const transcribedText = await this.speechManager.startRecording();
            
            // Hide recording modal
            recordingModal.style.display = 'none';
            
            if (transcribedText) {
                // Set transcribed text to input field
                this.messageInput.value = transcribedText;
                // Focus on input to allow editing if needed
                this.messageInput.focus();
            }
        } catch (error) {
            console.error('Speech recognition error:', error);
            
            // Hide recording modal
            recordingModal.style.display = 'none';
            
            // Show error message
            this.addSystemMessage(`Speech recognition error: ${error.message}`);
        }
    }
}