// Subscription Manager Logic with Advanced Branding

let subscriptions = [];

// Defining Brand Colors & Icons map
const BRAND_ASSETS = {
    'netflix': { color: '#E50914', icon: 'fa-ticket-alt' }, // FontAwesome doesn't have N logo in free tier usually, sticking to generic
    'spotify': { color: '#1DB954', icon: 'fa-spotify', isBrand: true },
    'youtube': { color: '#FF0000', icon: 'fa-youtube', isBrand: true },
    'prime': { color: '#00A8E1', icon: 'fa-amazon', isBrand: true },
    'amazon': { color: '#FF9900', icon: 'fa-amazon', isBrand: true },
    'hotstar': { color: '#05cbed', icon: 'fa-play-circle' }, // Teal/Greenish
    'zee5': { color: '#8230c6', icon: 'fa-tv' }, // Purple
    'sonyliv': { color: '#fba523', icon: 'fa-film' }, // Orange
    'sony': { color: '#000000', icon: 'fa-film' },
    'lionsgate': { color: '#ffffff', icon: 'fa-film' },
    'firstcry': { color: '#be1e2d', icon: 'fa-baby' },
    'zomato': { color: '#cb202d', icon: 'fa-utensils' },
    'swiggy': { color: '#fc8019', icon: 'fa-hamburger' },
    'apple': { color: '#A2AAAD', icon: 'fa-apple', isBrand: true },
    'google': { color: '#4285F4', icon: 'fa-google', isBrand: true },
    'chatgpt': { color: '#10a37f', icon: 'fa-robot' },
    'jio': { color: '#0f3cc9', icon: 'fa-wifi' },
    'airtel': { color: '#f50000', icon: 'fa-broadcast-tower' }
};

const DEFAULT_SUBS = [
    { id: 1, name: 'Netflix', cost: 649, cycle: 'monthly', date: 5, category: 'Entertainment', color: '#E50914', icon: 'fa-film' },
    { id: 2, name: 'Spotify', cost: 119, cycle: 'monthly', date: 21, category: 'Entertainment', color: '#1DB954', icon: 'fa-spotify', isBrand: true },
    { id: 3, name: 'Amazon Prime', cost: 1499, cycle: 'yearly', date: 15, category: 'Entertainment', color: '#00A8E1', icon: 'fa-amazon', isBrand: true },
    { id: 4, name: 'Hotstar', cost: 149, cycle: 'monthly', date: 1, category: 'Entertainment', color: '#05cbed', icon: 'fa-play-circle' }
];

// Load Data
function loadSubscriptions() {
    const saved = localStorage.getItem('mySubscriptions');
    if (saved) {
        subscriptions = JSON.parse(saved);
    } else {
        subscriptions = DEFAULT_SUBS;
        saveSubscriptions();
    }
    renderSubscriptions();
    updateStats();
}

// Save Data
function saveSubscriptions() {
    localStorage.setItem('mySubscriptions', JSON.stringify(subscriptions));
    updateStats();
}

// Format Currency
const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// Update Stats
function updateStats() {
    let monthlyTotal = 0;
    let yearlyTotal = 0;

    subscriptions.forEach(sub => {
        if (sub.cycle === 'monthly') {
            monthlyTotal += sub.cost;
            yearlyTotal += sub.cost * 12;
        } else {
            yearlyTotal += sub.cost;
            monthlyTotal += sub.cost / 12;
        }
    });

    document.getElementById('total-monthly').textContent = formatMoney(monthlyTotal);
    document.getElementById('total-yearly').textContent = formatMoney(yearlyTotal);
}

// Helper: Get Brand Style
function getBrandStyle(name) {
    const lowerName = name.toLowerCase();
    for (const [key, asset] of Object.entries(BRAND_ASSETS)) {
        if (lowerName.includes(key)) {
            return asset;
        }
    }
    return { color: 'var(--text-secondary)', icon: 'fa-receipt', isBrand: false };
}

// Render List
function renderSubscriptions() {
    const container = document.getElementById('subscription-list');
    container.innerHTML = '';

    // Sort by due date
    subscriptions.sort((a, b) => a.date - b.date);

    subscriptions.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        let style = getBrandStyle(sub.name);

        // Prefer saved icon if available, else derive
        let iconClass = sub.icon || style.icon;
        let color = sub.color || style.color;
        let isBrand = sub.isBrand || style.isBrand;

        // FontAwesome Brands prefix is 'fab', others 'fas'
        const faPrefix = isBrand ? 'fab' : 'fas';

        item.innerHTML = `
            <div class="transaction-icon" style="background: rgba(255, 255, 255, 0.05); color: ${color}; width: 42px; height: 42px; font-size: 1.2rem;">
                <i class="${faPrefix} ${iconClass}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-title">${sub.name}</div>
                <div class="transaction-date" style="color: var(--text-secondary); font-size: 0.8rem;">
                    ${sub.cycle === 'monthly' ? 'Monthly' : 'Yearly'} • Due on ${sub.date}
                </div>
            </div>
            <div class="transaction-amount" style="font-weight: 600; font-size: 1rem;">
                ${formatMoney(sub.cost)}
            </div>
            <button class="delete-btn" onclick="deleteSubscription(${sub.id})" style="margin-left: 1rem; background: none; border: none; color: var(--text-secondary); opacity: 0.5; transition: opacity 0.2s;"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(item);
    });
}

// Add Subscription
function addSubscription() {
    const name = document.getElementById('sub-name').value;
    const cost = parseFloat(document.getElementById('sub-cost').value);
    const date = parseInt(document.getElementById('sub-date').value);
    const category = document.getElementById('sub-category').value;
    const cycleBtn = document.querySelector('.chip.active');
    const cycle = cycleBtn ? cycleBtn.dataset.value : 'monthly';

    if (!name || isNaN(cost) || isNaN(date)) {
        alert('Please fill all fields');
        return;
    }

    // Auto-detect brand styling
    const style = getBrandStyle(name);

    const newSub = {
        id: Date.now(),
        name,
        cost,
        cycle,
        date,
        category,
        icon: style.icon,
        color: style.color,
        isBrand: style.isBrand
    };

    subscriptions.push(newSub);
    saveSubscriptions();
    renderSubscriptions();
    closeModal();
}

function deleteSubscription(id) {
    if (confirm('Stop tracking this subscription?')) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        saveSubscriptions();
        renderSubscriptions();
    }
}

// Modal Logic
const modal = document.getElementById('sub-modal');
const addBtn = document.getElementById('add-sub-btn');
const closeBtn = document.getElementById('close-modal');
const saveBtn = document.getElementById('save-sub-btn');

addBtn.onclick = () => {
    modal.classList.add('active');
    setTimeout(() => document.getElementById('sub-name').focus(), 100);
};

closeBtn.onclick = closeModal;

function closeModal() {
    modal.classList.remove('active');
    // Clear inputs
    document.getElementById('sub-name').value = '';
    document.getElementById('sub-cost').value = '';
    document.getElementById('sub-date').value = '';
}

// Chip Toggle
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => {
            c.classList.remove('active');
            c.style.background = 'transparent';
            c.style.color = 'var(--text-secondary)';
            c.style.border = '1px solid var(--glass-border)';
        });
        chip.classList.add('active');
        chip.style.background = 'rgba(236, 72, 153, 0.2)';
        chip.style.color = 'white';
        chip.style.border = '1px solid var(--primary)';
    });
});

saveBtn.onclick = addSubscription;

// Initialize
window.deleteSubscription = deleteSubscription;
document.addEventListener('DOMContentLoaded', loadSubscriptions);
