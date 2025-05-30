// Debug logger function
function debugLog(message, type = 'info') {
    const debugConsole = document.getElementById('debugConsole');
    if (!debugConsole) return;
    
    const line = document.createElement('div');
    line.className = `debug-line debug-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;
    
    debugConsole.appendChild(line);
    debugConsole.scrollTop = debugConsole.scrollHeight;
    
    // Also log to browser console
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBAOjtkE33iNfKf2KaKZNPuX9pCPwNXQDM",
    authDomain: "pizza-dashboard-92057.firebaseapp.com",
    projectId: "pizza-dashboard-92057",
    storageBucket: "pizza-dashboard-92057.firebasestorage.app",
    messagingSenderId: "287044348356",
    appId: "1:287044348356:ios:5eb4c95d0f6a3eb2159c91"
};

// Initialize Firebase with enhanced error handling and debugging
let db;
let firebaseInitialized = false;

debugLog('Starting Firebase initialization...');

// Check if Firebase SDK is loaded
if (typeof firebase === 'undefined') {
    debugLog('Firebase SDK not loaded! Check network connectivity and script tags.', 'error');
    document.getElementById('ordersContainer').innerHTML = `
        <div class="error-message">
            <h3>⚠️ Firebase SDK Not Loaded</h3>
            <p>Firebase scripts could not be loaded. Check your internet connection.</p>
            <p>Click the 'Show Debug' button at the bottom right for more details.</p>
        </div>
    `;
} else {
    debugLog('Firebase SDK detected, attempting to initialize...');
    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        debugLog('Firebase app initialized successfully');
        
        // Check if Firestore is available
        if (typeof firebase.firestore === 'undefined') {
            debugLog('Firestore module not available!', 'error');
            throw new Error('Firestore module not loaded');
        }
        
        // Initialize Firestore
        db = firebase.firestore();
        debugLog('Firestore initialized');
        
        // Add settings for better cross-domain support
        db.settings({
            ignoreUndefinedProperties: true,
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        debugLog('Firestore settings applied');
        
        // Test the connection with a simple query
        db.collection('orders').limit(1).get()
            .then(snapshot => {
                debugLog(`Firestore test query successful: ${snapshot.size} docs returned`);
                firebaseInitialized = true;
            })
            .catch(error => {
                debugLog(`Firestore test query failed: ${error.message}`, 'error');
                document.getElementById('ordersContainer').innerHTML = `
                    <div class="error-message">
                        <h3>⚠️ Firebase Connection Error</h3>
                        <p>Could not connect to Firestore. This is likely due to security rules.</p>
                        <p>Error: ${error.message}</p>
                        <p>If you're viewing this on GitHub Pages, make sure your Firebase security rules allow access from this domain.</p>
                        <p>Click the 'Show Debug' button at the bottom right for technical details.</p>
                    </div>
                `;
            });
    } catch (error) {
        debugLog(`Firebase initialization error: ${error.message}`, 'error');
        document.getElementById('ordersContainer').innerHTML = `
            <div class="error-message">
                <h3>⚠️ Firebase Initialization Error</h3>
                <p>Could not initialize Firebase: ${error.message}</p>
                <p>Check the console for more details and make sure your Firebase project settings are correct.</p>
            </div>
        `;
    }
}

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

// Pizza ingredients mapping for John Dough's pizzas with quantities per pizza
const pizzaIngredients = {
    "The Champ Pizza": [
        {name: "pepperoni", amount: 75, unit: "g"},
        {name: "spring onions", amount: 30, unit: "g"},
        {name: "parmesan", amount: 3, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "Pig in Paradise": [
        {name: "bacon", amount: 65, unit: "g"},
        {name: "caramelised pineapple", amount: 130, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "Margie Pizza": [
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "fresh mozzarella", amount: 80, unit: "g"},
        {name: "basil", amount: 10, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "Mushroom Cloud Pizza": [
        {name: "mushrooms", amount: 85, unit: "g"},
        {name: "goat's cheese", amount: 35, unit: "g"},
        {name: "sunflower seeds", amount: 10, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "caramelised onions", amount: 100, unit: "g"},
        {name: "chilli oil", amount: 10, unit: "ml"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "Spud Pizza": [
        {name: "potato slices", amount: 95, unit: "g"},
        {name: "rosemary", amount: 4, unit: "g"},
        {name: "salt flakes", amount: 3, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "caramelised onion", amount: 100, unit: "g"},
        {name: "chilli oil", amount: 10, unit: "ml"},
        {name: "parmesan", amount: 3, unit: "g"}
    ],
    "Mish-Mash Pizza": [
        {name: "parma ham", amount: 40, unit: "g"},
        {name: "fig preserve", amount: 45, unit: "g"},
        {name: "goat's cheese", amount: 35, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "rocket", amount: 15, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "Lekker'izza": [
        {name: "bacon", amount: 65, unit: "g"},
        {name: "chorizo sausage", amount: 65, unit: "g"},
        {name: "peppadews", amount: 30, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "feta", amount: 30, unit: "g"},
        {name: "fresh herbs", amount: 15, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "Vegan Harvest Pizza": [
        {name: "mushrooms", amount: 55, unit: "g"},
        {name: "baby marrow", amount: 40, unit: "g"},
        {name: "kalamata olives", amount: 60, unit: "g"},
        {name: "sundried tomatoes", amount: 40, unit: "g"},
        {name: "seasonal herbs", amount: 1, unit: "g"},
        {name: "hummus", amount: 45, unit: "g"},
        {name: "olive oil", amount: 10, unit: "ml"}
    ],
    "Poppa's Pizza": [
        {name: "anchovies", amount: 35, unit: "g"},
        {name: "olives", amount: 60, unit: "g"},
        {name: "fresh mozzarella", amount: 80, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "basil", amount: 10, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ],
    "The Zesty Zucchini": [
        {name: "courgette", amount: 75, unit: "g"},
        {name: "blue cheese", amount: 40, unit: "g"},
        {name: "parmesan", amount: 3, unit: "g"},
        {name: "fresh mozzarella", amount: 80, unit: "g"}
    ],
    "Chick Tick Boom": [
        {name: "spicy chicken tikka", amount: 100, unit: "g"},
        {name: "peppadews", amount: 30, unit: "g"},
        {name: "fresh coriander", amount: 5, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "pizza sauce", amount: 65, unit: "g"}
    ],
    "Artichoke & Ham": [
        {name: "ham", amount: 40, unit: "g"},
        {name: "mushrooms", amount: 55, unit: "g"},
        {name: "artichoke leaves", amount: 100, unit: "g"},
        {name: "olives", amount: 60, unit: "g"},
        {name: "shredded mozzarella", amount: 95, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "g"}
    ]
};

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
    if (status === 'stats' || status === 'monthly') {
        return orders; // Return all orders for stats
    }
    
    if (status === 'all') {
        return orders; // All orders
    }
    
    // Filter by status
    return orders.filter(order => {
        const data = order.data();
        return data.status && data.status.toLowerCase() === status;
    });
}

// Display orders or statistics in the container
function displayOrders(filteredOrders) {
    // Clear container
    ordersContainer.innerHTML = '';
    
    // Check if this is the stats tab
    if (currentTab === 'stats') {
        displayStatistics(filteredOrders);
        return;
    }
    
    // Check if this is the monthly stats tab
    if (currentTab === 'monthly') {
        displayMonthlyStatistics(filteredOrders);
        return;
    }
    
    // If no orders
    if (filteredOrders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <p>No orders found</p>
            </div>
        `;
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
        
        // Check if same day (local time) only
        const isSameDay = orderDate.getDate() === now.getDate() && 
                          orderDate.getMonth() === now.getMonth() && 
                          orderDate.getFullYear() === now.getFullYear();
        
        return isSameDay; // Only include orders from the current calendar day
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
    
    // Track ingredients usage
    let ingredientsUsage = {};
    
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
                
                // Track ingredients usage based on pizza type
                if (pizzaIngredients[pizzaType]) {
                    pizzaIngredients[pizzaType].forEach(ingredient => {
                        const ingredientKey = `${ingredient.name}|${ingredient.unit}`;
                        if (!ingredientsUsage[ingredientKey]) {
                            ingredientsUsage[ingredientKey] = {
                                name: ingredient.name,
                                amount: 0,
                                unit: ingredient.unit
                            };
                        }
                        ingredientsUsage[ingredientKey].amount += ingredient.amount * quantity;
                    });
                }
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
    
    // If no orders today
    if (todaysOrders.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'no-orders';
        noData.innerHTML = `<p>No pizza orders found for today.</p>`;
        statsContainer.appendChild(noData);
        ordersContainer.appendChild(statsContainer);
        updateLastUpdated();
        return;
    }
    
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
    
    // Order status breakdown with visualization
    const statusBreakdown = document.createElement('div');
    statusBreakdown.className = 'stats-section';
    
    const statusTitle = document.createElement('h3');
    statusTitle.textContent = 'Order Status Breakdown';
    statusBreakdown.appendChild(statusTitle);
    
    // Create a container for status visualization
    const statusVisualContainer = document.createElement('div');
    statusVisualContainer.className = 'stats-visual-container';
    statusBreakdown.appendChild(statusVisualContainer);
    
    // Create a bar chart for status
    const statusChartContainer = document.createElement('div');
    statusChartContainer.className = 'stats-chart-container';
    statusChartContainer.style.flex = '1';
    
    const statusCanvas = document.createElement('canvas');
    statusCanvas.id = 'orderStatusChart';
    statusCanvas.style.width = '100%';
    statusCanvas.style.height = '250px';
    statusChartContainer.appendChild(statusCanvas);
    statusVisualContainer.appendChild(statusChartContainer);
    
    // Create table container
    const statusTableContainer = document.createElement('div');
    statusTableContainer.className = 'stats-table-container';
    statusTableContainer.style.flex = '1';
    statusVisualContainer.appendChild(statusTableContainer);
    
    const statusTable = document.createElement('table');
    statusTable.className = 'stats-table';
    
    // Header
    const statusHeader = document.createElement('tr');
    statusHeader.innerHTML = `
        <th>Status</th>
        <th>Count</th>
    `;
    statusTable.appendChild(statusHeader);
    
    // Prepare data for status chart
    const statusLabels = [];
    const statusData = [];
    const statusColors = [
        'rgba(255, 99, 132, 0.7)',  // pending/new
        'rgba(255, 206, 86, 0.7)',  // preparing
        'rgba(54, 162, 235, 0.7)',  // ready
        'rgba(75, 192, 192, 0.7)',  // done
        'rgba(153, 102, 255, 0.7)', // delivered
        'rgba(255, 159, 64, 0.7)'   // cancelled
    ];
    
    // Create status rows and collect chart data
    for (const [status, count] of Object.entries(statusCounts)) {
        if (count > 0) {
            const row = document.createElement('tr');
            
            // Capitalize status
            const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
            
            row.innerHTML = `
                <td>${formattedStatus}</td>
                <td>${count}</td>
            `;
            
            statusTable.appendChild(row);
            
            // Add to chart data
            statusLabels.push(formattedStatus);
            statusData.push(count);
        }
    }
    
    statusTableContainer.appendChild(statusTable);
    
    // Create status chart script
    const statusChartScript = document.createElement('script');
    statusChartScript.innerHTML = `
        setTimeout(() => {
            const statusCtx = document.getElementById('orderStatusChart');
            if (!statusCtx) return;
            
            new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(statusLabels)},
                    datasets: [{
                        label: 'Number of Orders',
                        data: ${JSON.stringify(statusData)},
                        backgroundColor: ${JSON.stringify(statusColors.slice(0, statusLabels.length))},
                        borderColor: ${JSON.stringify(statusColors.slice(0, statusLabels.length).map(color => color.replace('0.7', '1')))},
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Orders by Status',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }, 100);
    `;
    
    statusBreakdown.appendChild(statusChartScript);
    statsContainer.appendChild(statusBreakdown);
    
    // Add hourly distribution chart
    // Group orders by hour
    const hourlyOrders = {};
    
    todaysOrders.forEach(order => {
        const data = order.data();
        const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
            new Date(data.orderTime) : 
            (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
        
        if (!orderTime) return;
        
        const hour = orderTime.getHours();
        
        // Initialize hour if not exists
        if (!hourlyOrders[hour]) {
            hourlyOrders[hour] = 0;
        }
        
        // Count order for this hour
        hourlyOrders[hour]++;
    });
    
    if (Object.keys(hourlyOrders).length > 0) {
        const hourlyBreakdown = document.createElement('div');
        hourlyBreakdown.className = 'stats-section';
        
        const hourlyTitle = document.createElement('h3');
        hourlyTitle.textContent = 'Hourly Order Distribution';
        hourlyBreakdown.appendChild(hourlyTitle);
        
        const hourlyChartContainer = document.createElement('div');
        hourlyChartContainer.className = 'stats-chart-container full-width';
        
        const hourlyCanvas = document.createElement('canvas');
        hourlyCanvas.id = 'hourlyOrdersChart';
        hourlyCanvas.style.width = '100%';
        hourlyCanvas.style.height = '250px';
        hourlyChartContainer.appendChild(hourlyCanvas);
        hourlyBreakdown.appendChild(hourlyChartContainer);
        
        // Create all 24 hours for a complete timeline
        const hourLabels = [];
        const hourData = [];
        
        for (let i = 0; i < 24; i++) {
            // Format hour as 12-hour with AM/PM
            let displayHour;
            if (i === 0) displayHour = '12 AM';
            else if (i < 12) displayHour = `${i} AM`;
            else if (i === 12) displayHour = '12 PM';
            else displayHour = `${i - 12} PM`;
            
            hourLabels.push(displayHour);
            hourData.push(hourlyOrders[i] || 0);
        }
        
        // Create hourly chart script
        const hourlyChartScript = document.createElement('script');
        hourlyChartScript.innerHTML = `
            setTimeout(() => {
                const hourlyCtx = document.getElementById('hourlyOrdersChart');
                if (!hourlyCtx) return;
                
                new Chart(hourlyCtx, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(hourLabels)},
                        datasets: [{
                            label: 'Orders per Hour',
                            data: ${JSON.stringify(hourData)},
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2,
                            tension: 0.2,
                            fill: true,
                            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Orders Throughout the Day',
                                font: {
                                    size: 16
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        hourlyBreakdown.appendChild(hourlyChartScript);
        statsContainer.appendChild(hourlyBreakdown);
    }
    
    // Create pizza types breakdown
    // If we have pizza types, display breakdown with visualization
    if (Object.keys(pizzaTypes).length > 0) {
        const pizzaTypesBreakdown = document.createElement('div');
        pizzaTypesBreakdown.className = 'stats-section';
        
        const pizzaTypesTitle = document.createElement('h3');
        pizzaTypesTitle.textContent = 'Pizza Types Sold Today';
        pizzaTypesBreakdown.appendChild(pizzaTypesTitle);
        
        // Create chart and table container with flex layout
        const pizzaTypesVisualContainer = document.createElement('div');
        pizzaTypesVisualContainer.className = 'stats-visual-container';
        pizzaTypesBreakdown.appendChild(pizzaTypesVisualContainer);
        
        // Add pie chart for pizza distribution
        const pieChartContainer = document.createElement('div');
        pieChartContainer.className = 'stats-chart-container';
        pieChartContainer.style.flex = '1';
        
        const pieCanvas = document.createElement('canvas');
        pieCanvas.id = 'pizzaTypesPieChart';
        pieCanvas.style.width = '100%';
        pieCanvas.style.height = '300px';
        pieChartContainer.appendChild(pieCanvas);
        pizzaTypesVisualContainer.appendChild(pieChartContainer);
        
        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'stats-table-container';
        tableContainer.style.flex = '1';
        pizzaTypesVisualContainer.appendChild(tableContainer);
        
        const pizzaTypesTable = document.createElement('table');
        pizzaTypesTable.className = 'stats-table';
        
        // Create table header
        const header = document.createElement('tr');
        header.innerHTML = `
            <th>Pizza Type</th>
            <th>Quantity</th>
            <th>% of Total</th>
        `;
        pizzaTypesTable.appendChild(header);
        
        // Sort pizza types by quantity (descending)
        const sortedPizzaTypes = Object.entries(pizzaTypes)
            .sort((a, b) => b[1] - a[1]);
        
        // Prepare data for pie chart
        const pieLabels = [];
        const pieData = [];
        const pieColors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(40, 159, 64, 0.8)',
            'rgba(210, 55, 86, 0.8)'
        ];
        
        // Create table rows and collect pie chart data
        sortedPizzaTypes.forEach(([type, quantity], index) => {
            const row = document.createElement('tr');
            const percentage = ((quantity / totalPizzas) * 100).toFixed(1);
            
            row.innerHTML = `
                <td>${type}</td>
                <td>${quantity}</td>
                <td>${percentage}%</td>
            `;
            
            pizzaTypesTable.appendChild(row);
            
            // Add data for pie chart (limit to top 8 for clarity)
            if (index < 8) {
                pieLabels.push(type);
                pieData.push(quantity);
            } else if (index === 8) {
                // Group remaining as "Other"
                pieLabels.push('Other');
                pieData.push(quantity);
            } else if (index > 8) {
                // Add to "Other"
                pieData[8] += quantity;
            }
        });
        
        tableContainer.appendChild(pizzaTypesTable);
        
        // Create pie chart script
        const pieChartScript = document.createElement('script');
        pieChartScript.innerHTML = `
            setTimeout(() => {
                const pieCtx = document.getElementById('pizzaTypesPieChart');
                if (!pieCtx) return;
                
                new Chart(pieCtx, {
                    type: 'pie',
                    data: {
                        labels: ${JSON.stringify(pieLabels)},
                        datasets: [{
                            data: ${JSON.stringify(pieData)},
                            backgroundColor: ${JSON.stringify(pieColors.slice(0, pieLabels.length))},
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    boxWidth: 15,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            title: {
                                display: true,
                                text: 'Pizza Types Distribution',
                                font: {
                                    size: 16
                                }
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        pizzaTypesBreakdown.appendChild(pieChartScript);
        statsContainer.appendChild(pizzaTypesBreakdown);
    }
    
    // If we have ingredients, display usage with visualization
    if (Object.keys(ingredientsUsage).length > 0) {
        const ingredientsBreakdown = document.createElement('div');
        ingredientsBreakdown.className = 'stats-section';
        
        const ingredientsTitle = document.createElement('h3');
        ingredientsTitle.textContent = 'Ingredients Used Today';
        ingredientsBreakdown.appendChild(ingredientsTitle);
        
        // Create visualization container
        const ingredientsVisualContainer = document.createElement('div');
        ingredientsVisualContainer.className = 'stats-visual-container';
        ingredientsBreakdown.appendChild(ingredientsVisualContainer);
        
        // Create chart container
        const ingredientsChartContainer = document.createElement('div');
        ingredientsChartContainer.className = 'stats-chart-container';
        ingredientsChartContainer.style.flex = '1';
        
        const ingredientsCanvas = document.createElement('canvas');
        ingredientsCanvas.id = 'ingredientsChart';
        ingredientsCanvas.style.width = '100%';
        ingredientsCanvas.style.height = '300px';
        ingredientsChartContainer.appendChild(ingredientsCanvas);
        ingredientsVisualContainer.appendChild(ingredientsChartContainer);
        
        // Create table container
        const ingredientsTableContainer = document.createElement('div');
        ingredientsTableContainer.className = 'stats-table-container';
        ingredientsTableContainer.style.flex = '1';
        ingredientsVisualContainer.appendChild(ingredientsTableContainer);
        
        const ingredientsTable = document.createElement('div');
        ingredientsTable.className = 'stats-table ingredients-table';
        ingredientsTableContainer.appendChild(ingredientsTable);
        
        // Sort ingredients by usage (descending)
        const sortedIngredients = Object.values(ingredientsUsage)
            .sort((a, b) => b.amount - a.amount);
        
        // Prepare data for ingredients chart (top 10 only for clarity)
        const ingredientLabels = [];
        const ingredientData = [];
        const ingredientColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)',
            'rgba(83, 102, 255, 0.7)',
            'rgba(40, 159, 64, 0.7)',
            'rgba(210, 55, 86, 0.7)'
        ];
        
        // Create table rows and collect chart data
        sortedIngredients.forEach((ingredient, index) => {
            const ingredientRow = document.createElement('div');
            ingredientRow.className = 'stats-table-row';
            
            const ingredientName = document.createElement('div');
            ingredientName.className = 'stats-table-cell stats-table-name';
            ingredientName.textContent = ingredient.name;
                
            const ingredientCount = document.createElement('div');
            ingredientCount.className = 'stats-table-cell stats-table-count';
            ingredientCount.textContent = `${ingredient.amount.toFixed(0)} ${ingredient.unit}`;
            
            ingredientRow.appendChild(ingredientName);
            ingredientRow.appendChild(ingredientCount);
            ingredientsTable.appendChild(ingredientRow);
            
            // Add top 10 ingredients to chart
            if (index < 10) {
                ingredientLabels.push(ingredient.name);
                ingredientData.push(ingredient.amount);
            }
        });
        
        // Create ingredients chart script
        const ingredientsChartScript = document.createElement('script');
        ingredientsChartScript.innerHTML = `
            setTimeout(() => {
                const ingredientsCtx = document.getElementById('ingredientsChart');
                if (!ingredientsCtx) return;
                
                new Chart(ingredientsCtx, {
                    type: 'horizontalBar',
                    data: {
                        labels: ${JSON.stringify(ingredientLabels)},
                        datasets: [{
                            label: 'Amount Used',
                            data: ${JSON.stringify(ingredientData)},
                            backgroundColor: ${JSON.stringify(ingredientColors.slice(0, ingredientLabels.length))},
                            borderColor: ${JSON.stringify(ingredientColors.slice(0, ingredientLabels.length).map(color => color.replace('0.7', '1')))},
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Top Ingredients Used (by quantity)',
                                font: {
                                    size: 16
                                }
                            },
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        ingredientsBreakdown.appendChild(ingredientsChartScript);
        statsContainer.appendChild(ingredientsBreakdown);
    }
    
    ordersContainer.appendChild(statsContainer);
    updateLastUpdated();
}

// Display monthly statistics
function displayMonthlyStatistics(allOrders) {
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get previous month and year
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
        prevMonth = 11; // December
        prevYear = currentYear - 1;
    }
    
    // Create month selector
    const monthSelector = document.createElement('div');
    monthSelector.className = 'month-selector';
    monthSelector.innerHTML = `
        <label for="monthSelect">Select Month: </label>
        <select id="monthSelect">
            <option value="current" selected>Current Month (${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear})</option>
            <option value="previous">Previous Month (${new Date(prevYear, prevMonth).toLocaleString('default', { month: 'long' })} ${prevYear})</option>
        </select>
    `;
    statsContainer.appendChild(monthSelector);
    
    // Create container for stats content that will be updated based on selection
    const statsContent = document.createElement('div');
    statsContent.id = 'monthlyStatsContent';
    statsContainer.appendChild(statsContent);
    
    // Function to render stats for a specific month
    const renderMonthStats = (targetMonth, targetYear) => {
        // Clear previous content
        statsContent.innerHTML = '';
        
        // Filter orders for the selected month
        const monthlyOrders = allOrders.filter(order => {
            const data = order.data();
            const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
            
            if (!orderTime) return false;
            
            const orderDate = new Date(orderTime);
            
            // Check if same month and year
            return orderDate.getMonth() === targetMonth && orderDate.getFullYear() === targetYear;
        });
        
        // Create month display
        const dateDisplay = document.createElement('div');
        dateDisplay.className = 'stats-date';
        dateDisplay.textContent = new Date(targetYear, targetMonth, 1).toLocaleDateString(undefined, { 
            year: 'numeric', month: 'long'
        });
        statsContent.appendChild(dateDisplay);
        
        // If no orders for this month
        if (monthlyOrders.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-orders';
            noData.innerHTML = `<p>No pizza orders found for this month.</p>`;
            statsContent.appendChild(noData);
            return;
        }
        
        // Group orders by day of month
        const ordersByDay = {};
        const pizzaTypesByDay = {};
        let monthlyTotalPizzas = 0;
        let monthlyTotalRevenue = 0;
        let monthlyTotalOrders = monthlyOrders.length;
        let bestSellingPizza = { type: 'None', count: 0 };
        let pizzaTypes = {};
        
        monthlyOrders.forEach(order => {
            const data = order.data();
            const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
            
            if (!orderTime) return;
            
            const orderDate = new Date(orderTime);
            const dayOfMonth = orderDate.getDate();
            
            // Initialize day if not exists
            if (!ordersByDay[dayOfMonth]) {
                ordersByDay[dayOfMonth] = {
                    orders: 0,
                    revenue: 0,
                    pizzas: 0
                };
            }
            
            // Initialize pizza types by day
            if (!pizzaTypesByDay[dayOfMonth]) {
                pizzaTypesByDay[dayOfMonth] = {};
            }
            
            // Count order for this day
            ordersByDay[dayOfMonth].orders++;
            
            // Add revenue
            const revenue = Number(data.totalAmount) || 0;
            ordersByDay[dayOfMonth].revenue += revenue;
            monthlyTotalRevenue += revenue;
            
            // Count pizzas
            if (data.pizzas && Array.isArray(data.pizzas)) {
                data.pizzas.forEach(pizza => {
                    const quantity = pizza.quantity || 1;
                    const pizzaType = pizza.pizzaType || 'Unknown';
                    
                    // Add to daily count
                    ordersByDay[dayOfMonth].pizzas += quantity;
                    
                    // Add to pizza types by day
                    if (!pizzaTypesByDay[dayOfMonth][pizzaType]) {
                        pizzaTypesByDay[dayOfMonth][pizzaType] = 0;
                    }
                    pizzaTypesByDay[dayOfMonth][pizzaType] += quantity;
                    
                    // Add to monthly count
                    monthlyTotalPizzas += quantity;
                    
                    // Track best-selling pizza
                    if (!pizzaTypes[pizzaType]) pizzaTypes[pizzaType] = 0;
                    pizzaTypes[pizzaType] += quantity;
                    
                    if (pizzaTypes[pizzaType] > bestSellingPizza.count) {
                        bestSellingPizza = {
                            type: pizzaType,
                            count: pizzaTypes[pizzaType]
                        };
                    }
                });
            }
        });
        
        // Create summary cards for the month
        const summaryCardsContainer = document.createElement('div');
        summaryCardsContainer.className = 'stats-summary-cards';
        
        // Orders this month
        summaryCardsContainer.appendChild(
            createStatCard('Monthly Orders', monthlyTotalOrders, 'receipt_long', 'primary')
        );
        
        // Total pizzas this month
        summaryCardsContainer.appendChild(
            createStatCard('Monthly Pizzas', monthlyTotalPizzas, 'local_pizza')
        );
        
        // Total revenue this month
        summaryCardsContainer.appendChild(
            createStatCard('Monthly Revenue', formatCurrency(monthlyTotalRevenue), 'payments', 'success')
        );
        
        // Best-selling pizza
        summaryCardsContainer.appendChild(
            createStatCard('Best Seller', bestSellingPizza.type, 'star', 'warning')
        );
        
        statsContent.appendChild(summaryCardsContainer);
        
        // Create daily breakdown
        const dailyBreakdownContainer = document.createElement('div');
        dailyBreakdownContainer.className = 'stats-section';
        
        const dailyBreakdownTitle = document.createElement('h3');
        dailyBreakdownTitle.textContent = 'Daily Breakdown';
        dailyBreakdownContainer.appendChild(dailyBreakdownTitle);
        
        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'stats-chart-container';
        
        // Create chart
        const chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'dailySalesChart';
        chartCanvas.style.width = '100%';
        chartCanvas.style.height = '300px';
        chartContainer.appendChild(chartCanvas);
        
        dailyBreakdownContainer.appendChild(chartContainer);
        
        // Create a table for daily data
        const table = document.createElement('table');
        table.className = 'stats-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Day</th>
                <th>Orders</th>
                <th>Pizzas</th>
                <th>Revenue</th>
                <th>Top Pizza</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        // Sort days numerically
        const sortedDays = Object.keys(ordersByDay).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Prepare data for chart
        const chartLabels = [];
        const orderData = [];
        const revenueData = [];
        const pizzaData = [];
        
        sortedDays.forEach(day => {
            const dayData = ordersByDay[day];
            
            // Add to chart data
            chartLabels.push(day);
            orderData.push(dayData.orders);
            revenueData.push(dayData.revenue);
            pizzaData.push(dayData.pizzas);
            
            // Find top pizza for this day
            let topPizza = { type: 'None', count: 0 };
            const pizzasForDay = pizzaTypesByDay[day];
            
            for (const [type, count] of Object.entries(pizzasForDay)) {
                if (count > topPizza.count) {
                    topPizza = { type, count };
                }
            }
            
            // Create table row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${day}</td>
                <td>${dayData.orders}</td>
                <td>${dayData.pizzas}</td>
                <td>${formatCurrency(dayData.revenue)}</td>
                <td>${topPizza.type} (${topPizza.count})</td>
            `;
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        dailyBreakdownContainer.appendChild(table);
        
        statsContent.appendChild(dailyBreakdownContainer);
        
        // Add chart script to visualize the data
        const chartScript = document.createElement('script');
        chartScript.innerHTML = `
            // Wait for the canvas to be in the DOM
            setTimeout(() => {
                const canvas = document.getElementById('dailySalesChart');
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(chartLabels)},
                        datasets: [
                            {
                                label: 'Pizzas',
                                data: ${JSON.stringify(pizzaData)},
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 1
                            },
                            {
                                label: 'Orders',
                                data: ${JSON.stringify(orderData)},
                                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                borderColor: 'rgb(54, 162, 235)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        statsContent.appendChild(chartScript);
    };
    
    // Initial render with current month
    renderMonthStats(currentMonth, currentYear);
    
    // Add event listener for month selector
    setTimeout(() => {
        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect) {
            monthSelect.addEventListener('change', function() {
                if (this.value === 'current') {
                    renderMonthStats(currentMonth, currentYear);
                } else {
                    renderMonthStats(prevMonth, prevYear);
                }
            });
        }
    }, 0);
    
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
    debugLog('Attempting to fetch orders...');
    
    // Show loading indicator
    ordersContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading pizza orders...</p>
        </div>
    `;
    
    // Check if Firebase is properly initialized
    if (typeof firebase === 'undefined') {
        debugLog('Firebase SDK not loaded when trying to fetch orders', 'error');
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <h3>⚠️ Firebase Not Loaded</h3>
                <p>Firebase SDK is not loaded. Please check your internet connection and refresh the page.</p>
            </div>
        `;
        return;
    }
    
    if (!db) {
        debugLog('Firestore database not initialized when trying to fetch orders', 'error');
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <h3>⚠️ Database Not Initialized</h3>
                <p>Firestore database is not properly initialized. Please check console for errors.</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        return;
    }
    
    try {
        debugLog('Creating Firestore query to fetch orders');
        const query = db.collection('orders')
            .orderBy('orderTime', 'desc')
            .limit(100); // Increased limit to 100 orders
        
        debugLog('Executing Firestore query...');
        query.get().then(snapshot => {
            debugLog(`Orders fetched successfully: ${snapshot.size} orders retrieved`);
            orders = snapshot.docs;
            const filteredOrders = filterOrdersByStatus(currentTab);
            displayOrders(filteredOrders);
        }).catch(error => {
            debugLog(`Error fetching orders: ${error.message}`, 'error');
            if (error.code === 'permission-denied') {
                debugLog('Firebase permission denied error - likely a security rules issue', 'error');
                ordersContainer.innerHTML = `
                    <div class="no-orders">
                        <h3>⚠️ Access Denied</h3>
                        <p>Firebase security rules are preventing access to the database.</p>
                        <p>If you're viewing this on GitHub Pages, please update your Firestore security rules to allow access from this domain (${window.location.hostname}).</p>
                        <p>Error details: ${error.message}</p>
                    </div>
                `;
            } else {
                ordersContainer.innerHTML = `
                    <div class="no-orders">
                        <h3>⚠️ Error Loading Orders</h3>
                        <p>${error.message}</p>
                        <p>Error code: ${error.code || 'unknown'}</p>
                        <button onclick="fetchOrders()">Try Again</button>
                    </div>
                `;
            }
        });
    } catch (e) {
        debugLog(`Fatal error accessing Firestore: ${e.message}`, 'error');
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <h3>⚠️ Connection Error</h3>
                <p>Could not connect to Firebase database. Error: ${e.message}</p>
                <button onclick="location.reload()">Reload Page</button>
            </div>
        `;
    }
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
