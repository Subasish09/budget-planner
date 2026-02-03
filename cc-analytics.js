// Credit Card Analytics for Main Dashboard

// Load credit card data
async function loadCreditCardData() {
    try {
        // Fetch with cache busting to ensure we get latest GitHub data
        const response = await fetch(`credit_card_data.js?t=${new Date().getTime()}`);
        if (response.ok) {
            const text = await response.text();
            try {
                // Formatting is likely 'window.creditCardDataRaw = [...]'
                // Remove the prefix 'window.creditCardDataRaw =' and potential trailing semicolon
                let cleanText = text.replace(/^\s*window\.creditCardDataRaw\s*=\s*/, '');
                cleanText = cleanText.replace(/;\s*$/, ''); // Remove trailing semicolon

                return JSON.parse(cleanText);
            } catch (e) {
                // Fallback: try finding the first [ and the last ]
                const firstBracket = text.indexOf('[');
                const lastBracket = text.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1) {
                    return JSON.parse(text.substring(firstBracket, lastBracket + 1));
                }
            }
        }
    } catch (error) {
        console.error('Failed to load credit card data:', error);
    }

    return [];
}

// Utility: Format Currency (No decimals for cleaner look)
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// Utility: Format Date (06 Jan)
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short'
    }).format(date);
};

// Process data in a single pass (Optimization)
function processCardData(cards) {
    let stats = {
        totalSpend: 0,
        totalLent: 0,
        unpaidAmount: 0,
        categories: {},
        recentTransactions: []
    };

    cards.forEach(card => {
        if (!card.transactions) return;

        card.transactions.forEach(tx => {
            // 1. Stats Calculation
            if (tx.isLent) {
                // Lending counts towards "Total Lent" if not repaid
                if (!tx.repaid) {
                    stats.totalLent += tx.amount;
                }
            } else {
                // Spending counts towards "Total Spend"
                stats.totalSpend += tx.amount;
            }

            // Unpaid calculation (pending payments with due dates)
            if (!tx.isPaid && tx.dueDate) {
                stats.unpaidAmount += tx.amount;
            }

            // 2. Category Aggregation
            // Lending is a distinct category
            const category = tx.isLent ? 'Lending' : (tx.category || 'General');
            stats.categories[category] = (stats.categories[category] || 0) + tx.amount;

            // 3. Collect Recent Transactions
            stats.recentTransactions.push({
                ...tx,
                cardName: card.name,
                bankName: card.bank,
                // Add sorting value
                timestamp: new Date(tx.date).getTime()
            });
        });
    });

    // Sort recent transactions by date desc
    stats.recentTransactions.sort((a, b) => b.timestamp - a.timestamp);

    // Keep top 5
    stats.recentTransactions = stats.recentTransactions.slice(0, 5);

    return stats;
}

// Render category breakdown with Chart.js
let infoChart = null;

function renderCategoryChart(categories) {
    const listContainer = document.getElementById('category-breakdown');
    const ctx = document.getElementById('category-chart');

    if (!listContainer) return;

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

    if (total === 0) {
        listContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 1rem;">No spending data yet</div>';
        return;
    }

    // 1. Render Legend/List
    let html = '';
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    // Centralized Colors
    const colors = [
        '#ec4899', // Pink (Primary)
        '#8b5cf6', // Violet
        '#f43f5e', // Rose
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#3b82f6', // Blue
        '#6366f1', // Indigo
        '#84cc16'  // Lime
    ];

    const chartData = {
        labels: [],
        data: [],
        backgroundColor: []
    };

    sortedCategories.forEach(([category, amount], index) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        const color = colors[index % colors.length];

        // Prepare data for chart
        chartData.labels.push(category);
        chartData.data.push(amount);
        chartData.backgroundColor.push(color);

        // Render list item
        html += `
            <div style="margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 12px; height: 12px; border-radius: 3px; background-color: ${color};"></div>
                    <span style="font-weight: 500; font-size: 0.95rem;">${category}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600;">${formatCurrency(amount)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${percentage}%</div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // 2. Render Chart
    if (ctx && typeof Chart !== 'undefined') {
        if (infoChart) {
            infoChart.destroy();
        }

        infoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.data,
                    backgroundColor: chartData.backgroundColor,
                    borderWidth: 0,
                    hoverOffset: 10,
                    borderRadius: 4,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(23, 23, 23, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: "'Inter', sans-serif", size: 13 },
                        bodyFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                },
                cutout: '75%',
                layout: { padding: 10 }
            }
        });
    }
}

// Render recent transactions list
function renderRecentTransactions(transactions) {
    const listContainer = document.getElementById('recent-cc-transactions');
    if (!listContainer) return;

    if (transactions.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">No recent activity</div>`;
        return;
    }

    let html = '';
    transactions.forEach(tx => {
        const isLent = tx.isLent;
        const icon = isLent ? 'fa-hand-holding-usd' : 'fa-shopping-bag';
        const color = isLent ? '#f59e0b' : '#ec4899'; // Warning color for Lend, Primary for Expense
        const bg = isLent ? 'rgba(245, 158, 11, 0.1)' : 'rgba(236, 72, 153, 0.1)';

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--glass-border);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: ${bg}; display: flex; align-items: center; justify-content: center; color: ${color};">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div>
                        <div style="font-weight: 500; font-size: 0.95rem;">${tx.desc}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">
                            ${tx.bankName} ${tx.cardName} • ${formatDate(tx.date)}
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--text-primary);">${formatCurrency(tx.amount)}</div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

// Main logic
async function updateCreditCardStats() {
    const cards = await loadCreditCardData();

    // Process all data in one pass
    const stats = processCardData(cards);

    // Update DOM Elements
    const totalSpendEl = document.getElementById('cc-total-spend');
    const totalLentEl = document.getElementById('cc-total-lent');
    const unpaidEl = document.getElementById('cc-unpaid');

    if (totalSpendEl) totalSpendEl.textContent = formatCurrency(stats.totalSpend);
    if (totalLentEl) totalLentEl.textContent = formatCurrency(stats.totalLent);
    if (unpaidEl) unpaidEl.textContent = formatCurrency(stats.unpaidAmount);

    renderCategoryChart(stats.categories);
    renderRecentTransactions(stats.recentTransactions);
}

// Initialize on page load
if (document.getElementById('cc-total-spend')) {
    updateCreditCardStats();
}
