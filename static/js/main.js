document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const roleSelect = document.getElementById('role-select');
    const scenarioSelect = document.getElementById('scenario-select');
    const ttsToggle = document.getElementById('tts-toggle');
    const startButton = document.getElementById('start-conversation');
    const roleStatus = document.getElementById('role-status');
    const guidanceText = document.getElementById('guidance-text');
    const switchRolesButton = document.getElementById('switch-roles');
    const analyzeButton = document.getElementById('analyze-conversation');
    const resetButton = document.getElementById('reset-conversation');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeButton = document.querySelector('.close-button');
    const feedbackContent = document.getElementById('feedback-content');

    // App state
    const state = {
        systemRole: '',
        assistantRole: '',
        scenario: '',
        ttsEnabled: false,
        conversationStarted: false
    };

    // Initialize conversation manager
    const conversationManager = new ConversationManager();
    
    // Initialize speech manager
    const speechManager = new SpeechManager();

    // Set up event listeners
    roleSelect.addEventListener('change', updateGuidance);
    scenarioSelect.addEventListener('change', updateGuidance);
    ttsToggle.addEventListener('change', toggleTTS);
    startButton.addEventListener('click', startConversation);
    switchRolesButton.addEventListener('click', switchRoles);
    analyzeButton.addEventListener('click', analyzeConversation);
    resetButton.addEventListener('click', resetConversation);
    closeButton.addEventListener('click', () => {
        feedbackModal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === feedbackModal) {
            feedbackModal.style.display = 'none';
        }
    });

    // Initialize typing animation
    const typingAnimator = new TypingAnimator();

    // Update guidance text based on selected role and scenario
    function updateGuidance() {
        state.systemRole = roleSelect.value;
        state.scenario = scenarioSelect.value;
        
        if (!state.systemRole || !state.scenario) return;
        
        // Show placeholder guidance until conversation starts
        guidanceText.textContent = `As a ${state.systemRole} in a ${state.scenario.replace('_', ' ')} scenario, you'll need to adapt your communication strategy accordingly. Start the conversation to see specific guidance.`;
    }

    // Toggle text-to-speech functionality
    function toggleTTS() {
        state.ttsEnabled = ttsToggle.checked;
        console.log(`TTS ${state.ttsEnabled ? 'enabled' : 'disabled'}`);
    }

    // Start a new conversation
    async function startConversation() {
        state.systemRole = roleSelect.value;
        state.scenario = scenarioSelect.value;
        
        if (!state.systemRole || !state.scenario) {
            alert('Please select both a role and scenario before starting.');
            return;
        }
        
        try {
            const response = await fetch('/api/start-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_role: state.systemRole,
                    scenario: state.scenario
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                state.systemRole = data.system_role;
                state.assistantRole = data.assistant_role;
                state.conversationStarted = true;
                
                // Update UI elements
                roleStatus.textContent = `Your role: ${state.systemRole ? state.systemRole.toUpperCase() : 'Unknown'}`;
                guidanceText.textContent = data.role_guidance;
                
                // Clear conversation
                conversationManager.clearConversation();
                
                // Add welcome message
                const welcomeMsg = `[Conversation started] You are the ${state.systemRole ? state.systemRole.toUpperCase() : 'Unknown'}, the AI is the ${state.assistantRole ? state.assistantRole.toUpperCase() : 'Unknown'}. Scenario: ${state.scenario.replace('_', ' ')}.`;
                conversationManager.addSystemMessage(welcomeMsg);
                
                // Enable interaction
                document.querySelector('.input-area').classList.add('active');
                
                // Disable role and scenario selectors
                roleSelect.disabled = true;
                scenarioSelect.disabled = true;
                startButton.disabled = true;
                
                // Enable control buttons
                switchRolesButton.disabled = false;
                analyzeButton.disabled = false;
                resetButton.disabled = false;
            } else {
                throw new Error(data.message || 'Failed to start conversation');
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            alert('Error starting conversation: ' + error.message);
        }
    }

    // Switch roles during conversation
    async function switchRoles() {
        if (!state.conversationStarted) return;
        
        try {
            const response = await fetch('/api/switch-roles', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Update app state
                state.systemRole = data.system_role;
                state.assistantRole = data.assistant_role;
                
                // Update UI
                roleStatus.textContent = `Your role: ${state.systemRole.toUpperCase()}`;
                guidanceText.textContent = data.role_guidance;
                
                // Add system message
                const roleMsg = `[Roles switched] You are now the ${state.systemRole ? state.systemRole.toUpperCase() : 'Unknown'}, the AI is the ${state.assistantRole ? state.assistantRole.toUpperCase() : 'Unknown'}.`;
                conversationManager.addSystemMessage(roleMsg);
            } else {
                throw new Error(data.message || 'Failed to switch roles');
            }
        } catch (error) {
            console.error('Error switching roles:', error);
            alert('Error switching roles: ' + error.message);
        }
    }

    // Analyze the current conversation
    async function analyzeConversation() {
        if (!state.conversationStarted || conversationManager.messageCount() < 2) {
            alert('Please have a conversation before requesting analysis.');
            return;
        }
        
        try {
            const response = await fetch('/api/analyze-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    include_suggestions: true
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Display feedback in modal
                displayFeedback(data.feedback);
                feedbackModal.style.display = 'block';
            } else {
                throw new Error(data.message || 'Failed to analyze conversation');
            }
        } catch (error) {
            console.error('Error analyzing conversation:', error);
            alert('Error analyzing conversation: ' + error.message);
        }
    }

    // Reset the current conversation
    async function resetConversation() {
        if (!state.conversationStarted) return;
        
        try {
            const response = await fetch('/api/reset-conversation', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Clear conversation UI
                conversationManager.clearConversation();
                
                // Add welcome message
                const welcomeMsg = `[Conversation reset] You are the ${state.systemRole.toUpperCase()}, the AI is the ${state.assistantRole.toUpperCase()}. Scenario: ${state.scenario.replace('_', ' ')}.`;
                conversationManager.addSystemMessage(welcomeMsg);
            } else {
                throw new Error(data.message || 'Failed to reset conversation');
            }
        } catch (error) {
            console.error('Error resetting conversation:', error);
            alert('Error resetting conversation: ' + error.message);
        }
    }

    // Display feedback in the modal
    function displayFeedback(feedback) {
        if (!feedback || feedback.error) {
            feedbackContent.innerHTML = `<p class="error">Error: ${feedback?.error || 'Could not generate feedback'}</p>`;
            return;
        }
        
        // Create HTML for feedback
        let html = '';
        
        if (feedback.strengths) {
            html += `<div class="feedback-section">
                <h3>Strengths</h3>
                <ul>${formatListItems(feedback.strengths)}</ul>
            </div>`;
        }
        
        if (feedback.weaknesses) {
            html += `<div class="feedback-section">
                <h3>Areas for Improvement</h3>
                <ul>${formatListItems(feedback.weaknesses)}</ul>
            </div>`;
        }
        
        if (feedback.key_moments) {
            html += `<div class="feedback-section">
                <h3>Key Moments</h3>
                <ul>${formatListItems(feedback.key_moments)}</ul>
            </div>`;
        }
        
        if (feedback.improvement_suggestions) {
            html += `<div class="feedback-section">
                <h3>Improvement Suggestions</h3>
                <ul>${formatListItems(feedback.improvement_suggestions)}</ul>
            </div>`;
        }
        
        if (feedback.role_specific_feedback) {
            html += `<div class="feedback-section">
                <h3>Role-Specific Feedback</h3>
                <p>${feedback.role_specific_feedback}</p>
            </div>`;
        }
        
        feedbackContent.innerHTML = html;
    }

    // Format list items for feedback display
    function formatListItems(items) {
        if (typeof items === 'string') {
            return `<li>${items}</li>`;
        }
        
        if (Array.isArray(items)) {
            return items.map(item => `<li>${item}</li>`).join('');
        }
        
        return '';
    }

    // Initialize default state
    updateGuidance();
});
