// Subscription Manager Logic with Image Logo Support

let subscriptions = [];

// Domain Map for Manual Overrides (if auto-detection fails)
const DOMAIN_MAP = {
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'prime': 'amazon.in',
    'amazon': 'amazon.in',
    'hotstar': 'hotstar.com',
    'disney': 'hotstar.com',
    'zee5': 'zee5.com',
    'sonyliv': 'sonyliv.com',
    'sony': 'sonyliv.com',
    'lionsgate': 'lionsgateplay.com',
    'firstcry': 'firstcry.com',
    'zomato': 'zomato.com',
    'swiggy': 'swiggy.com',
    'jio': 'jio.com',
    'airtel': 'airtel.in',
    'vi': 'myvi.in',
    'bsnl': 'bsnl.co.in',
    'act': 'actcorp.in',
    'apple': 'apple.com',
    'icloud': 'apple.com',
    'google': 'google.com',
    'youtube': 'youtube.com',
    'chatgpt': 'openai.com',
    'claude': 'anthropic.com',
    'midjourney': 'midjourney.com',
    'uber': 'uber.com',
    'ola': 'olacabs.com',
    'blinkit': 'blinkit.com',
    'zepto': 'zeptonow.com',
    'bigbasket': 'bigbasket.com'
};

const DEFAULT_SUBS = [
    { id: 1, name: 'Netflix', cost: 649, cycle: 'monthly', date: 5, category: 'Entertainment', domain: 'netflix.com' },
    { id: 2, name: 'Spotify', cost: 119, cycle: 'monthly', date: 21, category: 'Entertainment', domain: 'spotify.com' },
    { id: 3, name: 'Amazon Prime', cost: 1499, cycle: 'yearly', date: 15, category: 'Entertainment', domain: 'amazon.in' },
    { id: 4, name: 'Hotstar', cost: 149, cycle: 'monthly', date: 1, category: 'Entertainment', domain: 'hotstar.com' }
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

// Helper: Get Logo URL
function getLogoUrl(name, savedDomain) {
    if (savedDomain) return `https://logo.clearbit.com/${savedDomain}`;

    // Attempt detection
    const lowerName = name.toLowerCase().replace(/\s/g, '');
    for (const [key, domain] of Object.entries(DOMAIN_MAP)) {
        if (lowerName.includes(key)) {
            return `https://logo.clearbit.com/${domain}`;
        }
    }

    return null; // Fallback to icon
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

        const logoUrl = getLogoUrl(sub.name, sub.domain);

        let iconHTML = '';
        if (logoUrl) {
            iconHTML = `
                <div class="sub-logo-wrapper">
                    <img src="${logoUrl}" class="sub-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <i class="fas fa-receipt sub-logo-placeholder" style="display:none;"></i>
                </div>
            `;
        } else {
            iconHTML = `
                <div class="sub-logo-wrapper">
                    <i class="fas fa-receipt sub-logo-placeholder"></i>
                </div>
            `;
        }

        item.innerHTML = `
            ${iconHTML}
            <div class="transaction-info">
                <div class="transaction-title">${sub.name}</div>
                <div class="transaction-date">
                    <i class="fas fa-clock" style="font-size: 0.7rem;"></i> ${sub.cycle === 'monthly' ? 'Monthly' : 'Yearly'} • Due ${sub.date}
                </div>
            </div>
            <div class="transaction-amount">
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
    const cycleBtn = document.querySelector('.cycle-btn.active');
    const cycle = cycleBtn ? cycleBtn.dataset.value : 'monthly';

    if (!name || isNaN(cost) || isNaN(date)) {
        alert('Please fill all fields');
        return;
    }

    // Try to guess domain for logo
    let domain = null;
    const lowerName = name.toLowerCase().replace(/\s/g, '');
    for (const [key, d] of Object.entries(DOMAIN_MAP)) {
        if (lowerName.includes(key)) {
            domain = d;
            break;
        }
    }

    const newSub = {
        id: Date.now(),
        name,
        cost,
        cycle,
        date,
        category,
        domain
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
    document.getElementById('sub-name').value = '';
    document.getElementById('sub-cost').value = '';
    document.getElementById('sub-date').value = '';
}

// Chip Toggle (Updated Class Name)
document.querySelectorAll('.cycle-btn').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.cycle-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });
});

saveBtn.onclick = addSubscription;

// Initialize
window.deleteSubscription = deleteSubscription;
document.addEventListener('DOMContentLoaded', loadSubscriptions);
