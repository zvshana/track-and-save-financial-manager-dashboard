
/* expenses array lives on window (set by main.js) */
let chartInstances = {};

/* ─── Flatpickr date picker ─── */
let expDatePicker;
document.addEventListener('DOMContentLoaded', () => {
    expDatePicker = flatpickr('#exp-date', {
        dateFormat: 'd/m/Y',
        maxDate: 'today',
        defaultDate: 'today'
    });
});

/* ─── Modal open/close ─── */
const expModal    = document.getElementById('expenseModal');
const openExpBtn  = document.getElementById('openExpenseModal');
const closeExpBtn = document.getElementById('closeExpenseModal');

openExpBtn.addEventListener('click', () => {
    expModal.classList.add('open');
    document.getElementById('exp-amount').focus();
});
closeExpBtn.addEventListener('click', closeExpModal);
expModal.addEventListener('click', e => { if (e.target === expModal) closeExpModal(); });
function closeExpModal() {
    expModal.classList.remove('open');
    document.getElementById('expenseForm').reset();
    clearErrors();
    document.getElementById('exp-preview').textContent = '';
    if (expDatePicker) expDatePicker.setDate('today');
}

/* ─── Live ILS preview ─── */
document.getElementById('exp-amount').addEventListener('input', updateExpPreview);
document.getElementById('exp-currency').addEventListener('change', updateExpPreview);
function updateExpPreview() {
    const amt  = parseFloat(document.getElementById('exp-amount').value);
    const cur  = document.getElementById('exp-currency').value;
    const prev = document.getElementById('exp-preview');
    if (!amt || isNaN(amt)) { prev.textContent = ''; return; }
    if (cur === 'ILS') { prev.textContent = `= ₪ ${window.fmt(amt)}`; return; }
    const ils = window.toILS(amt, cur);
    prev.textContent = `≈ ₪ ${window.fmt(ils)} (at current rate)`;
}

/* ─── Form submit ─── */
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateExpForm()) return;

    const amount   = parseFloat(document.getElementById('exp-amount').value);
    const currency = document.getElementById('exp-currency').value;
    const dateVal  = document.getElementById('exp-date').value || new Date().toLocaleDateString();

    const entry = {
        id:        Date.now() + Math.random(),
        category:  document.getElementById('exp-category').value,
        method:    document.getElementById('exp-method').value,
        amount,
        currency,
        symbol:    window.symbolFor(currency),
        amountILS: window.toILS(amount, currency),
        date:      dateVal,
        note:      document.getElementById('exp-note').value.trim()
    };

    window.expenses.push(entry);
    window.saveToStorage();
    updateExpensesUI();
    window.logActivity('expense', `Added ${entry.category}: −${entry.symbol}${entry.amount.toFixed(2)}`);
    window.updateOverviewDashboard();
    closeExpModal();
});

/* ─── Validation ─── */
function validateExpForm() {
    let ok = true;
    clearErrors();
    const amt = parseFloat(document.getElementById('exp-amount').value);
    if (!amt || amt <= 0) {
        showError('exp-amount', 'exp-amount-err', 'Please enter a valid amount greater than 0.');
        ok = false;
    }
    return ok;
}
function showError(fieldId, errId, msg) {
    document.getElementById(fieldId).classList.add('invalid');
    document.getElementById(errId).textContent = msg;
}
function clearErrors() {
    document.getElementById('exp-amount').classList.remove('invalid');
    document.getElementById('exp-amount-err').textContent = '';
}

/* ─── Delete entry (SweetAlert2) ─── */
window.deleteExpense = async function(id) {
    const result = await Swal.fire({
        title: 'Delete this expense?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;
    window.expenses = window.expenses.filter(e => e.id !== id);
    window.saveToStorage();
    updateExpensesUI();
    window.updateOverviewDashboard();
};

/* ─── Filter + Search + Sort ─── */
window.updateExpensesUI = function() {
    const fMethod   = document.getElementById('filter-method').value;
    const fCurrency = document.getElementById('filter-currency').value;
    const fCategory = document.getElementById('filter-category').value;
    const search    = (document.getElementById('expense-search').value || '').toLowerCase();
    const sort      = document.getElementById('expense-sort').value;

    let filtered = window.expenses.filter(ex =>
        (fMethod   === 'ALL' || ex.method   === fMethod)   &&
        (fCurrency === 'ALL' || ex.currency === fCurrency) &&
        (fCategory === 'ALL' || ex.category === fCategory) &&
        (!search || ex.category.toLowerCase().includes(search) ||
                    ex.note.toLowerCase().includes(search) ||
                    ex.method.toLowerCase().includes(search))
    );

    filtered = sortEntries(filtered, sort);
    renderExpenseTable(filtered);
    renderExpensesCharts(filtered);
};

function sortEntries(arr, mode) {
    return [...arr].sort((a, b) => {
        if (mode === 'date-desc')   return parseDate(b.date) - parseDate(a.date);
        if (mode === 'date-asc')    return parseDate(a.date) - parseDate(b.date);
        if (mode === 'amount-desc') return b.amountILS - a.amountILS;
        if (mode === 'amount-asc')  return a.amountILS - b.amountILS;
        return 0;
    });
}

function parseDate(str) {
    // supports d/m/Y and locale strings
    const parts = str.split(/[\/\.\-]/);
    if (parts.length === 3) {
        // try d/m/Y
        const d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
        if (!isNaN(d)) return d;
    }
    return new Date(str);
}

/* ─── Render Table ─── */
function renderExpenseTable(data) {
    const tbody = document.getElementById('expenseBody');
    const emptyRow = document.getElementById('expense-empty-row');

    // Remove all non-empty rows
    tbody.querySelectorAll('tr:not(#expense-empty-row)').forEach(r => r.remove());

    if (data.length === 0) {
        emptyRow.style.display = '';
        document.getElementById('total-expense-sum').textContent = '0.00';
        return;
    }
    emptyRow.style.display = 'none';

    let sum = 0;
    data.forEach(ex => {
        sum += ex.amountILS;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="category-badge">${ex.category}</span></td>
            <td>${ex.method}</td>
            <td style="font-weight:700;color:var(--clr-expense);">${ex.symbol}${ex.amount.toFixed(2)}</td>
            <td style="color:var(--clr-muted);font-size:13px;">${ex.date}</td>
            <td style="color:var(--clr-muted);font-size:13px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(ex.note)}">${escHtml(ex.note) || '—'}</td>
            <td><button class="delete-row-btn" onclick="deleteExpense(${ex.id})" title="Delete">🗑</button></td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('total-expense-sum').textContent = window.fmt(sum);
}

/* ─── Charts ─── */
const PALETTE = ['#818cf8','#34d399','#fb923c','#f472b6','#60a5fa','#a78bfa','#4ade80','#fbbf24'];

function renderExpensesCharts(data) {
    renderDonut('methodChart',   'method',   data);
    renderDonut('currencyChart', 'symbol',   data);
    renderBar  ('categoryChart', 'category', data);
}

function renderDonut(canvasId, key, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    const grouped = groupBy(data, key);

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

    if (Object.keys(grouped).length === 0) {
        chartInstances[canvasId] = null;
        return;
    }

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                data: Object.values(grouped),
                backgroundColor: PALETTE,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 8 } },
                tooltip: { callbacks: { label: c => ' ₪' + window.fmt(c.raw) } }
            }
        }
    });
}

function renderBar(canvasId, key, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    const grouped = groupBy(data, key);

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

    if (Object.keys(grouped).length === 0) {
        chartInstances[canvasId] = null;
        return;
    }

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                label: 'Total (₪)',
                data: Object.values(grouped),
                backgroundColor: PALETTE,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ' ₪' + window.fmt(c.raw) } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f2f7' }, ticks: { font: { family: 'DM Sans' } } },
                x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, maxRotation: 30 } }
            }
        }
    });
}

/* ─── Helpers ─── */
function groupBy(arr, key) {
    const result = {};
    arr.forEach(d => { result[d[key]] = (result[d[key]] || 0) + d.amountILS; });
    return result;
}
function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Public getter ─── */
window.getExpensesSum = function() {
    return window.expenses.reduce((s, e) => s + e.amountILS, 0);
};

/* ─── Wire filters / search / sort ─── */
document.addEventListener('DOMContentLoaded', () => {
    ['filter-method','filter-currency','filter-category','expense-sort'].forEach(id => {
        document.getElementById(id).addEventListener('change', window.updateExpensesUI);
    });
    document.getElementById('expense-search').addEventListener('input', window.updateExpensesUI);

    // Render initially (data may already be loaded from localStorage)
    window.updateExpensesUI();
});
