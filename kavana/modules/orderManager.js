const { v4: uuidv4 } = require('uuid');

class OrderManager {
    constructor(io, queueManager, holdingAreaManager, notificationManager) {
        this.io = io;
        this.queueManager = queueManager;
        this.holdingAreaManager = holdingAreaManager;
        this.notificationManager = notificationManager;
        
        // Orders storage
        this.orders = new Map();
        
        // Stats
        this.stats = {
            totalOrdersToday: 0,
            ordersCompleted: 0,
            ordersPending: 0,
            ordersInHolding: 0,
            totalRevenue: 0
        };

        // Reset stats at midnight
        this.scheduleStatsReset();
    }

    scheduleStatsReset() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msUntilMidnight = midnight - now;

        setTimeout(() => {
            this.resetStats();
            // Schedule next reset
            setInterval(() => this.resetStats(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    resetStats() {
        this.stats = {
            totalOrdersToday: 0,
            ordersCompleted: 0,
            ordersPending: 0,
            ordersInHolding: 0,
            totalRevenue: 0
        };
        this.io.to('staff').emit('statsUpdated', this.stats);
    }

    // Calculate maximum preparation time from items
    calculateMaxPrepTime(items) {
        if (!items || items.length === 0) return 0;
        return Math.max(...items.map(item => item.prepTime || 5));
    }

    // Calculate total price
    calculateTotalPrice(items) {
        if (!items || items.length === 0) return 0;
        return items.reduce((total, item) => {
            const quantity = item.quantity || 1;
            return total + (item.price * quantity);
        }, 0);
    }

    // Create on-spot order
    createOnSpotOrder(userId, items, section) {
        const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 8)}`;
        const orderTime = new Date();
        const maxPrepTime = this.calculateMaxPrepTime(items);
        const readyTime = new Date(orderTime.getTime() + maxPrepTime * 60 * 1000);
        const totalPrice = this.calculateTotalPrice(items);

        const order = {
            id: orderId,
            userId,
            type: 'onspot',
            section,
            items,
            totalPrice,
            maxPrepTime,
            orderTime: orderTime.toISOString(),
            readyTime: readyTime.toISOString(),
            expectedPickupTime: readyTime.toISOString(),
            status: 'accepted', // accepted, preparing, ready, in-holding, completed, cancelled
            statusHistory: [
                { status: 'accepted', time: orderTime.toISOString() }
            ],
            isInHoldingArea: false,
            pickupSlot: null,
            createdAt: orderTime.toISOString()
        };

        this.orders.set(orderId, order);
        
        // Update stats
        this.stats.totalOrdersToday++;
        this.stats.ordersPending++;

        // Assign to queue
        this.queueManager.assignOrderToSlot(order);

        // Emit events
        this.io.to('staff').emit('newOrder', order);
        this.io.to('staff').emit('statsUpdated', this.stats);
        this.notificationManager.sendToUser(userId, 'orderAccepted', {
            orderId,
            message: `Your order has been accepted! Estimated ready time: ${this.formatTime(readyTime)}`,
            readyTime: readyTime.toISOString()
        });

        console.log(`📦 On-spot order created: ${orderId} - Ready at ${this.formatTime(readyTime)}`);
        return order;
    }

    // Create pre-order
    createPreOrder(userId, items, section, pickupTime) {
        const orderId = `PRE-${Date.now()}-${uuidv4().slice(0, 8)}`;
        const orderTime = new Date();
        const requestedPickupTime = new Date(pickupTime);
        const maxPrepTime = this.calculateMaxPrepTime(items);
        
        // Calculate when to start preparing to be ready exactly at pickup time
        const startPrepTime = new Date(requestedPickupTime.getTime() - maxPrepTime * 60 * 1000);
        const totalPrice = this.calculateTotalPrice(items);

        const order = {
            id: orderId,
            userId,
            type: 'preorder',
            section,
            items,
            totalPrice,
            maxPrepTime,
            orderTime: orderTime.toISOString(),
            requestedPickupTime: requestedPickupTime.toISOString(),
            startPrepTime: startPrepTime.toISOString(),
            readyTime: requestedPickupTime.toISOString(),
            expectedPickupTime: requestedPickupTime.toISOString(),
            status: 'scheduled', // scheduled, accepted, preparing, ready, in-holding, completed, cancelled
            statusHistory: [
                { status: 'scheduled', time: orderTime.toISOString() }
            ],
            isInHoldingArea: false,
            pickupSlot: null,
            createdAt: orderTime.toISOString()
        };

        this.orders.set(orderId, order);

        // Update stats
        this.stats.totalOrdersToday++;
        this.stats.ordersPending++;

        // Schedule the order in queue for the pickup time
        this.queueManager.schedulePreOrder(order);

        // Emit events
        this.io.to('staff').emit('newOrder', order);
        this.io.to('staff').emit('statsUpdated', this.stats);
        this.notificationManager.sendToUser(userId, 'orderScheduled', {
            orderId,
            message: `Your pre-order has been scheduled for pickup at ${this.formatTime(requestedPickupTime)}`,
            pickupTime: requestedPickupTime.toISOString()
        });

        console.log(`📅 Pre-order created: ${orderId} - Pickup at ${this.formatTime(requestedPickupTime)}`);
        return order;
    }

    // Update order status
    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.get(orderId);
        if (!order) return null;

        const previousStatus = order.status;
        order.status = newStatus;
        order.statusHistory.push({
            status: newStatus,
            time: new Date().toISOString()
        });

        this.orders.set(orderId, order);

        // Update stats based on status change
        if (newStatus === 'completed' && previousStatus !== 'completed') {
            this.stats.ordersCompleted++;
            this.stats.ordersPending--;
            this.stats.totalRevenue += order.totalPrice;
        } else if (newStatus === 'in-holding') {
            this.stats.ordersInHolding++;
        } else if (previousStatus === 'in-holding' && newStatus !== 'in-holding') {
            this.stats.ordersInHolding--;
        }

        // Emit updates
        this.io.to('staff').emit('orderUpdated', order);
        this.io.to('staff').emit('statsUpdated', this.stats);
        
        // Notify user
        this.notificationManager.sendToUser(order.userId, 'orderStatusUpdate', {
            orderId,
            status: newStatus,
            message: this.getStatusMessage(newStatus, order)
        });

        return order;
    }

    // Get status message for user
    getStatusMessage(status, order) {
        const messages = {
            'accepted': 'Your order has been accepted and is being prepared!',
            'preparing': 'Your order is now being prepared.',
            'ready': `Your order is ready! Please collect from ${order.section === 'cafeteria' ? 'Cafeteria' : 'Lassi Corner'} counter.`,
            'in-holding': 'Your order has been moved to the holding area. Click "Request Pickup" when you arrive.',
            'completed': 'Thank you! Your order has been completed.',
            'cancelled': 'Your order has been cancelled.'
        };
        return messages[status] || 'Order status updated.';
    }

    // Mark order as ready
    markOrderReady(orderId) {
        const order = this.orders.get(orderId);
        if (!order) return null;

        this.updateOrderStatus(orderId, 'ready');
        
        // Send notification
        this.notificationManager.sendToUser(order.userId, 'orderReady', {
            orderId,
            message: `🔔 Your order is ready! Please collect from the pickup counter.`,
            section: order.section
        });

        console.log(`✅ Order ${orderId} is ready for pickup`);
        return order;
    }

    // Complete order (user collected)
    completeOrder(orderId) {
        const order = this.orders.get(orderId);
        if (!order) return { success: false, message: 'Order not found' };

        // Release the pickup slot
        if (order.pickupSlot) {
            this.queueManager.releaseSlot(order.pickupSlot);
        }

        // Remove from holding area if present
        if (order.isInHoldingArea) {
            this.holdingAreaManager.removeFromHolding(orderId);
            order.isInHoldingArea = false;
        }

        this.updateOrderStatus(orderId, 'completed');

        console.log(`🎉 Order ${orderId} completed`);
        return { success: true, order };
    }

    // Check orders status periodically
    checkOrdersStatus() {
        const now = new Date();

        this.orders.forEach((order, orderId) => {
            // Skip completed or cancelled orders
            if (order.status === 'completed' || order.status === 'cancelled') {
                return;
            }

            const readyTime = new Date(order.readyTime);

            // For pre-orders, check if it's time to start preparing
            if (order.type === 'preorder' && order.status === 'scheduled') {
                const startPrepTime = new Date(order.startPrepTime);
                if (now >= startPrepTime) {
                    this.updateOrderStatus(orderId, 'preparing');
                    console.log(`🍳 Starting preparation for pre-order ${orderId}`);
                }
            }

            // Check if order is ready
            if ((order.status === 'accepted' || order.status === 'preparing') && now >= readyTime) {
                this.markOrderReady(orderId);
            }

            // Check if order should be moved to holding area
            // Grace period: 3 minutes after ready time
            if (order.status === 'ready' && !order.isInHoldingArea) {
                const gracePeriod = 3 * 60 * 1000; // 3 minutes
                const holdingTime = new Date(readyTime.getTime() + gracePeriod);
                
                if (now >= holdingTime) {
                    this.holdingAreaManager.moveToHolding(order);
                    order.isInHoldingArea = true;
                    this.updateOrderStatus(orderId, 'in-holding');
                    console.log(`📦 Order ${orderId} moved to holding area`);
                }
            }
        });
    }

    // Get order by ID
    getOrder(orderId) {
        return this.orders.get(orderId);
    }

    // Get all orders
    getAllOrders() {
        return Array.from(this.orders.values());
    }

    // Get user orders
    getUserOrders(userId) {
        return Array.from(this.orders.values())
            .filter(order => order.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get orders by status
    getOrdersByStatus(status) {
        return Array.from(this.orders.values())
            .filter(order => order.status === status);
    }

    // Get today's orders
    getTodaysOrders() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Array.from(this.orders.values())
            .filter(order => new Date(order.createdAt) >= today);
    }

    // Get stats
    getStats() {
        // Recalculate from actual data
        const todaysOrders = this.getTodaysOrders();
        
        return {
            totalOrdersToday: todaysOrders.length,
            ordersCompleted: todaysOrders.filter(o => o.status === 'completed').length,
            ordersPending: todaysOrders.filter(o => 
                !['completed', 'cancelled'].includes(o.status)
            ).length,
            ordersInHolding: todaysOrders.filter(o => o.isInHoldingArea).length,
            totalRevenue: todaysOrders
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.totalPrice, 0)
        };
    }

    // Format time helper
    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}

module.exports = OrderManager;
