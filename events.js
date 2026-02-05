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

// Initialize event data
let eventData = {
    events: []
};

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadEventData();
    renderDashboard();
});

// Load event data from localStorage
function loadEventData() {
    const stored = localStorage.getItem('eventData');
    if (stored) {
        try {
            eventData = JSON.parse(stored);
        } catch (error) {
            console.error('Error loading event data:', error);
            eventData = { events: [] };
        }
    }
}

// Save event data to localStorage
function saveEventData() {
    localStorage.setItem('eventData', JSON.stringify(eventData));
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

    // Set default start date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event-start-date').value = today;
    document.getElementById('event-end-date').value = today;

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
    const startDate = document.getElementById('event-start-date').value;
    const endDate = document.getElementById('event-end-date').value;
    const budget = parseFloat(document.getElementById('event-budget').value) || 0;
    const description = document.getElementById('event-description').value.trim();

    // Validation
    if (!name) {
        alert('Please enter event name');
        return;
    }

    if (!type) {
        alert('Please select event type');
        return;
    }

    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }

    if (new Date(endDate) < new Date(startDate)) {
        alert('End date cannot be before start date');
        return;
    }

    // Create event object
    const event = {
        id: generateId('evt'),
        name: name,
        type: type,
        icon: EVENT_TYPES[type].icon,
        color: EVENT_TYPES[type].color,
        startDate: startDate,
        endDate: endDate,
        totalBudget: budget,
        categoryBudgets: {},
        description: description,
        status: determineEventStatus(startDate, endDate),
        expenses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add to events array
    eventData.events.push(event);

    // Save to localStorage
    saveEventData();

    // Close modal
    closeCreateEventModal();

    // Show success toast
    showToast(`✅ Event "${name}" created successfully!`);

    // Refresh dashboard
    renderDashboard();
}

// Determine event status based on dates
function determineEventStatus(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
        return 'upcoming';
    } else if (now > end) {
        return 'completed';
    } else {
        return 'active';
    }
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
    const activeEvents = eventData.events.filter(e => e.status === 'active');
    const totalBudget = eventData.events.reduce((sum, e) => sum + (e.totalBudget || 0), 0);
    const totalSpent = eventData.events.reduce((sum, e) => {
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
    const activeEvents = eventData.events.filter(e => e.status === 'active');

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
    const upcomingEvents = eventData.events.filter(e => e.status === 'upcoming');

    if (upcomingEvents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No upcoming events</p>';
        return;
    }

    container.innerHTML = upcomingEvents.map(event => renderEventCard(event, true)).join('');
}

// Render completed events
function renderCompletedEvents() {
    const container = document.getElementById('completed-events-container');
    const completedEvents = eventData.events.filter(e => e.status === 'completed');

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
    const endDate = new Date(event.endDate);
    const startDate = new Date(event.startDate);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

    // Progress bar color
    let progressColor = '#10B981'; // Green
    if (percentage > 80) progressColor = '#F59E0B'; // Yellow
    if (percentage >= 100) progressColor = '#EF4444'; // Red

    return `
        <div class="event-card" style="background: linear-gradient(135deg, ${event.color}15, ${event.color}05); border-left: 4px solid ${event.color};">
            <div class="event-card-header">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="event-icon" style="font-size: 2rem;">${event.icon}</div>
                    <div>
                        <h3 style="margin: 0; color: var(--text-primary);">${event.name}</h3>
                        <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                            ${formatDate(event.startDate)} - ${formatDate(event.endDate)}
                        </p>
                    </div>
                </div>
                <button class="btn-icon" onclick="openEventDetails('${event.id}')" title="View Details">
                    <i class="fas fa-arrow-right"></i>
                </button>
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
            isCompleted ?
                `<span style="color: var(--text-secondary); font-size: 0.9rem;">
                        <i class="fas fa-check-circle"></i> Completed
                    </span>` :
                `<span style="color: var(--text-secondary); font-size: 0.9rem;">
                        <i class="fas fa-calendar"></i> ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining
                    </span>`
        }
                <button class="btn-primary" onclick="addExpenseToEvent('${event.id}')">
                    <i class="fas fa-plus"></i> Add Expense
                </button>
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

// Placeholder functions (to be implemented in next phases)
function openEventDetails(eventId) {
    alert('Event details page coming soon!');
    // TODO: Navigate to event detail page
}

function addExpenseToEvent(eventId) {
    alert('Add expense feature coming soon!');
    // TODO: Open add expense modal
}

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
