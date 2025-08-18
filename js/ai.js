// AI Tutor functionality
const aiTutor = {
    // DOM Elements
    elements: {},

    // State
    chatHistory: [],
    isChatLoading: false,
    currentContext: null,
    apiKey: null,

    // Initialize
    init() {
        this.getElements();
        this.bindEvents();
        this.setupChatContext();
        this.loadApiKey();
    },

    // Get DOM elements
    getElements() {
        this.elements.aiTutorFab = document.getElementById('ai-tutor-fab');
        this.elements.chatOverlay = document.getElementById('chat-overlay');
        this.elements.closeChatBtn = document.getElementById('close-chat-btn');
        this.elements.chatMessagesContainer = document.getElementById('chat-messages');
        this.elements.chatInputForm = document.getElementById('chat-input-form');
        this.elements.chatInput = document.getElementById('chat-input');
    },

    // Bind events
    bindEvents() {
        this.elements.aiTutorFab.addEventListener('click', () => this.openChat());
        this.elements.closeChatBtn.addEventListener('click', () => this.closeChat());
        this.elements.chatOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.chatOverlay) this.closeChat();
        });
        this.elements.chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });
    },

    // Load API key from localStorage
    loadApiKey() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        if (!this.apiKey) {
            // For demo purposes, use a placeholder
            this.apiKey = "YOUR_GEMINI_API_KEY";
            console.warn("Using placeholder API key. Please set your actual API key in localStorage with key 'gemini_api_key'");
        }
    },

    // Setup chat context based on current lesson/quiz
    setupChatContext() {
        if (app.state.currentView === 'lesson') {
            // Get lesson content as context
            const lessonContent = document.getElementById('lesson-content').innerText;
            this.currentContext = `Lesson: ${app.state.lesson}\n\nContent:\n${lessonContent}`;
        } else {
            this.currentContext = "No specific context available.";
        }
    },

    // Open chat window
    openChat() {
        this.chatHistory = []; // Reset history
        const systemPrompt = `You are an expert medical tutor. Your role is to help a medical student understand the provided context. Be encouraging, clear, and focus on clinical reasoning. The student is currently viewing the following content:\n\n${this.currentContext}\n\nStart the conversation by welcoming the student and asking how you can help with this specific topic.`;
        
        this.chatHistory.push({ role: "system", parts: [{ text: systemPrompt }] });
        
        this.addMessageToChat('ai', 'Hello! I\'m here to help you. How can I assist you with this topic?');
        this.elements.chatOverlay.classList.add('visible');
        this.elements.chatInput.focus();
    },

    // Close chat window
    closeChat() {
        this.elements.chatOverlay.classList.remove('visible');
    },

    // Add message to chat
    addMessageToChat(role, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', role);
        messageElement.textContent = text;
        this.elements.chatMessagesContainer.appendChild(messageElement);
        this.elements.chatMessagesContainer.scrollTop = this.elements.chatMessagesContainer.scrollHeight;
    },

    // Show loading indicator
    showLoadingIndicator() {
        this.isChatLoading = true;
        const indicator = `
            <div class="chat-message ai loading" id="loading-indicator">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>`;
        this.elements.chatMessagesContainer.insertAdjacentHTML('beforeend', indicator);
        this.elements.chatMessagesContainer.scrollTop = this.elements.chatMessagesContainer.scrollHeight;
    },

    // Hide loading indicator
    hideLoadingIndicator() {
        this.isChatLoading = false;
        const indicator = document.getElementById('loading-indicator');
        if (indicator) indicator.remove();
    },

    // Handle sending message
    async handleSendMessage() {
        const userInput = this.elements.chatInput.value.trim();
        if (!userInput || this.isChatLoading) return;
        
        this.addMessageToChat('user', userInput);
        this.chatHistory.push({ role: "user", parts: [{ text: userInput }] });
        this.elements.chatInput.value = '';
        
        this.showLoadingIndicator();
        
        try {
            const aiResponse = await this.callGeminiAPI(this.chatHistory);
            this.hideLoadingIndicator();
            this.addMessageToChat('ai', aiResponse);
            this.chatHistory.push({ role: "model", parts: [{ text: aiResponse }] });
        } catch (error) {
            this.hideLoadingIndicator();
            this.addMessageToChat('ai', 'Sorry, an error occurred while trying to connect. Please try again.');
            console.error("Gemini API Error:", error);
        }
    },

    // Call Gemini API
    async callGeminiAPI(history, retries = 3, delay = 1000) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
        
        const apiHistory = history.filter(msg => msg.role !== 'system').map(msg => ({
            role: msg.role === 'ai' ? 'model' : msg.role,
            parts: msg.parts
        }));
        
        const systemInstruction = history.find(msg => msg.role === 'system');
        const payload = {
            contents: apiHistory,
            systemInstruction: systemInstruction,
            generationConfig: {
                temperature: 0.7,
                topP: 1,
                topK: 1,
                maxOutputTokens: 2048,
            },
        };

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts.length > 0) {
                    return result.candidates[0].content.parts[0].text;
                } else {
                    return "I couldn't find an answer. Can you rephrase your question?";
                }
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            }
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ai-tutor-fab')) {
        aiTutor.init();
    }
});
