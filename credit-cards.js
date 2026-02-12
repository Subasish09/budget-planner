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

// Load Cards (Smart Merge: Local + Remote + Legacy Migration)
async function loadCards() {
    let localCards = [];
    let remoteCards = [];
    let legacyDataFound = false;

    // 1. Get Local Data (New Key 'creditCards')
    const stored = localStorage.getItem('creditCards');
    if (stored) {
        try {
            localCards = JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing local cards:', e);
        }
    }

    // 1b. Check Legacy Data (Recovery Mode - 'myCreditCards')
    // If new key is empty, check the old 'myCreditCards' key logic used previously
    if (localCards.length === 0) {
        const legacyStored = localStorage.getItem('myCreditCards');
        if (legacyStored) {
            try {
                console.log('Found legacy credit card data (myCreditCards), migrating...');
                localCards = JSON.parse(legacyStored);
                legacyDataFound = true;

                // Keep the IDs consistent with defaultCards if possible, or just use what's there
                // We might need to map them if the structure changed, but assuming it hasn't deeply
            } catch (e) {
                console.error('Error parsing legacy cards:', e);
            }
        }
    }

    // 2. Get Remote Data (if connected)
    if (typeof githubSync !== 'undefined' && githubSync.hasToken()) {
        try {
            const result = await githubSync.fetchFile('credit_card_data.json');
            if (result) {
                const data = JSON.parse(result.content);
                remoteCards = data.cards || [];
                console.log('Fetched remote cards:', remoteCards.length);
            }
        } catch (error) {
            console.error('GitHub fetch failed:', error);
            // Don't error out, just continue with local data
        }
    }

    // 3. Merge (Union by ID)
    const cardMap = new Map();

    // Default cards serve as the base structure
    defaultCards.forEach(c => cardMap.set(c.id, JSON.parse(JSON.stringify(c))));

    // Overlay Local Data
    localCards.forEach(c => {
        if (cardMap.has(c.id)) {
            // Merge transactions and updated fields
            const base = cardMap.get(c.id);
            // Keep transactions from local
            base.transactions = c.transactions || [];
            // Keep lounge usage
            if (c.lounge) base.lounge = c.lounge;
            cardMap.set(c.id, base);
        } else {
            // It's a custom card maybe? Add it.
            cardMap.set(c.id, c);
        }
    });

    // Overlay Remote Data (Remote wins usually, but let's be careful about overwriting with empty)
    if (remoteCards.length > 0) {
        remoteCards.forEach(c => {
            if (cardMap.has(c.id)) {
                const base = cardMap.get(c.id);
                // If remote has more transactions, trust it? 
                // Simple strategy: Trust remote for now if it exists
                base.transactions = c.transactions || [];
                if (c.lounge) base.lounge = c.lounge;
                cardMap.set(c.id, base);
            } else {
                cardMap.set(c.id, c);
            }
        });
    }

    myCards = Array.from(cardMap.values());

    // 4. Save merged state locally (to new key)
    localStorage.setItem('creditCards', JSON.stringify(myCards));

    // 5. Initial Sync Push 
    // If we recovered legacy data or have local data but remote is empty
    if ((legacyDataFound || (localCards.length > 0 && remoteCards.length === 0)) && typeof githubSync !== 'undefined' && githubSync.hasToken()) {
        console.log('Pushing recovered/initial cards to cloud...');
        saveCards();
    }

    console.log('Cards Loaded:', myCards.length);
    renderCarousel();
    selectCard(0);
    updateGlobalStats();
}

// Save Cards (Local + GitHub)
async function saveCards() {
    // 1. Save Local
    localStorage.setItem('creditCards', JSON.stringify(myCards));

    // 2. Sync to GitHub
    if (typeof githubSync !== 'undefined' && githubSync.hasToken()) {
        try {
            const content = JSON.stringify({ cards: myCards }, null, 2);
            await githubSync.commitFile('credit_card_data.json', content, 'Update credit cards');

            // Sync Icon Feedback
            const syncIcon = document.getElementById('sync-status-icon');
            if (syncIcon) {
                syncIcon.classList.remove('fa-exclamation-triangle');
                syncIcon.classList.add('fa-check');
                setTimeout(() => syncIcon.classList.remove('fa-check'), 2000);
            }
        } catch (error) {
            console.error('GitHub sync failed:', error);
            if (typeof showToast === 'function') showToast('⚠️ Saved locally, but GitHub sync failed.');
        }
    }
}


// Start
document.addEventListener('DOMContentLoaded', () => {
    loadCards();
});

// ==========================================
// UI Functions (Carousel, Stats, Rendering)
// ==========================================

function renderCarousel() {
    carousel.innerHTML = '';
    myCards.forEach((card, index) => {
        const div = document.createElement('div');
        div.className = `credit-card ${index === activeCardIndex ? 'active' : ''}`;
        div.style.background = card.color;
        div.style.color = card.textColor || '#fff';
        div.onclick = () => selectCard(index);

        div.innerHTML = `
            <div class="card-bank">${card.bank}</div>
            <div class="card-chip">
                <div class="chip-metal"></div>
                <i class="fas fa-wifi"></i>
            </div>
            <div class="card-number">•••• •••• •••• ${card.last4}</div>
            <div class="card-footer">
                <div class="card-holder">SUBASISH BHATTA</div>
                <div class="card-logo">${card.type}</div>
            </div>
        `;
        carousel.appendChild(div);
    });
}

function selectCard(index) {
    activeCardIndex = index;
    // Update visual active state
    document.querySelectorAll('.credit-card').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    // Scroll to card
    const cardEl = carousel.children[index];
    if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    renderDashboard();
    renderTransactions();
}

function renderDashboard() {
    const card = myCards[activeCardIndex];
    if (!card) return;

    // Calculate spendings
    const totalSpent = card.transactions.reduce((acc, t) => acc + (t.type === 'dr' ? t.amount : 0), 0);
    const totalLent = card.transactions.filter(t => t.tags && t.tags.includes('Lent')).reduce((acc, t) => acc + t.amount, 0);

    cardDashboard.innerHTML = `
        <div class="card-stats">
            <div class="c-stat">
                <span>Total Spent</span>
                <strong>₹${totalSpent.toLocaleString()}</strong>
            </div>
            <div class="c-stat">
                <span>Lent Amount</span>
                <strong>₹${totalLent.toLocaleString()}</strong>
            </div>
             <div class="c-stat">
                <span>Lounge Access</span>
                <strong>${card.lounge ? (card.lounge.total - card.lounge.used) + '/' + card.lounge.total : 'N/A'}</strong>
            </div>
        </div>

        <div class="quick-actions">
           <button class="action-btn" onclick="openAddTransactionModal('${card.id}')">
                <i class="fas fa-plus"></i> Add Expense
           </button>
           <button class="action-btn secondary" onclick="openLoungeModal('${card.id}')" ${!card.lounge || !card.lounge.hasAccess ? 'disabled style="opacity:0.5"' : ''}>
                <i class="fas fa-couch"></i> Lounge
           </button>
        </div>
    `;
}


function renderTransactions() {
    const card = myCards[activeCardIndex];
    if (!card) return;

    transactionsListEl.innerHTML = '';

    const list = card.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Filter?
    const filtered = currentFilter === 'lent'
        ? list.filter(t => t.tags && t.tags.includes('Lent'))
        : list;

    if (filtered.length === 0) {
        transactionsListEl.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary)">No transactions found</div>`;
        return;
    }

    filtered.forEach(t => {
        const div = document.createElement('div');
        div.className = 'transaction-row';
        div.innerHTML = `
            <div class="t-icon" style="background: rgba(255,255,255,0.1)">
                <i class="fas ${getCategoryIcon(t.category)}"></i>
            </div>
            <div class="t-details">
                <div class="t-title">${t.desc}</div>
                <div class="t-meta">${new Date(t.date).toLocaleDateString()} • ${t.category} ${t.tags && t.tags.includes('Lent') ? '• <span style="color:#fbbf24">Lent</span>' : ''}</div>
            </div>
            <div class="t-amount ${t.type === 'dr' ? 'expense' : 'income'}">
                ₹${t.amount.toLocaleString()}
            </div>
            <div class="t-actions">
                 <button onclick="deleteTransaction('${card.id}', '${t.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        transactionsListEl.appendChild(div);
    });
}

function getCategoryIcon(cat) {
    const map = {
        'Food': 'fa-utensils',
        'Travel': 'fa-plane',
        'Shopping': 'fa-shopping-bag',
        'Bills': 'fa-file-invoice',
        'Entertainment': 'fa-film',
        'Fuel': 'fa-gas-pump',
        'Grocery': 'fa-carrot'
    };
    return map[cat] || 'fa-receipt';
}


// Add Transaction
function openAddTransactionModal(cardId) {
    // Determine card
    const card = myCards.find(c => c.id === cardId);
    if (!card) return;

    // Simple Prompt for now, or use a proper modal if available
    // Reusing the main modal logic might be complex if not global.
    // Let's create a dynamic modal or use prompt for quick fix to ensure data works first.

    // Ideally we should have a modal in HTML. 
    // Assuming 'transaction-modal' exists or we can reuse `addTransaction` from main script but custom logic.

    // Let's fallback to a simple prompt based flow or inject a modal for stability
    const desc = prompt("Enter Description:");
    if (!desc) return;
    const amount = parseFloat(prompt("Enter Amount:"));
    if (isNaN(amount)) return;
    const cat = prompt("Category (Food, Travel, Shopping, etc):", "Shopping");

    const isLent = confirm("Is this money lent to someone?");

    const newTx = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        desc: desc,
        amount: amount,
        type: 'dr',
        category: cat || 'Other',
        tags: isLent ? ['Lent'] : []
    };

    card.transactions.push(newTx);
    saveCards();
    renderTransactions(); // Refresh UI
    renderDashboard();
    updateGlobalStats();
}


function deleteTransaction(cardId, txId) {
    if (!confirm("Delete this transaction?")) return;

    const card = myCards.find(c => c.id === cardId);
    if (card) {
        card.transactions = card.transactions.filter(t => t.id !== txId);
        saveCards();
        renderTransactions();
        renderDashboard();
        updateGlobalStats();
    }
}

function updateGlobalStats() {
    const totalSpend = myCards.reduce((acc, c) => acc + c.transactions.reduce((sum, t) => sum + (t.type === 'dr' ? t.amount : 0), 0), 0);
    const totalLent = myCards.reduce((acc, c) => acc + c.transactions.filter(t => t.tags && t.tags.includes('Lent')).reduce((sum, t) => sum + t.amount, 0), 0);

    const tsEl = document.getElementById('cc-total-spend');
    const tlEl = document.getElementById('cc-total-lent');

    if (tsEl) tsEl.innerText = `₹${totalSpend.toLocaleString()}`;
    if (tlEl) tlEl.innerText = `₹${totalLent.toLocaleString()}`;
}
