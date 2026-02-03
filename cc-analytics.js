// Credit Card Analytics for Main Dashboard

// Load credit card data
async function loadCreditCardData() {
    try {
        // Fetch with cache busting to ensure we get latest GitHub data
        const response = await fetch(`credit_card_data.js?t=${new Date().getTime()}`);
        if (response.ok) {
            const text = await response.text();
            // Handle both pure JSON and JS assignment formats
            try {
                return JSON.parse(text);
            } catch (e) {
                // If it's JS format (window.xxx = ...), try to extract JSON
                const match = text.match(/=\s*(\[[\s\S]*?\])/);
                if (match) {
                    return JSON.parse(match[1]);
                }
            }
        }
    } catch (error) {
        console.error('Failed to load credit card data:', error);
    }

    return [];
}

// Calculate total spend across all cards
function calculateTotalSpend(cards) {
    let total = 0;
    cards.forEach(card => {
        card.transactions.forEach(tx => {
            if (!tx.isLent) {
                total += tx.amount;
            }
        });
    });
    return total;
}

// Calculate total lent
function calculateTotalLent(cards) {
    let total = 0;
    cards.forEach(card => {
        card.transactions.forEach(tx => {
            if (tx.isLent && !tx.repaid) {
                total += tx.amount;
            }
        });
    });
    return total;
}

// Calculate unpaid amount (transactions past due date)
function calculateUnpaidAmount(cards) {
    let total = 0;

    cards.forEach(card => {
        card.transactions.forEach(tx => {
            if (!tx.isPaid && tx.dueDate) {
                total += tx.amount;
            }
        });
    });
    return total;
}

// Get category breakdown
function getCategoryBreakdown(cards) {
    const categories = {};

    cards.forEach(card => {
        card.transactions.forEach(tx => {
            const category = tx.isLent ? 'Lending' : (tx.category || 'General');
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category] += tx.amount;
        });
    });

    return categories;
}

// Render category breakdown
function renderCategoryBreakdown(categories) {
    const container = document.getElementById('category-breakdown');
    if (!container) return;

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

    if (total === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 1rem;">No spending data yet</div>';
        return;
    }

    let html = '';
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    sortedCategories.forEach(([category, amount]) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        html += `
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 500;">${category}</span>
                    <span style="color: var(--text-secondary);">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${percentage}%)</span>
                </div>
                <div style="background: var(--glass-border); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #8b5cf6, #ec4899); height: 100%; width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Update dashboard stats
async function updateCreditCardStats() {
    const cards = await loadCreditCardData();

    const totalSpend = calculateTotalSpend(cards);
    const totalLent = calculateTotalLent(cards);
    const unpaidAmount = calculateUnpaidAmount(cards);
    const categories = getCategoryBreakdown(cards);

    // Update DOM
    const totalSpendEl = document.getElementById('cc-total-spend');
    const totalLentEl = document.getElementById('cc-total-lent');
    const unpaidEl = document.getElementById('cc-unpaid');

    if (totalSpendEl) totalSpendEl.textContent = `₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (totalLentEl) totalLentEl.textContent = `₹${totalLent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (unpaidEl) unpaidEl.textContent = `₹${unpaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    renderCategoryBreakdown(categories);
}

// Initialize on page load
if (document.getElementById('cc-total-spend')) {
    updateCreditCardStats();
}
