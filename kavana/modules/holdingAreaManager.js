class HoldingAreaManager {
    constructor(notificationManager, queueManager) {
        this.notificationManager = notificationManager;
        this.queueManager = queueManager;
        
        // Holding areas for each section
        this.holdingArea = {
            cafeteria: new Map(),
            lassiCorner: new Map()
        };

        // Pending pickup requests
        this.pendingPickupRequests = new Map();

        // Max holding time before order is considered abandoned (30 minutes)
        this.maxHoldingTime = 30 * 60 * 1000;
    }

    // Get section key
    getSectionKey(section) {
        if (section === 'cafeteria') return 'cafeteria';
        if (section === 'lassi' || section === 'lassiCorner') return 'lassiCorner';
        return 'cafeteria';
    }

    // Move order to holding area
    moveToHolding(order) {
        const sectionKey = this.getSectionKey(order.section);
        
        const holdingEntry = {
            orderId: order.id,
            userId: order.userId,
            order: order,
            movedAt: new Date().toISOString(),
            originalReadyTime: order.readyTime,
            pickupRequested: false,
            pickupRequestTime: null
        };

        this.holdingArea[sectionKey].set(order.id, holdingEntry);

        // Release the pickup slot if occupied
        if (order.pickupSlot) {
            this.queueManager.releaseSlot(order.pickupSlot);
        }

        // Notify user
        this.notificationManager.sendToUser(order.userId, 'movedToHolding', {
            orderId: order.id,
            message: '📦 Your order has been moved to the holding area because it was not collected on time. Click "Request Pickup" when you arrive to collect it.',
            section: order.section
        });

        console.log(`📦 Order ${order.id} moved to holding area at ${sectionKey}`);
        return holdingEntry;
    }

    // Request pickup from holding area
    requestPickup(orderId, userId) {
        // Find the order in holding area
        let holdingEntry = null;
        let sectionKey = null;

        for (const [section, orders] of Object.entries(this.holdingArea)) {
            if (orders.has(orderId)) {
                holdingEntry = orders.get(orderId);
                sectionKey = section;
                break;
            }
        }

        if (!holdingEntry) {
            return {
                success: false,
                message: 'Order not found in holding area'
            };
        }

        // Verify user ownership
        if (holdingEntry.userId !== userId) {
            return {
                success: false,
                message: 'Unauthorized: This order does not belong to you'
            };
        }

        // Check if pickup already requested
        if (holdingEntry.pickupRequested) {
            const existingRequest = this.pendingPickupRequests.get(orderId);
            if (existingRequest) {
                return {
                    success: false,
                    message: 'Pickup already requested. Please wait for your turn.',
                    queuePosition: this.queueManager.getQueuePosition(orderId, sectionKey),
                    estimatedWait: existingRequest.estimatedWait
                };
            }
        }

        // Try to get a pickup slot
        const slotResult = this.queueManager.tryAssignSlot(orderId, sectionKey, userId);

        if (slotResult.success) {
            // Slot is available - move order to pickup counter
            holdingEntry.pickupRequested = true;
            holdingEntry.pickupRequestTime = new Date().toISOString();

            // Update order with new slot
            holdingEntry.order.pickupSlot = slotResult.slot.id;

            // Notify user
            this.notificationManager.sendToUser(userId, 'pickupSlotAssigned', {
                orderId,
                slot: slotResult.slot.name,
                message: `✅ Your order is ready at ${slotResult.slot.name}! Please collect it now.`,
                section: sectionKey
            });

            console.log(`✅ Holding order ${orderId} assigned to ${slotResult.slot.name}`);

            return {
                success: true,
                message: slotResult.message,
                slot: slotResult.slot,
                action: 'collect_now'
            };
        } else {
            // No slot available - add to queue
            holdingEntry.pickupRequested = true;
            holdingEntry.pickupRequestTime = new Date().toISOString();

            const queueResult = this.queueManager.addToWaitingQueue(orderId, userId, sectionKey, 1); // Priority 1 for holding area

            // Store pending request
            this.pendingPickupRequests.set(orderId, {
                userId,
                section: sectionKey,
                requestTime: new Date().toISOString(),
                estimatedWait: slotResult.estimatedWait
            });

            // Notify user
            this.notificationManager.sendToUser(userId, 'pickupQueued', {
                orderId,
                position: queueResult.position,
                estimatedWait: slotResult.estimatedWait,
                message: `⏳ All pickup counters are currently busy. You are #${queueResult.position} in queue. Estimated wait: ${slotResult.estimatedWait} minutes. We'll notify you when your slot is ready.`
            });

            console.log(`⏳ Holding order ${orderId} queued for pickup - Position: ${queueResult.position}`);

            return {
                success: true,
                message: slotResult.message,
                queuePosition: queueResult.position,
                estimatedWait: slotResult.estimatedWait,
                action: 'wait_for_slot'
            };
        }
    }

    // Remove order from holding area
    removeFromHolding(orderId) {
        for (const [section, orders] of Object.entries(this.holdingArea)) {
            if (orders.has(orderId)) {
                orders.delete(orderId);
                this.pendingPickupRequests.delete(orderId);
                console.log(`🗑️ Order ${orderId} removed from holding area`);
                return true;
            }
        }
        return false;
    }

    // Get all orders in holding area
    getHoldingAreaOrders() {
        const orders = {
            cafeteria: [],
            lassiCorner: []
        };

        this.holdingArea.cafeteria.forEach((entry, orderId) => {
            orders.cafeteria.push({
                orderId,
                ...entry,
                waitingTime: this.calculateWaitingTime(entry.movedAt)
            });
        });

        this.holdingArea.lassiCorner.forEach((entry, orderId) => {
            orders.lassiCorner.push({
                orderId,
                ...entry,
                waitingTime: this.calculateWaitingTime(entry.movedAt)
            });
        });

        return orders;
    }

    // Calculate waiting time in holding area
    calculateWaitingTime(movedAt) {
        const now = new Date();
        const moved = new Date(movedAt);
        const diffMs = now - moved;
        const diffMins = Math.floor(diffMs / 60000);
        return diffMins;
    }

    // Check holding area for abandoned orders
    checkHoldingAreaOrders() {
        const now = new Date();

        for (const [section, orders] of Object.entries(this.holdingArea)) {
            orders.forEach((entry, orderId) => {
                const movedAt = new Date(entry.movedAt);
                const holdingTime = now - movedAt;

                // Send reminder notifications
                if (holdingTime > 10 * 60 * 1000 && holdingTime < 11 * 60 * 1000) {
                    // 10 minute reminder
                    this.notificationManager.sendToUser(entry.userId, 'holdingReminder', {
                        orderId,
                        message: '⚠️ Your order has been in the holding area for 10 minutes. Please collect it soon.',
                        waitingTime: 10
                    });
                }

                if (holdingTime > 20 * 60 * 1000 && holdingTime < 21 * 60 * 1000) {
                    // 20 minute reminder
                    this.notificationManager.sendToUser(entry.userId, 'holdingReminder', {
                        orderId,
                        message: '⚠️ Your order has been waiting for 20 minutes. It will be cancelled in 10 minutes if not collected.',
                        waitingTime: 20,
                        urgent: true
                    });
                }

                // Handle abandoned orders (after max holding time)
                if (holdingTime > this.maxHoldingTime) {
                    this.handleAbandonedOrder(orderId, entry, section);
                }
            });
        }
    }

    // Handle abandoned order
    handleAbandonedOrder(orderId, entry, section) {
        // Notify user
        this.notificationManager.sendToUser(entry.userId, 'orderAbandoned', {
            orderId,
            message: '❌ Your order has been marked as abandoned due to non-collection. Please contact staff for assistance.',
        });

        // Remove from holding area
        this.holdingArea[section].delete(orderId);
        this.pendingPickupRequests.delete(orderId);

        console.log(`❌ Order ${orderId} marked as abandoned after ${this.maxHoldingTime / 60000} minutes`);
    }

    // Get order from holding area
    getHoldingOrder(orderId) {
        for (const [section, orders] of Object.entries(this.holdingArea)) {
            if (orders.has(orderId)) {
                return {
                    ...orders.get(orderId),
                    section
                };
            }
        }
        return null;
    }

    // Check if order is in holding area
    isInHoldingArea(orderId) {
        return this.holdingArea.cafeteria.has(orderId) || 
               this.holdingArea.lassiCorner.has(orderId);
    }

    // Get holding area stats
    getHoldingAreaStats() {
        return {
            cafeteria: {
                count: this.holdingArea.cafeteria.size,
                pendingPickups: Array.from(this.holdingArea.cafeteria.values())
                    .filter(e => e.pickupRequested).length
            },
            lassiCorner: {
                count: this.holdingArea.lassiCorner.size,
                pendingPickups: Array.from(this.holdingArea.lassiCorner.values())
                    .filter(e => e.pickupRequested).length
            },
            totalPendingRequests: this.pendingPickupRequests.size
        };
    }
}

module.exports = HoldingAreaManager;
