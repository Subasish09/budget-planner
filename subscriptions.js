// Subscription Manager Logic with Image Logo Support

let subscriptions = [];

// Domain Map for Manual Overrides (if auto-detection fails)
const DOMAIN_MAP = {
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'prime': 'primevideo.com',
    'amazon': 'primevideo.com',
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
    { id: 3, name: 'Amazon Prime', cost: 1499, cycle: 'yearly', date: '2026-08-15', category: 'Entertainment', domain: 'amazon.in' },
    { id: 4, name: 'Hotstar', cost: 149, cycle: 'monthly', date: 1, category: 'Entertainment', domain: 'hotstar.com' }
];

// Helper: Calculate Next Renewal Date
function calculateNextRenewal(sub) {
    const today = new Date();

    if (sub.cycle === 'monthly') {
        const day = sub.date;
        let nextMonth = new Date(today.getFullYear(), today.getMonth(), day);

        // If the date has passed this month, move to next month
        if (nextMonth <= today) {
            nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, day);
        }

        return nextMonth;
    } else {
        // Yearly: sub.date is ISO string
        const renewalDate = new Date(sub.date);

        // If renewal date has passed, add 1 year
        if (renewalDate <= today) {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }

        return renewalDate;
    }
}

// Helper: Check if renewal is upcoming (within 7 days)
function isUpcoming(sub) {
    const nextRenewal = calculateNextRenewal(sub);
    const today = new Date();
    const daysUntil = Math.ceil((nextRenewal - today) / (1000 * 60 * 60 * 24));

    return daysUntil >= 0 && daysUntil <= 7;
}

// Helper: Get days until renewal
function getDaysUntilRenewal(sub) {
    const nextRenewal = calculateNextRenewal(sub);
    const today = new Date();
    return Math.ceil((nextRenewal - today) / (1000 * 60 * 60 * 24));
}

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

    // Update insights
    renderInsights();
}

// Render Smart Insights
function renderInsights() {
    if (subscriptions.length === 0) {
        document.getElementById('most-expensive-name').textContent = '-';
        document.getElementById('most-expensive-cost').textContent = '₹0';
        document.getElementById('top-category-name').textContent = '-';
        document.getElementById('top-category-count').textContent = '0 subscriptions';
        document.getElementById('avg-monthly-cost').textContent = '₹0';
        return;
    }

    // Find most expensive (normalized to monthly)
    let mostExpensive = subscriptions[0];
    let maxMonthlyCost = mostExpensive.cycle === 'monthly' ? mostExpensive.cost : mostExpensive.cost / 12;

    subscriptions.forEach(sub => {
        const monthlyCost = sub.cycle === 'monthly' ? sub.cost : sub.cost / 12;
        if (monthlyCost > maxMonthlyCost) {
            maxMonthlyCost = monthlyCost;
            mostExpensive = sub;
        }
    });

    document.getElementById('most-expensive-name').textContent = mostExpensive.name;
    document.getElementById('most-expensive-cost').textContent = `${formatMoney(mostExpensive.cost)}/${mostExpensive.cycle === 'monthly' ? 'mo' : 'yr'}`;

    // Category breakdown
    const categoryCount = {};
    subscriptions.forEach(sub => {
        const cat = sub.category || 'Other';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Find top category
    let topCategory = 'None';
    let maxCount = 0;
    Object.entries(categoryCount).forEach(([cat, count]) => {
        if (count > maxCount) {
            maxCount = count;
            topCategory = cat;
        }
    });

    document.getElementById('top-category-name').textContent = topCategory;
    document.getElementById('top-category-count').textContent = `${maxCount} subscription${maxCount !== 1 ? 's' : ''}`;

    // Average monthly cost
    let totalMonthly = 0;
    subscriptions.forEach(sub => {
        totalMonthly += sub.cycle === 'monthly' ? sub.cost : sub.cost / 12;
    });
    const avgCost = totalMonthly / subscriptions.length;
    document.getElementById('avg-monthly-cost').textContent = formatMoney(avgCost);
}

// Helper: Get Logo URL (Using Brandfetch for reliability)
function getLogoUrl(name, savedDomain) {
    let domain = savedDomain;

    if (!domain) {
        const lowerName = name.toLowerCase().replace(/\s/g, '');
        for (const [key, d] of Object.entries(DOMAIN_MAP)) {
            if (lowerName.includes(key)) {
                domain = d;
                break;
            }
        }
    }

    // Fallback: If no map match, assume name is domain-like or append .com
    if (!domain && name.includes('.')) domain = name;

    if (domain) return `https://cdn.brandfetch.io/${domain}/w/128/h/128`;

    return null;
}

// Render List
function renderSubscriptions() {
    const container = document.getElementById('subscription-list');
    container.innerHTML = '';

    // Separate upcoming and regular subscriptions
    const upcoming = subscriptions.filter(sub => isUpcoming(sub));
    const regular = subscriptions.filter(sub => !isUpcoming(sub));

    // Render upcoming section if any
    if (upcoming.length > 0) {
        const upcomingHeader = document.createElement('div');
        upcomingHeader.className = 'section-header';
        upcomingHeader.style.marginTop = '0';
        upcomingHeader.innerHTML = `
            <h3 style="color: var(--warning); font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-exclamation-triangle"></i>
                Upcoming Renewals (Next 7 Days)
            </h3>
        `;
        container.appendChild(upcomingHeader);
    }

    // Render function for subscription items
    const renderSubItem = (sub, isUpcomingItem = false) => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        const logoUrl = getLogoUrl(sub.name, sub.domain);

        let iconHTML = '';
        if (logoUrl) {
            iconHTML = `
                <div class="sub-logo-wrapper">
                    <img src="${logoUrl}" class="sub-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="sub-logo-placeholder" style="display:none; width: 100%; height: 100%; align-items: center; justify-content: center;">
                        <i class="fas fa-receipt"></i>
                    </div>
                </div>
            `;
        } else {
            iconHTML = `
                <div class="sub-logo-wrapper">
                    <i class="fas fa-receipt sub-logo-placeholder"></i>
                </div>
            `;
        }

        // Format Date Display
        let dateDisplay = '';
        const daysUntil = getDaysUntilRenewal(sub);

        if (sub.cycle === 'monthly') {
            dateDisplay = `Monthly • Ends on ${sub.date}${getActionSuffix(sub.date)}`;
        } else {
            const d = new Date(sub.date);
            dateDisplay = `Yearly • Ends ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }

        // Add days until renewal for upcoming items
        if (isUpcomingItem) {
            const urgencyColor = daysUntil <= 2 ? 'var(--danger)' : 'var(--warning)';
            dateDisplay += ` <span style="color: ${urgencyColor}; font-weight: 600;">(${daysUntil} day${daysUntil !== 1 ? 's' : ''})</span>`;
        }

        item.innerHTML = `
            ${iconHTML}
            <div class="transaction-info">
                <div class="transaction-title">${sub.name}</div>
                <div class="transaction-date">
                    <i class="fas fa-clock" style="font-size: 0.7rem;"></i> ${dateDisplay}
                </div>
            </div>
            <div class="transaction-amount">
                ${formatMoney(sub.cost)}
            </div>
            <button class="btn-icon" onclick="markAsPaid(${sub.id})" title="Mark as Paid" style="margin-left: 0.5rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--success); padding: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                <i class="fas fa-check"></i>
            </button>
            <button class="delete-btn" onclick="deleteSubscription(${sub.id})" style="margin-left: 0.5rem; background: none; border: none; color: var(--text-secondary); opacity: 0.5; transition: opacity 0.2s;"><i class="fas fa-times"></i></button>
        `;
        return item;
    };

    // Render upcoming items
    upcoming.forEach(sub => {
        container.appendChild(renderSubItem(sub, true));
    });

    // Add separator if both sections exist
    if (upcoming.length > 0 && regular.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'section-header';
        separator.style.marginTop = '2rem';
        separator.innerHTML = '<h3 style="font-size: 1rem;">All Subscriptions</h3>';
        container.appendChild(separator);
    }

    // Render regular items
    regular.sort((a, b) => {
        if (a.cycle === b.cycle) {
            if (a.cycle === 'monthly') return a.date - b.date;
            return new Date(a.date) - new Date(b.date);
        }
        return a.cycle === 'monthly' ? -1 : 1;
    });

    regular.forEach(sub => {
        container.appendChild(renderSubItem(sub, false));
    });
}

function getActionSuffix(d) {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

// Add Subscription
function addSubscription() {
    const name = document.getElementById('sub-name').value;
    const cost = parseFloat(document.getElementById('sub-cost').value);
    const category = document.getElementById('sub-category').value || 'Other';
    const cycleBtn = document.querySelector('.cycle-btn.active');
    const cycle = cycleBtn ? cycleBtn.dataset.value : 'monthly';

    let date;
    if (cycle === 'monthly') {
        date = parseInt(document.getElementById('sub-date').value);
        if (!name || isNaN(cost) || isNaN(date)) {
            alert('Please fill all fields');
            return;
        }
    } else {
        date = document.getElementById('sub-full-date').value;
        if (!name || isNaN(cost) || !date) {
            alert('Please fill all fields including the renewal date');
            return;
        }
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
        date, // Now acts as either Int (Day) or String (ISO Date)
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

// Mark subscription as paid
function markAsPaid(id) {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    const today = new Date().toISOString().split('T')[0];

    // Initialize payment history if not exists
    if (!sub.paymentHistory) {
        sub.paymentHistory = [];
    }

    // Add payment record
    sub.paymentHistory.push({
        date: today,
        amount: sub.cost,
        status: 'paid'
    });

    // Update lastPaid
    sub.lastPaid = today;

    saveSubscriptions();
    renderSubscriptions();

    // Show confirmation
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; bottom: 2rem; right: 2rem; background: var(--success); color: white; padding: 1rem 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; animation: slideIn 0.3s ease;';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> Payment recorded for ${sub.name}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
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
    document.getElementById('sub-full-date').value = '';
}

// Chip Toggle (Updated Class Name)
// Chip Toggle Logic with Input Switch
const monthlyInput = document.getElementById('sub-date');
const yearlyInput = document.getElementById('sub-full-date');
const dateLabel = document.getElementById('date-label');

document.querySelectorAll('.cycle-btn').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.cycle-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const val = chip.dataset.value;
        if (val === 'monthly') {
            monthlyInput.style.display = 'block';
            yearlyInput.style.display = 'none';
            dateLabel.textContent = "Renewal Day (Next Month)";
        } else {
            monthlyInput.style.display = 'none';
            yearlyInput.style.display = 'block';
            dateLabel.textContent = "Renewal Date";
        }
    });
});

// Custom Dropdown Logic
const catSelect = document.getElementById('custom-category-select');
const catOptions = document.getElementById('category-options');
const catText = document.getElementById('selected-category-text');
const catHidden = document.getElementById('sub-category');

if (catSelect) {
    catSelect.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent modal close or other bubbles
        const isVisible = catOptions.style.display === 'block';
        catOptions.style.display = isVisible ? 'none' : 'block';
    });

    document.querySelectorAll('.cat-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const val = opt.getAttribute('data-value');
            catHidden.value = val;
            catText.textContent = val;
            catOptions.style.display = 'none';
            e.stopPropagation();
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!catSelect.contains(e.target)) {
            catOptions.style.display = 'none';
        }
    });
}

saveBtn.onclick = addSubscription;

// Initialize
window.deleteSubscription = deleteSubscription;
window.markAsPaid = markAsPaid;
document.addEventListener('DOMContentLoaded', loadSubscriptions);
