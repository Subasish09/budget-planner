// ========================================
// Event Spending Tracker
// ========================================

// Event type icons and colors
const EVENT_TYPES = {
    wedding: { icon: '💍', color: '#8B5CF6', label: 'Wedding' },
    party: { icon: '🎉', color: '#EC4899', label: 'Party' },
    trip: { icon: '🏖️', color: '#3B82F6', label: 'Trip' },
    renovation: { icon: '🏠', color: '#F59E0B', label: 'Renovation' },
    festival: { icon: '🪔', color: '#EF4444', label: 'Festival' },
    birthday: { icon: '🎂', color: '#10B981', label: 'Birthday' },
    other: { icon: '📌', color: '#6B7280', label: 'Other' }
};


// Expense categories with icons and colors
const EXPENSE_CATEGORIES = {
    venue: { icon: '🏛️', color: '#8b5cf6', label: 'Venue' },
    food: { icon: '🍽️', color: '#10b981', label: 'Food & Catering' },
    decoration: { icon: '🎨', color: '#f59e0b', label: 'Decoration' },
    travel: { icon: '✈️', color: '#3b82f6', label: 'Travel' },
    shopping: { icon: '🛍️', color: '#ec4899', label: 'Shopping' },
    entertainment: { icon: '🎭', color: '#a855f7', label: 'Entertainment' },
    other: { icon: '📌', color: '#6b7280', label: 'Other' }
};

// Initialize event data
let events = [];
let currentEventId = null;
let currentExpenseId = null;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadEventData();
});

// Load event data from localStorage or GitHub (Smart Merge)
async function loadEventData() {
    let localEvents = [];
    let remoteEvents = [];

    // 1. Get Local Data
    const stored = localStorage.getItem('eventData');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            localEvents = data.events || [];
        } catch (error) {
            console.error('Error parsing local data:', error);
        }
    }

    // 2. Get Remote Data (if connected)
    if (typeof githubSync !== 'undefined' && githubSync.hasToken()) {
        try {
            const result = await githubSync.fetchFile('event_data.json');
            if (result) {
                const data = JSON.parse(result.content);
                remoteEvents = data.events || [];
                console.log('Fetched remote events:', remoteEvents.length);
            }
        } catch (error) {
            console.error('GitHub fetch failed:', error);
        }
    }

    // 3. SMART MERGE: Combine Local + Remote
    const eventMap = new Map();

    // Add Local first
    localEvents.forEach(evt => eventMap.set(evt.id, evt));

    // Add Remote (Union - allow remote to add missing ones)
    // If conflict, default to Local for now to be safe, OR Remote if we trust it more?
    // Let's use Remote to overwrite Local only if ID matches, effectively getting latest?
    // Safety matching: If remote has it, assume it's the "truth", BUT don't delete local-only ones.
    remoteEvents.forEach(evt => eventMap.set(evt.id, evt));

    events = Array.from(eventMap.values());
    console.log(`Merged: ${localEvents.length} Local + ${remoteEvents.length} Remote -> ${events.length} Total`);

    // 4. Save merged state locally
    saveLocalCopy();

    // 5. Initial Push (If local has data but remote was empty)
    if (localEvents.length > 0 && remoteEvents.length === 0 && typeof githubSync !== 'undefined' && githubSync.hasToken()) {
        console.log('Pushing local events to cloud...');
        saveEventData();
    }

    renderDashboard();
}

function saveLocalCopy() {
    localStorage.setItem('eventData', JSON.stringify({ events }));
}

// Save event data to localStorage and GitHub
async function saveEventData() {
    // 1. Save locally first (instant UI update)
    saveLocalCopy();

    // 2. Sync to GitHub if token exists
    if (typeof githubSync !== 'undefined' && githubSync.hasToken()) {
        try {
            console.log('Syncing events to GitHub...');
            const content = JSON.stringify({ events }, null, 2);
            await githubSync.commitFile('event_data.json', content, 'Update event data via App');

            // Show a subtle sync indicator if element exists
            const syncIcon = document.getElementById('sync-status-icon');
            if (syncIcon) {
                syncIcon.className = 'fas fa-check';
                setTimeout(() => syncIcon.className = '', 2000);
            }
        } catch (error) {
            console.error('GitHub sync failed:', error);
            if (typeof showToast === 'function') showToast('⚠️ Saved locally, but GitHub sync failed.');
        }
    }
}

// Generate unique ID
function generateId(prefix = 'evt') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Open create event modal
function openCreateEventModal() {
    const modal = document.getElementById('create-event-modal');
    document.getElementById('event-modal-title').textContent = 'Create New Event';
    document.getElementById('event-form').reset();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event-date').value = today;

    modal.classList.add('active');
}

// Close create event modal
function closeCreateEventModal() {
    const modal = document.getElementById('create-event-modal');
    modal.classList.remove('active');
}

// Save event
function saveEvent() {
    const name = document.getElementById('event-name').value.trim();
    const type = document.getElementById('event-type').value;
    const eventDate = document.getElementById('event-date').value;
    const budget = parseFloat(document.getElementById('event-budget').value) || 0;

    // Validation
    if (!name) {
        alert('Please enter event name');
        return;
    }

    if (!type) {
        alert('Please select event type');
        return;
    }

    if (!eventDate) {
        alert('Please select event date');
        return;
    }

    // Create event object
    const event = {
        id: generateId('evt'),
        name: name,
        type: type,
        icon: EVENT_TYPES[type].icon,
        color: EVENT_TYPES[type].color,
        eventDate: eventDate,
        totalBudget: budget,
        status: determineEventStatus(eventDate),
        expenses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add to events array
    events.push(event);

    // Save to localStorage
    saveEventData();

    // Close modal
    closeCreateEventModal();

    // Show success toast
    showToast(`✅ Event "${name}" created successfully!`);

    // Refresh dashboard
    renderDashboard();
}

// Determine event status based on date
// Note: Events stay active until manually marked as complete
function determineEventStatus(eventDate, currentStatus) {
    // If already completed, keep it completed
    if (currentStatus === 'completed') {
        return 'completed';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);

    if (event > now) {
        return 'upcoming';
    } else {
        // Event date has passed, but keep it active until manually completed
        return 'active';
    }
}

// Delete event
function deleteEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (!confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`)) {
        return;
    }

    // Remove from array
    events = events.filter(e => e.id !== eventId);

    // Save and sync
    saveEventData();

    // Show success message
    showToast(`🗑️ Event "${event.name}" deleted successfully`);

    // Refresh dashboard
    renderDashboard();
}

// Render dashboard
function renderDashboard() {
    updateQuickStats();
    renderActiveEvents();
    renderUpcomingEvents();
    renderCompletedEvents();
}

// Update quick stats
function updateQuickStats() {
    const activeEvents = events.filter(e => e.status === 'active');
    const totalBudget = events.reduce((sum, e) => sum + (e.totalBudget || 0), 0);
    const totalSpent = events.reduce((sum, e) => {
        const eventSpent = e.expenses.reduce((s, exp) => s + exp.amount, 0);
        return sum + eventSpent;
    }, 0);

    document.getElementById('active-events-count').textContent = activeEvents.length;
    document.getElementById('total-budget').textContent = `₹${formatNumber(totalBudget)}`;
    document.getElementById('total-spent').textContent = `₹${formatNumber(totalSpent)}`;
}

// Render active events
function renderActiveEvents() {
    const container = document.getElementById('active-events-container');
    const activeEvents = events.filter(e => e.status === 'active');

    if (activeEvents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-plus" style="font-size: 4rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No Active Events</h3>
                <p>Create your first event to start tracking expenses</p>
                <button class="btn-primary" onclick="openCreateEventModal()" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Create Event
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = activeEvents.map(event => renderEventCard(event)).join('');
}

// Render upcoming events
function renderUpcomingEvents() {
    const container = document.getElementById('upcoming-events-container');
    const upcomingEvents = events.filter(e => e.status === 'upcoming');

    if (upcomingEvents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No upcoming events</p>';
        return;
    }

    container.innerHTML = upcomingEvents.map(event => renderEventCard(event, true)).join('');
}

// Render completed events
function renderCompletedEvents() {
    const container = document.getElementById('completed-events-container');
    const completedEvents = events.filter(e => e.status === 'completed');

    if (completedEvents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No completed events</p>';
        return;
    }

    container.innerHTML = completedEvents.map(event => renderEventCard(event, false, true)).join('');
}

// Render event card
function renderEventCard(event, isUpcoming = false, isCompleted = false) {
    const totalSpent = event.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const budget = event.totalBudget || 0;
    const percentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
    const remaining = budget - totalSpent;

    // Calculate days
    const now = new Date();
    const eventDate = new Date(event.eventDate);


    const daysUntilStart = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

    // Progress bar color
    let progressColor = '#10B981'; // Green
    if (percentage > 80) progressColor = '#F59E0B'; // Yellow
    if (percentage >= 100) progressColor = '#EF4444'; // Red

    // Completed Event Card (Flash Card Summary Style)
    if (isCompleted) {
        return `
            <div class="event-card" onclick="openEventDetail('${event.id}')" style="cursor: pointer; background: linear-gradient(145deg, #1f2937, #111827); border: 1px solid var(--glass-border); opacity: 0.9;">
                <div class="event-card-header" style="margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="event-icon" style="font-size: 1.5rem; filter: grayscale(0.5);">${event.icon}</div>
                        <div>
                            <h3 style="margin: 0; color: var(--text-secondary); font-size: 1.1rem; text-decoration: line-through;">${event.name}</h3>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 0.8rem;">Ended on ${formatDate(event.eventDate)}</p>
                        </div>
                    </div>
                    <div style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <i class="fas fa-check"></i> Done
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 0.5rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Total Spent</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">₹${formatNumber(totalSpent)}</div>
                    </div>
                    <div style="text-align: right;">
                         <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Result</div>
                         ${budget > 0 ? (remaining >= 0 ?
                `<span style="color: #10b981; font-weight: 600;">Saved ₹${formatNumber(remaining)}</span>` :
                `<span style="color: #ef4444; font-weight: 600;">Over ₹${formatNumber(Math.abs(remaining))}</span>`)
                : `<span style="color: var(--text-secondary);">No Budget</span>`}
                    </div>
                </div>
            </div>
        `;
    }

    // Active/Upcoming Event Card (Original Style)
    return `
        <div class="event-card" onclick="openEventDetail('${event.id}')" style="cursor: pointer; background: linear-gradient(135deg, ${event.color}15, ${event.color}05); border-left: 4px solid ${event.color};">
            <div class="event-card-header">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="event-icon" style="font-size: 2rem;">${event.icon}</div>
                    <div>
                        <h3 style="margin: 0; color: var(--text-primary);">${event.name}</h3>
                        <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                            ${formatDate(event.eventDate)}
                        </p>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteEvent('${event.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);" title="Delete Event">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-icon" onclick="openEventDetail('${event.id}')" title="View Details">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
            
            ${budget > 0 ? `
                <div class="event-budget">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">Budget Progress</span>
                        <span style="font-weight: 600; color: ${progressColor};">${percentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background: ${progressColor};"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.9rem;">
                        <span style="color: var(--text-secondary);">Spent: ₹${formatNumber(totalSpent)}</span>
                        <span style="color: var(--text-secondary);">Budget: ₹${formatNumber(budget)}</span>
                    </div>
                    ${remaining >= 0 ?
                `<p style="margin: 0.5rem 0 0 0; color: var(--success); font-size: 0.9rem;">
                            <i class="fas fa-check-circle"></i> ₹${formatNumber(remaining)} remaining
                        </p>` :
                `<p style="margin: 0.5rem 0 0 0; color: var(--danger); font-size: 0.9rem;">
                            <i class="fas fa-exclamation-triangle"></i> ₹${formatNumber(Math.abs(remaining))} over budget
                        </p>`
            }
                </div>
            ` : `
                <div class="event-budget">
                    <p style="color: var(--text-secondary); margin: 0;">Total Spent: ₹${formatNumber(totalSpent)}</p>
                </div>
            `}
            
            <div class="event-footer">
                ${isUpcoming ?
            `<span style="color: var(--text-secondary); font-size: 0.9rem;">
                        <i class="fas fa-clock"></i> Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}
                    </span>` :
            `<span style="color: var(--text-secondary); font-size: 0.9rem;">
                        <i class="fas fa-fire"></i> Active
                    </span>
                    <button class="btn-primary" onclick="openEventDetail('${event.id}')" style="background: linear-gradient(135deg, ${event.color}, ${event.color}dd);">
                        <i class="fas fa-plus"></i> Add Expense
                    </button>`
        }
            </div>
        </div>
    `;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Placeholder functions removed - implemented below

// Toast notification (reuse from grocery.js)
function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: rgba(34, 197, 94, 0.95);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        white-space: pre-line;
        font-weight: 500;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions globally accessible
window.openCreateEventModal = openCreateEventModal;
window.closeCreateEventModal = closeCreateEventModal;
window.saveEvent = saveEvent;
window.openEventDetails = openEventDetails;
window.addExpenseToEvent = addExpenseToEvent;

// ========================================
// Expense Management Functions
// ========================================

// Open event detail view
function openEventDetail(eventId) {
    currentEventId = eventId;
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Set event details
    document.getElementById('detail-event-name').textContent = event.name;
    document.getElementById('detail-event-date').textContent = `${event.icon} ${formatDate(event.eventDate)}`;

    // Show/hide budget summary
    if (event.totalBudget > 0) {
        const totalSpent = calculateTotalSpent(eventId);
        const remaining = event.totalBudget - totalSpent;
        const percentage = Math.min((totalSpent / event.totalBudget) * 100, 100);

        document.getElementById('budget-summary-section').style.display = 'block';
        document.getElementById('detail-budget').textContent = `₹${event.totalBudget.toLocaleString('en-IN')}`;
        document.getElementById('detail-spent').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
        document.getElementById('detail-remaining').textContent = `₹${remaining.toLocaleString('en-IN')}`;
        document.getElementById('budget-progress-bar').style.width = `${percentage}%`;

        // Change color based on percentage
        const progressBar = document.getElementById('budget-progress-bar');
        if (percentage < 70) {
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        } else if (percentage < 90) {
            progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        }
    } else {
        document.getElementById('budget-summary-section').style.display = 'none';
    }

    // Handle Completed vs Active Events
    const addExpenseBtn = document.querySelector('button[onclick="openAddExpenseModal()"]');
    const completeBtn = document.getElementById('complete-event-btn');

    if (event.status === 'completed') {
        // SUMMARY VIEW (Read-Only)
        renderEventSummary(event);

        // Hide Action Buttons
        if (addExpenseBtn) addExpenseBtn.parentElement.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';

        // Update Title
        document.getElementById('event-modal-title').textContent = 'Event Summary';
    } else {
        // ACTIVE VIEW (Editable)
        renderExpensesList(eventId);

        // Show Action Buttons
        if (addExpenseBtn) addExpenseBtn.parentElement.style.display = 'grid'; // Restore grid
        if (completeBtn) completeBtn.style.display = 'block';

        // Restore Title
        document.getElementById('event-modal-title').textContent = 'Event Details';
    }

    // Show modal
    document.getElementById('event-detail-modal').classList.add('active');
}

// Close event detail view
function closeEventDetail() {
    document.getElementById('event-detail-modal').classList.remove('active');
    currentEventId = null;
}

// Calculate total spent for an event
function calculateTotalSpent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.expenses) return 0;
    return event.expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

// Render expenses list grouped by date
function renderExpensesList(eventId) {
    const event = events.find(e => e.id === eventId);
    const container = document.getElementById('expenses-list-container');

    if (!event || !event.expenses || event.expenses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No expenses yet</p>
                <p style="font-size: 0.9rem;">Click "Add Expense" to start tracking</p>
            </div>
        `;
        return;
    }

    // Group expenses by date
    const groupedExpenses = {};
    event.expenses.forEach(expense => {
        if (!groupedExpenses[expense.date]) {
            groupedExpenses[expense.date] = [];
        }
        groupedExpenses[expense.date].push(expense);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

    let html = '';
    sortedDates.forEach(date => {
        const dateExpenses = groupedExpenses[date];
        const dateTotal = dateExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        html += `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--glass-border);">
                    <h3 style="margin: 0; font-size: 1rem; color: var(--text-primary);">${formatDate(date)}</h3>
                    <span style="font-weight: 600; color: var(--text-secondary);">₹${dateTotal.toLocaleString('en-IN')}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${dateExpenses.map(expense => renderExpenseItem(expense)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render single expense item
function renderExpenseItem(expense) {
    const category = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.other;

    return `
        <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                <div style="font-size: 1.5rem;">${category.icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${expense.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${category.label}</div>
                    ${expense.notes ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem; font-style: italic;">${expense.notes}</div>` : ''}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-primary);">₹${expense.amount.toLocaleString('en-IN')}</div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="editExpense('${expense.id}')" class="btn-icon" style="padding: 0.5rem;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteExpense('${expense.id}')" class="btn-icon" style="padding: 0.5rem; color: #ef4444;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Open add expense modal
function openAddExpenseModal() {
    if (!currentEventId) return;

    currentExpenseId = null;
    document.getElementById('expense-modal-title').textContent = 'Add Expense';
    document.getElementById('expense-form').reset();

    // Set default date to event date
    const event = events.find(e => e.id === currentEventId);
    if (event) {
        document.getElementById('expense-date').value = event.eventDate;
    }

    document.getElementById('expense-modal').classList.add('active');
}

// Close expense modal
function closeExpenseModal() {
    document.getElementById('expense-modal').classList.remove('active');
    currentExpenseId = null;
}

// Save expense (add or edit)
function saveExpense() {
    const name = document.getElementById('expense-name').value.trim();
    const category = document.getElementById('expense-category').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;
    const notes = document.getElementById('expense-notes').value.trim();

    // Validation
    if (!name || !category || !amount || !date) {
        alert('Please fill in all required fields');
        return;
    }

    if (amount <= 0) {
        alert('Amount must be greater than 0');
        return;
    }

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    if (!event.expenses) {
        event.expenses = [];
    }

    if (currentExpenseId) {
        // Edit existing expense
        const expenseIndex = event.expenses.findIndex(e => e.id === currentExpenseId);
        if (expenseIndex >= 0) {
            event.expenses[expenseIndex] = {
                ...event.expenses[expenseIndex],
                name,
                category,
                amount,
                date,
                notes,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // Add new expense
        const expense = {
            id: generateId('exp'),
            name,
            category,
            amount,
            date,
            notes,
            createdAt: new Date().toISOString()
        };
        event.expenses.push(expense);
    }

    event.updatedAt = new Date().toISOString();
    saveEventData();
    renderExpensesList(currentEventId);

    // Update budget summary if visible
    if (event.totalBudget > 0) {
        const totalSpent = calculateTotalSpent(currentEventId);
        const remaining = event.totalBudget - totalSpent;
        const percentage = Math.min((totalSpent / event.totalBudget) * 100, 100);

        document.getElementById('detail-spent').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
        document.getElementById('detail-remaining').textContent = `₹${remaining.toLocaleString('en-IN')}`;
        document.getElementById('budget-progress-bar').style.width = `${percentage}%`;
    }

    // Update dashboard
    renderDashboard();

    closeExpenseModal();
}

// Edit expense
function editExpense(expenseId) {
    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    const expense = event.expenses.find(e => e.id === expenseId);
    if (!expense) return;

    currentExpenseId = expenseId;
    document.getElementById('expense-modal-title').textContent = 'Edit Expense';
    document.getElementById('expense-name').value = expense.name;
    document.getElementById('expense-category').value = expense.category;
    document.getElementById('expense-amount').value = expense.amount;
    document.getElementById('expense-date').value = expense.date;
    document.getElementById('expense-notes').value = expense.notes || '';

    document.getElementById('expense-modal').classList.add('active');
}

// Delete expense
function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    event.expenses = event.expenses.filter(e => e.id !== expenseId);
    event.updatedAt = new Date().toISOString();

    saveEventData();
    renderExpensesList(currentEventId);

    // Update budget summary if visible
    if (event.totalBudget > 0) {
        const totalSpent = calculateTotalSpent(currentEventId);
        const remaining = event.totalBudget - totalSpent;
        const percentage = Math.min((totalSpent / event.totalBudget) * 100, 100);

        document.getElementById('detail-spent').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
        document.getElementById('detail-remaining').textContent = `₹${remaining.toLocaleString('en-IN')}`;
        document.getElementById('budget-progress-bar').style.width = `${percentage}%`;
    }

    // Update dashboard
    renderDashboard();
}

// Complete event manually
function completeEvent() {
    if (!currentEventId) return;

    if (!confirm('Mark this event as complete? You can still view it in the Completed section.')) {
        return;
    }

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    event.status = 'completed';
    event.completedAt = new Date().toISOString();
    event.updatedAt = new Date().toISOString();

    saveEventData();
    renderDashboard();
    closeEventDetail();

    // Show success message
    alert('Event marked as complete! You can find it in the Completed Events section.');
}


// Render summary view for completed events
function renderEventSummary(event) {
    const container = document.getElementById('expenses-list-container');
    const totalSpent = event.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const budget = event.totalBudget || 0;

    // Calculate category totals
    const categoryTotals = {};
    event.expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    // Sort categories by spend (highest first)
    const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    // Generate Summary HTML
    let html = `
        <div style="animation: fadeIn 0.3s ease;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid var(--glass-border); text-align: center;">
                <h3 style="color: var(--text-secondary); margin: 0 0 0.5rem 0; font-size: 0.9rem;">Final Total Spent</h3>
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
                    ₹${totalSpent.toLocaleString('en-IN')}
                </div>
                ${budget > 0 ? `
                    <div style="font-size: 0.9rem; color: ${totalSpent > budget ? '#ef4444' : '#10b981'};">
                        ${totalSpent > budget ?
                `<i class="fas fa-exclamation-triangle"></i> Over budget by ₹${(totalSpent - budget).toLocaleString('en-IN')}` :
                `<i class="fas fa-check-circle"></i> Within budget (Saved ₹${(budget - totalSpent).toLocaleString('en-IN')})`
            }
                    </div>
                ` : ''}
            </div>

            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Thinking Back (Spending Breakdown)</h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
    `;

    if (sortedCategories.length === 0) {
        html += `<p style="text-align: center; color: var(--text-secondary);">No expenses recorded for this event.</p>`;
    } else {
        sortedCategories.forEach(catKey => {
            const amount = categoryTotals[catKey];
            const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
            const category = EXPENSE_CATEGORIES[catKey] || EXPENSE_CATEGORIES.other;

            html += `
                <div style="background: var(--bg-secondary); border-radius: 8px; padding: 1rem; border: 1px solid var(--glass-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="font-size: 1.25rem;">${category.icon}</div>
                            <span style="font-weight: 500;">${category.label}</span>
                        </div>
                        <span style="font-weight: 600;">₹${amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${category.color}; border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
            
            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border); text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
                <p><i class="fas fa-lock"></i> This event is completed. Expenses cannot be modified.</p>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
