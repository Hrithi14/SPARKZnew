// =============================================
// CAFETERIA MANAGEMENT SYSTEM - MAIN APP
// =============================================

// Configuration
const API_BASE = '';
const socket = io();

// State
let currentUser = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', currentUser);

let cart = [];
let menu = { cafeteria: { items: [] }, lassiCorner: { items: [] } };
let orders = [];
let notifications = [];
let currentSection = 'home';

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Register user with socket
    socket.emit('registerUser', currentUser);

    // Load initial data
    await loadMenu();
    await loadUserOrders();

    // Setup event listeners
    setupEventListeners();

    // Setup socket listeners
    setupSocketListeners();

    // Initialize chatbot
    initChatbot();

    // Set minimum time for pre-orders
    setPreorderMinTime();

    console.log('🍔 Cafeteria App Initialized');
}

// =============================================
// MENU FUNCTIONS
// =============================================

async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE}/api/menu`);
        menu = await response.json();
        renderCafeteriaMenu();
        renderLassiMenu();
    } catch (error) {
        console.error('Error loading menu:', error);
        showToast('Failed to load menu', 'error');
    }
}

function renderCafeteriaMenu(category = 'all') {
    const container = document.getElementById('cafeteriaMenu');
    let items = menu.cafeteria.items;

    if (category !== 'all') {
        items = items.filter(item => item.category === category);
    }

    container.innerHTML = items.map(item => createMenuItemCard(item, 'cafeteria')).join('');
}

function renderLassiMenu(category = 'all') {
    const container = document.getElementById('lassiMenu');
    let items = menu.lassiCorner.items;

    if (category !== 'all') {
        items = items.filter(item => item.category === category);
    }

    container.innerHTML = items.map(item => createMenuItemCard(item, 'lassiCorner')).join('');
}

function createMenuItemCard(item, section) {
    const inCart = cart.find(c => c.id === item.id);
    const quantity = inCart ? inCart.quantity : 0;

    return `
        <div class="menu-card ${!item.available ? 'unavailable' : ''}" data-id="${item.id}">
            <div class="menu-card-image">
                <span class="menu-emoji">${item.image}</span>
                ${!item.available ? '<span class="unavailable-badge">Unavailable</span>' : ''}
            </div>
            <div class="menu-card-content">
                <h4 class="menu-card-title">${item.name}</h4>
                <p class="menu-card-description">${item.description}</p>
                <div class="menu-card-meta">
                    <span class="prep-time"><i class="fas fa-clock"></i> ${item.prepTime} min</span>
                    <span class="price">₹${item.price}</span>
                </div>
                <div class="menu-card-tags">
                    ${item.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="menu-card-actions">
                ${item.available ? `
                    ${quantity > 0 ? `
                        <div class="quantity-control">
                            <button class="qty-btn" onclick="updateCartQuantity('${item.id}', ${quantity - 1}, '${section}')">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="qty-value">${quantity}</span>
                            <button class="qty-btn" onclick="updateCartQuantity('${item.id}', ${quantity + 1}, '${section}')">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    ` : `
                        <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}', '${section}')">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    `}
                ` : `
                    <button class="btn btn-disabled btn-sm" disabled>
                        <i class="fas fa-ban"></i> Unavailable
                    </button>
                `}
            </div>
        </div>
    `;
}

// =============================================
// CART FUNCTIONS
// =============================================

function addToCart(itemId, section) {
    const menuSection = section === 'cafeteria' ? menu.cafeteria : menu.lassiCorner;
    const item = menuSection.items.find(i => i.id === itemId);

    if (!item) return;

    const existingItem = cart.find(c => c.id === itemId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...item,
            section,
            quantity: 1
        });
    }

    updateCartUI();
    showToast(`${item.name} added to cart!`, 'success');

    // Re-render menu to show quantity controls
    if (section === 'cafeteria') {
        renderCafeteriaMenu(getCurrentFilter('cafeteria'));
    } else {
        renderLassiMenu(getCurrentFilter('lassi'));
    }
}

function updateCartQuantity(itemId, newQuantity, section) {
    if (newQuantity <= 0) {
        removeFromCart(itemId, section);
        return;
    }

    const item = cart.find(c => c.id === itemId);
    if (item) {
        item.quantity = newQuantity;
        updateCartUI();

        // Re-render menu
        if (section === 'cafeteria') {
            renderCafeteriaMenu(getCurrentFilter('cafeteria'));
        } else {
            renderLassiMenu(getCurrentFilter('lassi'));
        }
    }
}

function removeFromCart(itemId, section) {
    cart = cart.filter(c => c.id !== itemId);
    updateCartUI();

    // Re-render menu
    if (section === 'cafeteria') {
        renderCafeteriaMenu(getCurrentFilter('cafeteria'));
    } else {
        renderLassiMenu(getCurrentFilter('lassi'));
    }
}

function updateCartUI() {
    const cartBadge = document.getElementById('cartBadge');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';

    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <small>Add items from the menu</small>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <span class="menu-emoji">${item.image}</span>
                </div>
                <div class="cart-item-info">
                    <h5>${item.name}</h5>
                    <span class="cart-item-price">₹${item.price}</span>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn-sm" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1}, '${item.section}')">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn-sm" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1}, '${item.section}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}', '${item.section}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // Update total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `₹${total}`;

    // Disable place order button if cart is empty
    document.getElementById('placeOrderBtn').disabled = cart.length === 0;
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function getCurrentFilter(section) {
    const sectionId = section === 'cafeteria' ? 'cafeteriaSection' : 'lassiSection';
    const activeFilter = document.querySelector(`#${sectionId} .filter-btn.active`);
    return activeFilter ? activeFilter.dataset.category : 'all';
}

// =============================================
// ORDER FUNCTIONS
// =============================================

async function placeOrder() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    let pickupTime = null;

    if (orderType === 'preorder') {
        const timeInput = document.getElementById('pickupTimeInput').value;
        if (!timeInput) {
            showToast('Please select a pickup time for pre-order', 'error');
            return;
        }
        
        // Create full datetime
        const now = new Date();
        const [hours, minutes] = timeInput.split(':');
        pickupTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        
        if (pickupTime <= now) {
            showToast('Pickup time must be in the future', 'error');
            return;
        }
    }

    // Group items by section
    const cafeteriaItems = cart.filter(item => item.section === 'cafeteria');
    const lassiItems = cart.filter(item => item.section === 'lassiCorner');

    try {
        const placedOrders = [];

        // Place cafeteria order
        if (cafeteriaItems.length > 0) {
            const response = await fetch(`${API_BASE}/api/orders/${orderType === 'preorder' ? 'preorder' : 'onspot'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser,
                    items: cafeteriaItems,
                    section: 'cafeteria',
                    pickupTime: pickupTime?.toISOString()
                })
            });
            const order = await response.json();
            placedOrders.push(order);
        }

        // Place lassi corner order
        if (lassiItems.length > 0) {
            const response = await fetch(`${API_BASE}/api/orders/${orderType === 'preorder' ? 'preorder' : 'onspot'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser,
                    items: lassiItems,
                    section: 'lassiCorner',
                    pickupTime: pickupTime?.toISOString()
                })
            });
            const order = await response.json();
            placedOrders.push(order);
        }

        // Show success
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        showOrderConfirmation(placedOrders, totalAmount);

        // Record order in chatbot for recommendations
        if (window.chatbotRecordOrder) {
            window.chatbotRecordOrder(cart);
        }

        // Clear cart
        cart = [];
        updateCartUI();
        toggleCart();

        // Reload orders
        await loadUserOrders();

    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Failed to place order. Please try again.', 'error');
    }
}

function showOrderConfirmation(orders, totalAmount) {
    const modal = document.getElementById('orderModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const firstOrder = orders[0];
    const readyTime = new Date(firstOrder.readyTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    modalTitle.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success)"></i> Order Placed!';
    modalBody.innerHTML = `
        <div class="order-confirmation">
            <div class="confirmation-icon">
                <i class="fas fa-receipt"></i>
            </div>
            <div class="confirmation-details">
                <p><strong>Order ID:</strong> ${firstOrder.id.slice(-8)}</p>
                <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
                <p><strong>Estimated Ready Time:</strong> ${readyTime}</p>
                ${firstOrder.type === 'preorder' ? 
                    `<p><strong>Scheduled Pickup:</strong> ${new Date(firstOrder.requestedPickupTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>` 
                    : ''
                }
            </div>
            <div class="confirmation-message">
                <i class="fas fa-bell"></i>
                <p>You'll receive a notification when your order is ready!</p>
            </div>
        </div>
    `;

    modal.classList.add('open');
}

async function loadUserOrders() {
    try {
        const response = await fetch(`${API_BASE}/api/orders/user/${currentUser}`);
        orders = await response.json();
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderOrders(tab = 'active') {
    const container = document.getElementById('ordersList');
    
    let filteredOrders = orders;
    if (tab === 'active') {
        filteredOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
    } else {
        filteredOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status));
    }

    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-receipt"></i>
                <p>${tab === 'active' ? 'No active orders' : 'No order history'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredOrders.map(order => createOrderCard(order)).join('');
}

function createOrderCard(order) {
    const statusColors = {
        'accepted': 'var(--info)',
        'scheduled': 'var(--info)',
        'preparing': 'var(--warning)',
        'ready': 'var(--success)',
        'in-holding': 'var(--warning)',
        'completed': 'var(--success)',
        'cancelled': 'var(--danger)'
    };

    const statusIcons = {
        'accepted': 'check-circle',
        'scheduled': 'calendar-check',
        'preparing': 'fire',
        'ready': 'bell',
        'in-holding': 'box',
        'completed': 'check-double',
        'cancelled': 'times-circle'
    };

    const orderTime = new Date(order.orderTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const readyTime = new Date(order.readyTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-card-header">
                <div class="order-info">
                    <span class="order-id">#${order.id.slice(-8)}</span>
                    <span class="order-type ${order.type}">${order.type === 'preorder' ? 'Pre-Order' : 'On-Spot'}</span>
                </div>
                <div class="order-status" style="background-color: ${statusColors[order.status]}20; color: ${statusColors[order.status]}">
                    <i class="fas fa-${statusIcons[order.status]}"></i>
                    ${order.status.replace('-', ' ').toUpperCase()}
                </div>
            </div>
            <div class="order-card-body">
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-emoji">${item.image}</span>
                            <span class="item-name">${item.name}</span>
                            <span class="item-qty">x${item.quantity || 1}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-meta">
                    <div class="meta-item">
                        <i class="fas fa-store"></i>
                        <span>${order.section === 'cafeteria' ? 'Cafeteria' : 'Lassi Corner'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>Ordered: ${orderTime}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-bell"></i>
                        <span>Ready by: ${readyTime}</span>
                    </div>
                    <div class="meta-item total">
                        <i class="fas fa-rupee-sign"></i>
                        <span>₹${order.totalPrice}</span>
                    </div>
                </div>
            </div>
            ${order.status === 'in-holding' ? `
                <div class="order-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="requestPickup('${order.id}')">
                        <i class="fas fa-hand-paper"></i> Request Pickup
                    </button>
                </div>
            ` : ''}
            ${order.status === 'ready' && order.pickupSlot ? `
                <div class="pickup-info">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Collect from: ${order.pickupSlot}</span>
                </div>
            ` : ''}
        </div>
    `;
}

async function requestPickup(orderId) {
    try {
        const response = await fetch(`${API_BASE}/api/holding-area/request-pickup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                userId: currentUser
            })
        });

        const result = await response.json();

        if (result.success) {
            if (result.action === 'collect_now') {
                showToast(`Your order is ready at ${result.slot.name}!`, 'success');
            } else {
                showToast(`Added to queue. Position: #${result.queuePosition}. Wait: ~${result.estimatedWait} min`, 'info');
            }
            await loadUserOrders();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error requesting pickup:', error);
        showToast('Failed to request pickup', 'error');
    }
}

// =============================================
// NOTIFICATION FUNCTIONS
// =============================================

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    const overlay = document.getElementById('overlay');
    panel.classList.toggle('open');
    overlay.classList.toggle('active');
}

function addNotification(notification) {
    notifications.unshift(notification);
    updateNotificationUI();
    showToast(notification.data?.message || 'New notification', getNotificationType(notification.type));
}

function updateNotificationUI() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');

    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';

    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notifications.slice(0, 20).map(notif => `
        <div class="notification-item ${notif.read ? 'read' : ''}" onclick="markNotificationRead('${notif.id}')">
            <div class="notification-icon ${getNotificationType(notif.type)}">
                <i class="fas fa-${getNotificationIcon(notif.type)}"></i>
            </div>
            <div class="notification-content">
                <p class="notification-message">${notif.data?.message || 'Notification'}</p>
                <span class="notification-time">${formatTime(notif.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        'orderAccepted': 'check-circle',
        'orderScheduled': 'calendar-check',
        'orderReady': 'bell',
        'orderStatusUpdate': 'sync',
        'movedToHolding': 'box',
        'pickupSlotAssigned': 'map-marker-alt',
        'pickupQueued': 'clock',
        'holdingReminder': 'exclamation-triangle',
        'slotAvailable': 'door-open'
    };
    return icons[type] || 'bell';
}

function getNotificationType(type) {
    const types = {
        'orderAccepted': 'success',
        'orderScheduled': 'info',
        'orderReady': 'success',
        'orderStatusUpdate': 'info',
        'movedToHolding': 'warning',
        'pickupSlotAssigned': 'success',
        'pickupQueued': 'info',
        'holdingReminder': 'warning',
        'slotAvailable': 'success'
    };
    return types[type] || 'info';
}

function markNotificationRead(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        updateNotificationUI();
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

// =============================================
// SOCKET LISTENERS
// =============================================

function setupSocketListeners() {
    // Order updates
    socket.on('orderPlaced', (order) => {
        console.log('Order placed:', order);
        loadUserOrders();
    });

    socket.on('orderUpdated', (order) => {
        console.log('Order updated:', order);
        if (order.userId === currentUser) {
            loadUserOrders();
        }
    });

    // Notifications
    socket.on('notification', (notification) => {
        console.log('Notification received:', notification);
        addNotification(notification);

        // Handle specific notification types
        if (notification.type === 'orderReady') {
            playNotificationSound();
            showReadyAlert(notification.data);
        } else if (notification.type === 'movedToHolding') {
            showHoldingModal(notification.data);
        } else if (notification.type === 'pickupSlotAssigned') {
            showPickupSlotAlert(notification.data);
        }

        // Reload orders for any order-related notification
        loadUserOrders();
    });

    // Menu updates
    socket.on('menuUpdated', (newMenu) => {
        menu = newMenu;
        renderCafeteriaMenu();
        renderLassiMenu();
    });

    // Connection status
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('registerUser', currentUser);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showToast('Connection lost. Reconnecting...', 'warning');
    });

    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        showToast('Reconnected!', 'success');
        socket.emit('registerUser', currentUser);
        loadUserOrders();
    });
}

// =============================================
// UI FUNCTIONS
// =============================================

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Show target section
    const targetId = `${sectionName}Section`;
    document.getElementById(targetId)?.classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionName);
    });

    currentSection = sectionName;
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    });

    // Cart toggle
    document.getElementById('cartIcon').addEventListener('click', toggleCart);

    // Notification toggle
    document.getElementById('notificationBell').addEventListener('click', toggleNotifications);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parent = e.target.closest('.section');
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const category = e.target.dataset.category;
            if (parent.id === 'cafeteriaSection') {
                renderCafeteriaMenu(category);
            } else if (parent.id === 'lassiSection') {
                renderLassiMenu(category);
            }
        });
    });

    // Order tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderOrders(e.target.dataset.tab);
        });
    });

    // Order type selector
    document.querySelectorAll('input[name="orderType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const preorderTime = document.getElementById('preorderTime');
            preorderTime.style.display = e.target.value === 'preorder' ? 'block' : 'none';
        });
    });
}

function setPreorderMinTime() {
    const input = document.getElementById('pickupTimeInput');
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15); // Minimum 15 minutes from now
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    input.min = `${hours}:${minutes}`;
    input.value = `${hours}:${minutes}`;
}

function closeModal() {
    document.getElementById('orderModal').classList.remove('open');
}

function closeHoldingModal() {
    document.getElementById('holdingModal').classList.remove('open');
}

function showHoldingModal(data) {
    const modal = document.getElementById('holdingModal');
    const btn = document.getElementById('requestPickupBtn');
    
    btn.onclick = () => {
        requestPickup(data.orderId);
        closeHoldingModal();
    };

    modal.classList.add('open');
}

function showReadyAlert(data) {
    showToast(`🔔 Your order is ready! Please collect from ${data.section === 'cafeteria' ? 'Cafeteria' : 'Lassi Corner'} counter.`, 'success', 8000);
}

function showPickupSlotAlert(data) {
    showToast(`✅ Your order is ready at ${data.slot}! Please collect it now.`, 'success', 8000);
}

function closeAllPanels() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('notificationPanel').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        'success': 'check-circle',
        'error': 'times-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };

    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function playNotificationSound() {
    // Create audio context for notification sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Export for chatbot
window.addToCartFromChatbot = function(item, section) {
    addToCart(item.id, section);
};
