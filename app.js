// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBAOjtkE33iNfKf2KaKZNPuX9pCPwNXQDM",
    authDomain: "pizza-dashboard-92057.firebaseapp.com",
    projectId: "pizza-dashboard-92057",
    storageBucket: "pizza-dashboard-92057.firebasestorage.app",
    messagingSenderId: "287044348356",
    appId: "1:287044348356:ios:5eb4c95d0f6a3eb2159c91"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const ordersContainer = document.getElementById('ordersContainer');
const refreshButton = document.getElementById('refreshButton');
const realtimeToggle = document.getElementById('realtimeToggle');
const tabButtons = document.querySelectorAll('.tab-btn');
const lastUpdatedElement = document.getElementById('lastUpdated');

// App State
let currentTab = 'all';
let unsubscribe = null;
let orders = [];

// Format date function
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp instanceof Date ? timestamp : 
                (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Format currency function
function formatCurrency(amount) {
    return 'R' + (Number(amount) || 0).toFixed(2);
}

// Update last updated text
function updateLastUpdated() {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
}

// Create order card element
function createOrderCard(order) {
    const data = order.data();
    const id = order.id;
    
    // Get all order details
    const status = data.status || 'Unknown';
    const customerName = data.customerName || 'Unknown';
    const platform = data.platform || 'Unknown';
    const totalAmount = data.totalAmount || 0;
    const prepTimeMinutes = data.prepTimeMinutes || 0;
    const hasSpecialInstructions = data.hasSpecialInstructions || false;
    const completed = data.completed || false;
    const source = data.source || 'Unknown';
    const timestamp = data.timestamp || null;
    const cooked = data.cooked || [];
    
    // Parse dates
    let orderTime = null;
    if (data.orderTime) {
        orderTime = typeof data.orderTime === 'string' ? new Date(data.orderTime) : 
                   data.orderTime.toDate ? data.orderTime.toDate() : new Date();
    }
    
    let dueTime = null;
    if (data.dueTime) {
        dueTime = typeof data.dueTime === 'string' ? new Date(data.dueTime) : 
                 data.dueTime.toDate ? data.dueTime.toDate() : new Date(data.dueTime);
    }
    
    // Create card element
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    orderCard.id = `order-${id}`;
    
    // Create order header
    const orderHeader = document.createElement('div');
    orderHeader.className = 'order-header';
    
    const orderTitle = document.createElement('h3');
    orderTitle.className = 'order-title';
    orderTitle.textContent = `Order #${id.substring(0, 6)}`;
    
    const statusBadge = document.createElement('div');
    statusBadge.className = `status-badge ${status.toLowerCase()}`;
    statusBadge.textContent = status;
    
    orderHeader.appendChild(orderTitle);
    orderHeader.appendChild(statusBadge);
    
    // Create customer info section
    const customerInfo = document.createElement('div');
    customerInfo.className = 'customer-info';
    
    // Customer
    const customerNameInfo = document.createElement('div');
    customerNameInfo.className = 'info-item';
    
    const customerLabel = document.createElement('span');
    customerLabel.className = 'info-label';
    customerLabel.textContent = 'Customer';
    
    const customerValue = document.createElement('span');
    customerValue.className = 'info-value';
    customerValue.textContent = customerName;
    
    customerNameInfo.appendChild(customerLabel);
    customerNameInfo.appendChild(customerValue);
    customerInfo.appendChild(customerNameInfo);
    
    // Platform
    const platformInfo = document.createElement('div');
    platformInfo.className = 'info-item';
    
    const platformLabel = document.createElement('span');
    platformLabel.className = 'info-label';
    platformLabel.textContent = 'Platform';
    
    const platformValue = document.createElement('span');
    platformValue.className = 'info-value';
    
    const platformTag = document.createElement('span');
    platformTag.className = 'platform-tag';
    
    // Add platform-specific class
    if (platform.includes('Uber Eats')) {
        platformTag.classList.add('uber-eats');
    } else if (platform.includes('Mr D Food')) {
        platformTag.classList.add('mr-d-food');
    } else if (platform.includes('Window')) {
        platformTag.classList.add('window');
    } else if (platform.includes('Customer Pickup') || platform.includes('Pickup')) {
        platformTag.classList.add('pickup');
    }
    
    platformTag.textContent = platform;
    platformValue.appendChild(platformTag);
    
    platformInfo.appendChild(platformLabel);
    platformInfo.appendChild(platformValue);
    customerInfo.appendChild(platformInfo);
    
    // Order Time
    const orderTimeInfo = document.createElement('div');
    orderTimeInfo.className = 'info-item';
    
    const orderTimeLabel = document.createElement('span');
    orderTimeLabel.className = 'info-label';
    orderTimeLabel.textContent = 'Order Time';
    
    const orderTimeValue = document.createElement('span');
    orderTimeValue.className = 'info-value';
    orderTimeValue.textContent = formatDate(orderTime);
    
    orderTimeInfo.appendChild(orderTimeLabel);
    orderTimeInfo.appendChild(orderTimeValue);
    customerInfo.appendChild(orderTimeInfo);
    
    // Total
    const totalInfo = document.createElement('div');
    totalInfo.className = 'info-item';
    
    const totalLabel = document.createElement('span');
    totalLabel.className = 'info-label';
    totalLabel.textContent = 'Total';
    
    const totalValue = document.createElement('span');
    totalValue.className = 'info-value';
    totalValue.textContent = formatCurrency(totalAmount);
    
    totalInfo.appendChild(totalLabel);
    totalInfo.appendChild(totalValue);
    customerInfo.appendChild(totalInfo);
    
    // Create card structure
    orderCard.appendChild(orderHeader);
    orderCard.appendChild(customerInfo);
    
    // Add special instructions indicator if any
    if (hasSpecialInstructions) {
        const specialInstructions = document.createElement('div');
        specialInstructions.className = 'special-instructions';
        specialInstructions.innerHTML = '⚠️ Has special instructions';
        orderCard.appendChild(specialInstructions);
    }
    
    // Add pizza summary directly to the main card
    if (data.pizzas && data.pizzas.length > 0) {
        const pizzaSummary = document.createElement('div');
        pizzaSummary.className = 'pizza-summary';
        pizzaSummary.style.padding = '0 1rem 0.75rem';
        pizzaSummary.style.fontSize = '0.9rem';
        
        const pizzaList = document.createElement('ul');
        pizzaList.style.margin = '0';
        pizzaList.style.padding = '0 0 0 1.5rem';
        pizzaList.style.listStyle = 'circle';
        
        data.pizzas.forEach(pizza => {
            const pizzaItem = document.createElement('li');
            pizzaItem.style.marginBottom = '0.25rem';
            
            // Use pizzaType for the pizza name as shown in the database structure
            const pizzaName = pizza.pizzaType || 'Pizza';
            const pizzaQuantity = pizza.quantity > 1 ? `(${pizza.quantity}x)` : '';
            
            pizzaItem.textContent = `${pizzaName} ${pizzaQuantity}`;
            pizzaList.appendChild(pizzaItem);
        });
        
        pizzaSummary.appendChild(pizzaList);
        orderCard.appendChild(pizzaSummary);
    }
    
    // Add detailed information section
    const pizzaDetails = document.createElement('div');
    pizzaDetails.className = 'pizza-details';
    
    // Add order status info
    const orderStatusInfo = document.createElement('div');
    orderStatusInfo.className = 'info-section';
    orderStatusInfo.style.padding = '0.75rem 1rem';
    orderStatusInfo.style.display = 'flex';
    orderStatusInfo.style.flexWrap = 'wrap';
    orderStatusInfo.style.gap = '1rem';
    orderStatusInfo.style.borderBottom = '1px solid var(--border-color)';
    
    // Order Source
    const sourceInfo = document.createElement('div');
    sourceInfo.className = 'info-item';
    
    const sourceLabel = document.createElement('span');
    sourceLabel.className = 'info-label';
    sourceLabel.textContent = 'Source';
    
    const sourceValue = document.createElement('span');
    sourceValue.className = 'info-value';
    sourceValue.textContent = source;
    
    sourceInfo.appendChild(sourceLabel);
    sourceInfo.appendChild(sourceValue);
    orderStatusInfo.appendChild(sourceInfo);
    
    // Preparation Time
    const prepTimeInfo = document.createElement('div');
    prepTimeInfo.className = 'info-item';
    
    const prepTimeLabel = document.createElement('span');
    prepTimeLabel.className = 'info-label';
    prepTimeLabel.textContent = 'Prep Time';
    
    const prepTimeValue = document.createElement('span');
    prepTimeValue.className = 'info-value';
    prepTimeValue.textContent = `${prepTimeMinutes} minutes`;
    
    prepTimeInfo.appendChild(prepTimeLabel);
    prepTimeInfo.appendChild(prepTimeValue);
    orderStatusInfo.appendChild(prepTimeInfo);
    
    // Due Time if available
    if (dueTime) {
        const dueTimeInfo = document.createElement('div');
        dueTimeInfo.className = 'info-item';
        
        const dueTimeLabel = document.createElement('span');
        dueTimeLabel.className = 'info-label';
        dueTimeLabel.textContent = 'Due Time';
        
        const dueTimeValue = document.createElement('span');
        dueTimeValue.className = 'info-value';
        dueTimeValue.textContent = formatDate(dueTime);
        
        dueTimeInfo.appendChild(dueTimeLabel);
        dueTimeInfo.appendChild(dueTimeValue);
        orderStatusInfo.appendChild(dueTimeInfo);
    }
    
    // Completed Status
    const completedInfo = document.createElement('div');
    completedInfo.className = 'info-item';
    
    const completedLabel = document.createElement('span');
    completedLabel.className = 'info-label';
    completedLabel.textContent = 'Status';
    
    const completedValue = document.createElement('span');
    completedValue.className = 'info-value';
    completedValue.style.fontWeight = 'bold';
    
    if (completed) {
        completedValue.textContent = 'Completed';
        completedValue.style.color = 'var(--success-color)';
    } else {
        completedValue.textContent = 'In Progress';
        completedValue.style.color = 'var(--info-color)';
    }
    
    completedInfo.appendChild(completedLabel);
    completedInfo.appendChild(completedValue);
    orderStatusInfo.appendChild(completedInfo);
    
    pizzaDetails.appendChild(orderStatusInfo);
    
    // Add order-level special instructions if any exist
    if (data.specialInstructions && typeof data.specialInstructions === 'string' && data.specialInstructions.trim() !== '') {
        const orderSpecialInstructions = document.createElement('div');
        orderSpecialInstructions.className = 'order-special-instructions';
        orderSpecialInstructions.innerHTML = `<h4>Order Special Instructions</h4><p>${data.specialInstructions}</p>`;
        pizzaDetails.appendChild(orderSpecialInstructions);
    }

    // Add pizzas section
    if (data.pizzas && data.pizzas.length > 0) {
        const pizzasContainer = document.createElement('div');
        pizzasContainer.className = 'pizzas-container';
        
        const pizzasTitle = document.createElement('h4');
        pizzasTitle.className = 'pizzas-title';
        pizzasTitle.textContent = `Pizzas (${data.pizzas.length})`;
        pizzasContainer.appendChild(pizzasTitle);
        
        data.pizzas.forEach((pizza, index) => {
            const pizzaItem = document.createElement('div');
            pizzaItem.className = 'pizza-item';
            
            const pizzaName = document.createElement('div');
            pizzaName.className = 'pizza-name';
            pizzaName.innerHTML = `<strong>${index + 1}. ${pizza.pizzaType || 'Pizza'}</strong> ${formatCurrency(pizza.totalPrice || 0)}`;
            pizzaItem.appendChild(pizzaName);
            
            // Display special instructions for this pizza if any
            if (pizza.specialInstructions && pizza.specialInstructions.trim() !== '') {
                const instructionsDiv = document.createElement('div');
                instructionsDiv.className = 'pizza-special-instructions';
                instructionsDiv.innerHTML = `<strong>Special Instructions:</strong> ${pizza.specialInstructions}`;
                pizzaItem.appendChild(instructionsDiv);
            }
            
            if (pizza.toppings && pizza.toppings.length > 0) {
                const toppings = document.createElement('div');
                toppings.className = 'pizza-toppings';
                toppings.textContent = `Toppings: ${pizza.toppings.join(', ')}`;
                pizzaItem.appendChild(toppings);
            }
            
            // Check if this pizza has been cooked
            if (cooked && cooked.some(item => item === pizza.name)) {
                const cookedStatus = document.createElement('div');
                cookedStatus.style.color = 'var(--success-color)';
                cookedStatus.style.fontSize = '0.75rem';
                cookedStatus.style.marginTop = '0.25rem';
                cookedStatus.innerHTML = '✓ Cooked';
                pizzaItem.appendChild(cookedStatus);
            }
            
            pizzasContainer.appendChild(pizzaItem);
        });
        
        pizzaDetails.appendChild(pizzasContainer);
    }
    
    orderCard.appendChild(pizzaDetails);
    
    // Add expandable hint at bottom of card
    const expandHint = document.createElement('div');
    expandHint.className = 'card-expandable-hint';
    expandHint.innerHTML = 'Tap for details';
    orderCard.appendChild(expandHint);
    
    // Toggle card expansion on click
    orderCard.addEventListener('click', () => {
        orderCard.classList.toggle('expanded');
        if (orderCard.classList.contains('expanded')) {
            expandHint.innerHTML = 'Tap to collapse';
        } else {
            expandHint.innerHTML = 'Tap for details';
        }
    });
    
    return orderCard;
}

// Filter orders based on tab
function filterOrdersByStatus(status) {
    if (status === 'all') {
        return orders;
    }
    
    return orders.filter(order => {
        const orderData = order.data();
        const orderStatus = (orderData.status || '').toLowerCase();
        
        // Special case: 'pending' orders should appear in 'preparing' tab
        if (status === 'preparing' && orderStatus === 'pending') {
            return true;
        }
        
        return orderStatus === status;
    });
}

// Display orders or statistics in the container
function displayOrders(filteredOrders) {
    ordersContainer.innerHTML = '';
    
    // If stats tab is active, show statistics instead of orders
    if (currentTab === 'stats') {
        displayStatistics(orders);
        return;
    }
    
    if (filteredOrders.length === 0) {
        const noOrders = document.createElement('div');
        noOrders.className = 'no-orders';
        noOrders.textContent = 'No orders found';
        ordersContainer.appendChild(noOrders);
        return;
    }
    
    filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
    
    updateLastUpdated();
}

// Display statistics for today's orders
function displayStatistics(allOrders) {
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    // Get today's date (start of day in local timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter orders for today only - with more flexible matching for timezone differences
    const todaysOrders = allOrders.filter(order => {
        const data = order.data();
        const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
            new Date(data.orderTime) : 
            (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
        
        if (!orderTime) return false;
        
        // More flexible matching to account for timezone differences
        // Match orders from the last 24 hours or any order from today's date in local time
        const orderDate = new Date(orderTime);
        const now = new Date();
        const diffHours = (now - orderDate) / (1000 * 60 * 60);
        
        // Check if same day (local time) or within last 24 hours
        const isSameDay = orderDate.getDate() === now.getDate() && 
                          orderDate.getMonth() === now.getMonth() && 
                          orderDate.getFullYear() === now.getFullYear();
        
        return isSameDay || diffHours < 24;
    });
    
    // Calculate total pizzas sold today
    let totalPizzas = 0;
    let totalRevenue = 0;
    let totalLateOrders = 0;
    let statusCounts = {
        'pending': 0,
        'preparing': 0,
        'ready': 0,
        'done': 0,
        'delivered': 0,
        'cancelled': 0
    };
    
    // Different pizza types sold today
    let pizzaTypes = {};
    
    todaysOrders.forEach(order => {
        const data = order.data();
        
        // Count by status
        const status = (data.status || '').toLowerCase();
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
        
        // Add to total revenue
        totalRevenue += Number(data.totalAmount) || 0;
        
        // Check if order was/is late
        if (data.dueTime && data.orderTime) {
            const dueTime = typeof data.dueTime === 'string' ? 
                new Date(data.dueTime) : 
                (data.dueTime.toDate ? data.dueTime.toDate() : new Date(data.dueTime));
            
            const orderTime = typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime.toDate ? data.orderTime.toDate() : new Date(data.orderTime));
            
            const now = new Date();
            const prepTime = data.prepTimeMinutes || 0;
            
            // If status is not done/delivered and current time > due time, it's late
            if (status !== 'done' && status !== 'delivered' && now > dueTime) {
                totalLateOrders++;
            }
        }
        
        // Count pizzas in this order
        if (data.pizzas && Array.isArray(data.pizzas)) {
            data.pizzas.forEach(pizza => {
                // Add quantity (or 1 if quantity not specified)
                const quantity = pizza.quantity || 1;
                totalPizzas += quantity;
                
                // Count by pizza type
                const pizzaType = pizza.pizzaType || 'Unknown';
                if (!pizzaTypes[pizzaType]) pizzaTypes[pizzaType] = 0;
                pizzaTypes[pizzaType] += quantity;
            });
        }
    });
    
    // Create today's date display
    const dateDisplay = document.createElement('div');
    dateDisplay.className = 'stats-date';
    dateDisplay.textContent = today.toLocaleDateString(undefined, { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    statsContainer.appendChild(dateDisplay);
    
    // Create summary cards
    const summaryCardsContainer = document.createElement('div');
    summaryCardsContainer.className = 'stats-summary-cards';
    
    // Orders card
    const ordersCard = createStatCard('Orders Today', todaysOrders.length, 'receipt');
    summaryCardsContainer.appendChild(ordersCard);
    
    // Pizzas card
    const pizzasCard = createStatCard('Pizzas Sold', totalPizzas, 'local_pizza');
    summaryCardsContainer.appendChild(pizzasCard);
    
    // Revenue card
    const revenueCard = createStatCard('Total Revenue', formatCurrency(totalRevenue), 'payments');
    summaryCardsContainer.appendChild(revenueCard);
    
    // Late orders card
    const lateCard = createStatCard('Late Orders', totalLateOrders, 'schedule', totalLateOrders > 0 ? 'stats-card-warning' : '');
    summaryCardsContainer.appendChild(lateCard);
    
    statsContainer.appendChild(summaryCardsContainer);
    
    // Create status breakdown
    const statusBreakdown = document.createElement('div');
    statusBreakdown.className = 'stats-breakdown';
    statusBreakdown.innerHTML = '<h3>Orders by Status</h3>';
    
    const statusTable = document.createElement('div');
    statusTable.className = 'stats-table';
    
    for (const [status, count] of Object.entries(statusCounts)) {
        if (count > 0) {
            const statusRow = document.createElement('div');
            statusRow.className = 'stats-table-row';
            
            const statusName = document.createElement('div');
            statusName.className = 'stats-table-cell';
            statusName.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            
            const statusCount = document.createElement('div');
            statusCount.className = 'stats-table-cell stats-table-count';
            statusCount.textContent = count;
            
            statusRow.appendChild(statusName);
            statusRow.appendChild(statusCount);
            statusTable.appendChild(statusRow);
        }
    }
    
    statusBreakdown.appendChild(statusTable);
    statsContainer.appendChild(statusBreakdown);
    
    // Create pizza types breakdown if we have any pizzas
    if (Object.keys(pizzaTypes).length > 0) {
        const pizzaBreakdown = document.createElement('div');
        pizzaBreakdown.className = 'stats-breakdown';
        pizzaBreakdown.innerHTML = '<h3>Pizzas by Type</h3>';
        
        const pizzaTable = document.createElement('div');
        pizzaTable.className = 'stats-table';
        
        // Sort pizza types by quantity (most popular first)
        const sortedPizzaTypes = Object.entries(pizzaTypes)
            .sort((a, b) => b[1] - a[1]);
        
        for (const [pizzaType, count] of sortedPizzaTypes) {
            const pizzaRow = document.createElement('div');
            pizzaRow.className = 'stats-table-row';
            
            const pizzaName = document.createElement('div');
            pizzaName.className = 'stats-table-cell';
            pizzaName.textContent = pizzaType;
            
            const pizzaCount = document.createElement('div');
            pizzaCount.className = 'stats-table-cell stats-table-count';
            pizzaCount.textContent = count;
            
            pizzaRow.appendChild(pizzaName);
            pizzaRow.appendChild(pizzaCount);
            pizzaTable.appendChild(pizzaRow);
        }
        
        pizzaBreakdown.appendChild(pizzaTable);
        statsContainer.appendChild(pizzaBreakdown);
    }
    
    ordersContainer.appendChild(statsContainer);
    updateLastUpdated();
}

// Helper function to create a statistics card
function createStatCard(title, value, icon, extraClass = '') {
    const card = document.createElement('div');
    card.className = `stats-card ${extraClass}`;
    
    const iconElement = document.createElement('span');
    iconElement.className = 'material-icons stats-card-icon';
    iconElement.textContent = icon; // Using material icons
    
    const valueElement = document.createElement('div');
    valueElement.className = 'stats-card-value';
    valueElement.textContent = value;
    
    const titleElement = document.createElement('div');
    titleElement.className = 'stats-card-title';
    titleElement.textContent = title;
    
    card.appendChild(iconElement);
    card.appendChild(valueElement);
    card.appendChild(titleElement);
    
    return card;
}

// Fetch orders from Firestore
function fetchOrders() {
    ordersContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading pizza orders...</p>
        </div>
    `;
    
    const query = db.collection('orders')
        .orderBy('orderTime', 'desc')
        .limit(100); // Increased limit to 100 orders
    
    query.get().then(snapshot => {
        orders = snapshot.docs;
        const filteredOrders = filterOrdersByStatus(currentTab);
        displayOrders(filteredOrders);
    }).catch(error => {
        console.error('Error fetching orders:', error);
        ordersContainer.innerHTML = `
            <div class="no-orders">
                Error loading orders: ${error.message}
            </div>
        `;
    });
}

// Set up real-time listener
function setupRealTimeListener() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    
    const query = db.collection('orders')
        .orderBy('orderTime', 'desc')
        .limit(100); // Increased limit to 100 orders
    
    unsubscribe = query.onSnapshot(snapshot => {
        orders = snapshot.docs;
        const filteredOrders = filterOrdersByStatus(currentTab);
        displayOrders(filteredOrders);
    }, error => {
        console.error('Error in real-time updates:', error);
        ordersContainer.innerHTML = `
            <div class="no-orders">
                Error with live updates: ${error.message}
            </div>
        `;
    });
}

// Event Listeners
realtimeToggle.addEventListener('change', function() {
    if (this.checked) {
        setupRealTimeListener();
    } else {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        fetchOrders();
    }
});

refreshButton.addEventListener('click', function() {
    if (realtimeToggle.checked) {
        const alertMessage = document.createElement('div');
        alertMessage.className = 'alert-message';
        alertMessage.textContent = 'Live updates are enabled - orders will update automatically';
        
        ordersContainer.insertBefore(alertMessage, ordersContainer.firstChild);
        
        setTimeout(() => {
            if (alertMessage.parentNode === ordersContainer) {
                ordersContainer.removeChild(alertMessage);
            }
        }, 5000);
    } else {
        fetchOrders();
    }
});

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update current tab and filter orders
        currentTab = button.dataset.tab;
        const filteredOrders = filterOrdersByStatus(currentTab);
        displayOrders(filteredOrders);
    });
});

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    if (realtimeToggle.checked) {
        setupRealTimeListener();
    } else {
        fetchOrders();
    }
});
