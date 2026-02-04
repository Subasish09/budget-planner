// Elements
const groceryModalOverlay = document.getElementById('grocery-modal-overlay');
const newListBtn = document.getElementById('new-list-btn');
const closeGroceryBtn = document.getElementById('close-grocery-modal');
const groceryForm = document.getElementById('grocery-form');
const groceryItemsBody = document.getElementById('grocery-items-body');
const addGroceryRowBtn = document.getElementById('add-grocery-row-btn');
const groceryTotalDisplay = document.getElementById('grocery-total-display');
const groceryPeriodInput = document.getElementById('g-period');
const groceryListsContainer = document.getElementById('grocery-lists-container');
const periodSelect = document.getElementById('period-select');
const listTitle = document.getElementById('list-title');

// Stats Elements
const annualTotalEl = document.getElementById('annual-total');
const lastPeriodCostEl = document.getElementById('last-period-cost');
const topItemEl = document.getElementById('top-item');

// State
let myGroceryLists = JSON.parse(localStorage.getItem('myGroceryLists')) || [];
let currentListId = null;

// Temporary Fix: Force remove "Feb-Mar 2026" as requested
if (myGroceryLists.some(l => l.id === 'Feb-Mar 2026')) {
    console.log('Removing Feb-Mar 2026 as requested');
    myGroceryLists = myGroceryLists.filter(l => l.id !== 'Feb-Mar 2026');
    localStorage.setItem('myGroceryLists', JSON.stringify(myGroceryLists));
}

// Initialize with imported data if available and fresher
// Resync logic: Merge/Overwrite based on data integrity
// Initialize with imported data if available and fresher
// Resync logic: Merge/Overwrite based on data integrity

async function init() {
    await loadData();

    populatePeriodSelect();

    // Check if a period was previously selected (optional, or just default to overview)
    const savedPeriod = localStorage.getItem('selectedPeriod') || 'overview';
    if (periodSelect.querySelector(`option[value="${savedPeriod}"]`)) {
        periodSelect.value = savedPeriod;
    }

    renderUI();
    renderStats();
}

async function loadData() {
    let data;
    try {
        const response = await fetch('grocery_data.json');
        if (!response.ok) throw new Error('Failed to load grocery data');
        data = await response.json();
    } catch (error) {
        console.warn('Fetch failed, attempting fallback to local data:', error);
        if (typeof window.groceryDataRaw !== 'undefined') {
            data = window.groceryDataRaw;
        } else {
            console.error('No data source available.');
            return;
        }
    }

    // Expose inventory globally as before
    window.groceryInventory = data.inventory;
    const groceryHistory = data.history;

    let dataChanged = false;

    // 1. Ensure all history items exist in local storage
    if (groceryHistory) {
        groceryHistory.forEach(historyList => {
            const localListIndex = myGroceryLists.findIndex(l => l.id === historyList.id);

            if (localListIndex === -1) {
                // New history item found (e.g. 2025 data), add it
                myGroceryLists.push(historyList);
                dataChanged = true;
            } else {
                // Check for data integrity issues (e.g. truncated lists or placeholder corruption)
                // If local version has significantly fewer items than source of truth, overwrite it.
                // Also overwrite if local data appears to be placeholder spam (all "Item").
                const isPlaceholderData = myGroceryLists[localListIndex].items.some(i => i.name === 'Item' && i.cost === 1);

                if (myGroceryLists[localListIndex].items.length < historyList.items.length || isPlaceholderData) {
                    console.log(`Restoring data for ${historyList.id} (Corrupt/Truncated)`);
                    myGroceryLists[localListIndex] = historyList;
                    dataChanged = true;
                }
            }
        });
    }

    if (dataChanged) {
        localStorage.setItem('myGroceryLists', JSON.stringify(myGroceryLists));
        // Force re-render if we updated the currently viewed list
        if (typeof renderUI === 'function') renderUI();
    }
}

function populatePeriodSelect() {
    // Keep 'overview'
    periodSelect.innerHTML = '<option value="overview">Overview</option>';

    // Sort lists chronologically for the dropdown
    // Parsing ID "Month-Month YYYY" to date object for sorting
    const sortedLists = [...myGroceryLists].sort((a, b) => {
        const parseDate = (id) => {
            const parts = id.split(' ');
            if (parts.length < 2) return new Date(0);
            const year = parseInt(parts[1]);
            const monthRange = parts[0].split('-');
            const monthMap = {
                "Jan": 0, "January": 0,
                "Feb": 1, "February": 1,
                "Mar": 2, "March": 2,
                "Apr": 3, "April": 3,
                "May": 4,
                "Jun": 5, "June": 5,
                "Jul": 6, "July": 6,
                "Aug": 7, "August": 7,
                "Sept": 8, "Sep": 8, "September": 8,
                "Oct": 9, "October": 9,
                "Nov": 10, "November": 10,
                "Dec": 11, "December": 11
            };
            const month = monthMap[monthRange[0]] || 0;
            return new Date(year, month, 1);
        };
        return parseDate(b.id) - parseDate(a.id); // Descending (Newest first)
    });

    sortedLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.id;
        periodSelect.appendChild(option);
    });
}

// Helper to get bi-monthly period from month index
periodSelect.addEventListener('change', () => {
    localStorage.setItem('selectedPeriod', periodSelect.value);
    renderUI();
});

function renderUI() {
    groceryListsContainer.innerHTML = '';
    const viewMode = periodSelect.value;

    if (viewMode === 'overview') {
        listTitle.style.display = 'block';
        listTitle.innerText = "Grocery History";
        renderOverview();
    } else {
        const list = myGroceryLists.find(l => l.id === viewMode);
        if (list) {
            listTitle.style.display = 'none'; // Hide duplicate title
            renderDetailView(list);
        } else {
            renderOverview(); // Fallback
        }
    }
    renderStats();
}

function renderOverview() {
    groceryListsContainer.classList.add('grocery-grid'); // Ensure grid layout
    groceryListsContainer.classList.remove('detail-view');

    if (myGroceryLists.length === 0) {
        groceryListsContainer.innerHTML = '<div class="empty-state-small">No grocery lists found. Start a new one!</div>';
        return;
    }

    [...myGroceryLists].reverse().forEach(list => {
        const card = document.createElement('div');
        card.classList.add('grocery-card');
        card.onclick = () => {
            // Clicking card switches view to that period
            periodSelect.value = list.id;
            renderUI();
        };

        const itemCount = list.items.length;
        // Tag Logic: Show top 4 highest cost items as tags
        const previewLimit = 4;
        const topItems = [...list.items].sort((a, b) => b.cost - a.cost).slice(0, previewLimit);
        const tags = topItems.map(i => `<span class="item-tag">${i.name}</span>`).join('');
        const moreCount = list.items.length - previewLimit;
        const moreTag = moreCount > 0 ? `<span class="more-tag">+${moreCount} more</span>` : '';

        card.innerHTML = `
            <div class="grocery-header">
                <div>
                    <div class="g-period">${list.id}</div> 
                    <div class="g-count">${itemCount} Items</div>
                </div>
                <div class="text-right">
                     <div class="g-total">₹${list.total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
            </div>
             <div class="g-preview">
                ${tags}
                ${moreTag}
            </div>
        `;
        groceryListsContainer.appendChild(card);
    });
}

// Sort State
let currentSort = 'total-desc';

function updateSort(val) {
    currentSort = val;
    renderUI();
}

function renderDetailView(list) {
    groceryListsContainer.classList.remove('grocery-grid');
    groceryListsContainer.classList.add('detail-view');

    // Sorting Logic
    const sortedItems = [...list.items].sort((a, b) => {
        const pA = a.qty > 0 ? a.cost / a.qty : 0;
        const pB = b.qty > 0 ? b.cost / b.qty : 0;

        switch (currentSort) {
            case 'price-desc': return pB - pA;
            case 'price-asc': return pA - pB;
            case 'total-desc': return b.cost - a.cost;
            case 'total-asc': return a.cost - b.cost;
            case 'qty-desc': return b.qty - a.qty;
            case 'qty-asc': return a.qty - b.qty;
            default: return b.cost - a.cost;
        }
    });

    const tableHtml = `
        <div class="detail-container">
            <div class="detail-header">
                <div class="detail-title-group">
                     <h3>${list.id}</h3>
                     <span style="color: var(--text-secondary); font-size: 1.1rem;">${list.items.length} items collected</span>
                </div>
                <div class="detail-cost-group">
                    <div style="color: var(--text-secondary); margin-bottom:0.5rem;">Total Estimated Cost</div>
                    <div class="detail-cost-value">₹${list.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="detail-actions">
                        <select class="sort-select" onchange="updateSort(this.value)" style="padding: 0.5rem; font-size: 0.9rem;">
                            <option value="total-desc" ${currentSort === 'total-desc' ? 'selected' : ''}>Highest Total</option>
                            <option value="total-asc" ${currentSort === 'total-asc' ? 'selected' : ''}>Lowest Total</option>
                            <option value="price-desc" ${currentSort === 'price-desc' ? 'selected' : ''}>Highest Price</option>
                            <option value="price-asc" ${currentSort === 'price-asc' ? 'selected' : ''}>Lowest Price</option>
                            <option value="qty-desc" ${currentSort === 'qty-desc' ? 'selected' : ''}>Most Qty</option>
                            <option value="qty-asc" ${currentSort === 'qty-asc' ? 'selected' : ''}>Least Qty</option>
                        </select>
                        <button class="btn-text" onclick="openModal('${list.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-text" onclick="deleteList('${list.id}')" style="color: #ff6b6b; border-color: rgba(244, 63, 94, 0.2);"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
            
            <table class="grocery-detail-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Item Details</th>
                        <th style="width: 20%;">Quantity</th>
                        <th style="width: 20%; text-align:right;">Unit Price</th>
                        <th style="width: 20%; text-align:right;">Line Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedItems.map((item, index) => {
        const unitPrice = item.qty > 0 ? item.cost / item.qty : 0;
        // Hide items after index 4 (5th item) - NOTE: Pagination logic might depend on sort order now, usually desired behavior
        const displayStyle = index > 4 ? 'display: none;' : '';
        const rowClass = index > 4 ? 'hidden-row' : '';
        return `
                        <tr class="${rowClass}" style="${displayStyle}">
                            <td><span style="font-weight: 500; font-size: 1.05rem;">${item.name}</span></td>
                            <td>${item.qty} ${guessUnit(item.name)}</td>
                            <td style="text-align:right; font-family: monospace; color: var(--text-secondary);">₹${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style="text-align:right; font-weight: 600; color: var(--text-primary);">₹${item.cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    `}).join('')}
                    ${list.items.length > 5 ? `
                        <tr id="show-more-row">
                            <td colspan="4" style="text-align: center; padding: 1rem;">
                                <button onclick="showAllItems(this)" class="btn-text" style="width: auto; margin: 0 auto; font-size: 0.9rem;">
                                    Show ${list.items.length - 5} More Items <i class="fas fa-chevron-down"></i>
                                </button>
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    `;
    groceryListsContainer.innerHTML = tableHtml;
}

function guessUnit(name) {
    if (!name) return '';
    const match = name.match(/(\d+(?:kg|g|lt|ml|pc))/i);
    return '';
}

function renderStats() {
    const total = myGroceryLists.reduce((acc, list) => acc + list.total, 0);
    const avg = myGroceryLists.length > 0 ? total / myGroceryLists.length : 0;

    // 1. Find Highest Spending List
    let maxList = { id: '-', total: 0 };
    myGroceryLists.forEach(list => {
        if (list.total > maxList.total) maxList = list;
    });

    // 2. Find Most Valuable Item (Highest Total Spend)
    const itemCostMap = {};
    myGroceryLists.forEach(list => {
        list.items.forEach(item => {
            // item.cost is total line cost
            itemCostMap[item.name] = (itemCostMap[item.name] || 0) + item.cost;
        });
    });

    let mvpName = "-";
    let maxCost = 0;
    for (const [name, cost] of Object.entries(itemCostMap)) {
        if (cost > maxCost) {
            maxCost = cost;
            mvpName = name;
        }
    }
    if (mvpName.length > 18) mvpName = mvpName.substring(0, 16) + '...';

    if (mvpName.length > 18) mvpName = mvpName.substring(0, 16) + '...';

    // 3. Calculate Trend (Selected List vs Average) - RESTORED
    const selectedIdentifier = periodSelect ? periodSelect.value : 'overview';
    let targetList = null;

    if (selectedIdentifier && selectedIdentifier !== 'overview') {
        targetList = myGroceryLists.find(l => l.id === selectedIdentifier);
    }

    // Fallback to last list if overview or not found
    if (!targetList) {
        targetList = myGroceryLists.length > 0 ? myGroceryLists[myGroceryLists.length - 1] : null;
    }

    let trendHtml = '-';
    if (targetList && avg > 0) {
        const diff = targetList.total - avg;
        const percent = (diff / avg) * 100;
        const icon = diff > 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
        const color = diff > 0 ? 'var(--danger)' : 'var(--success)';
        trendHtml = `<span style="color:${color}; font-size: 1.1rem;">${icon} ${Math.abs(percent).toFixed(1)}%</span> <span style="font-size:0.8rem; color:var(--text-secondary);">vs Avg</span>`;
    }

    // 4. Render Spending Line Chart (SVG) - NEW CONTAINER
    const chartEl = document.getElementById('spending-chart-container');
    const chartData = myGroceryLists.slice(-7); // Last 7 periods

    if (chartEl && chartData.length > 0) {
        const width = 1000;
        const height = 200;
        const padding = 20;

        const maxVal = Math.max(...chartData.map(l => l.total)) || 1;
        const count = chartData.length;

        // Calculate Points
        const points = chartData.map((list, index) => {
            // Distribute X evenly
            const x = count > 1 ? (index / (count - 1)) * width : width / 2;
            // Scale Y (invert because SVG 0 is top)
            // Leave 20% padding at top
            const y = height - ((list.total / maxVal) * (height - padding * 2)) - padding;
            return { x, y, list };
        });

        // Build Path Strings
        let pathD = `M ${points[0].x} ${points[0].y}`;
        points.slice(1).forEach(p => pathD += ` L ${p.x} ${p.y}`);

        const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

        // Build Circles
        const circlesHtml = points.map(p => {
            const shortName = p.list.id.split(' ')[0];
            const formattedTotal = p.list.total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
            return `<circle cx="${p.x}" cy="${p.y}" r="5" class="chart-point">
                        <title>${shortName}: ₹${formattedTotal}</title>
                     </circle>`;
        }).join('');

        chartEl.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="chart-svg">
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="${areaD}" fill="url(#chartGradient)" stroke="none" />
                <path d="${pathD}" fill="none" stroke="var(--primary)" stroke-width="3" />
                ${circlesHtml}
            </svg>
        `;
    }

    // Update DOM - Use explicit IDs
    const annualEl = document.getElementById('annual-total');
    const avgEl = document.getElementById('avg-cost');
    const highEl = document.getElementById('highest-spend');
    const mvpEl = document.getElementById('mvp-item');
    const trendEl = document.getElementById('spending-trend');

    // Safe updates
    if (annualEl) annualEl.innerText = `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    if (avgEl) avgEl.innerText = `₹${avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    if (highEl) highEl.innerHTML = `<div>₹${maxList.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div><div style='font-size:0.8rem; color:var(--text-secondary); margin-top:4px;'>${maxList.id}</div>`;

    if (mvpEl) mvpEl.innerHTML = `<div>${mvpName}</div><div style='font-size:0.8rem; color:var(--text-secondary); margin-top:4px;'>Total: ₹${maxCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>`;

    if (trendEl) trendEl.innerHTML = trendHtml;
}

// Helper to get bi-monthly period from month index
const getBiMonthly = (monthIndex) => {
    // 0=Jan, 1=Feb, ...
    // Map to Jan-Feb, Mar-Apr...
    // If even (0, 2, 4...), it's the start. If odd, it's the end.
    // Let's standardise: If user selects Feb, treat as Feb-Mar? Or map Feb to Jan-Feb?
    // Let's map selected 'Start Month' to 'StartMonth-NextMonth'.
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const start = months[monthIndex];
    const end = months[(monthIndex + 1) % 12];
    // Special handling for legacy naming conventions if needed, but "Jan-Feb" is standard.
    return `${start}-${end}`;
};

function populateDateSelects() {
    const yearSelect = document.getElementById('g-year');
    const monthSelect = document.getElementById('g-month');
    const dateSelect = document.getElementById('g-date');

    // Years: Current - 2 to Current + 5
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.text = i;
        if (i === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // Bi-Monthly Periods
    const periods = ["Jan-Feb", "Mar-Apr", "May-Jun", "July-Aug", "Sept-Oct", "Nov-Dec"];
    monthSelect.innerHTML = '';
    periods.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.text = p;
        monthSelect.appendChild(opt);
    });

    // Dates: 1-31
    dateSelect.innerHTML = '<option value="">--</option>'; // Optional
    for (let i = 1; i <= 31; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.text = i;
        dateSelect.appendChild(opt);
    }
}

function openModal(id = null) {
    currentListId = id;
    groceryItemsBody.innerHTML = '';
    populateDateSelects();

    const yearSelect = document.getElementById('g-year');
    const monthSelect = document.getElementById('g-month');
    const dateSelect = document.getElementById('g-date');

    if (id) {
        const list = myGroceryLists.find(l => l.id === id);
        if (list) {
            // Parse ID "Jan-Feb 2026" or "Month-Month Year"
            // We need to extract Year and Start Month to preset the selects.
            const parts = list.id.split(' ');
            if (parts.length >= 2) {
                const year = parts[parts.length - 1]; // Last part is year
                const period = parts[0]; // "Jan-Feb"
                const startMonth = period.split('-')[0]; // "Jan"

                yearSelect.value = year;
                // Find option with text or value matching startMonth short code
                // Our HTML values are "Jan", "Feb"...
                monthSelect.value = startMonth;
            }

            // Determine if there is a specific date saved? Data structure doesn't support it explicitly yet on the list level except via ID if we added it?
            // Current data doesn't store "Date". We can leave Date as blank for editing old lists.
            dateSelect.value = "";

            list.items.forEach(item => {
                // Find unit price from cost/qty
                const price = (item.cost / item.qty).toFixed(2);
                addRow({ ...item, price: price });
            });
        }
    } else {
        // New List
        const now = new Date();
        yearSelect.value = now.getFullYear();

        // Determine current bi-monthly block
        const monthIdx = now.getMonth(); // 0-11
        // 0,1 -> Jan-Feb (0)
        // 2,3 -> Mar-Apr (1)
        const periods = ["Jan-Feb", "Mar-Apr", "May-Jun", "July-Aug", "Sept-Oct", "Nov-Dec"];
        const periodIdx = Math.floor(monthIdx / 2);
        monthSelect.value = periods[periodIdx];

        dateSelect.value = now.getDate(); // Default to today

        addRow();
    }

    calcTotal();
    groceryModalOverlay.classList.add('active');
}

function closeModal() {
    groceryModalOverlay.classList.remove('active');
}

function addRow(data = null) {
    const tr = document.createElement('tr');

    // Create datalist options for autocomplete from imported inventory + History
    let datalist = document.getElementById('grocery-inventory-list');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'grocery-inventory-list';

        const suggestions = new Map();

        // 1. Add items from History (Recent items first - Priority for Last Price)
        if (myGroceryLists) {
            // Sort by date descending to find the LATEST price first
            // We assume myGroceryLists is somewhat chronological, but let's be safe
            // Actually, populatePeriodSelect sorts them. Let's rely on the array order or reverse it.
            // If we reverse, the first one we find is the latest.
            [...myGroceryLists].reverse().forEach(list => {
                list.items.forEach(item => {
                    if (!suggestions.has(item.name)) {
                        // Found latest occurrence
                        const unitPrice = (item.cost / item.qty).toFixed(2);
                        suggestions.set(item.name, unitPrice);
                    }
                });
            });
        }

        // 2. Add items from Base Inventory (only if not found in history)
        if (typeof groceryInventory !== 'undefined') {
            groceryInventory.forEach(item => {
                if (!suggestions.has(item.name)) {
                    suggestions.set(item.name, item.current_price);
                }
            });
        }

        // Render options
        suggestions.forEach((price, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.innerText = `Last ₹${price}`; // "Last" instead of "Avg"
            datalist.appendChild(option);
        });

        document.body.appendChild(datalist);
    }

    const name = data ? data.name : '';
    const qty = data ? data.qty : 1;
    const price = data ? data.price : '';
    const rowTotal = data ? data.cost.toFixed(2) : '0.00';

    tr.innerHTML = `
        <td>
            <input type="text" class="g-input g-name" list="grocery-inventory-list" placeholder="Item Name" value="${name}" required>
        </td>
        <td><input type="number" class="g-input g-qty" placeholder="1" value="${qty}" min="0.1" step="0.1" required></td>
        <td><input type="number" class="g-input g-price" placeholder="0.00" value="${price}" step="0.01" required></td>
        <td class="g-row-total" style="vertical-align: middle; font-weight: 500; color: var(--text-primary);">₹${rowTotal}</td>
        <td><button type="button" class="g-del-btn" style="opacity: 0.6; transition: 0.2s;"><i class="fas fa-trash"></i></button></td>
    `;

    // Event listeners
    const nameInput = tr.querySelector('.g-name');
    const priceInput = tr.querySelector('.g-price');
    const qtyInput = tr.querySelector('.g-qty');
    const totalCell = tr.querySelector('.g-row-total');

    // Row calculation helper
    const updateRowTotal = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const p = parseFloat(priceInput.value) || 0;
        const t = q * p;
        totalCell.innerText = `₹${t.toFixed(2)}`;
        calcTotal(); // Update global total
    };

    // Auto-fill price
    nameInput.addEventListener('change', () => {
        const options = document.getElementById('grocery-inventory-list').options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === nameInput.value) {
                // Extract price from innerText "Avg ₹109"
                const priceText = options[i].innerText;
                const match = priceText.match(/₹([\d\.]+)/);
                if (match && !priceInput.value) {
                    priceInput.value = match[1];
                    updateRowTotal();
                }
                break;
            }
        }
    });

    qtyInput.addEventListener('input', updateRowTotal);
    priceInput.addEventListener('input', updateRowTotal);

    tr.querySelector('.g-del-btn').addEventListener('click', () => {
        tr.remove();
        calcTotal();
    });

    groceryItemsBody.appendChild(tr);
}

function calcTotal() {
    const rows = groceryItemsBody.querySelectorAll('tr');
    let total = 0;

    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.g-qty').value) || 0;
        const price = parseFloat(row.querySelector('.g-price').value) || 0;
        total += (qty * price);
    });

    groceryTotalDisplay.innerText = `₹${total.toFixed(2)}`;
    return total;
}

function saveList(e) {
    e.preventDefault();

    const rows = groceryItemsBody.querySelectorAll('tr');
    const items = [];

    rows.forEach(row => {
        items.push({
            name: row.querySelector('.g-name').value,
            qty: parseFloat(row.querySelector('.g-qty').value),
            cost: parseFloat(row.querySelector('.g-qty').value) * parseFloat(row.querySelector('.g-price').value) // Store cost directly
        });
    });

    const total = items.reduce((acc, i) => acc + i.cost, 0);

    const year = document.getElementById('g-year').value;
    const period = document.getElementById('g-month').value; // Now holds "Jan-Feb" etc directly
    const date = document.getElementById('g-date').value;

    const id = `${period} ${year}`;

    const existingIndex = myGroceryLists.findIndex(l => l.id === id);
    const listData = {
        id,
        items,
        total,
        // Optional: Store detailed date info if needed for display
        dateDetails: { year, period, date }
    };

    if (existingIndex !== -1) {
        // Update existing
        myGroceryLists[existingIndex] = listData;
    } else {
        // New
        myGroceryLists.push(listData);
    }

    localStorage.setItem('myGroceryLists', JSON.stringify(myGroceryLists));

    populatePeriodSelect(); // Refresh dropdown
    periodSelect.value = id; // Switch view to saved list
    renderUI();
    renderStats();
    closeModal();
}

function deleteList(id) {
    if (confirm(`Are you sure you want to delete the list "${id}"? This cannot be undone.`)) {
        myGroceryLists = myGroceryLists.filter(l => l.id !== id);
        localStorage.setItem('myGroceryLists', JSON.stringify(myGroceryLists));

        // Reset view to overview if we just deleted the current view
        if (periodSelect.value === id) {
            periodSelect.value = 'overview';
            // Also remove the option from the select
        }

        populatePeriodSelect();
        renderUI();
        renderStats();
    }
}

// Search Functionality
const searchInput = document.getElementById('item-search-input');
const searchResults = document.getElementById('search-results');
const searchSuggestionsEl = document.getElementById('search-suggestions');
const searchResetBtn = document.getElementById('search-reset-btn');

// Toggle Reset Button & Clear Logic
searchInput.addEventListener('input', (e) => {
    const val = e.target.value;

    if (val.length > 0) {
        searchResetBtn.classList.add('active');
    } else {
        searchResetBtn.classList.remove('active');
        // Clearly hide results when input is cleared manually
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
    }

    showSuggestions(val.trim());
});

// Reset Search
searchResetBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchResetBtn.classList.remove('active');
    searchSuggestionsEl.classList.remove('active');
    searchResults.style.display = 'none';
    searchResults.innerHTML = '';
    searchInput.focus();
});

function showSuggestions(query) {
    currentFocus = -1;
    if (!query) {
        if (searchSuggestionsEl) searchSuggestionsEl.classList.remove('active');
        return;
    }

    const uniqueItems = new Set();
    if (myGroceryLists) {
        myGroceryLists.forEach(list => {
            list.items.forEach(item => {
                if (item.name.toLowerCase().includes(query.toLowerCase())) {
                    uniqueItems.add(item.name);
                }
            });
        });
    }

    const matches = [...uniqueItems].sort();

    if (matches.length === 0) {
        if (searchSuggestionsEl) searchSuggestionsEl.classList.remove('active');
        return;
    }

    if (searchSuggestionsEl) {
        searchSuggestionsEl.innerHTML = '';
        matches.slice(0, 8).forEach(name => {
            const item = document.createElement('div');
            item.classList.add('suggestion-item');

            const regex = new RegExp(`(${query})`, 'gi');
            const highlightedName = name.replace(regex, '<span class="suggestion-highlight">$1</span>');

            item.innerHTML = `<span>${highlightedName}</span>`;
            // Hidden input for keyboard selection
            item.innerHTML += `<input type='hidden' value='${name}'>`;

            item.addEventListener('click', () => {
                searchInput.value = name;
                searchSuggestionsEl.classList.remove('active');
                searchSuggestionsEl.innerHTML = ''; // Destroy suggestions
                searchItems();
            });

            searchSuggestionsEl.appendChild(item);
        });
        searchSuggestionsEl.classList.add('active');
    }
}

function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;

    items[currentFocus].classList.add("selected");
    items[currentFocus].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("selected");
    }
}

// Event Listeners for Custom Search

searchInput.addEventListener('keydown', (e) => {
    let x = document.getElementById("search-suggestions");
    if (x) x = x.getElementsByTagName("div");
    if (e.key == "ArrowDown") {
        currentFocus++;
        addActive(x);
    } else if (e.key == "ArrowUp") {
        currentFocus--;
        addActive(x);
    } else if (e.key == "Enter") {
        e.preventDefault();
        if (currentFocus > -1) {
            if (x) x[currentFocus].click();
        } else {
            searchSuggestionsEl.classList.remove('active');
            searchSuggestionsEl.innerHTML = ''; // Destroy suggestions
            searchItems();
        }
    }
});

document.addEventListener('click', (e) => {
    if (searchSuggestionsEl && !searchInput.contains(e.target) && !searchSuggestionsEl.contains(e.target)) {
        searchSuggestionsEl.classList.remove('active');
    }
});

function searchItems() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    const history = [];
    myGroceryLists.forEach(list => {
        list.items.forEach(item => {
            if (item.name.toLowerCase().includes(query)) {
                history.push({
                    listId: list.id,
                    ...item,
                    unitPrice: item.cost / item.qty
                });
            }
        });
    });

    if (history.length === 0) {
        // If triggered by auto-select, we might not want to show "No items found" excessively
        // but for now precise feedback is good.
        searchResults.style.display = 'block';
        searchResults.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 1rem;">No items found matching "' + searchInput.value + '"</div>';
        return;
    }

    // Sort history by date? List order keys are chronological-ish.
    // Let's assume list order is chronological (oldest to newest).
    // Let's Reverse for display (Newest First)
    // history.reverse(); 

    // Build Table
    let html = `
        <h4 style="margin-bottom: 1rem; color: var(--primary);">Price History for "${searchInput.value}"</h4>
        <div style="max-height: 300px; overflow-y: auto;">
            <table class="grocery-detail-table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Unit Price</th>
                        <th>Qty Bought</th>
                        <th>Trend</th>
                    </tr>
                </thead>
                <tbody>
    `;

    history.forEach((h, index) => {
        let trend = '-';
        // Compare with PREVIOUS purchase (which is index-1 in chronological list)
        if (index > 0) {
            const prev = history[index - 1].unitPrice;
            const diff = h.unitPrice - prev;
            if (diff > 0) trend = `<span style="color: var(--danger);"><i class="fas fa-arrow-up"></i> +${diff.toFixed(2)}</span>`;
            else if (diff < 0) trend = `<span style="color: var(--success);"><i class="fas fa-arrow-down"></i> ${diff.toFixed(2)}</span>`;
        }

        html += `
            <tr>
                <td>${h.listId}</td>
                <td>₹${h.unitPrice.toFixed(2)}</td>
                <td>${h.qty}</td>
                <td>${trend}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    searchResults.style.display = 'block';
    searchResults.innerHTML = html;
}

// Search triggered via enter or click on suggestion, no manual button needed.


// Events
newListBtn.addEventListener('click', () => openModal());
closeGroceryBtn.addEventListener('click', closeModal);
addGroceryRowBtn.addEventListener('click', () => addRow());
groceryForm.addEventListener('submit', saveList);
groceryModalOverlay.addEventListener('click', (e) => {
    if (e.target === groceryModalOverlay) closeModal();
});

// Expose openModal globally for "Edit" button in HTML
window.openModal = openModal;
window.deleteList = deleteList;
window.showAllItems = function (btn) {
    const tbody = btn.closest('tbody');
    const hiddenRows = tbody.querySelectorAll('.hidden-row');
    hiddenRows.forEach(row => {
        row.style.display = 'table-row';
        // Add a small fade in effect if possible via CSS class, but simple display switch works for now
    });
    // Remove the button row
    const btnRow = btn.closest('tr');
    btnRow.remove();
};

// --- SETTINGS / GITHUB SYNC LOGIC ---
const settingsModal = document.getElementById('settings-modal-overlay');

function openSettings() {
    const config = JSON.parse(localStorage.getItem('ghGroceryConfig')) || {};
    if (config.username) document.getElementById('gh-username').value = config.username;
    if (config.repo) document.getElementById('gh-repo').value = config.repo;
    if (config.pat) document.getElementById('gh-pat').value = config.pat;
    if (config.branch) document.getElementById('gh-branch').value = config.branch;
    if (config.path) document.getElementById('gh-path').value = config.path;

    settingsModal.classList.add('active');
}

document.getElementById('close-settings-modal').addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

function saveSettings() {
    const config = {
        username: document.getElementById('gh-username').value,
        repo: document.getElementById('gh-repo').value,
        pat: document.getElementById('gh-pat').value,
        branch: document.getElementById('gh-branch').value || 'main',
        path: document.getElementById('gh-path').value || 'grocery_data.json'
    };

    localStorage.setItem('ghGroceryConfig', JSON.stringify(config));
    alert('Settings Saved! You can now Sync.');
}

async function syncToGitHub() {
    const config = JSON.parse(localStorage.getItem('ghGroceryConfig'));
    if (!config || !config.username || !config.repo || !config.pat) {
        alert('Please save your GitHub configuration first.');
        return;
    }

    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}`;

    // Export Data Structure
    const exportData = {
        inventory: typeof groceryInventory !== 'undefined' ? groceryInventory : [],
        history: myGroceryLists
    };

    const content = JSON.stringify(exportData, null, 4);
    const message = `Update grocery data - ${new Date().toLocaleString()}`;

    // Get SHA
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
            throw new Error('Failed to fetch file info. Check repo settings.');
        }
    } catch (e) {
        console.error(e);
        alert('Error accessing repository. Check credentials.');
        return;
    }

    // PUT Update
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
                content: btoa(unescape(encodeURIComponent(content))), // UTF-8 Base64
                sha: sha || undefined,
                branch: config.branch
            })
        });

        if (putRes.ok) {
            alert('✅ Success! Grocery Data synced to GitHub.');
            settingsModal.classList.remove('active');
            // Allow immediate re-sync to ensure we're fresh? 
            // Ideally we also reload data here if we pulled merged data, but for now we just push.
        } else {
            const err = await putRes.json();
            alert(`Sync Failed: ${err.message}`);
        }
    } catch (e) {
        alert('Sync Error: ' + e.message);
    }
}

init();

// ========================================
// Tab Navigation Logic (Shopping List Feature)
// ========================================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update view sections
    document.querySelectorAll('.view-section').forEach(view => {
        view.style.display = 'none';
    });
    
    const activeView = document.getElementById(`${tabName}-view`);
    if (activeView) {
        activeView.style.display = 'block';
        
        // Render content based on active tab
        if (tabName === 'shopping') {
            renderShoppingLists();
        } else if (tabName === 'inventory') {
            renderInventory();
        }
    }
}

// ========================================
// Shopping Lists Functions (Placeholder)
// ========================================


function createShoppingList() {
    alert('Shopping list creation coming in Phase 2!');
    // TODO: Implement shopping list creation modal
}

// ========================================
// Inventory Browser Functions (Placeholder)
// ========================================

function renderInventory() {
    const container = document.getElementById('inventory-container');
    const countEl = document.getElementById('inventory-count');
    
    // Get inventory from imported data
    if (!window.groceryData || !window.groceryData.inventory) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No inventory data available</p>';
        return;
    }
    
    const inventory = window.groceryData.inventory;
    countEl.textContent = inventory.length;
    
    // Render inventory items
    container.innerHTML = inventory.map(item => `
        <div class="stat-card" style="padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">${item.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ${item.category || 'General'} • ${item.unit}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--success);">
                        ₹${item.current_price}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add search functionality
    const searchInput = document.getElementById('inventory-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = inventory.filter(item => 
            item.name.toLowerCase().includes(query) ||
            (item.category && item.category.toLowerCase().includes(query))
        );
        
        container.innerHTML = filtered.map(item => `
            <div class="stat-card" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${item.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            ${item.category || 'General'} • ${item.unit}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--success);">
                            ₹${item.current_price}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    });
}

// Make functions globally accessible
window.switchTab = switchTab;
window.createShoppingList = createShoppingList;

// ========================================
// Shopping List Creation Logic (Phase 2)
// ========================================

let selectedShoppingItems = [];

// Open shopping list creation modal
function createShoppingList() {
    const modal = document.getElementById('shopping-list-modal');
    modal.classList.add('active');
    
    // Reset state
    selectedShoppingItems = [];
    updateSelectedItemsDisplay();
    
    // Load available items
    loadAvailableItems();
}

// Load available items from inventory
function loadAvailableItems() {
    const container = document.getElementById('available-items-container');
    
    if (!window.groceryData || !window.groceryData.inventory) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No inventory data available</p>';
        return;
    }
    
    const inventory = window.groceryData.inventory;
    
    container.innerHTML = inventory.map(item => `
        <div class="available-item" data-item='${JSON.stringify(item)}' style="padding: 0.75rem; margin: 0.25rem 0; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border); border-radius: 8px; cursor: pointer; transition: var(--transition-fast); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 500; color: var(--text-primary);">${item.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.unit} • ₹${item.current_price}</div>
            </div>
            <button class="btn-icon" onclick="addItemToShoppingList(event, this)" style="background: var(--primary); color: white; padding: 0.5rem; border-radius: 6px;">
                <i class="fas fa-plus"></i>
            </button>
        </div>
    `).join('');
    
    // Add search functionality
    const searchInput = document.getElementById('shopping-item-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = container.querySelectorAll('.available-item');
        
        items.forEach(itemEl => {
            const itemData = JSON.parse(itemEl.dataset.item);
            const matches = itemData.name.toLowerCase().includes(query) || 
                          (itemData.category && itemData.category.toLowerCase().includes(query));
            itemEl.style.display = matches ? 'flex' : 'none';
        });
    });
}

// Add item to shopping list
function addItemToShoppingList(event, button) {
    event.stopPropagation();
    
    const itemEl = button.closest('.available-item');
    const itemData = JSON.parse(itemEl.dataset.item);
    
    // Check if already added
    if (selectedShoppingItems.some(i => i.name === itemData.name)) {
        alert('Item already added to shopping list');
        return;
    }
    
    // Add to selected items with default quantity
    selectedShoppingItems.push({
        name: itemData.name,
        unit: itemData.unit,
        qty: 1,
        unit_price: null,
        checked: false
    });
    
    updateSelectedItemsDisplay();
}

// Update selected items display
function updateSelectedItemsDisplay() {
    const container = document.getElementById('selected-items-list');
    const countEl = document.getElementById('selected-count');
    
    countEl.textContent = selectedShoppingItems.length;
    
    if (selectedShoppingItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No items selected. Search and click items below to add.</p>';
        return;
    }
    
    container.innerHTML = selectedShoppingItems.map((item, index) => `
        <div class="selected-item" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
            <div style="flex: 1;">
                <div style="font-weight: 500; color: var(--text-primary);">${item.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.unit}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <label style="font-size: 0.85rem; color: var(--text-secondary);">Qty:</label>
                <input type="number" value="${item.qty}" min="0.1" step="0.1" onchange="updateItemQuantity(${index}, this.value)" style="width: 80px; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); text-align: center;">
            </div>
            <button class="btn-icon" onclick="removeItemFromShoppingList(${index})" style="background: rgba(244, 63, 94, 0.2); color: var(--danger); padding: 0.5rem; border-radius: 6px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Update item quantity
function updateItemQuantity(index, value) {
    const qty = parseFloat(value);
    if (qty > 0) {
        selectedShoppingItems[index].qty = qty;
    }
}

// Remove item from shopping list
function removeItemFromShoppingList(index) {
    selectedShoppingItems.splice(index, 1);
    updateSelectedItemsDisplay();
}

// Save shopping list
async function saveShoppingList() {
    if (selectedShoppingItems.length === 0) {
        alert('Please add at least one item to the shopping list');
        return;
    }
    
    // Create shopping list object
    const now = new Date();
    const listId = `shopping_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const shoppingList = {
        id: listId,
        status: 'pending',
        created: now.toISOString(),
        items: selectedShoppingItems,
        total: null,
        completed_date: null
    };
    
    // Add to grocery data
    if (!window.groceryData.shopping_lists) {
        window.groceryData.shopping_lists = [];
    }
    
    window.groceryData.shopping_lists.push(shoppingList);
    
    // Save to localStorage (temporary until GitHub sync)
    localStorage.setItem('groceryData', JSON.stringify(window.groceryData));
    
    // Close modal
    closeShoppingModal();
    
    // Switch to shopping lists tab
    switchTab('shopping');
    
    alert('✅ Shopping list created successfully!');
}

// Close shopping modal
function closeShoppingModal() {
    const modal = document.getElementById('shopping-list-modal');
    modal.classList.remove('active');
    selectedShoppingItems = [];
}

// Modal event listeners
document.getElementById('close-shopping-modal').addEventListener('click', closeShoppingModal);
document.getElementById('cancel-shopping-list').addEventListener('click', closeShoppingModal);
document.getElementById('save-shopping-list').addEventListener('click', saveShoppingList);

// Make functions globally accessible
window.addItemToShoppingList = addItemToShoppingList;
window.updateItemQuantity = updateItemQuantity;
window.removeItemFromShoppingList = removeItemFromShoppingList;

// Update renderShoppingLists function
function renderShoppingLists() {
    const container = document.getElementById('shopping-lists-container');
    
    if (!window.groceryData.shopping_lists || window.groceryData.shopping_lists.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem;">No shopping lists yet</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Create your first shopping list to get started!</p>
            </div>
        `;
        return;
    }
    
    const lists = window.groceryData.shopping_lists;
    
    container.innerHTML = lists.map(list => {
        const statusBadge = list.status === 'pending' 
            ? '<span style="background: rgba(245, 158, 11, 0.2); color: var(--warning); padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">Pending</span>'
            : list.status === 'active'
            ? '<span style="background: rgba(59, 130, 246, 0.2); color: var(--info); padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">Active</span>'
            : '<span style="background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">Completed</span>';
        
        const createdDate = new Date(list.created).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        return `
            <div class="stat-card" style="padding: 1.5rem; cursor: pointer; transition: var(--transition);" onclick="openShoppingMode('${list.id}')">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">${list.id.replace('shopping_', 'Shopping List ')}</h3>
                        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">Created ${createdDate}</p>
                    </div>
                    ${statusBadge}
                </div>
                
                <div style="display: flex; gap: 2rem; margin-top: 1rem;">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">Items</div>
                        <div style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary);">${list.items.length}</div>
                    </div>
                    ${list.total ? `
                        <div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Total</div>
                            <div style="font-size: 1.2rem; font-weight: 600; color: var(--success);">₹${list.total}</div>
                        </div>
                    ` : ''}
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                    ${list.status === 'pending' 
                        ? '<button class="btn-primary" style="width: 100%; padding: 0.75rem;" onclick="event.stopPropagation(); startShopping(\'' + list.id + '\')"><i class="fas fa-shopping-cart"></i> Start Shopping</button>'
                        : list.status === 'active'
                        ? '<button class="btn-primary" style="width: 100%; padding: 0.75rem;" onclick="event.stopPropagation(); openShoppingMode(\'' + list.id + '\')"><i class="fas fa-edit"></i> Continue Shopping</button>'
                        : '<button class="btn-secondary" style="width: 100%; padding: 0.75rem;" onclick="event.stopPropagation(); viewCompletedList(\'' + list.id + '\')"><i class="fas fa-eye"></i> View Details</button>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Placeholder functions for Phase 3
function openShoppingMode(listId) {
    alert('Shopping mode coming in Phase 3!');
}

function startShopping(listId) {
    const list = window.groceryData.shopping_lists.find(l => l.id === listId);
    if (list) {
        list.status = 'active';
        localStorage.setItem('groceryData', JSON.stringify(window.groceryData));
        renderShoppingLists();
    }
}

function viewCompletedList(listId) {
    alert('View completed list details coming soon!');
}

// Make functions globally accessible
window.openShoppingMode = openShoppingMode;
window.startShopping = startShopping;
window.viewCompletedList = viewCompletedList;

// ========================================
// Shopping Mode Logic (Phase 3)
// ========================================

let currentShoppingList = null;

// Open shopping mode
function openShoppingMode(listId) {
    const list = window.groceryData.shopping_lists.find(l => l.id === listId);
    if (!list) {
        alert('Shopping list not found');
        return;
    }
    
    currentShoppingList = list;
    
    const modal = document.getElementById('shopping-mode-modal');
    const title = document.getElementById('shopping-mode-title');
    const subtitle = document.getElementById('shopping-mode-subtitle');
    
    title.textContent = list.id.replace('shopping_', 'Shopping - ');
    updateShoppingModeSubtitle();
    
    renderShoppingModeItems();
    modal.classList.add('active');
}

// Render shopping mode items
function renderShoppingModeItems() {
    const container = document.getElementById('shopping-mode-items');
    
    if (!currentShoppingList || !currentShoppingList.items) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No items in this list</p>';
        return;
    }
    
    container.innerHTML = currentShoppingList.items.map((item, index) => `
        <div class="shopping-item-card ${item.checked ? 'checked' : ''}" id="shopping-item-${index}">
            <div style="display: flex; gap: 1rem; align-items: start;">
                <div class="shopping-item-checkbox ${item.checked ? 'checked' : ''}" onclick="toggleShoppingItem(${index})"></div>
                
                <div class="shopping-item-info">
                    <div class="shopping-item-name">${item.name}</div>
                    <div class="shopping-item-details">Quantity: ${item.qty} ${item.unit}</div>
                    
                    <div class="shopping-item-price-input">
                        <label>Price per ${item.unit}:</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">₹</span>
                            <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                placeholder="0.00"
                                value="${item.unit_price || ''}"
                                onchange="updateItemPrice(${index}, this.value)"
                                style="padding-left: 2rem;"
                            >
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    updateShoppingModeTotal();
}

// Toggle shopping item checked state
function toggleShoppingItem(index) {
    if (!currentShoppingList) return;
    
    currentShoppingList.items[index].checked = !currentShoppingList.items[index].checked;
    
    // Update UI
    const card = document.getElementById(`shopping-item-${index}`);
    const checkbox = card.querySelector('.shopping-item-checkbox');
    
    if (currentShoppingList.items[index].checked) {
        card.classList.add('checked');
        checkbox.classList.add('checked');
    } else {
        card.classList.remove('checked');
        checkbox.classList.remove('checked');
    }
    
    updateShoppingModeSubtitle();
    
    // Save to localStorage
    localStorage.setItem('groceryData', JSON.stringify(window.groceryData));
}

// Update item price
function updateItemPrice(index, value) {
    if (!currentShoppingList) return;
    
    const price = parseFloat(value);
    currentShoppingList.items[index].unit_price = price > 0 ? price : null;
    
    updateShoppingModeTotal();
    
    // Save to localStorage
    localStorage.setItem('groceryData', JSON.stringify(window.groceryData));
}

// Update shopping mode subtitle
function updateShoppingModeSubtitle() {
    if (!currentShoppingList) return;
    
    const subtitle = document.getElementById('shopping-mode-subtitle');
    const checkedCount = currentShoppingList.items.filter(i => i.checked).length;
    const totalCount = currentShoppingList.items.length;
    
    subtitle.textContent = `${checkedCount} of ${totalCount} items checked`;
}

// Update shopping mode total
function updateShoppingModeTotal() {
    if (!currentShoppingList) return;
    
    const totalEl = document.getElementById('shopping-mode-total');
    
    let total = 0;
    currentShoppingList.items.forEach(item => {
        if (item.unit_price && item.unit_price > 0) {
            total += item.unit_price * item.qty;
        }
    });
    
    totalEl.textContent = `₹${Math.round(total)}`;
    currentShoppingList.total = Math.round(total);
}

// Complete shopping
async function completeShopping() {
    if (!currentShoppingList) return;
    
    // Check if all items have prices
    const missingPrices = currentShoppingList.items.filter(i => !i.unit_price || i.unit_price <= 0);
    
    if (missingPrices.length > 0) {
        const confirm = window.confirm(`${missingPrices.length} items don't have prices yet. Complete shopping anyway?`);
        if (!confirm) return;
    }
    
    // Calculate total
    let total = 0;
    currentShoppingList.items.forEach(item => {
        if (item.unit_price && item.unit_price > 0) {
            total += item.unit_price * item.qty;
        }
    });
    
    // Create history entry
    const historyEntry = {
        id: currentShoppingList.id.replace('shopping_', ''),
        items: currentShoppingList.items.map(item => ({
            name: item.name,
            qty: item.qty,
            cost: (item.unit_price || 0) * item.qty
        })),
        total: Math.round(total)
    };
    
    // Add to history
    if (!window.groceryData.history) {
        window.groceryData.history = [];
    }
    window.groceryData.history.push(historyEntry);
    
    // Update inventory prices
    currentShoppingList.items.forEach(item => {
        if (item.unit_price && item.unit_price > 0) {
            const inventoryItem = window.groceryData.inventory.find(i => i.name === item.name);
            if (inventoryItem) {
                inventoryItem.current_price = item.unit_price;
            }
        }
    });
    
    // Mark shopping list as completed
    currentShoppingList.status = 'completed';
    currentShoppingList.completed_date = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem('groceryData', JSON.stringify(window.groceryData));
    
    // Close modal
    closeShoppingMode();
    
    // Switch to history tab
    switchTab('history');
    
    // Refresh UI
    renderUI();
    renderStats();
    
    alert(`✅ Shopping completed! Total: ₹${Math.round(total)}\n\nAdded to grocery history.`);
}

// Close shopping mode
function closeShoppingMode() {
    const modal = document.getElementById('shopping-mode-modal');
    modal.classList.remove('active');
    currentShoppingList = null;
}

// Event listeners
document.getElementById('close-shopping-mode').addEventListener('click', closeShoppingMode);
document.getElementById('complete-shopping-btn').addEventListener('click', completeShopping);

// Make functions globally accessible
window.toggleShoppingItem = toggleShoppingItem;
window.updateItemPrice = updateItemPrice;
