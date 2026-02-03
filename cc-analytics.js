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
                // Formatting is likely 'window.creditCardDataRaw = [...]'
                // Remove the prefix 'window.creditCardDataRaw =' and potential trailing semicolon
                let cleanText = text.replace(/^\s*window\.creditCardDataRaw\s*=\s*/, '');
                cleanText = cleanText.replace(/;\s*$/, ''); // Remove trailing semicolon

                try {
                    return JSON.parse(cleanText);
                } catch (parseError) {
                    console.error('JSON Parse failed:', parseError);
                    // Fallback: try finding the first [ and the last ]
                    const firstBracket = text.indexOf('[');
                    const lastBracket = text.lastIndexOf(']');
                    if (firstBracket !== -1 && lastBracket !== -1) {
                        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
                    }
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

// Render category breakdown with Chart.js
let infoChart = null;

function renderCategoryBreakdown(categories) {
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

    // Define colors
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
                    <div style="font-weight: 600;">₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${percentage}%</div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // 2. Render Chart (only if context exists and Chart is loaded)
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
                    legend: {
                        display: false // We use our custom legend
                    },
                    tooltip: {
                        backgroundColor: 'rgba(23, 23, 23, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            family: "'Inter', sans-serif",
                            size: 13
                        },
                        bodyFont: {
                            family: "'Inter', sans-serif",
                            size: 13,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                },
                cutout: '75%',
                layout: {
                    padding: 10
                }
            }
        });
    }
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
