/* ─── Shared Currency State ─── */
window.appRates = { ILS: 1, USD: 3.6, EUR: 3.9, GBP: 4.5, JPY: 0.025, CAD: 2.65, AUD: 2.35, CHF: 4.0, CNY: 0.5, HKD: 0.46, NZD: 2.15, SEK: 0.35, SGD: 2.7 };
window.ratesLoaded = false;

const CURRENCY_SYMBOLS = {
    ILS:"₪", USD:"$", EUR:"€", GBP:"£", JPY:"¥",
    CAD:"C$", AUD:"A$", CHF:"CHF", CNY:"¥",
    HKD:"HK$", NZD:"NZ$", SEK:"kr", SGD:"S$"
};

/* Convert any amount in given currency to ILS */
window.toILS = function(amount, currency) {
    if (currency === 'ILS') return amount;
    const rate = window.appRates[currency];
    if (!rate || rate === 0) return amount;
    return amount / rate;
};

window.symbolFor = function(currency) {
    return CURRENCY_SYMBOLS[currency] || currency;
};

/* ─── Fetch Exchange Rates ─── */
async function fetchCurrencyRates() {
    const badge = document.getElementById('rate-badge');
    const dot   = badge.querySelector('.rate-dot');
    const label = document.getElementById('rate-status');

    try {
        const res  = await fetch('https://open.er-api.com/v6/latest/ILS');
        const data = await res.json();
        if (data && data.rates) {
            window.appRates  = data.rates;
            window.appRates.ILS = 1;
            window.ratesLoaded  = true;
            const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            label.textContent = `Rates live · ${ts}`;
            dot.className = 'rate-dot live';
            
            // Update the exchange chart once rates are fetched
            if (typeof updateExchangeRatesChart === 'function') updateExchangeRatesChart();
        }
    } catch(e) {
        label.textContent = 'Using cached rates';
        dot.className = 'rate-dot error';
        if (typeof updateExchangeRatesChart === 'function') updateExchangeRatesChart();
    }
}

/* ─── Tab Navigation ─── */
window.openTab = function(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
    if (tabName === 'Overview') updateOverviewDashboard();
};

/* ─── Overview Dashboard ─── */
window.updateOverviewDashboard = function() {
    const incSum  = typeof getIncomesSum  === 'function' ? getIncomesSum()  : 0;
    const expSum  = typeof getExpensesSum === 'function' ? getExpensesSum() : 0;
    const savSum  = typeof getSavingsSum  === 'function' ? getSavingsSum()  : 0;
    const net     = incSum - expSum;

    /* Stat cards */
    document.getElementById('ov-income').textContent  = fmt(incSum);
    document.getElementById('ov-expense').textContent = fmt(expSum);
    document.getElementById('ov-savings').textContent = fmt(savSum);

    const netEl = document.getElementById('ov-net-full');
    netEl.textContent = (net >= 0 ? '+' : '') + '₪ ' + fmt(Math.abs(net));
    netEl.style.color = net >= 0
        ? 'var(--clr-net-pos)'
        : 'var(--clr-net-neg)';

    const incLen = typeof window.incomes !== 'undefined' ? window.incomes.length : 0;
    const expLen = typeof window.expenses !== 'undefined' ? window.expenses.length : 0;
    document.getElementById('ov-income-count').textContent  = incLen + ' entr' + (incLen === 1 ? 'y' : 'ies');
    document.getElementById('ov-expense-count').textContent = expLen + ' entr' + (expLen === 1 ? 'y' : 'ies');

    const goalsActive = typeof window.savingsGoals !== 'undefined'
        ? window.savingsGoals.filter(g => g.saved < g.target).length : 0;
    document.getElementById('ov-goals-count').textContent = goalsActive + ' active goal' + (goalsActive === 1 ? '' : 's');

    updateOverviewChart(incSum, expSum);
    updateExchangeRatesChart(); // הוספנו את קריאת הגרף הקווי
    updateOvGoals();
};

/* ─── Comparison Bar Chart (Main Overview) ─── */
let overviewChart = null;
function updateOverviewChart(income, expense) {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (overviewChart) overviewChart.destroy();

    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses', 'Net Balance'],
            datasets: [{
                data: [income, expense, Math.max(0, income - expense)],
                backgroundColor: ['#dcfce7', '#fee2e2', '#ede9fc'],
                borderColor:     ['#16a34a', '#dc2626', '#4f35c2'],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => '  ₪ ' + fmt(c.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f2f7' },
                    ticks: { callback: v => '₪' + fmtShort(v), font: { family: 'DM Sans' } }
                },
                x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', weight: '600' } } }
            }
        }
    });
}

/* ─── Live Exchange Rates Chart (API Integration - Line Chart) ─── */
let exchangeChart = null;
window.updateExchangeRatesChart = function() {
    const canvas = document.getElementById('exchangeRatesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rates = window.appRates;
    
    // Select specific currencies to showcase
    const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY'];
    const labels = [];
    const dataPoints = [];

    currencies.forEach(c => {
        const r = rates[c];
        if (r && r > 0) {
            if (c === 'JPY') {
                labels.push('¥ 100 JPY');
                dataPoints.push(100 / r);
            } else {
                labels.push(window.symbolFor(c) + ' ' + c);
                dataPoints.push(1 / r);
            }
        }
    });

    if (exchangeChart) exchangeChart.destroy();

    exchangeChart = new Chart(ctx, {
        type: 'line', // שינוי לגרף קווי
        data: {
            labels: labels,
            datasets: [{
                label: 'Value in ILS (₪)',
                data: dataPoints,
                borderColor: '#0284c7',      
                backgroundColor: 'rgba(2, 132, 199, 0.1)', 
                fill: true,                  
                tension: 0.3,                
                pointBackgroundColor: '#0284c7', 
                pointBorderColor: '#fff',    
                pointBorderWidth: 2,         
                pointRadius: 4               
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => ' ₪ ' + c.raw.toFixed(2)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false, // בגרף קווי עדיף לא תמיד להתחיל מאפס כדי לראות הבדלים
                    grid: { color: '#f0f2f7' },
                    ticks: { font: { family: 'DM Sans' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'DM Sans', size: 10, weight: '500' } }
                }
            }
        }
    });
};

/* ─── Goals Overview ─── */
function updateOvGoals() {
    const el    = document.getElementById('ov-goals-list');
    const goals = typeof window.savingsGoals !== 'undefined' ? window.savingsGoals : [];
    if (goals.length === 0) {
        el.innerHTML = '<div class="empty-state-small">No goals yet</div>';
        return;
    }
    el.innerHTML = goals.slice(0,4).map(g => {
        const pct  = Math.min(100, g.target > 0 ? (g.saved / g.target * 100) : 0);
        const done = g.saved >= g.target;
        return `
        <div class="ov-goal-item">
            <div class="ov-goal-row">
                <span class="ov-goal-name">${g.emoji} ${g.name}</span>
                <span class="ov-goal-pct">${pct.toFixed(0)}%</span>
            </div>
            <div class="ov-progress-track">
                <div class="ov-progress-fill ${done?'complete':''}" style="width:${pct}%"></div>
            </div>
        </div>`;
    }).join('');
}

/* ─── Activity Feed ─── */
window.logActivity = function(type, text) {
    const list = document.getElementById('activity-list');
    list.querySelectorAll('.empty-state-small').forEach(e => e.remove());

    const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML = `
        <span class="activity-dot ${type}"></span>
        <span>${text}</span>
        <span class="activity-time">${now}</span>`;
    list.prepend(li);

    const items = list.querySelectorAll('.activity-item');
    if (items.length > 20) items[items.length - 1].remove();
};

document.getElementById('clearActivityBtn').addEventListener('click', () => {
    document.getElementById('activity-list').innerHTML = '<li class="empty-state-small">No activities recorded yet.</li>';
});

/* ─── Export to JSON ─── */
document.getElementById('exportBtn').addEventListener('click', () => {
    const data = {
        exportedAt: new Date().toISOString(),
        expenses:   typeof window.expenses !== 'undefined' ? window.expenses : [],
        incomes:    typeof window.incomes  !== 'undefined' ? window.incomes  : [],
        goals:      typeof window.savingsGoals !== 'undefined' ? window.savingsGoals : []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'track-and-save-export.json';
    a.click();
    URL.revokeObjectURL(url);
});

/* ─── Personal Details (SweetAlert2) ─── */
document.getElementById('detailsBtn').addEventListener('click', () => {
    Swal.fire({
        title: 'Personal Details',
        html: `
            <div style="text-align:center;font-family:'DM Sans',sans-serif;line-height:1.8; font-size:16px;">
                <strong>Developer:</strong> Sara Shana Zivi<br>
                <strong>ID:</strong> 209941152
            </div>`,
        confirmButtonText: 'Close',
        confirmButtonColor: '#4f35c2',
        width: 350
    });
});

/* ─── Reset Data (SweetAlert2) ─── */
document.getElementById('resetBtn').addEventListener('click', async () => {
    const result = await Swal.fire({
        title: 'Reset All Data?',
        text: 'Are you sure? This will permanently delete all your incomes, expenses, and savings goals. This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, reset everything',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        reverseButtons: true
    });
    
    if (!result.isConfirmed) return;

    window.expenses = [];
    window.incomes = [];
    window.savingsGoals = [];

    localStorage.removeItem('ts_expenses');
    localStorage.removeItem('ts_incomes');
    localStorage.removeItem('ts_goals');

    if (typeof updateExpensesUI === 'function') updateExpensesUI();
    if (typeof updateIncomesUI  === 'function') updateIncomesUI();
    if (typeof renderGoals      === 'function') renderGoals();
    updateOverviewDashboard();
    
    document.getElementById('activity-list').innerHTML = '<li class="empty-state-small">No activities recorded yet.</li>';

    Swal.fire({ title: 'Data Reset Successfully!', icon: 'success', timer: 1500, showConfirmButton: false });
});

/* ─── Persist to localStorage ─── */
window.saveToStorage = function() {
    try {
        localStorage.setItem('ts_expenses', JSON.stringify(window.expenses || []));
        localStorage.setItem('ts_incomes',  JSON.stringify(window.incomes  || []));
        localStorage.setItem('ts_goals',    JSON.stringify(window.savingsGoals || []));
    } catch(e) { }
};

window.loadFromStorage = function() {
    try {
        const exp  = localStorage.getItem('ts_expenses');
        const inc  = localStorage.getItem('ts_incomes');
        const gls  = localStorage.getItem('ts_goals');
        if (exp) window.expenses      = JSON.parse(exp);
        if (inc) window.incomes       = JSON.parse(inc);
        if (gls) window.savingsGoals  = JSON.parse(gls);
    } catch(e) { }
};

/* ─── Formatting Helpers ─── */
window.fmt = function(n) {
    return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
function fmtShort(n) {
    if (n >= 1000) return (n/1000).toFixed(1) + 'k';
    return n.toFixed(0);
}

/* ─── Init ─── */
window.expenses     = [];
window.incomes      = [];
window.savingsGoals = [];

window.addEventListener('DOMContentLoaded', () => {
    fetchCurrencyRates();
    window.loadFromStorage();
    updateOverviewDashboard();
});