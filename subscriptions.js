// Subscription Manager Logic

let subscriptions = [];
const DEFAULT_SUBS = [
    { id: 1, name: 'Netflix', cost: 649, cycle: 'monthly', date: 5, category: 'Entertainment', icon: 'fa-film', color: '#E50914' },
    { id: 2, name: 'Spotify', cost: 119, cycle: 'monthly', date: 21, category: 'Entertainment', icon: 'fa-music', color: '#1DB954' },
    { id: 3, name: 'Amazon Prime', cost: 1499, cycle: 'yearly', date: 15, category: 'Entertainment', icon: 'fa-box', color: '#00A8E1' }
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

// Render List
function renderSubscriptions() {
    const container = document.getElementById('subscription-list');
    container.innerHTML = '';

    // Sort by due date
    subscriptions.sort((a, b) => a.date - b.date);

    subscriptions.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        let icon = sub.icon || 'fa-receipt';
        // Auto-icon logic
        if (sub.name.toLowerCase().includes('netflix')) icon = 'fa-film';
        else if (sub.name.toLowerCase().includes('spotify')) icon = 'fa-music';
        else if (sub.name.toLowerCase().includes('prime') || sub.name.toLowerCase().includes('amazon')) icon = 'fa-box';
        else if (sub.name.toLowerCase().includes('youtube')) icon = 'fa-play';
        else if (sub.name.toLowerCase().includes('google')) icon = 'fa-google';
        else if (sub.name.toLowerCase().includes('apple')) icon = 'fa-apple';
        else if (sub.name.toLowerCase().includes('chatgpt') || sub.name.toLowerCase().includes('ai')) icon = 'fa-robot';

        item.innerHTML = `
            <div class="transaction-icon" style="background: rgba(255, 255, 255, 0.05); color: ${sub.color || 'var(--text-primary)'}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-title">${sub.name}</div>
                <div class="transaction-date">${sub.cycle === 'monthly' ? 'Monthly' : 'Yearly'} • Due on ${sub.date}</div>
            </div>
            <div class="transaction-amount">
                ${formatMoney(sub.cost)}
            </div>
            <button class="delete-btn" onclick="deleteSubscription(${sub.id})" style="margin-left: 1rem; background: none; border: none; color: var(--text-secondary);"><i class="fas fa-trash"></i></button>
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

    const newSub = {
        id: Date.now(),
        name,
        cost,
        cycle,
        date,
        category,
        icon: 'fa-receipt', // Default
        color: '#fff'
    };

    subscriptions.push(newSub);
    saveSubscriptions();
    renderSubscriptions();
    closeModal();
}

function deleteSubscription(id) {
    if (confirm('Delete this subscription?')) {
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
    document.getElementById('sub-name').focus();
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
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });
});

saveBtn.onclick = addSubscription;

// Initialize
// Make delete global
window.deleteSubscription = deleteSubscription;
document.addEventListener('DOMContentLoaded', loadSubscriptions);
