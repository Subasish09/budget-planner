// Monthly Payment Tracker Functions

// Toggle monthly tracker visibility
function toggleMonthlyTracker() {
    const section = document.getElementById('monthly-tracker-section');
    const isVisible = section.style.display !== 'none';

    if (isVisible) {
        section.style.display = 'none';
    } else {
        section.style.display = 'block';
        renderMonthlyTracker();
        // Hide lending history if open
        document.getElementById('lending-history-section').style.display = 'none';
    }
}

// Toggle lending history visibility
function toggleLendingHistory() {
    const section = document.getElementById('lending-history-section');
    const isVisible = section.style.display !== 'none';

    if (isVisible) {
        section.style.display = 'none';
    } else {
        section.style.display = 'block';
        renderLendingHistory();
        // Hide monthly tracker if open
        document.getElementById('monthly-tracker-section').style.display = 'none';
    }
}

// Get monthly spend grouped by card and month
function getMonthlySpendByCard() {
    const monthlyData = {};

    myCards.forEach(card => {
        card.transactions.forEach(tx => {
            const date = new Date(tx.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {};
            }

            if (!monthlyData[monthKey][card.id]) {
                monthlyData[monthKey][card.id] = {
                    cardName: `${card.bank} ${card.name}`,
                    transactions: [],
                    totalAmount: 0,
                    paidAmount: 0,
                    unpaidAmount: 0
                };
            }

            monthlyData[monthKey][card.id].transactions.push(tx);
            monthlyData[monthKey][card.id].totalAmount += tx.amount;

            if (tx.isPaid) {
                monthlyData[monthKey][card.id].paidAmount += tx.amount;
            } else {
                monthlyData[monthKey][card.id].unpaidAmount += tx.amount;
            }
        });
    });

    return monthlyData;
}

// Mark transaction as paid
async function markTransactionAsPaid(cardId, transactionId) {
    const card = myCards.find(c => c.id === cardId);
    if (!card) return;

    const transaction = card.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    transaction.isPaid = true;
    transaction.paidDate = new Date().toISOString().split('T')[0];

    await saveToGitHub();
    renderMonthlyTracker();
    updateGlobalStats();
}

// Render monthly tracker
function renderMonthlyTracker() {
    const container = document.getElementById('monthly-tracker-content');
    if (!container) return;

    const monthlyData = getMonthlySpendByCard();
    const months = Object.keys(monthlyData).sort().reverse(); // Latest first

    if (months.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No transactions yet</div>';
        return;
    }

    let html = '';

    months.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const cards = monthlyData[monthKey];
        const monthTotal = Object.values(cards).reduce((sum, card) => sum + card.totalAmount, 0);
        const monthPaid = Object.values(cards).reduce((sum, card) => sum + card.paidAmount, 0);
        const monthUnpaid = Object.values(cards).reduce((sum, card) => sum + card.unpaidAmount, 0);

        html += `
            <div style="margin-bottom: 2rem; border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.5rem; background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.2rem;">${monthName}</h3>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">₹${monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            Paid: ₹${monthPaid.toLocaleString('en-IN')} | Unpaid: ₹${monthUnpaid.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
                
                ${Object.entries(cards).map(([cardId, cardData]) => `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <div style="font-weight: 600;">${cardData.cardName}</div>
                            <div style="font-size: 1.1rem; font-weight: 600;">₹${cardData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        
                        <div style="margin-bottom: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                                <span style="color: var(--success);">Paid: ₹${cardData.paidAmount.toLocaleString('en-IN')}</span>
                                <span style="color: var(--danger);">Unpaid: ₹${cardData.unpaidAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div style="background: var(--glass-border); height: 6px; border-radius: 3px; overflow: hidden;">
                                <div style="background: var(--success); height: 100%; width: ${(cardData.paidAmount / cardData.totalAmount * 100)}%;"></div>
                            </div>
                        </div>
                        
                        <details style="margin-top: 0.75rem;">
                            <summary style="cursor: pointer; color: var(--primary); font-size: 0.9rem;">View Transactions (${cardData.transactions.length})</summary>
                            <div style="margin-top: 0.75rem;">
                                ${cardData.transactions.map(tx => {
            const isOverdue = !tx.isPaid && tx.dueDate && new Date(tx.dueDate) < new Date();
            const statusColor = tx.isPaid ? 'var(--success)' : (isOverdue ? 'var(--danger)' : 'var(--warning)');
            const statusText = tx.isPaid ? 'Paid' : (isOverdue ? 'Overdue' : 'Pending');

            return `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--glass-border);">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500;">${tx.desc}</div>
                                                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                                    ${tx.date}${tx.dueDate ? ` • Due: ${tx.dueDate}` : ''}
                                                </div>
                                            </div>
                                            <div style="text-align: right; display: flex; align-items: center; gap: 0.75rem;">
                                                <div>
                                                    <div style="font-weight: 600;">₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                    <div style="font-size: 0.75rem; color: ${statusColor};">${statusText}</div>
                                                </div>
                                                ${!tx.isPaid ? `
                                                    <button class="btn-text" onclick="markTransactionAsPaid('${cardId}', '${tx.id}')" 
                                                        style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: var(--success); color: white;">
                                                        <i class="fas fa-check"></i> Mark Paid
                                                    </button>
                                                ` : `
                                                    <span style="color: var(--success); font-size: 0.8rem;">
                                                        <i class="fas fa-check-circle"></i> ${tx.paidDate || ''}
                                                    </span>
                                                `}
                                            </div>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        </details>
                    </div>
                `).join('')}
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render complete lending history
function renderLendingHistory() {
    const container = document.getElementById('lending-history-content');
    if (!container) return;

    // Collect all lending transactions
    const lendingData = {};

    myCards.forEach(card => {
        card.transactions.forEach(tx => {
            if (tx.isLent && tx.lentTo) {
                if (!lendingData[tx.lentTo]) {
                    lendingData[tx.lentTo] = [];
                }
                lendingData[tx.lentTo].push({
                    ...tx,
                    cardName: `${card.bank} ${card.name}`,
                    cardId: card.id
                });
            }
        });
    });

    const friends = Object.keys(lendingData).sort();

    if (friends.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No lending history</div>';
        return;
    }

    let html = '';

    friends.forEach(friend => {
        const transactions = lendingData[friend];
        const totalLent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalRepaid = transactions.filter(tx => tx.repaid).reduce((sum, tx) => sum + tx.amount, 0);
        const outstanding = totalLent - totalRepaid;

        html += `
            <div style="margin-bottom: 2rem; border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.5rem; background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.2rem;"><i class="fas fa-user"></i> ${friend}</h3>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${outstanding > 0 ? 'var(--warning)' : 'var(--success)'};">
                            ₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">Outstanding</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
                    <div style="text-align: center; padding: 0.5rem; background: rgba(244, 63, 94, 0.1); border-radius: 6px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Total Lent</div>
                        <div style="font-weight: 600; color: var(--danger);">₹${totalLent.toLocaleString('en-IN')}</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Repaid</div>
                        <div style="font-weight: 600; color: var(--success);">₹${totalRepaid.toLocaleString('en-IN')}</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: rgba(139, 92, 246, 0.1); border-radius: 6px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Transactions</div>
                        <div style="font-weight: 600; color: var(--primary);">${transactions.length}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 0.5rem;">
                    <div style="background: var(--glass-border); height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: var(--success); height: 100%; width: ${(totalRepaid / totalLent * 100)}%;"></div>
                    </div>
                </div>
                
                <details open>
                    <summary style="cursor: pointer; color: var(--primary); font-size: 0.9rem; margin-bottom: 0.75rem;">Transaction History</summary>
                    <div>
                        ${transactions.map(tx => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--glass-border);">
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">${tx.cardName}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                        ${tx.date}${tx.dueDate ? ` • Due: ${tx.dueDate}` : ''}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; font-size: 1.1rem;">₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                    <div style="font-size: 0.75rem; color: ${tx.repaid ? 'var(--success)' : 'var(--warning)'};">
                                        ${tx.repaid ? '<i class="fas fa-check-circle"></i> Repaid' : '<i class="fas fa-clock"></i> Pending'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </details>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Expose functions globally
window.toggleMonthlyTracker = toggleMonthlyTracker;
window.toggleLendingHistory = toggleLendingHistory;
window.markTransactionAsPaid = markTransactionAsPaid;
