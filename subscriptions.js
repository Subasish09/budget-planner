// Subscription Manager Logic with GitHub Sync Support
// Now uses subscription_data.json instead of localStorage

let subscriptions = [];
let subscriptionData = null;

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

// Helper: Get payment status
function getPaymentStatus(sub) {
    if (!sub.lastPaid) return 'DUE';

    const lastPaid = new Date(sub.lastPaid);
    const today = new Date();

    // Check if paid this billing cycle
    if (sub.cycle === 'monthly') {
        // Paid this month?
        return lastPaid.getMonth() === today.getMonth() &&
            lastPaid.getFullYear() === today.getFullYear() ? 'PAID' : 'DUE';
    } else {
        // Paid this year?
        return lastPaid.getFullYear() === today.getFullYear() ? 'PAID' : 'DUE';
    }
}

// Load Data from GitHub JSON
async function loadSubscriptions() {
    updateSyncStatus('syncing', 'Loading data...');

    try {
        // Try to fetch from GitHub first
        if (githubSync.hasToken()) {
            const file = await githubSync.fetchFile('subscription_data.json');
            if (file) {
                subscriptionData = JSON.parse(file.content);
                subscriptions = subscriptionData.subscriptions || [];
                updateSyncStatus('success', subscriptionData.lastSync);
            }
        } else {
            // Fallback: fetch from local file
            const response = await fetch('subscription_data.json');
            if (response.ok) {
                subscriptionData = await response.json();
                subscriptions = subscriptionData.subscriptions || [];
                updateSyncStatus('setup');
            }
        }

        // Migration: Check localStorage for old data
        await migrateFromLocalStorage();

    } catch (error) {
        console.error('Failed to load subscriptions:', error);

        // Final fallback: use localStorage if available
        const localData = localStorage.getItem('mySubscriptions');
        if (localData) {
            subscriptions = JSON.parse(localData);
            subscriptionData = { subscriptions, lastSync: null };
            updateSyncStatus('error', 'Using offline data');
        } else {
            subscriptions = [];
            subscriptionData = { subscriptions: [], lastSync: null };
            updateSyncStatus('setup');
        }
    }

    renderSubscriptions();
    updateStats();
}

// Migrate data from localStorage to GitHub
async function migrateFromLocalStorage() {
    const localData = localStorage.getItem('mySubscriptions');
    const migrated = localStorage.getItem('migrated_to_github');

    if (localData && !migrated && githubSync.hasToken()) {
        try {
            const subs = JSON.parse(localData);

            // Only migrate if GitHub has no data or less data
            if (!subscriptions.length || subs.length > subscriptions.length) {
                subscriptions = subs;
                subscriptionData.subscriptions = subs;

                await syncToGitHub('Migrated from localStorage');
                localStorage.setItem('migrated_to_github', Date.now());

                console.log('Successfully migrated data from localStorage to GitHub');
            }
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
}

// Save Data to GitHub
async function syncToGitHub(message = 'Update subscriptions') {
    if (!githubSync.hasToken()) {
        console.warn('GitHub sync not configured');
        return false;
    }

    updateSyncStatus('syncing', 'Syncing...');

    try {
        subscriptionData.subscriptions = subscriptions;
        subscriptionData.lastSync = new Date().toISOString();

        const content = JSON.stringify(subscriptionData, null, 2);

        await githubSync.commitFile(
            'subscription_data.json',
            content,
            message
        );

        updateSyncStatus('success', subscriptionData.lastSync);

        // Also save to localStorage as backup
        localStorage.setItem('mySubscriptions', JSON.stringify(subscriptions));

        return true;
    } catch (error) {
        console.error('Sync failed:', error);
        updateSyncStatus('error', error.message);

        // Save to localStorage as fallback
        localStorage.setItem('mySubscriptions', JSON.stringify(subscriptions));

        return false;
    }
}

// Update Sync Status Indicator
function updateSyncStatus(state, message = '') {
    const indicator = document.getElementById('sync-status');
    const icon = indicator.querySelector('.sync-icon');
    const text = indicator.querySelector('.sync-text');

    // Remove all state classes
    indicator.className = 'sync-indicator';
    icon.className = 'sync-icon';

    switch (state) {
        case 'setup':
            indicator.classList.add('setup');
            icon.classList.add('fa-cog');
            text.textContent = 'Setup Sync';
            break;

        case 'syncing':
            indicator.classList.add('syncing');
            icon.classList.add('fa-sync-alt', 'rotating');
            text.textContent = message || 'Syncing...';
            break;

        case 'success':
            indicator.classList.add('success');
            icon.classList.add('fa-check-circle');
            const time = message ? new Date(message).toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }) : 'Just now';
            text.textContent = `Synced at ${time}`;

            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (indicator.classList.contains('success')) {
                    icon.classList.remove('fa-check-circle');
                    icon.classList.add('fa-cloud');
                    text.textContent = 'Synced';
                }
            }, 5000);
            break;

        case 'error':
            indicator.classList.add('error');
            icon.classList.add('fa-exclamation-triangle');
            text.textContent = message || 'Sync failed - Retry';
            break;
    }
}

// Handle Sync Indicator Click
function handleSyncClick() {
    const indicator = document.getElementById('sync-status');

    if (indicator.classList.contains('setup') || indicator.classList.contains('error')) {
        // Open settings modal
        document.getElementById('sync-settings-modal').classList.add('active');

        // Populate repository info
        if (githubSync.owner && githubSync.repo) {
            document.getElementById('repo-info').value = `${githubSync.owner}/${githubSync.repo}`;
        }
    } else if (indicator.classList.contains('error')) {
        // Retry sync
        syncToGitHub('Manual retry');
    }
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

        // Payment status badge
        const paymentStatus = getPaymentStatus(sub);
        const badgeColor = paymentStatus === 'PAID' ? 'var(--success)' : 'var(--warning)';
        const badgeBg = paymentStatus === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)';

        item.innerHTML = `
            ${iconHTML}
            <div class="transaction-info">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="transaction-title">${sub.name}</div>
                    <span style="font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600;">${paymentStatus}</span>
                </div>
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
async function addSubscription() {
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
        date,
        category,
        domain,
        lastPaid: null,
        paymentHistory: []
    };

    subscriptions.push(newSub);
    await syncToGitHub(`Added subscription: ${name}`);
    renderSubscriptions();
    updateStats();
    closeModal();
}

function deleteSubscription(id) {
    if (confirm('Stop tracking this subscription?')) {
        const sub = subscriptions.find(s => s.id === id);
        subscriptions = subscriptions.filter(s => s.id !== id);
        syncToGitHub(`Deleted subscription: ${sub?.name || id}`);
        renderSubscriptions();
        updateStats();
    }
}

// Mark subscription as paid
async function markAsPaid(id) {
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

    await syncToGitHub(`Marked ${sub.name} as paid`);
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
        e.stopPropagation();
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

    document.addEventListener('click', (e) => {
        if (!catSelect.contains(e.target)) {
            catOptions.style.display = 'none';
        }
    });
}

// GitHub Sync Settings Modal Logic
const syncSettingsModal = document.getElementById('sync-settings-modal');
const closeSyncSettings = document.getElementById('close-sync-settings');
const testConnectionBtn = document.getElementById('test-connection-btn');
const saveTokenBtn = document.getElementById('save-token-btn');
const clearTokenBtn = document.getElementById('clear-token-btn');
const tokenInput = document.getElementById('github-token-input');
const connectionStatus = document.getElementById('connection-status');
const connectionMessage = document.getElementById('connection-message');

closeSyncSettings.onclick = () => {
    syncSettingsModal.classList.remove('active');
};

testConnectionBtn.onclick = async () => {
    const token = tokenInput.value.trim();

    if (!token) {
        showConnectionStatus('error', 'Please enter a token');
        return;
    }

    // Temporarily set token for testing
    const oldToken = githubSync.token;
    githubSync.token = token;

    try {
        showConnectionStatus('syncing', 'Testing connection...');
        const result = await githubSync.testConnection();

        if (result.success) {
            showConnectionStatus('success', `✓ Connected to ${result.repo}`);
        }
    } catch (error) {
        showConnectionStatus('error', `✗ ${error.message}`);
        githubSync.token = oldToken; // Restore old token
    }
};

saveTokenBtn.onclick = async () => {
    const token = tokenInput.value.trim();

    if (!token) {
        showConnectionStatus('error', 'Please enter a token');
        return;
    }

    try {
        showConnectionStatus('syncing', 'Saving token...');

        githubSync.saveToken(token);

        // Test connection
        const result = await githubSync.testConnection();

        if (result.success) {
            showConnectionStatus('success', `✓ Sync enabled for ${result.repo}`);

            // Reload data from GitHub
            await loadSubscriptions();

            // Close modal after 2 seconds
            setTimeout(() => {
                syncSettingsModal.classList.remove('active');
                tokenInput.value = '';
            }, 2000);
        }
    } catch (error) {
        showConnectionStatus('error', `✗ ${error.message}`);
    }
};

clearTokenBtn.onclick = () => {
    if (confirm('This will disable GitHub sync. Are you sure?')) {
        githubSync.clearToken();
        tokenInput.value = '';
        showConnectionStatus('success', '✓ Token cleared. Sync disabled.');
        updateSyncStatus('setup');

        setTimeout(() => {
            syncSettingsModal.classList.remove('active');
        }, 1500);
    }
};

function showConnectionStatus(type, message) {
    connectionStatus.style.display = 'block';
    connectionMessage.textContent = message;

    if (type === 'success') {
        connectionStatus.style.background = 'rgba(16, 185, 129, 0.1)';
        connectionStatus.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        connectionStatus.style.color = 'var(--success)';
    } else if (type === 'error') {
        connectionStatus.style.background = 'rgba(239, 68, 68, 0.1)';
        connectionStatus.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        connectionStatus.style.color = 'var(--danger)';
    } else {
        connectionStatus.style.background = 'rgba(59, 130, 246, 0.1)';
        connectionStatus.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        connectionStatus.style.color = '#3b82f6';
    }
}

saveBtn.onclick = addSubscription;

// Initialize
window.deleteSubscription = deleteSubscription;
window.markAsPaid = markAsPaid;
window.handleSyncClick = handleSyncClick;
document.addEventListener('DOMContentLoaded', loadSubscriptions);
