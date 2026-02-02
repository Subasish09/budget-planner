const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income-total');
const expenseEl = document.getElementById('expense-total');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const modalOverlay = document.getElementById('modal-overlay');

// Get transactions from local storage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Init app
function init() {
    listEl.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
}

// Add transaction
function addTransaction(e) {
    e.preventDefault();

    if (descInput.value.trim() === '' || amountInput.value.trim() === '') {
        alert('Please add a description and amount');
        return;
    }

    // Get value from checked radio button
    const typeValue = document.querySelector('input[name="type"]:checked').value;

    const transaction = {
        id: generateID(),
        text: descInput.value,
        amount: +amountInput.value,
        type: typeValue,
        date: new Date().toLocaleDateString()
    };

    transactions.push(transaction);

    addTransactionDOM(transaction);
    updateValues();
    updateLocalStorage();

    descInput.value = '';
    amountInput.value = '';
    closeModal();
}

// Generate random ID
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
    // Determine sign and color class
    const sign = transaction.type === 'expense' ? '-' : '+';
    // 'plus' or 'minus' for the CSS border strip
    const itemClass = transaction.type === 'expense' ? 'minus' : 'plus';

    const item = document.createElement('div');
    item.classList.add('transaction-item');
    item.classList.add(itemClass); // Add global class

    item.innerHTML = `
        <div class="t-info">
            <span class="t-desc">${transaction.text}</span>
            <span class="t-date"><i class="far fa-calendar-alt"></i> ${transaction.date}</span>
        </div>
        <div class="t-right" style="display:flex; align-items:center;">
            <span class="t-amount">${sign}₹${Math.abs(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    listEl.appendChild(item);
}

// Update the balance, income and expense
function updateValues() {
    const amounts = transactions.map(transaction =>
        transaction.type === 'expense' ? -transaction.amount : transaction.amount
    );

    const total = amounts.reduce((acc, item) => (acc += item), 0);

    const income = transactions
        .filter(item => item.type === 'income')
        .reduce((acc, item) => (acc += item.amount), 0);

    const expense = (transactions
        .filter(item => item.type === 'expense')
        .reduce((acc, item) => (acc += item.amount), 0) * 1);

    balanceEl.innerText = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    incomeEl.innerText = `₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    expenseEl.innerText = `₹${expense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Update Empty State
    if (transactions.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No transactions yet. Start by adding one!</div>';
    } else {
        const emptyState = listEl.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
    }
}

// Remove transaction by ID
function removeTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    init();
}

// Update local storage transactions
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Modal handling
function openModal() {
    modalOverlay.classList.add('active');
    descInput.focus();
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// Event Listeners
form.addEventListener('submit', addTransaction);
document.getElementById('add-btn').addEventListener('click', openModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Exposure for inline HTML onclick
window.removeTransaction = removeTransaction;

init();
