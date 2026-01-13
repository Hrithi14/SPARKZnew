const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// [ADDED] Firebase Imports
const admin = require('firebase-admin');

// [ADDED] Initialize Firebase
// NOTE: Ensure 'serviceAccountKey.json' is in the same folder as this file!
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin Initialized Successfully!");
} catch (error) {
    console.warn("⚠️ Warning: Could not connect to Firebase.");
    console.warn("   Make sure 'serviceAccountKey.json' is present if you want to use the database features.");
}

// [ADDED] Database Reference
const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import modules
const OrderManager = require('./modules/orderManager');
const QueueManager = require('./modules/queueManager');
const HoldingAreaManager = require('./modules/holdingAreaManager');
const MenuManager = require('./modules/menuManager');
const ChatbotManager = require('./modules/chatbotManager');
const NotificationManager = require('./modules/notificationManager');

// Initialize managers
const menuManager = new MenuManager();
const notificationManager = new NotificationManager(io);
const queueManager = new QueueManager(notificationManager);
const holdingAreaManager = new HoldingAreaManager(notificationManager, queueManager);
const orderManager = new OrderManager(io, queueManager, holdingAreaManager, notificationManager);
const chatbotManager = new ChatbotManager(menuManager);

// Store connected users
const connectedUsers = new Map();

// ========================
// API ROUTES
// ========================

// Menu Routes
app.get('/api/menu', (req, res) => {
    res.json(menuManager.getFullMenu());
});

app.get('/api/menu/:section', (req, res) => {
    const section = req.params.section;
    const menu = menuManager.getMenuBySection(section);
    if (menu) {
        res.json(menu);
    } else {
        res.status(404).json({ error: 'Section not found' });
    }
});

app.post('/api/menu/item', (req, res) => {
    const { section, item } = req.body;
    const result = menuManager.addMenuItem(section, item);
    io.emit('menuUpdated', menuManager.getFullMenu());
    res.json(result);
});

app.put('/api/menu/item/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const result = menuManager.updateMenuItem(id, updates);
    io.emit('menuUpdated', menuManager.getFullMenu());
    res.json(result);
});

// Order Routes
app.post('/api/orders/onspot', (req, res) => {
    const { userId, items, section } = req.body;
    const order = orderManager.createOnSpotOrder(userId, items, section);
    res.json(order);
});

app.post('/api/orders/preorder', (req, res) => {
    const { userId, items, section, pickupTime } = req.body;
    const order = orderManager.createPreOrder(userId, items, section, pickupTime);
    res.json(order);
});

app.get('/api/orders', (req, res) => {
    res.json(orderManager.getAllOrders());
});

app.get('/api/orders/user/:userId', (req, res) => {
    const { userId } = req.params;
    res.json(orderManager.getUserOrders(userId));
});

app.get('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    const order = orderManager.getOrder(orderId);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

app.post('/api/orders/:orderId/complete', (req, res) => {
    const { orderId } = req.params;
    const result = orderManager.completeOrder(orderId);
    res.json(result);
});

// Holding Area Routes
app.get('/api/holding-area', (req, res) => {
    res.json(holdingAreaManager.getHoldingAreaOrders());
});

app.post('/api/holding-area/request-pickup', (req, res) => {
    const { orderId, userId } = req.body;
    const result = holdingAreaManager.requestPickup(orderId, userId);
    res.json(result);
});

// Queue Routes
app.get('/api/queue/status', (req, res) => {
    res.json(queueManager.getQueueStatus());
});

app.get('/api/queue/slots', (req, res) => {
    res.json(queueManager.getAvailableSlots());
});

// Dashboard Stats
app.get('/api/stats', (req, res) => {
    res.json(orderManager.getStats());
});

// Chatbot Routes
app.post('/api/chatbot/message', (req, res) => {
    const { userId, message, mood, taste } = req.body;
    const response = chatbotManager.processMessage(userId, message, mood, taste);
    res.json(response);
});

app.get('/api/chatbot/recommendations/:userId', (req, res) => {
    const { userId } = req.params;
    const { mood, taste, timeOfDay } = req.query;
    const recommendations = chatbotManager.getRecommendations(userId, mood, taste, timeOfDay);
    res.json(recommendations);
});

app.post('/api/chatbot/feedback', (req, res) => {
    const { userId, itemId, liked } = req.body;
    chatbotManager.recordFeedback(userId, itemId, liked);
    res.json({ success: true });
});

app.get('/api/chatbot/history/:userId', (req, res) => {
    const { userId } = req.params;
    const history = chatbotManager.getUserHistory(userId);
    res.json(history);
});

// User preference routes
app.post('/api/user/preferences', (req, res) => {
    const { userId, preferences } = req.body;
    chatbotManager.updateUserPreferences(userId, preferences);
    res.json({ success: true });
});

// ==========================================
// [ADDED] HACKATHON: FIREBASE SYNC ROUTE
// ==========================================
app.get('/api/firebase/seed', async (req, res) => {
    try {
        if (!admin.apps.length) throw new Error("Firebase not initialized.");

        // 1. Get current data from MenuManager
        const fullMenu = menuManager.getFullMenu();

        // 2. Prepare a batch write
        const batch = db.batch();
        
        // 3. Loop through sections and add them to the batch
        for (const [section, items] of Object.entries(fullMenu)) {
            // This will overwrite the document in 'hackathon_sample_data' collection
            const docRef = db.collection('hackathon_sample_data').doc(section);
            batch.set(docRef, { items: items });
        }

        // 4. Commit to Firebase
        await batch.commit();

        console.log("✅ Data synced to Firebase successfully.");
        res.json({ 
            success: true, 
            message: "Sample data successfully uploaded to Firebase!",
            target_collection: "hackathon_sample_data"
        });

    } catch (error) {
        console.error("❌ Firebase Sync Error:", error.message);
        res.status(500).json({ 
            error: "Failed to sync with Firebase", 
            details: error.message 
        });
    }
});

// ========================
// SOCKET.IO EVENTS
// ========================

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User registration
    socket.on('registerUser', (userId) => {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Staff registration
    socket.on('registerStaff', () => {
        socket.join('staff');
        console.log(`Staff member connected: ${socket.id}`);
    });

    // Order events
    socket.on('placeOrder', (orderData) => {
        const { type, userId, items, section, pickupTime } = orderData;
        let order;
        
        if (type === 'onspot') {
            order = orderManager.createOnSpotOrder(userId, items, section);
        } else if (type === 'preorder') {
            order = orderManager.createPreOrder(userId, items, section, pickupTime);
        }

        socket.emit('orderPlaced', order);
        io.to('staff').emit('newOrder', order);
    });

    // Request pickup from holding area
    socket.on('requestPickup', (data) => {
        const { orderId, userId } = data;
        const result = holdingAreaManager.requestPickup(orderId, userId);
        socket.emit('pickupRequestResponse', result);
    });

    // Staff actions
    socket.on('markOrderReady', (orderId) => {
        orderManager.markOrderReady(orderId);
    });

    socket.on('markOrderCompleted', (orderId) => {
        orderManager.completeOrder(orderId);
    });

    // Chatbot interaction
    socket.on('chatbotMessage', (data) => {
        const { userId, message, mood, taste } = data;
        const response = chatbotManager.processMessage(userId, message, mood, taste);
        socket.emit('chatbotResponse', response);
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
        }
        console.log('Client disconnected:', socket.id);
    });
});

// Make connectedUsers available to notification manager
notificationManager.setConnectedUsers(connectedUsers);

// ========================
// TIME-BASED CHECKS
// ========================

// Check orders every 10 seconds for ready status and holding area moves
setInterval(() => {
    orderManager.checkOrdersStatus();
    holdingAreaManager.checkHoldingAreaOrders();
}, 10000);

// Check queue slots every 5 seconds
setInterval(() => {
    queueManager.processQueue();
}, 5000);

// ========================
// SERVE FRONTEND
// ========================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/staff', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff.html'));
});

// ========================
// START SERVER
// ========================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🍔 Cafeteria Management System running on http://localhost:${PORT}`);
    console.log(`📊 Staff Dashboard available at http://localhost:${PORT}/staff`);
    console.log(`🔥 To sync sample data to DB, visit: http://localhost:${PORT}/api/firebase/seed`);
});

module.exports = { app, io };