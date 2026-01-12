// =============================================
// STAFF DASHBOARD - MAIN SCRIPT
// =============================================

const socket = io();
let orders = [];
let stats = {};
let queueStatus = {};
let holdingArea = {};
let menu = {};

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeStaffDashboard();
});

async function initializeStaffDashboard() {
    // Register as staff
    socket.emit('registerStaff');

    // Load initial data
    await loadAllData();

    // Setup event listeners
    setupEventListeners();

    // Setup socket listeners
    setupSocketListeners();

    // Update time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Refresh data periodically
    setInterval(loadAllData, 30000);

    console.log('📊 Staff Dashboard Initialized');
}

async function loadAllData() {
    await Promise.all([
        loadStats(),
        loadOrders(),
        loadQueueStatus(),
        loadHoldingArea(),
        loadMenu()
    ]);
}

// =============================================
// DATA LOADING
// =============================================

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        stats = await response.json();
        updateStatsUI();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        orders = await response.json();
        updateOrdersUI();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function loadQueueStatus() {
    try {
        const response = await fetch('/api/queue/status');
        queueStatus = await response.json();
        updateQueueUI();
    } catch (error) {
        console.error('Error loading queue status:', error);
    }
}

async function loadHoldingArea() {
    try {
        const response = await fetch('/api/holding-area');
        holdingArea = await response.json();
        updateHoldingAreaUI();
    } catch (error) {
        console.error('Error loading holding area:', error);
    }
}

async function loadMenu() {
    try {
        const response = await fetch('/api/menu');
        menu = await response.json();
        updateMenuUI();
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

// =============================================
// UI UPDATES
// =============================================

function updateStatsUI() {
    document.getElementById('totalOrders').textContent = stats.totalOrdersToday || 0;
    document.getElementById('completedOrders').textContent = stats.ordersCompleted || 0;
    document.getElementById('pendingOrders').textContent = stats.ordersPending || 0;
    document.getElementById('holdingOrders').textContent = stats.ordersInHolding || 0;
    document.getElementById('totalRevenue').textContent = `₹${stats.totalRevenue || 0}`;
    
    document.getElementById('pendingBadge').textContent = stats.ordersPending || 0;
    document.getElementById('holdingBadge').textContent = stats.ordersInHolding || 0;
}

function updateOrdersUI() {
    // Recent orders (last 10)
    const recentOrders = orders
        .filter(o => !['completed', 'cancelled'].includes(o.status))
        .slice(0, 10);
    
    document.getElementById('recentOrdersBody').innerHTML = 
        recentOrders.map(order => createOrderRow(order)).join('');

    // All orders
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const sectionFilter = document.getElementById('orderSectionFilter')?.value || 'all';
    
    let filteredOrders = orders;
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.status === statusFilter);
    }
    if (sectionFilter !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.section === sectionFilter);
    }

    document.getElementById('allOrdersBody').innerHTML = 
        filteredOrders.map(order => createOrderRowFull(order)).join('');
}

function createOrderRow(order) {
    const time = new Date(order.orderTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <tr class="order-row ${order.status}">
            <td><strong>#${order.id.slice(-8)}</strong></td>
            <td><span class="type-badge ${order.type}">${order.type === 'preorder' ? 'Pre' : 'On-Spot'}</span></td>
            <td>${order.section === 'cafeteria' ? '🍔 Cafeteria' : '🥤 Lassi'}</td>
            <td>${order.items.map(i => i.name).join(', ').slice(0, 30)}...</td>
            <td><span class="status-badge ${order.status}">${formatStatus(order.status)}</span></td>
            <td>${time}</td>
            <td>
                ${getOrderActions(order)}
            </td>
        </tr>
    `;
}

function createOrderRowFull(order) {
    const orderTime = new Date(order.orderTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const readyTime = new Date(order.readyTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <tr class="order-row ${order.status}" onclick="showOrderDetail('${order.id}')">
            <td><strong>#${order.id.slice(-8)}</strong></td>
            <td><span class="type-badge ${order.type}">${order.type === 'preorder' ? 'Pre' : 'On-Spot'}</span></td>
            <td>${order.section === 'cafeteria' ? '🍔 Cafeteria' : '🥤 Lassi'}</td>
            <td>
                <div class="items-list">
                    ${order.items.map(i => `<span class="item-tag">${i.image} ${i.name}</span>`).join('')}
                </div>
            </td>
            <td>₹${order.totalPrice}</td>
            <td><span class="status-badge ${order.status}">${formatStatus(order.status)}</span></td>
            <td>${orderTime}</td>
            <td>${readyTime}</td>
            <td>
                ${getOrderActions(order)}
            </td>
        </tr>
    `;
}

function getOrderActions(order) {
    const actions = [];

    if (order.status === 'accepted' || order.status === 'preparing') {
        actions.push(`
            <button class="action-btn success" onclick="event.stopPropagation(); markReady('${order.id}')" title="Mark Ready">
                <i class="fas fa-check"></i>
            </button>
        `);
    }

    if (order.status === 'ready' || order.status === 'in-holding') {
        actions.push(`
            <button class="action-btn primary" onclick="event.stopPropagation(); markCompleted('${order.id}')" title="Mark Completed">
                <i class="fas fa-check-double"></i>
            </button>
        `);
    }

    actions.push(`
        <button class="action-btn info" onclick="event.stopPropagation(); showOrderDetail('${order.id}')" title="View Details">
            <i class="fas fa-eye"></i>
        </button>
    `);

    return actions.join('');
}

function formatStatus(status) {
    const labels = {
        'accepted': 'Accepted',
        'scheduled': 'Scheduled',
        'preparing': 'Preparing',
        'ready': 'Ready',
        'in-holding': 'In Holding',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return labels[status] || status;
}

function updateQueueUI() {
    // Cafeteria slots
    const cafSlots = queueStatus.cafeteria?.slots || [];
    document.getElementById('cafeteriaSlotsOverview').innerHTML = 
        cafSlots.map(slot => createSlotCard(slot)).join('');
    document.getElementById('cafeteriaSlots').innerHTML = 
        cafSlots.map(slot => createSlotCardLarge(slot)).join('');

    // Lassi slots
    const lasSlots = queueStatus.lassiCorner?.slots || [];
    document.getElementById('lassiSlotsOverview').innerHTML = 
        lasSlots.map(slot => createSlotCard(slot)).join('');
    document.getElementById('lassiSlots').innerHTML = 
        lasSlots.map(slot => createSlotCardLarge(slot)).join('');

    // Queue info
    document.getElementById('cafeteriaQueueInfo').innerHTML = `
        <span class="waiting-count">${queueStatus.cafeteria?.waitingCount || 0} orders waiting</span>
        <span class="est-time">Est. wait: ${queueStatus.cafeteria?.estimatedWait || 0} min</span>
    `;
    document.getElementById('lassiQueueInfo').innerHTML = `
        <span class="waiting-count">${queueStatus.lassiCorner?.waitingCount || 0} orders waiting</span>
        <span class="est-time">Est. wait: ${queueStatus.lassiCorner?.estimatedWait || 0} min</span>
    `;
}

function createSlotCard(slot) {
    return `
        <div class="slot-card ${slot.occupied ? 'occupied' : 'available'}">
            <div class="slot-name">${slot.name}</div>
            <div class="slot-status">
                ${slot.occupied ? 
                    `<i class="fas fa-user"></i> #${slot.orderId?.slice(-8) || 'N/A'}` : 
                    '<i class="fas fa-check"></i> Available'}
            </div>
        </div>
    `;
}

function createSlotCardLarge(slot) {
    return `
        <div class="slot-card large ${slot.occupied ? 'occupied' : 'available'}">
            <div class="slot-icon">
                <i class="fas fa-${slot.occupied ? 'user-clock' : 'door-open'}"></i>
            </div>
            <div class="slot-name">${slot.name}</div>
            <div class="slot-status">
                ${slot.occupied ? 
                    `Order #${slot.orderId?.slice(-8) || 'N/A'}` : 
                    'Available'}
            </div>
            ${slot.occupied ? `
                <button class="btn btn-sm" onclick="releaseSlot('${slot.id}')">
                    Release
                </button>
            ` : ''}
        </div>
    `;
}

function updateHoldingAreaUI() {
    // Cafeteria holding
    const cafHolding = holdingArea.cafeteria || [];
    document.getElementById('cafeteriaHolding').innerHTML = 
        cafHolding.length > 0 ? 
            cafHolding.map(entry => createHoldingCard(entry)).join('') :
            '<div class="empty-state"><i class="fas fa-box-open"></i><p>No orders in holding</p></div>';
    document.getElementById('cafeteriaHoldingCount').textContent = cafHolding.length;

    // Lassi holding
    const lasHolding = holdingArea.lassiCorner || [];
    document.getElementById('lassiHolding').innerHTML = 
        lasHolding.length > 0 ?
            lasHolding.map(entry => createHoldingCard(entry)).join('') :
            '<div class="empty-state"><i class="fas fa-box-open"></i><p>No orders in holding</p></div>';
    document.getElementById('lassiHoldingCount').textContent = lasHolding.length;
}

function createHoldingCard(entry) {
    return `
        <div class="holding-card ${entry.pickupRequested ? 'requested' : ''}">
            <div class="holding-header">
                <span class="order-id">#${entry.orderId.slice(-8)}</span>
                <span class="waiting-time">${entry.waitingTime} min</span>
            </div>
            <div class="holding-items">
                ${entry.order.items.map(i => `<span>${i.image} ${i.name}</span>`).join(', ')}
            </div>
            <div class="holding-footer">
                ${entry.pickupRequested ? 
                    '<span class="pickup-status"><i class="fas fa-hand-paper"></i> Pickup Requested</span>' : 
                    '<span class="waiting-status"><i class="fas fa-clock"></i> Waiting</span>'}
                <button class="btn btn-sm btn-primary" onclick="markCompleted('${entry.orderId}')">
                    Complete
                </button>
            </div>
        </div>
    `;
}

function updateMenuUI() {
    // Cafeteria menu
    const cafItems = menu.cafeteria?.items || [];
    document.getElementById('cafeteriaMenuList').innerHTML = 
        cafItems.map(item => createMenuItemRow(item, 'cafeteria')).join('');

    // Lassi menu
    const lasItems = menu.lassiCorner?.items || [];
    document.getElementById('lassiMenuList').innerHTML = 
        lasItems.map(item => createMenuItemRow(item, 'lassiCorner')).join('');
}

function createMenuItemRow(item, section) {
    return `
        <div class="menu-item-row ${!item.available ? 'unavailable' : ''}">
            <div class="menu-item-icon">${item.image}</div>
            <div class="menu-item-info">
                <span class="menu-item-name">${item.name}</span>
                <span class="menu-item-meta">₹${item.price} • ${item.prepTime} min</span>
            </div>
            <div class="menu-item-actions">
                <label class="toggle-switch">
                    <input type="checkbox" ${item.available ? 'checked' : ''} 
                           onchange="toggleItemAvailability('${item.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
    `;
}

// =============================================
// ORDER ACTIONS
// =============================================

async function markReady(orderId) {
    try {
        socket.emit('markOrderReady', orderId);
        showToast('Order marked as ready!', 'success');
        playNotificationSound();
        await loadAllData();
    } catch (error) {
        showToast('Error marking order ready', 'error');
    }
}

async function markCompleted(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}/complete`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Order completed!', 'success');
            await loadAllData();
        } else {
            showToast(result.message || 'Error completing order', 'error');
        }
    } catch (error) {
        showToast('Error completing order', 'error');
    }
}

function showOrderDetail(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('orderDetailModal');
    const body = document.getElementById('orderDetailBody');
    const footer = document.getElementById('orderDetailFooter');

    body.innerHTML = `
        <div class="order-detail">
            <div class="detail-header">
                <h4>Order #${order.id.slice(-8)}</h4>
                <span class="status-badge large ${order.status}">${formatStatus(order.status)}</span>
            </div>
            
            <div class="detail-section">
                <h5>Order Info</h5>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Type</label>
                        <span>${order.type === 'preorder' ? 'Pre-Order' : 'On-Spot'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Section</label>
                        <span>${order.section === 'cafeteria' ? 'Cafeteria' : 'Lassi Corner'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Order Time</label>
                        <span>${new Date(order.orderTime).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Ready Time</label>
                        <span>${new Date(order.readyTime).toLocaleString()}</span>
                    </div>
                    ${order.pickupSlot ? `
                    <div class="detail-item">
                        <label>Pickup Slot</label>
                        <span>${order.pickupSlot}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="detail-section">
                <h5>Items</h5>
                <div class="items-detail-list">
                    ${order.items.map(item => `
                        <div class="item-detail">
                            <span class="item-emoji">${item.image}</span>
                            <span class="item-name">${item.name}</span>
                            <span class="item-qty">x${item.quantity || 1}</span>
                            <span class="item-price">₹${item.price * (item.quantity || 1)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="total-row">
                    <strong>Total</strong>
                    <strong>₹${order.totalPrice}</strong>
                </div>
            </div>

            <div class="detail-section">
                <h5>Status History</h5>
                <div class="status-timeline">
                    ${order.statusHistory.map(entry => `
                        <div class="timeline-item">
                            <span class="timeline-status">${formatStatus(entry.status)}</span>
                            <span class="timeline-time">${new Date(entry.time).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    footer.innerHTML = `
        <button class="btn btn-secondary" onclick="closeOrderModal()">Close</button>
        ${order.status === 'accepted' || order.status === 'preparing' ? `
            <button class="btn btn-success" onclick="markReady('${order.id}'); closeOrderModal();">
                <i class="fas fa-check"></i> Mark Ready
            </button>
        ` : ''}
        ${order.status === 'ready' || order.status === 'in-holding' ? `
            <button class="btn btn-primary" onclick="markCompleted('${order.id}'); closeOrderModal();">
                <i class="fas fa-check-double"></i> Mark Completed
            </button>
        ` : ''}
    `;

    modal.classList.add('open');
}

function closeOrderModal() {
    document.getElementById('orderDetailModal').classList.remove('open');
}

// =============================================
// MENU MANAGEMENT
// =============================================

function showAddItemModal(section) {
    document.getElementById('itemSection').value = section;
    document.getElementById('addItemModal').classList.add('open');
}

function closeAddItemModal() {
    document.getElementById('addItemModal').classList.remove('open');
    document.getElementById('addItemForm').reset();
}

async function saveMenuItem() {
    const section = document.getElementById('itemSection').value;
    const item = {
        name: document.getElementById('itemName').value,
        description: document.getElementById('itemDescription').value,
        price: parseInt(document.getElementById('itemPrice').value),
        prepTime: parseInt(document.getElementById('itemPrepTime').value),
        category: document.getElementById('itemCategory').value,
        image: document.getElementById('itemEmoji').value || '🍽️',
        tags: [],
        mood: [],
        taste: []
    };

    try {
        const response = await fetch('/api/menu/item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, item })
        });

        if (response.ok) {
            showToast('Item added successfully!', 'success');
            closeAddItemModal();
            await loadMenu();
        } else {
            showToast('Error adding item', 'error');
        }
    } catch (error) {
        showToast('Error adding item', 'error');
    }
}

async function toggleItemAvailability(itemId, available) {
    try {
        const response = await fetch(`/api/menu/item/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available })
        });

        if (response.ok) {
            showToast(`Item ${available ? 'enabled' : 'disabled'}`, 'success');
        } else {
            showToast('Error updating item', 'error');
        }
    } catch (error) {
        showToast('Error updating item', 'error');
    }
}

// =============================================
// SOCKET LISTENERS
// =============================================

function setupSocketListeners() {
    socket.on('newOrder', (order) => {
        console.log('New order received:', order);
        showToast(`New order #${order.id.slice(-8)}!`, 'info');
        playNotificationSound();
        loadAllData();
    });

    socket.on('orderUpdated', (order) => {
        console.log('Order updated:', order);
        loadAllData();
    });

    socket.on('statsUpdated', (newStats) => {
        stats = newStats;
        updateStatsUI();
    });

    socket.on('menuUpdated', (newMenu) => {
        menu = newMenu;
        updateMenuUI();
    });

    socket.on('connect', () => {
        document.getElementById('connectionStatus').classList.remove('disconnected');
        document.getElementById('connectionStatus').innerHTML = `
            <i class="fas fa-circle"></i>
            <span>Connected</span>
        `;
    });

    socket.on('disconnect', () => {
        document.getElementById('connectionStatus').classList.add('disconnected');
        document.getElementById('connectionStatus').innerHTML = `
            <i class="fas fa-circle"></i>
            <span>Disconnected</span>
        `;
    });
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showTab(item.dataset.tab);
        });
    });

    // Filters
    document.getElementById('orderStatusFilter')?.addEventListener('change', updateOrdersUI);
    document.getElementById('orderSectionFilter')?.addEventListener('change', updateOrdersUI);
}

function showTab(tabName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `${tabName}Tab`);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        orders: 'Orders',
        holding: 'Holding Area',
        queue: 'Queue Status',
        menu: 'Menu Management'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || 'Dashboard';
}

// =============================================
// UTILITIES
// =============================================

function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);

        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            osc2.connect(gainNode);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            osc2.start();
            osc2.stop(audioContext.currentTime + 0.15);
        }, 150);
    } catch (e) {
        console.log('Audio not supported');
    }
}
