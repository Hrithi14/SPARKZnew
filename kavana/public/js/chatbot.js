// =============================================
// CHATBOT MODULE
// =============================================

let chatbotOpen = false;
let conversationHistory = [];
let currentMood = null;
let currentTaste = null;
let voiceRecognition = null;

// =============================================
// INITIALIZATION
// =============================================

function initChatbot() {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = 'en-US';

        voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
            sendChatMessage();
        };

        voiceRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast('Voice input failed. Please try again.', 'error');
            document.getElementById('voiceBtn').classList.remove('listening');
        };

        voiceRecognition.onend = () => {
            document.getElementById('voiceBtn').classList.remove('listening');
        };
    }

    // Show welcome message after delay
    setTimeout(() => {
        showChatbotTooltip();
    }, 3000);
}

// =============================================
// CHATBOT UI FUNCTIONS
// =============================================

function toggleChatbot() {
    const container = document.getElementById('chatbotContainer');
    const toggle = document.getElementById('chatbotToggle');
    
    chatbotOpen = !chatbotOpen;
    container.classList.toggle('open', chatbotOpen);
    toggle.classList.toggle('active', chatbotOpen);

    if (chatbotOpen && conversationHistory.length === 0) {
        // Start conversation
        startConversation();
    }
}

function showChatbotTooltip() {
    const tooltip = document.querySelector('.chatbot-tooltip');
    if (tooltip && !chatbotOpen) {
        tooltip.classList.add('show');
        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 5000);
    }
}

function startConversation() {
    // Send initial welcome message
    sendToBackend('', null, null);
}

// =============================================
// MESSAGE HANDLING
// =============================================

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    // Add user message to chat
    addMessage(message, 'user');
    input.value = '';

    // Send to backend
    await sendToBackend(message, currentMood, currentTaste);
}

async function sendToBackend(message, mood, taste) {
    showTypingIndicator();

    try {
        const response = await fetch('/api/chatbot/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser,
                message,
                mood,
                taste
            })
        });

        const data = await response.json();
        hideTypingIndicator();

        // Process response
        handleChatbotResponse(data);

    } catch (error) {
        hideTypingIndicator();
        console.error('Chatbot error:', error);
        addMessage("Sorry, I'm having trouble connecting. Please try again.", 'bot');
    }
}

function handleChatbotResponse(response) {
    // Add bot message
    addMessage(response.message, 'bot');

    // Store conversation
    conversationHistory.push({
        type: response.type,
        message: response.message,
        timestamp: new Date().toISOString()
    });

    // Show options if available
    if (response.options && response.options.length > 0) {
        showOptions(response.options, response.type);
    }

    // Show suggestions if available
    if (response.suggestions && response.suggestions.length > 0) {
        showSuggestions(response.suggestions);
    }

    // Update state
    if (response.nextState === 'taste_detection' && response.type === 'mood_acknowledged') {
        // Ask for taste after mood acknowledgment
        setTimeout(() => {
            sendToBackend('', currentMood, null);
        }, 1000);
    }
}

function addMessage(text, sender) {
    const container = document.getElementById('chatbotMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-content">
            ${sender === 'bot' ? '<div class="bot-avatar"><i class="fas fa-robot"></i></div>' : ''}
            <div class="message-bubble">
                <p>${text}</p>
                <span class="message-time">${time}</span>
            </div>
        </div>
    `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function showOptions(options, type) {
    const container = document.getElementById('chatbotOptions');
    container.innerHTML = '';

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.innerHTML = `${option.emoji || ''} ${option.text}`;
        btn.onclick = () => handleOptionClick(option, type);
        container.appendChild(btn);
    });

    container.classList.add('show');
}

function showSuggestions(suggestions) {
    const container = document.getElementById('chatbotMessages');
    
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'chat-suggestions';

    suggestionsDiv.innerHTML = `
        <div class="suggestions-grid">
            ${suggestions.map(item => `
                <div class="suggestion-card" onclick="addSuggestionToCart('${item.id}', '${item.section || 'cafeteria'}')">
                    <div class="suggestion-emoji">${item.image}</div>
                    <div class="suggestion-info">
                        <h5>${item.name}</h5>
                        <span class="suggestion-price">₹${item.price}</span>
                    </div>
                    <button class="add-btn">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    container.appendChild(suggestionsDiv);
    container.scrollTop = container.scrollHeight;
}

function handleOptionClick(option, type) {
    // Clear options
    document.getElementById('chatbotOptions').classList.remove('show');

    // Add user selection as message
    addMessage(option.text, 'user');

    // Handle based on option type
    switch (option.value) {
        case 'happy':
        case 'calm':
        case 'tired':
        case 'confused':
        case 'energetic':
        case 'stressed':
        case 'hungry':
            currentMood = option.value;
            sendToBackend(option.value, option.value, null);
            break;

        case 'spicy':
        case 'sweet':
        case 'healthy':
        case 'refreshing':
            currentTaste = option.value;
            sendToBackend(option.value, currentMood, option.value);
            break;

        case 'similar':
            sendToBackend('I want something similar to my last order', currentMood, currentTaste);
            break;

        case 'new':
        case 'recommend':
            currentMood = null;
            currentTaste = null;
            sendToBackend('recommend something new', null, null);
            break;

        case 'browse':
        case 'search':
            addMessage("You can browse the menu by clicking on Cafeteria or Lassi Corner in the navigation!", 'bot');
            break;

        case 'cafeteria':
            toggleChatbot();
            showSection('cafeteria');
            break;

        case 'lassi':
            toggleChatbot();
            showSection('lassi');
            break;

        case 'add':
        case 'yes':
            addMessage("Great! I've noted your preferences. The items have been added to your cart! 🛒", 'bot');
            break;

        case 'more':
            sendToBackend('show me more options', currentMood, currentTaste);
            break;

        case 'cart':
        case 'order':
            toggleChatbot();
            toggleCart();
            break;

        case 'complete':
            toggleChatbot();
            toggleCart();
            break;

        default:
            sendToBackend(option.value, currentMood, currentTaste);
    }
}

function addSuggestionToCart(itemId, section) {
    // Find item in menu
    const menuSection = section === 'cafeteria' ? menu.cafeteria : menu.lassiCorner;
    const item = menuSection.items.find(i => i.id === itemId);

    if (item) {
        window.addToCartFromChatbot(item, section);
        addMessage(`Added ${item.name} to your cart! 🛒`, 'bot');
        
        // Record positive feedback
        recordFeedback(itemId, true);
    }
}

// =============================================
// TYPING INDICATOR
// =============================================

function showTypingIndicator() {
    const container = document.getElementById('chatbotMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="bot-avatar"><i class="fas fa-robot"></i></div>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// =============================================
// VOICE INPUT
// =============================================

function startVoiceInput() {
    if (!voiceRecognition) {
        showToast('Voice input is not supported in your browser', 'warning');
        return;
    }

    const btn = document.getElementById('voiceBtn');
    
    if (btn.classList.contains('listening')) {
        voiceRecognition.stop();
        btn.classList.remove('listening');
    } else {
        voiceRecognition.start();
        btn.classList.add('listening');
        showToast('Listening...', 'info');
    }
}

// =============================================
// KEYBOARD HANDLING
// =============================================

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

// =============================================
// FEEDBACK & LEARNING
// =============================================

async function recordFeedback(itemId, liked) {
    try {
        await fetch('/api/chatbot/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser,
                itemId,
                liked
            })
        });
    } catch (error) {
        console.error('Error recording feedback:', error);
    }
}

// Export for app.js to record orders
window.chatbotRecordOrder = async function(cartItems) {
    // This would be called when an order is placed to update preferences
    for (const item of cartItems) {
        await recordFeedback(item.id, true);
    }
};

// =============================================
// QUICK ACTIONS
// =============================================

function quickRecommend() {
    if (!chatbotOpen) toggleChatbot();
    sendToBackend('recommend something', null, null);
}

function quickBrowse(section) {
    if (chatbotOpen) toggleChatbot();
    showSection(section);
}

// Add quick action buttons to chatbot
function addQuickActions() {
    const container = document.getElementById('chatbotMessages');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'quick-actions';
    actionsDiv.innerHTML = `
        <button onclick="quickRecommend()"><i class="fas fa-magic"></i> Quick Recommend</button>
        <button onclick="quickBrowse('cafeteria')"><i class="fas fa-hamburger"></i> Cafeteria</button>
        <button onclick="quickBrowse('lassi')"><i class="fas fa-glass-water"></i> Lassi Corner</button>
    `;
    container.appendChild(actionsDiv);
}
