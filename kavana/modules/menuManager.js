const { v4: uuidv4 } = require('uuid');

class MenuManager {
    constructor() {
        // Initialize menu with Cafeteria and Lassi Corner sections
        this.menu = {
            cafeteria: {
                name: 'Cafeteria',
                items: [
                    {
                        id: 'caf-001',
                        name: 'Veg Burger',
                        description: 'Crispy veggie patty with fresh vegetables',
                        price: 80,
                        prepTime: 8, // minutes
                        category: 'main',
                        tags: ['vegetarian', 'filling', 'popular'],
                        mood: ['happy', 'energetic', 'hungry'],
                        taste: ['savory', 'spicy'],
                        image: '🍔',
                        available: true
                    },
                    {
                        id: 'caf-002',
                        name: 'Chicken Burger',
                        description: 'Juicy chicken patty with special sauce',
                        price: 120,
                        prepTime: 10,
                        category: 'main',
                        tags: ['non-vegetarian', 'filling', 'popular'],
                        mood: ['happy', 'energetic', 'hungry'],
                        taste: ['savory', 'spicy'],
                        image: '🍔',
                        available: true
                    },
                    {
                        id: 'caf-003',
                        name: 'Masala Fries',
                        description: 'Crispy fries with Indian spices',
                        price: 60,
                        prepTime: 6,
                        category: 'snacks',
                        tags: ['vegetarian', 'snack', 'spicy'],
                        mood: ['happy', 'relaxed', 'bored'],
                        taste: ['spicy', 'savory'],
                        image: '🍟',
                        available: true
                    },
                    {
                        id: 'caf-004',
                        name: 'Cheese Sandwich',
                        description: 'Grilled sandwich with melted cheese',
                        price: 50,
                        prepTime: 5,
                        category: 'snacks',
                        tags: ['vegetarian', 'quick', 'light'],
                        mood: ['relaxed', 'tired'],
                        taste: ['savory', 'mild'],
                        image: '🥪',
                        available: true
                    },
                    {
                        id: 'caf-005',
                        name: 'Veg Pizza Slice',
                        description: 'Loaded veggie pizza slice',
                        price: 70,
                        prepTime: 7,
                        category: 'main',
                        tags: ['vegetarian', 'popular', 'cheesy'],
                        mood: ['happy', 'celebrating'],
                        taste: ['savory', 'cheesy'],
                        image: '🍕',
                        available: true
                    },
                    {
                        id: 'caf-006',
                        name: 'Paneer Roll',
                        description: 'Spiced paneer wrapped in roti',
                        price: 90,
                        prepTime: 8,
                        category: 'main',
                        tags: ['vegetarian', 'filling', 'indian'],
                        mood: ['hungry', 'energetic'],
                        taste: ['spicy', 'savory'],
                        image: '🌯',
                        available: true
                    },
                    {
                        id: 'caf-007',
                        name: 'Chicken Roll',
                        description: 'Tender chicken wrapped in roti',
                        price: 110,
                        prepTime: 9,
                        category: 'main',
                        tags: ['non-vegetarian', 'filling', 'indian'],
                        mood: ['hungry', 'energetic'],
                        taste: ['spicy', 'savory'],
                        image: '🌯',
                        available: true
                    },
                    {
                        id: 'caf-008',
                        name: 'Samosa (2 pcs)',
                        description: 'Crispy potato-filled samosas',
                        price: 30,
                        prepTime: 3,
                        category: 'snacks',
                        tags: ['vegetarian', 'quick', 'indian', 'popular'],
                        mood: ['relaxed', 'snacking'],
                        taste: ['spicy', 'savory'],
                        image: '🥟',
                        available: true
                    },
                    {
                        id: 'caf-009',
                        name: 'Spring Roll',
                        description: 'Crispy vegetable spring rolls',
                        price: 50,
                        prepTime: 5,
                        category: 'snacks',
                        tags: ['vegetarian', 'light', 'crispy'],
                        mood: ['relaxed', 'snacking'],
                        taste: ['savory', 'mild'],
                        image: '🥢',
                        available: true
                    },
                    {
                        id: 'caf-010',
                        name: 'Veg Biryani',
                        description: 'Aromatic rice with vegetables',
                        price: 100,
                        prepTime: 12,
                        category: 'main',
                        tags: ['vegetarian', 'filling', 'indian', 'rice'],
                        mood: ['hungry', 'tired', 'comfort'],
                        taste: ['spicy', 'aromatic'],
                        image: '🍚',
                        available: true
                    },
                    {
                        id: 'caf-011',
                        name: 'Chicken Biryani',
                        description: 'Aromatic rice with tender chicken',
                        price: 140,
                        prepTime: 15,
                        category: 'main',
                        tags: ['non-vegetarian', 'filling', 'indian', 'rice'],
                        mood: ['hungry', 'tired', 'comfort'],
                        taste: ['spicy', 'aromatic'],
                        image: '🍚',
                        available: true
                    },
                    {
                        id: 'caf-012',
                        name: 'Fresh Salad',
                        description: 'Mixed greens with light dressing',
                        price: 60,
                        prepTime: 4,
                        category: 'healthy',
                        tags: ['vegetarian', 'healthy', 'light', 'fresh'],
                        mood: ['healthy', 'light', 'energetic'],
                        taste: ['fresh', 'healthy'],
                        image: '🥗',
                        available: true
                    },
                    {
                        id: 'caf-013',
                        name: 'Coffee',
                        description: 'Hot brewed coffee',
                        price: 30,
                        prepTime: 3,
                        category: 'beverages',
                        tags: ['vegetarian', 'quick', 'hot', 'caffeine'],
                        mood: ['tired', 'focused', 'morning'],
                        taste: ['bitter', 'warm'],
                        image: '☕',
                        available: true
                    },
                    {
                        id: 'caf-014',
                        name: 'Tea',
                        description: 'Hot masala chai',
                        price: 20,
                        prepTime: 3,
                        category: 'beverages',
                        tags: ['vegetarian', 'quick', 'hot', 'indian'],
                        mood: ['relaxed', 'tired', 'comfort'],
                        taste: ['warm', 'spiced'],
                        image: '🍵',
                        available: true
                    },
                    {
                        id: 'caf-015',
                        name: 'Cold Coffee',
                        description: 'Chilled coffee with ice cream',
                        price: 50,
                        prepTime: 4,
                        category: 'beverages',
                        tags: ['vegetarian', 'cold', 'sweet', 'caffeine'],
                        mood: ['tired', 'hot', 'refreshing'],
                        taste: ['sweet', 'refreshing', 'cold'],
                        image: '🧋',
                        available: true
                    }
                ]
            },
            lassiCorner: {
                name: 'Lassi Corner',
                items: [
                    {
                        id: 'las-001',
                        name: 'Sweet Lassi',
                        description: 'Traditional creamy sweet yogurt drink',
                        price: 40,
                        prepTime: 3,
                        category: 'lassi',
                        tags: ['vegetarian', 'sweet', 'refreshing', 'popular'],
                        mood: ['happy', 'relaxed', 'hot'],
                        taste: ['sweet', 'refreshing', 'creamy'],
                        image: '🥛',
                        available: true
                    },
                    {
                        id: 'las-002',
                        name: 'Mango Lassi',
                        description: 'Creamy lassi blended with fresh mangoes',
                        price: 60,
                        prepTime: 4,
                        category: 'lassi',
                        tags: ['vegetarian', 'sweet', 'fruity', 'popular'],
                        mood: ['happy', 'celebrating', 'hot'],
                        taste: ['sweet', 'fruity', 'refreshing'],
                        image: '🥭',
                        available: true
                    },
                    {
                        id: 'las-003',
                        name: 'Rose Lassi',
                        description: 'Fragrant lassi with rose essence',
                        price: 50,
                        prepTime: 3,
                        category: 'lassi',
                        tags: ['vegetarian', 'sweet', 'floral', 'unique'],
                        mood: ['relaxed', 'romantic', 'calm'],
                        taste: ['sweet', 'floral', 'refreshing'],
                        image: '🌹',
                        available: true
                    },
                    {
                        id: 'las-004',
                        name: 'Salted Lassi',
                        description: 'Traditional savory lassi with cumin',
                        price: 35,
                        prepTime: 3,
                        category: 'lassi',
                        tags: ['vegetarian', 'savory', 'traditional'],
                        mood: ['hot', 'tired', 'refreshing'],
                        taste: ['savory', 'refreshing', 'tangy'],
                        image: '🥛',
                        available: true
                    },
                    {
                        id: 'las-005',
                        name: 'Strawberry Lassi',
                        description: 'Sweet lassi with fresh strawberries',
                        price: 65,
                        prepTime: 4,
                        category: 'lassi',
                        tags: ['vegetarian', 'sweet', 'fruity'],
                        mood: ['happy', 'playful'],
                        taste: ['sweet', 'fruity', 'refreshing'],
                        image: '🍓',
                        available: true
                    },
                    {
                        id: 'las-006',
                        name: 'Banana Lassi',
                        description: 'Creamy lassi with ripe bananas',
                        price: 55,
                        prepTime: 4,
                        category: 'lassi',
                        tags: ['vegetarian', 'sweet', 'filling', 'healthy'],
                        mood: ['hungry', 'tired', 'energetic'],
                        taste: ['sweet', 'creamy', 'filling'],
                        image: '🍌',
                        available: true
                    },
                    {
                        id: 'las-007',
                        name: 'Chocolate Milkshake',
                        description: 'Rich chocolate shake with ice cream',
                        price: 70,
                        prepTime: 5,
                        category: 'milkshakes',
                        tags: ['vegetarian', 'sweet', 'indulgent', 'popular'],
                        mood: ['happy', 'celebrating', 'stressed'],
                        taste: ['sweet', 'chocolatey', 'creamy'],
                        image: '🍫',
                        available: true
                    },
                    {
                        id: 'las-008',
                        name: 'Vanilla Milkshake',
                        description: 'Classic vanilla shake with ice cream',
                        price: 60,
                        prepTime: 5,
                        category: 'milkshakes',
                        tags: ['vegetarian', 'sweet', 'classic'],
                        mood: ['relaxed', 'nostalgic'],
                        taste: ['sweet', 'creamy', 'vanilla'],
                        image: '🍦',
                        available: true
                    },
                    {
                        id: 'las-009',
                        name: 'Oreo Shake',
                        description: 'Creamy shake blended with Oreo cookies',
                        price: 80,
                        prepTime: 5,
                        category: 'milkshakes',
                        tags: ['vegetarian', 'sweet', 'indulgent', 'popular'],
                        mood: ['happy', 'playful', 'celebrating'],
                        taste: ['sweet', 'chocolatey', 'crunchy'],
                        image: '🍪',
                        available: true
                    },
                    {
                        id: 'las-010',
                        name: 'Fresh Lime Soda',
                        description: 'Refreshing lime with soda water',
                        price: 30,
                        prepTime: 2,
                        category: 'refreshers',
                        tags: ['vegetarian', 'refreshing', 'light', 'tangy'],
                        mood: ['hot', 'tired', 'thirsty'],
                        taste: ['tangy', 'refreshing', 'fizzy'],
                        image: '🍋',
                        available: true
                    },
                    {
                        id: 'las-011',
                        name: 'Mint Lemonade',
                        description: 'Cool mint and lemon refresher',
                        price: 40,
                        prepTime: 3,
                        category: 'refreshers',
                        tags: ['vegetarian', 'refreshing', 'healthy', 'cooling'],
                        mood: ['hot', 'stressed', 'refreshing'],
                        taste: ['refreshing', 'minty', 'tangy'],
                        image: '🌿',
                        available: true
                    },
                    {
                        id: 'las-012',
                        name: 'Butterscotch Shake',
                        description: 'Rich butterscotch flavored shake',
                        price: 75,
                        prepTime: 5,
                        category: 'milkshakes',
                        tags: ['vegetarian', 'sweet', 'indulgent'],
                        mood: ['happy', 'celebrating', 'comfort'],
                        taste: ['sweet', 'buttery', 'creamy'],
                        image: '🧈',
                        available: true
                    },
                    {
                        id: 'las-013',
                        name: 'Kesar Lassi',
                        description: 'Premium lassi with saffron strands',
                        price: 70,
                        prepTime: 4,
                        category: 'lassi',
                        tags: ['vegetarian', 'premium', 'traditional', 'royal'],
                        mood: ['celebrating', 'special', 'relaxed'],
                        taste: ['sweet', 'aromatic', 'rich'],
                        image: '🥛',
                        available: true
                    },
                    {
                        id: 'las-014',
                        name: 'Mixed Fruit Smoothie',
                        description: 'Blend of seasonal fresh fruits',
                        price: 80,
                        prepTime: 5,
                        category: 'smoothies',
                        tags: ['vegetarian', 'healthy', 'fruity', 'energizing'],
                        mood: ['healthy', 'energetic', 'morning'],
                        taste: ['sweet', 'fruity', 'fresh'],
                        image: '🍹',
                        available: true
                    },
                    {
                        id: 'las-015',
                        name: 'Cold Badam Milk',
                        description: 'Chilled almond milk with saffron',
                        price: 60,
                        prepTime: 3,
                        category: 'traditional',
                        tags: ['vegetarian', 'healthy', 'traditional', 'nutty'],
                        mood: ['tired', 'healthy', 'energetic'],
                        taste: ['sweet', 'nutty', 'refreshing'],
                        image: '🥜',
                        available: true
                    }
                ]
            }
        };
    }

    getFullMenu() {
        return this.menu;
    }

    getMenuBySection(section) {
        if (section === 'cafeteria') return this.menu.cafeteria;
        if (section === 'lassi' || section === 'lassiCorner') return this.menu.lassiCorner;
        return null;
    }

    getMenuItem(itemId) {
        // Search in cafeteria
        let item = this.menu.cafeteria.items.find(i => i.id === itemId);
        if (item) return { ...item, section: 'cafeteria' };

        // Search in lassi corner
        item = this.menu.lassiCorner.items.find(i => i.id === itemId);
        if (item) return { ...item, section: 'lassiCorner' };

        return null;
    }

    getItemsByIds(itemIds) {
        const items = [];
        for (const id of itemIds) {
            const item = this.getMenuItem(id);
            if (item) items.push(item);
        }
        return items;
    }

    addMenuItem(section, item) {
        const newItem = {
            id: uuidv4(),
            ...item,
            available: true
        };

        if (section === 'cafeteria') {
            this.menu.cafeteria.items.push(newItem);
        } else if (section === 'lassiCorner') {
            this.menu.lassiCorner.items.push(newItem);
        }

        return newItem;
    }

    updateMenuItem(itemId, updates) {
        // Search and update in cafeteria
        let index = this.menu.cafeteria.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            this.menu.cafeteria.items[index] = {
                ...this.menu.cafeteria.items[index],
                ...updates
            };
            return this.menu.cafeteria.items[index];
        }

        // Search and update in lassi corner
        index = this.menu.lassiCorner.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            this.menu.lassiCorner.items[index] = {
                ...this.menu.lassiCorner.items[index],
                ...updates
            };
            return this.menu.lassiCorner.items[index];
        }

        return null;
    }

    getItemsForMood(mood) {
        const allItems = [
            ...this.menu.cafeteria.items,
            ...this.menu.lassiCorner.items
        ];

        return allItems.filter(item => 
            item.available && item.mood && item.mood.includes(mood.toLowerCase())
        );
    }

    getItemsForTaste(taste) {
        const allItems = [
            ...this.menu.cafeteria.items,
            ...this.menu.lassiCorner.items
        ];

        return allItems.filter(item => 
            item.available && item.taste && item.taste.includes(taste.toLowerCase())
        );
    }

    getItemsByCategory(category) {
        const allItems = [
            ...this.menu.cafeteria.items,
            ...this.menu.lassiCorner.items
        ];

        return allItems.filter(item => 
            item.available && item.category === category
        );
    }

    searchItems(query) {
        const allItems = [
            ...this.menu.cafeteria.items,
            ...this.menu.lassiCorner.items
        ];

        const lowerQuery = query.toLowerCase();
        return allItems.filter(item => 
            item.available && (
                item.name.toLowerCase().includes(lowerQuery) ||
                item.description.toLowerCase().includes(lowerQuery) ||
                item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
            )
        );
    }

    getAllAvailableItems() {
        return [
            ...this.menu.cafeteria.items.filter(i => i.available),
            ...this.menu.lassiCorner.items.filter(i => i.available)
        ];
    }
}

module.exports = MenuManager;
