// Data Model
const defaultCards = [
    {
        id: 'hdfc-regalia',
        bank: 'HDFC Bank',
        name: 'Regalia Gold',
        type: 'Visa',
        last4: '4579',
        // Pure Black base with Sharp Gold diagonal tip
        color: 'linear-gradient(115deg, #000000 0%, #000000 70%, #d4af37 70%, #fcf6ba 85%, #aa8e28 100%)',
        textColor: '#fcf6ba', // Light Gold text
        lounge: { hasAccess: true, total: 12, used: 0 },
        transactions: []
    },
    {
        id: 'tata-neu',
        bank: 'HDFC Bank',
        name: 'Tata Neu Infinity',
        type: 'Rupay', // Usually Rupay for Neu
        last4: '8850',
        // Deep fluorescent Purple to Dark Violet/Black
        color: 'linear-gradient(135deg, #5a189a 0%, #3c096c 40%, #10002b 100%)',
        textColor: '#fff',
        lounge: { hasAccess: true, total: 8, used: 0 },
        transactions: []
    },
    {
        id: 'icici-mmt-master',
        bank: 'ICICI Bank',
        name: 'MMT Signature',
        type: 'MasterCard',
        last4: '2209',
        // MMT Sunset Theme: Orange/Yellow top, Dark Earth bottom
        color: 'linear-gradient(180deg, #ea580c 0%, #facc15 35%, #290803 36%, #0f0502 100%)',
        textColor: '#fff',
        lounge: { hasAccess: true, total: 8, used: 0 },
        transactions: [] // MakeMyTrip
    },
    {
        id: 'flipkart-axis',
        bank: 'Axis Bank',
        name: 'Flipkart Axis',
        type: 'MasterCard', // Often MC
        last4: '9058',
        // Black base with Blue-to-Pink ribbon streak
        color: 'linear-gradient(125deg, #000000 25%, #2563eb 45%, #db2777 65%, #000000 85%)',
        textColor: '#fff',
        lounge: { hasAccess: true, total: 4, used: 0 }, // Often has 4/year
        transactions: []
    },
    {
        id: 'icici-mmt-upi',
        bank: 'ICICI Bank',
        name: 'MMT UPI',
        type: 'UPI',
        last4: '1900',
        color: 'linear-gradient(180deg, #ea580c 0%, #facc15 35%, #290803 36%, #0f0502 100%)', // Same MMT Theme
        textColor: '#fff',
        lounge: { hasAccess: false },
        transactions: []
    },
    {
        id: 'hdfc-upi',
        bank: 'HDFC Bank',
        name: 'Digital UPI',
        type: 'UPI',
        last4: '9032',
        color: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', // Slate
        textColor: '#fff',
        lounge: { hasAccess: false },
        transactions: []
    }
];

// State
let myCards = [];
let activeCardIndex = 0;
let currentFilter = 'all'; // 'all' or 'lent'
let autoSyncEnabled = true; // Auto-sync toggle
let isSyncing = false;

// Elements
const carousel = document.getElementById('cards-carousel');
const cardDashboard = document.getElementById('card-dashboard');
const transactionsListEl = document.getElementById('card-transactions');
const loungeCard = document.getElementById('lounge-card');

// GitHub Config
function getGitHubConfig() {
    const config = JSON.parse(localStorage.getItem('ghConfig'));
    if (!config || !config.username || !config.repo || !config.pat) {
        return null;
    }
    return config;
}

// Sync Status Indicator
function updateSyncStatus(status, message = '') {
    const indicator = document.getElementById('sync-status');
    if (!indicator) return;

    indicator.className = 'sync-status';

    switch (status) {
        case 'syncing':
            indicator.classList.add('syncing');
            indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i> Syncing...';
            break;
        case 'synced':
            indicator.classList.add('synced');
            const timestamp = new Date().toLocaleTimeString();
            indicator.innerHTML = `<i class="fas fa-check-circle"></i> Synced at ${timestamp}`;
            setTimeout(() => indicator.classList.remove('synced'), 3000);
            break;
        case 'failed':
            indicator.classList.add('failed');
            indicator.innerHTML = `<i class="fas fa-exclamation-circle"></i> Sync failed ${message}`;
            break;
        case 'offline':
            indicator.classList.add('offline');
            indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            break;
    }
}

// Load data from GitHub
async function loadFromGitHub() {
    const config = getGitHubConfig();

    if (!config) {
        // No config, use default cards
        console.log('No GitHub config found, using default cards');
        myCards = defaultCards;
        renderCarousel();
        selectCard(0);
        updateGlobalStats();
        return;
    }

    updateSyncStatus('syncing');

    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${config.pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const fileData = await response.json();
            const content = atob(fileData.content);

            // Extract data from the JS file
            const match = content.match(/window\.creditCardDataRaw\s*=\s*(\[[\s\S]*?\]);/);
            if (match) {
                myCards = JSON.parse(match[1]);

                // Sync visual updates from defaultCards
                myCards = myCards.map(savedCard => {
                    const freshDef = defaultCards.find(d => d.id === savedCard.id);
                    if (freshDef) {
                        return {
                            ...savedCard,
                            name: freshDef.name,
                            color: freshDef.color,
                            textColor: freshDef.textColor,
                            type: freshDef.type,
                            bank: freshDef.bank,
                            last4: freshDef.last4
                        };
                    }
                    return savedCard;
                });

                updateSyncStatus('synced');
            } else {
                throw new Error('Invalid data format');
            }
        } else if (response.status === 404) {
            // File doesn't exist yet, use defaults
            console.log('GitHub file not found, using default cards');
            myCards = defaultCards;
            await saveToGitHub(); // Create initial file
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to load from GitHub:', error);
        updateSyncStatus('failed', `- ${error.message}`);

        // Fallback to localStorage if available
        const localData = localStorage.getItem('myCreditCards');
        if (localData) {
            myCards = JSON.parse(localData);
            console.log('Using localStorage fallback');
        } else {
            myCards = defaultCards;
        }
    }

    renderCarousel();
    selectCard(0);
    updateGlobalStats();
}

// Save data to GitHub
async function saveToGitHub() {
    if (!autoSyncEnabled) {
        console.log('Auto-sync disabled');
        return;
    }

    const config = getGitHubConfig();
    if (!config) {
        alert('Please configure GitHub settings before saving data.');
        openSettings();
        return;
    }

    if (isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    isSyncing = true;
    updateSyncStatus('syncing');

    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}`;
    const content = `window.creditCardDataRaw = ${JSON.stringify(myCards, null, 4)};`;
    const message = `Update credit card data - ${new Date().toLocaleString()}`;

    try {
        // Get current SHA
        let sha = '';
        const getRes = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${config.pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        // Update file
        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha || undefined,
                branch: config.branch
            })
        });

        if (putRes.ok) {
            updateSyncStatus('synced');
            // Also save to localStorage as backup
            localStorage.setItem('myCreditCards', JSON.stringify(myCards));
        } else {
            const err = await putRes.json();
            throw new Error(err.message || 'Sync failed');
        }
    } catch (error) {
        console.error('Failed to save to GitHub:', error);
        updateSyncStatus('failed', `- ${error.message}`);
        // Save to localStorage as fallback
        localStorage.setItem('myCreditCards', JSON.stringify(myCards));
    } finally {
        isSyncing = false;
    }
}

// Init - Load from GitHub
async function init() {
    await loadFromGitHub();
    // Set default date
    document.getElementById('cc-date').valueAsDate = new Date();
}

// Render Carousel
function renderCarousel() {
    carousel.innerHTML = myCards.map((card, index) => {
        const logo = card.type === 'Visa' ? '<i class="fab fa-cc-visa fa-2x"></i>'
            : card.type === 'MasterCard' ? '<i class="fab fa-cc-mastercard fa-2x"></i>'
                : '<i class="fas fa-qrcode fa-2x"></i>'; // Generic/UPI

        const displayNum = card.last4 === 'UPI' ? 'LINKED TO UPI' : `•••• •••• •••• ${card.last4}`;

        return `
            <div class="credit-card ${index === activeCardIndex ? 'active' : ''}" 
                 onclick="selectCard(${index})"
                 style="background: ${card.color}; color: ${card.textColor};">
                <div class="card-top">
                    <span class="bank-name">${card.bank}</span>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span class="card-type">${logo}</span>
                        <div class="card-select-radio">
                            <input type="radio" name="card-select" ${index === activeCardIndex ? 'checked' : ''}>
                        </div>
                    </div>
                </div>
                <div class="card-mid">
                    <div class="chip"></div>
                    <span class="card-number">${displayNum}</span>
                </div>
                <div class="card-bottom">
                    <div>
                        <div style="font-size: 0.65rem; opacity: 0.8; letter-spacing: 1px;">SUBASISH BHATTA</div>
                        <div class="card-name" style="font-size: 0.9rem; margin-top: 2px;">${card.name}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectCard(index) {
    activeCardIndex = index;
    renderCarousel(); // Refresh active state
    renderDashboard();
    cardDashboard.style.display = 'block';
}

// Bank Limits (Shared across cards of same bank)
const BANK_LIMITS = {
    'HDFC Bank': 373000,
    'ICICI Bank': 300000,
    'Axis Bank': 100000
};

function renderDashboard() {
    const card = myCards[activeCardIndex];

    // 1. Calculate Card Outstanding
    const totalOut = card.transactions.reduce((sum, t) => sum + (t.repaid ? 0 : t.amount), 0);
    document.getElementById('card-outstanding').innerText = `₹${totalOut.toLocaleString('en-IN')}`;

    // 2. Calculate Shared Limit & Available
    const bankLimit = BANK_LIMITS[card.bank] || 0;

    // Find all cards of this bank
    const cardsOfBank = myCards.filter(c => c.bank === card.bank);

    // Calculate total spend across ALL cards provided by this bank (Shared Limit)
    const totalBankSpend = cardsOfBank
        .reduce((acc, c) => {
            const cardSpend = c.transactions.reduce((s, t) => s + (t.repaid ? 0 : t.amount), 0);
            return acc + cardSpend;
        }, 0);

    const available = bankLimit - totalBankSpend;

    // Update UI
    const limitEl = document.getElementById('card-limit');
    if (bankLimit > 0) {
        const util = (totalBankSpend / bankLimit) * 100;
        const limitStr = (bankLimit / 100000).toFixed(2) + 'L';
        const labelText = cardsOfBank.length > 1 ? 'Shared' : 'Limit';

        limitEl.innerHTML = `
            ₹${available.toLocaleString('en-IN')}
            <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 400; margin-top: 4px;">
                of ₹${limitStr} ${labelText}
            </div>
        `;

        // Color code low availability (Use danger color if < 10% available or > 90% utilized)
        limitEl.style.color = util > 90 ? 'var(--danger)' : 'var(--text-primary)';
    } else {
        limitEl.innerText = '₹-';
    }

    // Lounge
    if (card.lounge && card.lounge.hasAccess) {
        loungeCard.style.display = 'block';
        document.getElementById('lounge-count').innerText = `${card.lounge.total - card.lounge.used}/${card.lounge.total}`;
    } else {
        loungeCard.style.display = 'none';
    }

    renderTransactions();
}

// Inject Total Limit into Header
function updateGlobalStats() {
    const totalLimit = Object.values(BANK_LIMITS).reduce((a, b) => a + b, 0);
    const sub = document.querySelector('.subtitle');
    if (sub && !sub.innerText.includes('Limit')) {
        sub.innerHTML += ` <span style="opacity: 0.5; margin: 0 8px;">|</span> Limit: ₹${(totalLimit / 100000).toFixed(2)}L`;
    }
}

function renderTransactions() {
    const card = myCards[activeCardIndex];
    const filtered = currentFilter === 'all'
        ? card.transactions
        : card.transactions.filter(t => t.isLent);

    // Sort new to old
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        transactionsListEl.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No transactions found.</div>`;
        return;
    }

    transactionsListEl.innerHTML = sorted.map(t => {
        const isLent = t.isLent;
        const icon = isLent ? 'fa-hand-holding-usd' : 'fa-shopping-bag';
        const colorClass = isLent ? 'lent-item' : '';

        // Repayment Logic
        const repayments = t.repayments || (t.repaid ? [{ amount: t.amount, date: t.date }] : []);
        const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
        const remaining = t.amount - totalRepaid;

        // Data Integrity: If somehow fully repaid but flag not set (or vice versa due to old data)
        const isFullyRepaid = totalRepaid >= t.amount;
        if (isFullyRepaid && !t.repaid) { t.repaid = true; saveToGitHub(); }

        const lentHtml = isLent
            ? `<div style="font-size:0.8rem; color: #f43f5e; margin-top:2px;">
                 <i class="fas fa-user"></i> Lent to: ${t.lentTo} 
                 ${t.repaid ? '(Settled)' : `<span style="color: var(--text-primary); margin-left:8px; font-weight:500;">Remaining: ₹${remaining.toLocaleString('en-IN')}</span>`}
               </div>`
            : '';

        const actionBtn = isLent && !t.repaid
            ? `<button class="btn-xs" onclick="openRepaymentModal('${t.id}')" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);">Track Repayment</button>`
            : '';

        return `
            <div class="cc-transaction ${colorClass} ${t.repaid ? 'repaid' : ''}">
                <div class="t-icon ${isLent ? 'lent' : ''}"><i class="fas ${icon}"></i></div>
                <div class="t-details">
                    <div class="t-desc">${t.desc}</div>
                    <div class="t-date">${new Date(t.date).toLocaleDateString()}</div>
                    ${lentHtml}
                </div>
                <div class="t-right">
                    <div class="t-amount">₹${t.amount.toLocaleString('en-IN')}</div>
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');
}

// Modal Logic
const modalOverlay = document.getElementById('cc-modal-overlay');
const ccForm = document.getElementById('cc-form');

function openTransactionModal(type) {
    document.getElementById('cc-type').value = type;
    document.getElementById('cc-modal-title').innerText = type === 'spend' ? 'Add Card Spend' : 'Lend Money from Card';

    // Toggle Friend Input
    document.getElementById('friend-input-group').style.display = type === 'lend' ? 'block' : 'none';
    document.getElementById('cc-desc').placeholder = type === 'lend' ? 'Reason for lending' : 'e.g. Dinner, Flight';

    if (type === 'lend') {
        document.getElementById('cc-category').value = 'Lent';
        document.getElementById('cc-friend').setAttribute('required', 'true');
    } else {
        document.getElementById('cc-category').value = 'General';
        document.getElementById('cc-friend').removeAttribute('required');
    }

    modalOverlay.classList.add('active');
}

document.getElementById('close-cc-modal').addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

ccForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('cc-type').value;
    const desc = document.getElementById('cc-desc').value;
    const amount = parseFloat(document.getElementById('cc-amount').value);
    const date = document.getElementById('cc-date').value;
    const category = document.getElementById('cc-category').value;
    const friend = document.getElementById('cc-friend').value;

    const newTransaction = {
        id: Date.now().toString(),
        desc,
        amount,
        date,
        category,
        isLent: type === 'lend',
        lentTo: type === 'lend' ? friend : null,
        repaid: false
    };

    myCards[activeCardIndex].transactions.push(newTransaction);
    saveToGitHub();
    modalOverlay.classList.remove('active');
    renderDashboard();
    ccForm.reset();
});

// Repayment Modal Logic
const repModal = document.getElementById('repayment-modal-overlay');
const repForm = document.getElementById('repayment-form');

function openRepaymentModal(tid) {
    const t = myCards[activeCardIndex].transactions.find(x => x.id === tid);
    if (!t) return;

    document.getElementById('rep-id').value = tid;
    document.getElementById('rep-lent-to').innerText = t.lentTo;
    document.getElementById('rep-total').innerText = `₹${t.amount.toLocaleString('en-IN')}`;

    // Calculate Stats
    const repayments = t.repayments || [];
    const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
    const remaining = t.amount - totalRepaid;

    document.getElementById('rep-remaining').innerText = `₹${remaining.toLocaleString('en-IN')}`;
    document.getElementById('rep-date').valueAsDate = new Date(); // Default today

    // Render History
    const historyContainer = document.getElementById('repayment-history');
    if (repayments.length === 0) {
        historyContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">No repayments yet.</div>';
    } else {
        // Sort history new to old
        const sortedRep = [...repayments].sort((a, b) => new Date(b.date) - new Date(a.date));
        historyContainer.innerHTML = sortedRep.map(r => `
            <div style="display: flex; justify-content: space-between; padding: 0.8rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--glass-border);">
                <div style="font-size: 0.9rem; color: var(--text-secondary);">${new Date(r.date).toLocaleDateString()}</div>
                <div style="font-weight: 600; color: var(--success);">+₹${r.amount.toLocaleString('en-IN')}</div>
            </div>
        `).join('');
    }

    repModal.classList.add('active');
}

document.getElementById('close-repayment-modal').addEventListener('click', () => {
    repModal.classList.remove('active');
});

repForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tid = document.getElementById('rep-id').value;
    const amount = parseFloat(document.getElementById('rep-amount').value);
    const date = document.getElementById('rep-date').value;

    const t = myCards[activeCardIndex].transactions.find(x => x.id === tid);
    if (t) {
        if (!t.repayments) t.repayments = [];

        t.repayments.push({
            id: Date.now().toString(),
            amount,
            date
        });

        // Check for Settlement
        const totalRepaid = t.repayments.reduce((sum, r) => sum + r.amount, 0);
        if (totalRepaid >= t.amount) {
            t.repaid = true;
        }

        saveToGitHub();
        renderDashboard();
        repModal.classList.remove('active');
        repForm.reset();
    }
});

function markBillPaid() {
    if (confirm('Clear all outstanding transactions for this card? This will archive them.')) {
        // Simple logic: remove all non-lent transactions, or just reset. 
        // For now, let's just clear non-lent transactions as "Paid off"
        myCards[activeCardIndex].transactions = myCards[activeCardIndex].transactions.filter(t => t.isLent && !t.repaid);
        saveToGitHub();
        renderDashboard();
    }
}

// Tab Logic
document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        currentFilter = t.dataset.tab;
        renderTransactions();
    });
});




// Settings Logic
function openSettings() {
    const sModal = document.getElementById('settings-modal-overlay');
    if (!sModal) {
        console.error('Settings modal not found!');
        return;
    }

    // Force visibility in case CSS class fails -> REMOVED to fix Close issue
    // sModal.style.display = 'flex';
    // sModal.style.opacity = '1';
    // sModal.style.pointerEvents = 'all';

    // Load saved settings
    const config = JSON.parse(localStorage.getItem('ghConfig')) || {};
    if (config.username) document.getElementById('gh-username').value = config.username;
    if (config.repo) document.getElementById('gh-repo').value = config.repo;
    if (config.pat) document.getElementById('gh-pat').value = config.pat;
    if (config.branch) document.getElementById('gh-branch').value = config.branch;
    if (config.path) document.getElementById('gh-path').value = config.path;

    sModal.classList.add('active');
}

document.getElementById('close-settings-modal').addEventListener('click', () => {
    const sModal = document.getElementById('settings-modal-overlay');
    sModal.classList.remove('active');
    // Clear any inline styles that might have been set previously
    sModal.style.display = '';
    sModal.style.opacity = '';
    sModal.style.pointerEvents = '';
});

function saveSettings() {
    const config = {
        username: document.getElementById('gh-username').value,
        repo: document.getElementById('gh-repo').value,
        pat: document.getElementById('gh-pat').value,
        branch: document.getElementById('gh-branch').value || 'main',
        path: document.getElementById('gh-path').value || 'credit_card_data.js'
    };

    localStorage.setItem('ghConfig', JSON.stringify(config));
    alert('Settings Saved! You can now Sync.');

    // Close modal
    document.getElementById('settings-modal-overlay').classList.remove('active');
}

async function syncToGitHub() {
    // 1. Get Config
    const config = JSON.parse(localStorage.getItem('ghConfig'));
    if (!config || !config.username || !config.repo || !config.pat) {
        alert('Please save your GitHub configuration first.');
        return;
    }

    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}`;
    const content = `window.creditCardDataRaw = ${JSON.stringify(myCards, null, 4)};`;
    const message = `Update credit card data - ${new Date().toLocaleString()}`;

    // 2. Fetch SHA (required for update)
    let sha = '';
    try {
        const getRes = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${config.pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        } else if (getRes.status !== 404) {
            throw new Error('Failed to fetch file info');
        }
    } catch (e) {
        console.error(e);
        alert('Error accessing repository. Check credentials.');
        return;
    }

    // 3. PUT Update
    try {
        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
                sha: sha || undefined, // undefined if new file
                branch: config.branch
            })
        });

        if (putRes.ok) {
            alert('✅ Success! Data synced to GitHub.');
            document.getElementById('settings-modal-overlay').classList.remove('active');
        } else {
            const err = await putRes.json();
            alert(`Sync Failed: ${err.message}`);
        }
    } catch (e) {
        alert('Sync Error: ' + e.message);
    }
}

init();
