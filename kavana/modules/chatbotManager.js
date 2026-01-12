class ChatbotManager {
    constructor(menuManager) {
        this.menuManager = menuManager;
        
        // User preferences and history storage
        this.userProfiles = new Map();
        
        // Mood mappings
        this.moodMappings = {
            'happy': ['happy', 'energetic', 'celebrating', 'playful'],
            'energetic': ['happy', 'energetic', 'hungry'],
            'calm': ['relaxed', 'calm', 'comfort'],
            'relaxed': ['relaxed', 'calm', 'snacking'],
            'tired': ['tired', 'comfort', 'energetic'],
            'stressed': ['stressed', 'comfort', 'refreshing'],
            'confused': ['relaxed', 'popular'],
            'hungry': ['hungry', 'filling', 'comfort']
        };

        // Taste mappings
        this.tasteMappings = {
            'spicy': ['spicy', 'savory'],
            'sweet': ['sweet', 'creamy', 'fruity'],
            'healthy': ['healthy', 'fresh', 'light'],
            'refreshing': ['refreshing', 'cold', 'tangy'],
            'savory': ['savory', 'spicy', 'filling'],
            'mild': ['mild', 'light', 'comfort']
        };

        // Sentiment keywords
        this.sentimentKeywords = {
            positive: ['good', 'great', 'happy', 'excited', 'wonderful', 'amazing', 'fantastic', 'love', 'awesome', 'energetic', 'cheerful'],
            negative: ['tired', 'sad', 'stressed', 'exhausted', 'bored', 'upset', 'anxious', 'worried', 'down'],
            neutral: ['okay', 'fine', 'normal', 'usual', 'regular', 'not sure', 'confused']
        };

        // Time-based suggestions
        this.timeBasedSuggestions = {
            morning: ['coffee', 'tea', 'healthy', 'light'],
            afternoon: ['filling', 'main', 'energizing'],
            evening: ['comfort', 'indulgent', 'relaxing'],
            night: ['light', 'refreshing']
        };

        // Conversation states
        this.conversationStates = new Map();
    }

    // Initialize or get user profile
    getUserProfile(userId) {
        if (!this.userProfiles.has(userId)) {
            this.userProfiles.set(userId, {
                id: userId,
                preferences: {
                    tastes: [],
                    avoidTastes: [],
                    favoriteItems: [],
                    dietaryRestrictions: []
                },
                orderHistory: [],
                interactionHistory: [],
                recommendationFeedback: [],
                lastMood: null,
                lastTaste: null,
                createdAt: new Date().toISOString()
            });
        }
        return this.userProfiles.get(userId);
    }

    // Process incoming message
    processMessage(userId, message, mood = null, taste = null) {
        const profile = this.getUserProfile(userId);
        const state = this.conversationStates.get(userId) || 'welcome';
        
        let response = {
            type: 'text',
            message: '',
            options: [],
            suggestions: [],
            nextState: state
        };

        // Analyze message sentiment if no mood provided
        if (!mood && message) {
            mood = this.analyzeSentiment(message);
        }

        // Store mood if detected
        if (mood) {
            profile.lastMood = mood;
        }

        // Store taste if provided
        if (taste) {
            profile.lastTaste = taste;
            this.updateTastePreference(profile, taste);
        }

        // Process based on state
        switch (state) {
            case 'welcome':
                response = this.handleWelcome(profile);
                break;
            case 'mood_detection':
                response = this.handleMoodDetection(profile, mood, message);
                break;
            case 'taste_detection':
                response = this.handleTasteDetection(profile, taste, message);
                break;
            case 'suggestions':
                response = this.handleSuggestions(profile, message);
                break;
            case 'feedback':
                response = this.handleFeedback(profile, message);
                break;
            default:
                response = this.handleGeneralMessage(profile, message, mood, taste);
        }

        // Store interaction
        profile.interactionHistory.push({
            message,
            mood,
            taste,
            response: response.message,
            timestamp: new Date().toISOString()
        });

        // Update conversation state
        this.conversationStates.set(userId, response.nextState);

        return response;
    }

    // Handle welcome state
    handleWelcome(profile) {
        const greeting = this.getTimeBasedGreeting();
        let message = `${greeting} 👋 Welcome to the Cafeteria App! I'm here to help you choose the perfect food or drink today!`;
        
        // Check if returning user
        if (profile.orderHistory.length > 0) {
            const lastOrder = profile.orderHistory[profile.orderHistory.length - 1];
            const lastItem = lastOrder.items[0];
            message += `\n\nGood to see you again! Last time you enjoyed ${lastItem?.name || 'something delicious'}. Would you like something similar?`;
        }

        return {
            type: 'greeting',
            message,
            options: [
                { id: 'similar', text: '👍 Yes, something similar', value: 'similar' },
                { id: 'new', text: '🔄 Try something new', value: 'new' },
                { id: 'browse', text: '📋 Browse menu', value: 'browse' }
            ],
            suggestions: [],
            nextState: 'mood_detection'
        };
    }

    // Handle mood detection
    handleMoodDetection(profile, mood, message) {
        if (!mood && message) {
            mood = this.analyzeSentiment(message);
        }

        if (!mood) {
            return {
                type: 'mood_question',
                message: "How are you feeling today? 🤔",
                options: [
                    { id: 'happy', text: '😊 Happy & Energetic', value: 'happy', emoji: '😊' },
                    { id: 'calm', text: '😌 Calm / Relaxed', value: 'calm', emoji: '😌' },
                    { id: 'tired', text: '😴 Tired / Low Energy', value: 'tired', emoji: '😴' },
                    { id: 'confused', text: '🤔 Not Sure', value: 'confused', emoji: '🤔' }
                ],
                allowText: true,
                allowVoice: true,
                nextState: 'mood_detection'
            };
        }

        profile.lastMood = mood;
        const moodResponse = this.getMoodResponse(mood);

        return {
            type: 'mood_acknowledged',
            message: moodResponse,
            options: [],
            nextState: 'taste_detection'
        };
    }

    // Handle taste detection
    handleTasteDetection(profile, taste, message) {
        if (!taste && message) {
            taste = this.detectTasteFromMessage(message);
        }

        if (!taste) {
            const moodBasedPrompt = this.getTasteSuggestionForMood(profile.lastMood);
            
            return {
                type: 'taste_question',
                message: `What kind of taste are you craving right now? ${moodBasedPrompt}`,
                options: [
                    { id: 'spicy', text: '🌶️ Spicy', value: 'spicy', emoji: '🌶️' },
                    { id: 'sweet', text: '🍬 Sweet', value: 'sweet', emoji: '🍬' },
                    { id: 'healthy', text: '🥗 Healthy', value: 'healthy', emoji: '🥗' },
                    { id: 'refreshing', text: '🥤 Refreshing', value: 'refreshing', emoji: '🥤' }
                ],
                allowText: true,
                allowVoice: true,
                nextState: 'taste_detection'
            };
        }

        profile.lastTaste = taste;
        this.updateTastePreference(profile, taste);

        // Get recommendations
        const recommendations = this.getRecommendations(
            profile.id,
            profile.lastMood,
            taste,
            this.getCurrentTimeOfDay()
        );

        return {
            type: 'suggestions',
            message: `Based on your mood and taste preferences, you might enjoy:`,
            suggestions: recommendations.slice(0, 4),
            options: [
                { id: 'add', text: '👍 Yes, add to cart', value: 'add' },
                { id: 'more', text: '🔁 Show more suggestions', value: 'more' },
                { id: 'search', text: "✍️ I'll search myself", value: 'search' }
            ],
            nextState: 'feedback'
        };
    }

    // Handle suggestions state
    handleSuggestions(profile, message) {
        const recommendations = this.getRecommendations(
            profile.id,
            profile.lastMood,
            profile.lastTaste,
            this.getCurrentTimeOfDay()
        );

        return {
            type: 'suggestions',
            message: "Here are some recommendations for you:",
            suggestions: recommendations.slice(0, 4),
            options: [
                { id: 'add', text: '👍 Add to cart', value: 'add' },
                { id: 'more', text: '🔁 Show more', value: 'more' },
                { id: 'search', text: '✍️ Search myself', value: 'search' }
            ],
            nextState: 'feedback'
        };
    }

    // Handle feedback
    handleFeedback(profile, message) {
        const lowerMessage = message?.toLowerCase() || '';

        if (lowerMessage.includes('yes') || lowerMessage.includes('add') || lowerMessage.includes('like')) {
            return {
                type: 'positive_feedback',
                message: "Great choice! 🎉 I've noted your preference. Would you like to complete your order or add more items?",
                options: [
                    { id: 'complete', text: '✅ Complete order', value: 'complete' },
                    { id: 'more', text: '➕ Add more items', value: 'more' }
                ],
                nextState: 'welcome'
            };
        } else if (lowerMessage.includes('more') || lowerMessage.includes('other')) {
            return this.handleSuggestions(profile, message);
        } else if (lowerMessage.includes('search') || lowerMessage.includes('browse') || lowerMessage.includes('myself')) {
            return {
                type: 'browse_menu',
                message: "No problem! You can browse the full menu or tell me what you're looking for. 📋",
                options: [
                    { id: 'cafeteria', text: '🍔 Cafeteria', value: 'cafeteria' },
                    { id: 'lassi', text: '🥤 Lassi Corner', value: 'lassi' }
                ],
                nextState: 'welcome'
            };
        }

        return {
            type: 'clarification',
            message: "I didn't quite catch that. Do you like any of these suggestions?",
            options: [
                { id: 'yes', text: '👍 Yes', value: 'yes' },
                { id: 'no', text: '👎 No, show more', value: 'more' },
                { id: 'browse', text: '📋 Browse menu', value: 'browse' }
            ],
            nextState: 'feedback'
        };
    }

    // Handle general messages
    handleGeneralMessage(profile, message, mood, taste) {
        const lowerMessage = message?.toLowerCase() || '';

        // Check for specific intents
        if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
            this.conversationStates.set(profile.id, 'mood_detection');
            return this.handleMoodDetection(profile, mood, message);
        }

        if (lowerMessage.includes('menu') || lowerMessage.includes('browse')) {
            return {
                type: 'browse_menu',
                message: "Here are our sections. What would you like to explore?",
                options: [
                    { id: 'cafeteria', text: '🍔 Cafeteria', value: 'cafeteria' },
                    { id: 'lassi', text: '🥤 Lassi Corner', value: 'lassi' }
                ],
                nextState: 'welcome'
            };
        }

        if (lowerMessage.includes('order') || lowerMessage.includes('cart')) {
            return {
                type: 'order_action',
                message: "Would you like to view your cart or place a new order?",
                options: [
                    { id: 'cart', text: '🛒 View cart', value: 'cart' },
                    { id: 'new', text: '➕ New order', value: 'new' }
                ],
                nextState: 'welcome'
            };
        }

        // Search for items
        const searchResults = this.menuManager.searchItems(message);
        if (searchResults.length > 0) {
            return {
                type: 'search_results',
                message: `I found some items matching "${message}":`,
                suggestions: searchResults.slice(0, 4),
                options: [
                    { id: 'add', text: '👍 Add to cart', value: 'add' },
                    { id: 'more', text: '🔁 Show more', value: 'more' }
                ],
                nextState: 'feedback'
            };
        }

        // Default response
        return {
            type: 'help',
            message: "I'm here to help! You can:",
            options: [
                { id: 'recommend', text: '💡 Get recommendations', value: 'recommend' },
                { id: 'browse', text: '📋 Browse menu', value: 'browse' },
                { id: 'order', text: '🛒 View order', value: 'order' }
            ],
            nextState: 'welcome'
        };
    }

    // Get recommendations
    getRecommendations(userId, mood, taste, timeOfDay) {
        const profile = this.getUserProfile(userId);
        let allItems = this.menuManager.getAllAvailableItems();
        let scoredItems = [];

        for (const item of allItems) {
            let score = 0;

            // Mood matching
            if (mood && this.moodMappings[mood]) {
                const moodTags = this.moodMappings[mood];
                if (item.mood) {
                    const moodMatch = item.mood.some(m => moodTags.includes(m));
                    if (moodMatch) score += 30;
                }
            }

            // Taste matching
            if (taste && this.tasteMappings[taste]) {
                const tasteTags = this.tasteMappings[taste];
                if (item.taste) {
                    const tasteMatch = item.taste.some(t => tasteTags.includes(t));
                    if (tasteMatch) score += 30;
                }
            }

            // Time of day matching
            if (timeOfDay && this.timeBasedSuggestions[timeOfDay]) {
                const timeTags = this.timeBasedSuggestions[timeOfDay];
                const timeMatch = item.tags.some(t => timeTags.includes(t));
                if (timeMatch) score += 15;
            }

            // User preference matching
            if (profile.preferences.tastes.length > 0) {
                const prefMatch = item.taste?.some(t => profile.preferences.tastes.includes(t));
                if (prefMatch) score += 20;
            }

            // Check if previously ordered (boost familiar items)
            const previouslyOrdered = profile.orderHistory.some(order => 
                order.items.some(i => i.id === item.id)
            );
            if (previouslyOrdered) score += 10;

            // Check positive feedback
            const positiveFeedback = profile.recommendationFeedback.some(f => 
                f.itemId === item.id && f.liked
            );
            if (positiveFeedback) score += 15;

            // Check negative feedback (avoid these)
            const negativeFeedback = profile.recommendationFeedback.some(f => 
                f.itemId === item.id && !f.liked
            );
            if (negativeFeedback) score -= 20;

            // Avoid restricted items
            if (profile.preferences.avoidTastes.length > 0) {
                const avoided = item.taste?.some(t => profile.preferences.avoidTastes.includes(t));
                if (avoided) score -= 50;
            }

            // Popular items bonus
            if (item.tags.includes('popular')) score += 5;

            scoredItems.push({ ...item, score });
        }

        // Sort by score and return top items
        scoredItems.sort((a, b) => b.score - a.score);
        return scoredItems.filter(item => item.score > 0).slice(0, 10);
    }

    // Record feedback
    recordFeedback(userId, itemId, liked) {
        const profile = this.getUserProfile(userId);
        profile.recommendationFeedback.push({
            itemId,
            liked,
            timestamp: new Date().toISOString()
        });

        // Update taste preferences based on feedback
        const item = this.menuManager.getMenuItem(itemId);
        if (item && item.taste) {
            if (liked) {
                item.taste.forEach(t => {
                    if (!profile.preferences.tastes.includes(t)) {
                        profile.preferences.tastes.push(t);
                    }
                });
            } else {
                item.taste.forEach(t => {
                    if (!profile.preferences.avoidTastes.includes(t)) {
                        profile.preferences.avoidTastes.push(t);
                    }
                });
            }
        }
    }

    // Record order
    recordOrder(userId, order) {
        const profile = this.getUserProfile(userId);
        profile.orderHistory.push({
            orderId: order.id,
            items: order.items,
            timestamp: new Date().toISOString()
        });

        // Update favorite items
        order.items.forEach(item => {
            const existingFav = profile.preferences.favoriteItems.find(f => f.id === item.id);
            if (existingFav) {
                existingFav.count++;
            } else {
                profile.preferences.favoriteItems.push({ id: item.id, name: item.name, count: 1 });
            }
        });

        // Sort favorites by count
        profile.preferences.favoriteItems.sort((a, b) => b.count - a.count);
    }

    // Update taste preference
    updateTastePreference(profile, taste) {
        if (taste && !profile.preferences.tastes.includes(taste)) {
            profile.preferences.tastes.push(taste);
            // Keep only recent preferences
            if (profile.preferences.tastes.length > 5) {
                profile.preferences.tastes.shift();
            }
        }
    }

    // Analyze sentiment from text
    analyzeSentiment(text) {
        if (!text) return null;
        const lowerText = text.toLowerCase();

        // Check for mood keywords
        for (const [sentiment, keywords] of Object.entries(this.sentimentKeywords)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    if (sentiment === 'positive') return 'happy';
                    if (sentiment === 'negative') return 'tired';
                    return 'confused';
                }
            }
        }

        return null;
    }

    // Detect taste from message
    detectTasteFromMessage(text) {
        if (!text) return null;
        const lowerText = text.toLowerCase();

        const tasteKeywords = {
            'spicy': ['spicy', 'hot', 'chili', 'masala', 'pepper'],
            'sweet': ['sweet', 'dessert', 'sugar', 'chocolate', 'candy'],
            'healthy': ['healthy', 'light', 'salad', 'fresh', 'diet'],
            'refreshing': ['refreshing', 'cold', 'cool', 'juice', 'drink']
        };

        for (const [taste, keywords] of Object.entries(tasteKeywords)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    return taste;
                }
            }
        }

        return null;
    }

    // Get time-based greeting
    getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning!";
        if (hour < 17) return "Good afternoon!";
        if (hour < 21) return "Good evening!";
        return "Hi there!";
    }

    // Get current time of day
    getCurrentTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 11) return 'morning';
        if (hour >= 11 && hour < 16) return 'afternoon';
        if (hour >= 16 && hour < 21) return 'evening';
        return 'night';
    }

    // Get mood response
    getMoodResponse(mood) {
        const responses = {
            'happy': "That's wonderful to hear! 😊 Let me suggest something to match your great mood!",
            'energetic': "Full of energy! 💪 Let's find something to keep that going!",
            'calm': "Nice and relaxed! 😌 I have some perfect comfort options for you.",
            'relaxed': "Taking it easy! 🧘 Some light refreshments perhaps?",
            'tired': "Need a pick-me-up? 😴 I know just the thing to boost your energy!",
            'stressed': "Let's find something comforting to help you unwind! 🫂",
            'confused': "No worries! 🤔 Let me help you decide with some suggestions!",
            'hungry': "Let's get you something filling! 🍽️"
        };

        return responses[mood] || "Got it! Let me find the perfect options for you!";
    }

    // Get taste suggestion for mood
    getTasteSuggestionForMood(mood) {
        const suggestions = {
            'happy': "Maybe something indulgent to celebrate?",
            'tired': "Something energizing or comforting perhaps?",
            'stressed': "Something soothing might help!",
            'hungry': "Feeling like something filling?"
        };

        return suggestions[mood] || "";
    }

    // Get user history
    getUserHistory(userId) {
        const profile = this.getUserProfile(userId);
        return {
            orderHistory: profile.orderHistory,
            preferences: profile.preferences,
            favoriteItems: profile.preferences.favoriteItems.slice(0, 5)
        };
    }

    // Update user preferences
    updateUserPreferences(userId, preferences) {
        const profile = this.getUserProfile(userId);
        profile.preferences = {
            ...profile.preferences,
            ...preferences
        };
    }

    // Reset conversation
    resetConversation(userId) {
        this.conversationStates.set(userId, 'welcome');
    }
}

module.exports = ChatbotManager;
