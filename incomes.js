let incomeChartInstances = {};

/* ─── Flatpickr ─── */
let incDatePicker;
document.addEventListener('DOMContentLoaded', () => {
    incDatePicker = flatpickr('#inc-date', {
        dateFormat: 'd/m/Y',
        maxDate: 'today',
        defaultDate: 'today'
    });
});

/* ─── Modal open/close ─── */
const incModal    = document.getElementById('incomeModal');
const openIncBtn  = document.getElementById('openIncomeModal');
const closeIncBtn = document.getElementById('closeIncomeModal');

openIncBtn.addEventListener('click', () => {
    incModal.classList.add('open');
    document.getElementById('inc-amount').focus();
});
closeIncBtn.addEventListener('click', closeIncModal);
incModal.addEventListener('click', e => { if (e.target === incModal) closeIncModal(); });
function closeIncModal() {
    incModal.classList.remove('open');
    document.getElementById('incomeForm').reset();
    clearIncErrors();
    document.getElementById('inc-preview').textContent = '';
    if (incDatePicker) incDatePicker.setDate('today');
}

/* ─── Live ILS preview ─── */
document.getElementById('inc-amount').addEventListener('input', updateIncPreview);
document.getElementById('inc-currency').addEventListener('change', updateIncPreview);
function updateIncPreview() {
    const amt  = parseFloat(document.getElementById('inc-amount').value);
    const cur  = document.getElementById('inc-currency').value;
    const prev = document.getElementById('inc-preview');
    if (!amt || isNaN(amt)) { prev.textContent = ''; return; }
    if (cur === 'ILS') { prev.textContent = `= ₪ ${window.fmt(amt)}`; return; }
    const ils = window.toILS(amt, cur);
    prev.textContent = `≈ ₪ ${window.fmt(ils)} (at current rate)`;
}

/* ─── Form submit ─── */
document.getElementById('incomeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateIncForm()) return;

    const amount   = parseFloat(document.getElementById('inc-amount').value);
    const currency = document.getElementById('inc-currency').value;
    const dateVal  = document.getElementById('inc-date').value || new Date().toLocaleDateString();

    const entry = {
        id:        Date.now() + Math.random(),
        category:  document.getElementById('inc-category').value,
        method:    document.getElementById('inc-method').value,
        amount,
        currency,
        symbol:    window.symbolFor(currency),
        amountILS: window.toILS(amount, currency),
        date:      dateVal,
        note:      document.getElementById('inc-note').value.trim()
    };

    window.incomes.push(entry);
    window.saveToStorage();
    updateIncomesUI();
    window.logActivity('income', `Added ${entry.category}: +${entry.symbol}${entry.amount.toFixed(2)}`);
    window.updateOverviewDashboard();
    closeIncModal();
});

/* ─── Validation ─── */
function validateIncForm() {
    let ok = true;
    clearIncErrors();
    const amt = parseFloat(document.getElementById('inc-amount').value);
    if (!amt || amt <= 0) {
        showIncError('inc-amount', 'inc-amount-err', 'Please enter a valid amount greater than 0.');
        ok = false;
    }
    return ok;
}
function showIncError(fieldId, errId, msg) {
    document.getElementById(fieldId).classList.add('invalid');
    document.getElementById(errId).textContent = msg;
}
function clearIncErrors() {
    document.getElementById('inc-amount').classList.remove('invalid');
    document.getElementById('inc-amount-err').textContent = '';
}

/* ─── Delete (SweetAlert2) ─── */
window.deleteIncome = async function(id) {
    const result = await Swal.fire({
        title: 'Delete this income?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;
    window.incomes = window.incomes.filter(i => i.id !== id);
    window.saveToStorage();
    updateIncomesUI();
    window.updateOverviewDashboard();
};

/* ─── Filter + Search + Sort ─── */
window.updateIncomesUI = function() {
    const fMethod   = document.getElementById('filter-income-method').value;
    const fCurrency = document.getElementById('filter-income-currency').value;
    const fCategory = document.getElementById('filter-income-category').value;
    const search    = (document.getElementById('income-search').value || '').toLowerCase();
    const sort      = document.getElementById('income-sort').value;

    let filtered = window.incomes.filter(inc =>
        (fMethod   === 'ALL' || inc.method   === fMethod)   &&
        (fCurrency === 'ALL' || inc.currency === fCurrency) &&
        (fCategory === 'ALL' || inc.category === fCategory) &&
        (!search || inc.category.toLowerCase().includes(search) ||
                    inc.note.toLowerCase().includes(search) ||
                    inc.method.toLowerCase().includes(search))
    );

    filtered = sortIncEntries(filtered, sort);
    renderIncomeTable(filtered);
    renderIncomeCharts(filtered);
};

function sortIncEntries(arr, mode) {
    return [...arr].sort((a, b) => {
        if (mode === 'date-desc')   return parseDateInc(b.date) - parseDateInc(a.date);
        if (mode === 'date-asc')    return parseDateInc(a.date) - parseDateInc(b.date);
        if (mode === 'amount-desc') return b.amountILS - a.amountILS;
        if (mode === 'amount-asc')  return a.amountILS - b.amountILS;
        return 0;
    });
}

function parseDateInc(str) {
    const parts = str.split(/[\/\.\-]/);
    if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
        if (!isNaN(d)) return d;
    }
    return new Date(str);
}

/* ─── Render Table ─── */
function renderIncomeTable(data) {
    const tbody    = document.getElementById('incomeBody');
    const emptyRow = document.getElementById('income-empty-row');

    tbody.querySelectorAll('tr:not(#income-empty-row)').forEach(r => r.remove());

    if (data.length === 0) {
        emptyRow.style.display = '';
        document.getElementById('total-income-sum').textContent = '0.00';
        return;
    }
    emptyRow.style.display = 'none';

    let sum = 0;
    data.forEach(inc => {
        sum += inc.amountILS;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="category-badge" style="background:var(--clr-income-lt);color:var(--clr-income);">${inc.category}</span></td>
            <td>${inc.method}</td>
            <td style="font-weight:700;color:var(--clr-income);">+${inc.symbol}${inc.amount.toFixed(2)}</td>
            <td style="color:var(--clr-muted);font-size:13px;">${inc.date}</td>
            <td style="color:var(--clr-muted);font-size:13px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtmlInc(inc.note)}">${escHtmlInc(inc.note) || '—'}</td>
            <td><button class="delete-row-btn" onclick="deleteIncome(${inc.id})" title="Delete">🗑</button></td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('total-income-sum').textContent = window.fmt(sum);
}

/* ─── Charts ─── */
const INC_PALETTE = ['#34d399','#60a5fa','#a78bfa','#fbbf24','#fb923c','#f472b6','#4ade80','#818cf8'];

function renderIncomeCharts(data) {
    renderIncDonut('incomeMethodChart',   'method',   data);
    renderIncDonut('incomeCurrencyChart', 'symbol',   data);
    renderIncBar  ('incomeCategoryChart', 'category', data);
}

function renderIncDonut(canvasId, key, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    const grouped = groupByInc(data, key);

    if (incomeChartInstances[canvasId]) incomeChartInstances[canvasId].destroy();
    if (Object.keys(grouped).length === 0) { incomeChartInstances[canvasId] = null; return; }

    incomeChartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                data: Object.values(grouped),
                backgroundColor: INC_PALETTE,
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

function renderIncBar(canvasId, key, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    const grouped = groupByInc(data, key);

    if (incomeChartInstances[canvasId]) incomeChartInstances[canvasId].destroy();
    if (Object.keys(grouped).length === 0) { incomeChartInstances[canvasId] = null; return; }

    incomeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                label: 'Total (₪)',
                data: Object.values(grouped),
                backgroundColor: INC_PALETTE,
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
function groupByInc(arr, key) {
    const result = {};
    arr.forEach(d => { result[d[key]] = (result[d[key]] || 0) + d.amountILS; });
    return result;
}
function escHtmlInc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Public getter ─── */
window.getIncomesSum = function() {
    return window.incomes.reduce((s, i) => s + i.amountILS, 0);
};

/* ─── Wire filters ─── */
document.addEventListener('DOMContentLoaded', () => {
    ['filter-income-method','filter-income-currency','filter-income-category','income-sort'].forEach(id => {
        document.getElementById(id).addEventListener('change', window.updateIncomesUI);
    });
    document.getElementById('income-search').addEventListener('input', window.updateIncomesUI);

    window.updateIncomesUI();
});
