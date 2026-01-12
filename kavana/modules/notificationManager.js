class NotificationManager {
    constructor(io) {
        this.io = io;
        this.connectedUsers = null;
        
        // Notification history
        this.notificationHistory = new Map();
    }

    // Set connected users reference
    setConnectedUsers(connectedUsers) {
        this.connectedUsers = connectedUsers;
    }

    // Send notification to specific user
    sendToUser(userId, eventType, data) {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            data,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Store in history
        if (!this.notificationHistory.has(userId)) {
            this.notificationHistory.set(userId, []);
        }
        this.notificationHistory.get(userId).push(notification);

        // Keep only last 50 notifications per user
        const userNotifications = this.notificationHistory.get(userId);
        if (userNotifications.length > 50) {
            this.notificationHistory.set(userId, userNotifications.slice(-50));
        }

        // Send via socket if user is connected
        if (this.connectedUsers && this.connectedUsers.has(userId)) {
            const socketId = this.connectedUsers.get(userId);
            this.io.to(socketId).emit('notification', notification);
            console.log(`📤 Notification sent to user ${userId}: ${eventType}`);
        } else {
            console.log(`📥 Notification stored for user ${userId}: ${eventType} (user offline)`);
        }

        return notification;
    }

    // Send notification to all staff
    sendToStaff(eventType, data) {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            data,
            timestamp: new Date().toISOString()
        };

        this.io.to('staff').emit('staffNotification', notification);
        console.log(`📤 Staff notification sent: ${eventType}`);
        return notification;
    }

    // Send broadcast to all connected users
    broadcast(eventType, data) {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            data,
            timestamp: new Date().toISOString()
        };

        this.io.emit('broadcast', notification);
        console.log(`📢 Broadcast sent: ${eventType}`);
        return notification;
    }

    // Get user's notification history
    getUserNotifications(userId) {
        return this.notificationHistory.get(userId) || [];
    }

    // Mark notification as read
    markAsRead(userId, notificationId) {
        const userNotifications = this.notificationHistory.get(userId);
        if (userNotifications) {
            const notification = userNotifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                return true;
            }
        }
        return false;
    }

    // Mark all notifications as read
    markAllAsRead(userId) {
        const userNotifications = this.notificationHistory.get(userId);
        if (userNotifications) {
            userNotifications.forEach(n => n.read = true);
            return true;
        }
        return false;
    }

    // Get unread count
    getUnreadCount(userId) {
        const userNotifications = this.notificationHistory.get(userId);
        if (userNotifications) {
            return userNotifications.filter(n => !n.read).length;
        }
        return 0;
    }

    // Clear user notifications
    clearUserNotifications(userId) {
        this.notificationHistory.delete(userId);
    }

    // Create order status notification message
    createOrderStatusMessage(status, order) {
        const messages = {
            'accepted': {
                title: 'Order Accepted! 🎉',
                body: `Your order #${order.id.slice(-8)} has been accepted.`,
                icon: '✅'
            },
            'preparing': {
                title: 'Preparing Your Order 👨‍🍳',
                body: `We're now preparing your order #${order.id.slice(-8)}.`,
                icon: '🍳'
            },
            'ready': {
                title: 'Order Ready! 🔔',
                body: `Your order #${order.id.slice(-8)} is ready for pickup!`,
                icon: '🔔'
            },
            'in-holding': {
                title: 'Order in Holding Area 📦',
                body: `Your order #${order.id.slice(-8)} has been moved to the holding area.`,
                icon: '📦'
            },
            'completed': {
                title: 'Order Complete! 🎊',
                body: `Thank you for your order #${order.id.slice(-8)}!`,
                icon: '🎊'
            }
        };

        return messages[status] || {
            title: 'Order Update',
            body: `Status updated for order #${order.id.slice(-8)}`,
            icon: 'ℹ️'
        };
    }

    // Send push notification (for future browser push notifications)
    sendPushNotification(userId, title, body, data = {}) {
        // This would integrate with Web Push API in production
        const notification = {
            id: `push-${Date.now()}`,
            type: 'push',
            title,
            body,
            data,
            timestamp: new Date().toISOString()
        };

        if (this.connectedUsers && this.connectedUsers.has(userId)) {
            const socketId = this.connectedUsers.get(userId);
            this.io.to(socketId).emit('pushNotification', notification);
        }

        return notification;
    }
}

module.exports = NotificationManager;
