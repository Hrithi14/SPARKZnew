class QueueManager {
    constructor(notificationManager) {
        this.notificationManager = notificationManager;
        
        // Pickup slots configuration
        this.slots = {
            cafeteria: {
                total: 3, // 3 pickup slots for cafeteria
                slots: [
                    { id: 'caf-slot-1', name: 'Counter 1', occupied: false, orderId: null, occupiedAt: null },
                    { id: 'caf-slot-2', name: 'Counter 2', occupied: false, orderId: null, occupiedAt: null },
                    { id: 'caf-slot-3', name: 'Counter 3', occupied: false, orderId: null, occupiedAt: null }
                ]
            },
            lassiCorner: {
                total: 2, // 2 pickup slots for lassi corner
                slots: [
                    { id: 'las-slot-1', name: 'Counter 1', occupied: false, orderId: null, occupiedAt: null },
                    { id: 'las-slot-2', name: 'Counter 2', occupied: false, orderId: null, occupiedAt: null }
                ]
            }
        };

        // Queue for orders waiting for slots
        this.waitingQueue = {
            cafeteria: [],
            lassiCorner: []
        };

        // Scheduled pre-orders
        this.scheduledOrders = [];

        // Slot timeout (auto-release after 5 minutes if not collected)
        this.slotTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Get section key from order section
    getSectionKey(section) {
        if (section === 'cafeteria') return 'cafeteria';
        if (section === 'lassi' || section === 'lassiCorner') return 'lassiCorner';
        return 'cafeteria'; // default
    }

    // Assign order to a pickup slot
    assignOrderToSlot(order) {
        const sectionKey = this.getSectionKey(order.section);
        const sectionSlots = this.slots[sectionKey];

        // Find an available slot
        const availableSlot = sectionSlots.slots.find(slot => !slot.occupied);

        if (availableSlot) {
            availableSlot.occupied = true;
            availableSlot.orderId = order.id;
            availableSlot.occupiedAt = new Date().toISOString();
            order.pickupSlot = availableSlot.id;

            console.log(`🎯 Order ${order.id} assigned to ${availableSlot.name} at ${sectionKey}`);
            return { success: true, slot: availableSlot };
        } else {
            // Add to waiting queue
            this.waitingQueue[sectionKey].push({
                orderId: order.id,
                userId: order.userId,
                addedAt: new Date().toISOString(),
                priority: order.type === 'preorder' ? 1 : 2 // Pre-orders have higher priority
            });

            console.log(`⏳ Order ${order.id} added to waiting queue at ${sectionKey}`);
            return { success: false, message: 'All slots busy, added to queue', position: this.waitingQueue[sectionKey].length };
        }
    }

    // Schedule pre-order for specific pickup time
    schedulePreOrder(order) {
        this.scheduledOrders.push({
            orderId: order.id,
            userId: order.userId,
            section: order.section,
            pickupTime: order.requestedPickupTime,
            scheduled: true
        });

        // Sort by pickup time
        this.scheduledOrders.sort((a, b) => 
            new Date(a.pickupTime) - new Date(b.pickupTime)
        );

        console.log(`📅 Pre-order ${order.id} scheduled for ${order.requestedPickupTime}`);
    }

    // Release a slot
    releaseSlot(slotId) {
        // Search in cafeteria slots
        let slot = this.slots.cafeteria.slots.find(s => s.id === slotId);
        let sectionKey = 'cafeteria';

        if (!slot) {
            // Search in lassi corner slots
            slot = this.slots.lassiCorner.slots.find(s => s.id === slotId);
            sectionKey = 'lassiCorner';
        }

        if (slot) {
            const previousOrderId = slot.orderId;
            slot.occupied = false;
            slot.orderId = null;
            slot.occupiedAt = null;

            console.log(`🔓 Slot ${slot.name} released at ${sectionKey}`);

            // Process waiting queue
            this.processWaitingQueue(sectionKey);

            return { success: true, releasedOrderId: previousOrderId };
        }

        return { success: false, message: 'Slot not found' };
    }

    // Process waiting queue for a section
    processWaitingQueue(sectionKey) {
        const queue = this.waitingQueue[sectionKey];
        if (queue.length === 0) return;

        // Sort by priority (pre-orders first) then by time
        queue.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return new Date(a.addedAt) - new Date(b.addedAt);
        });

        // Try to assign first in queue
        const nextInQueue = queue[0];
        const sectionSlots = this.slots[sectionKey];
        const availableSlot = sectionSlots.slots.find(slot => !slot.occupied);

        if (availableSlot) {
            availableSlot.occupied = true;
            availableSlot.orderId = nextInQueue.orderId;
            availableSlot.occupiedAt = new Date().toISOString();

            // Remove from queue
            queue.shift();

            // Notify user
            this.notificationManager.sendToUser(nextInQueue.userId, 'slotAvailable', {
                orderId: nextInQueue.orderId,
                slot: availableSlot.name,
                message: `Your pickup slot is now available at ${availableSlot.name}. Please collect your order.`
            });

            console.log(`📢 Order ${nextInQueue.orderId} moved from queue to ${availableSlot.name}`);
        }
    }

    // Process the entire queue
    processQueue() {
        // Check for timed-out slots
        this.checkSlotTimeouts();

        // Process scheduled pre-orders
        this.processScheduledOrders();

        // Process waiting queues
        this.processWaitingQueue('cafeteria');
        this.processWaitingQueue('lassiCorner');
    }

    // Check for slot timeouts
    checkSlotTimeouts() {
        const now = new Date();

        ['cafeteria', 'lassiCorner'].forEach(sectionKey => {
            this.slots[sectionKey].slots.forEach(slot => {
                if (slot.occupied && slot.occupiedAt) {
                    const occupiedTime = new Date(slot.occupiedAt);
                    if (now - occupiedTime > this.slotTimeout) {
                        // Slot has been occupied too long - this will be handled by holding area
                        console.log(`⚠️ Slot ${slot.name} timeout - order ${slot.orderId} should be in holding`);
                    }
                }
            });
        });
    }

    // Process scheduled pre-orders
    processScheduledOrders() {
        const now = new Date();
        const fiveMinutesBefore = 5 * 60 * 1000;

        this.scheduledOrders = this.scheduledOrders.filter(scheduled => {
            const pickupTime = new Date(scheduled.pickupTime);
            
            // 5 minutes before pickup time, try to assign a slot
            if (pickupTime - now <= fiveMinutesBefore && scheduled.scheduled) {
                const sectionKey = this.getSectionKey(scheduled.section);
                const result = this.tryAssignSlot(scheduled.orderId, sectionKey, scheduled.userId);
                
                if (result.success) {
                    console.log(`📅 Pre-order ${scheduled.orderId} slot assigned for pickup`);
                    return false; // Remove from scheduled list
                }
            }

            // Keep in list if not yet processed
            return pickupTime > now;
        });
    }

    // Try to assign slot (used for holding area pickup requests)
    tryAssignSlot(orderId, section, userId) {
        const sectionKey = this.getSectionKey(section);
        const sectionSlots = this.slots[sectionKey];
        const availableSlot = sectionSlots.slots.find(slot => !slot.occupied);

        if (availableSlot) {
            availableSlot.occupied = true;
            availableSlot.orderId = orderId;
            availableSlot.occupiedAt = new Date().toISOString();

            return { 
                success: true, 
                slot: availableSlot,
                message: `Your order is ready at ${availableSlot.name}. Please collect now.`
            };
        }

        return { 
            success: false, 
            message: 'All pickup slots are currently busy. Please wait.',
            estimatedWait: this.estimateWaitTime(sectionKey)
        };
    }

    // Estimate wait time
    estimateWaitTime(sectionKey) {
        const queueLength = this.waitingQueue[sectionKey].length;
        // Assume average pickup time is 2 minutes
        return (queueLength + 1) * 2;
    }

    // Get queue status
    getQueueStatus() {
        return {
            cafeteria: {
                slots: this.slots.cafeteria.slots.map(s => ({
                    id: s.id,
                    name: s.name,
                    occupied: s.occupied,
                    orderId: s.orderId
                })),
                waitingCount: this.waitingQueue.cafeteria.length,
                estimatedWait: this.estimateWaitTime('cafeteria')
            },
            lassiCorner: {
                slots: this.slots.lassiCorner.slots.map(s => ({
                    id: s.id,
                    name: s.name,
                    occupied: s.occupied,
                    orderId: s.orderId
                })),
                waitingCount: this.waitingQueue.lassiCorner.length,
                estimatedWait: this.estimateWaitTime('lassiCorner')
            },
            scheduledPreOrders: this.scheduledOrders.length
        };
    }

    // Get available slots
    getAvailableSlots() {
        return {
            cafeteria: this.slots.cafeteria.slots.filter(s => !s.occupied),
            lassiCorner: this.slots.lassiCorner.slots.filter(s => !s.occupied)
        };
    }

    // Check if slot is available for a section
    isSlotAvailable(section) {
        const sectionKey = this.getSectionKey(section);
        return this.slots[sectionKey].slots.some(slot => !slot.occupied);
    }

    // Get slot by order ID
    getSlotByOrderId(orderId) {
        // Search in cafeteria
        let slot = this.slots.cafeteria.slots.find(s => s.orderId === orderId);
        if (slot) return { slot, section: 'cafeteria' };

        // Search in lassi corner
        slot = this.slots.lassiCorner.slots.find(s => s.orderId === orderId);
        if (slot) return { slot, section: 'lassiCorner' };

        return null;
    }

    // Add to waiting queue manually (for holding area requests)
    addToWaitingQueue(orderId, userId, section, priority = 2) {
        const sectionKey = this.getSectionKey(section);
        
        // Check if already in queue
        const existingIndex = this.waitingQueue[sectionKey].findIndex(q => q.orderId === orderId);
        if (existingIndex === -1) {
            this.waitingQueue[sectionKey].push({
                orderId,
                userId,
                addedAt: new Date().toISOString(),
                priority
            });
            return { success: true, position: this.waitingQueue[sectionKey].length };
        }
        return { success: false, message: 'Already in queue', position: existingIndex + 1 };
    }

    // Get position in queue
    getQueuePosition(orderId, section) {
        const sectionKey = this.getSectionKey(section);
        const index = this.waitingQueue[sectionKey].findIndex(q => q.orderId === orderId);
        return index === -1 ? null : index + 1;
    }
}

module.exports = QueueManager;
