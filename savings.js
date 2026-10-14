/* savingsGoals array lives on window (set by main.js) */

/* ─── Flatpickr for goal deadline ─── */
let goalDeadlinePicker;
document.addEventListener('DOMContentLoaded', () => {
    goalDeadlinePicker = flatpickr('#goal-deadline', {
        dateFormat: 'd/m/Y',
        minDate: 'today'
    });
});

/* ─── Emoji Picker ─── */
document.querySelectorAll('.emoji-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('goal-emoji').value = opt.dataset.emoji;
    });
});

/* ─── Goal Modal ─── */
const goalModal    = document.getElementById('goalModal');
const openGoalBtn  = document.getElementById('openGoalModal');
const closeGoalBtn = document.getElementById('closeGoalModal');

openGoalBtn.addEventListener('click', () => {
    goalModal.classList.add('open');
    document.getElementById('goal-name').focus();
});
closeGoalBtn.addEventListener('click', closeGoalModal);
goalModal.addEventListener('click', e => { if (e.target === goalModal) closeGoalModal(); });
function closeGoalModal() {
    goalModal.classList.remove('open');
    document.getElementById('goalForm').reset();
    clearGoalErrors();
    // Reset emoji picker
    document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
    document.querySelector('.emoji-opt[data-emoji="🎯"]').classList.add('selected');
    document.getElementById('goal-emoji').value = '🎯';
    if (goalDeadlinePicker) goalDeadlinePicker.clear();
}

/* ─── Goal Form Submit ─── */
document.getElementById('goalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateGoalForm()) return;

    const name    = document.getElementById('goal-name').value.trim();
    const target  = parseFloat(document.getElementById('goal-target').value);
    const initial = parseFloat(document.getElementById('goal-initial').value) || 0;
    const emoji   = document.getElementById('goal-emoji').value;
    const deadline = document.getElementById('goal-deadline').value;

    const goal = {
        id:       Date.now() + Math.random(),
        name,
        target,
        saved:    Math.min(initial, target),
        emoji,
        deadline,
        deposits: initial > 0 ? [{ amount: initial, note: 'Initial deposit', date: new Date().toLocaleDateString() }] : []
    };

    window.savingsGoals.push(goal);
    window.saveToStorage();
    renderGoals();
    updateSavingsSummary();
    window.logActivity('savings', `New goal created: ${emoji} ${name} (target ₪${window.fmt(target)})`);
    window.updateOverviewDashboard();
    closeGoalModal();
});

/* ─── Validation ─── */
function validateGoalForm() {
    let ok = true;
    clearGoalErrors();
    const name   = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    if (!name) {
        showGoalError('goal-name', 'goal-name-err', 'Please enter a goal name.');
        ok = false;
    }
    if (!target || target <= 0) {
        showGoalError('goal-target', 'goal-target-err', 'Please enter a target amount greater than 0.');
        ok = false;
    }
    return ok;
}
function showGoalError(fieldId, errId, msg) {
    document.getElementById(fieldId).classList.add('invalid');
    document.getElementById(errId).textContent = msg;
}
function clearGoalErrors() {
    ['goal-name','goal-target'].forEach(id => document.getElementById(id).classList.remove('invalid'));
    ['goal-name-err','goal-target-err'].forEach(id => document.getElementById(id).textContent = '');
}

/* ─── Deposit Modal ─── */
const depositModal    = document.getElementById('depositModal');
const closeDepositBtn = document.getElementById('closeDepositModal');

closeDepositBtn.addEventListener('click', closeDepositModal);
depositModal.addEventListener('click', e => { if (e.target === depositModal) closeDepositModal(); });
function closeDepositModal() {
    depositModal.classList.remove('open');
    document.getElementById('depositForm').reset();
    document.getElementById('deposit-amount-err').textContent = '';
}

window.openDepositModal = function(goalId) {
    const goal = window.savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    document.getElementById('deposit-goal-id').value   = goalId;
    document.getElementById('deposit-goal-name').textContent = `Into: ${goal.emoji} ${goal.name} — ₪${window.fmt(goal.saved)} / ₪${window.fmt(goal.target)}`;
    depositModal.classList.add('open');
    document.getElementById('deposit-amount').focus();
};

document.getElementById('depositForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('deposit-amount').value);
    if (!amt || amt <= 0) {
        document.getElementById('deposit-amount-err').textContent = 'Enter a valid amount.';
        return;
    }

    const goalId = parseFloat(document.getElementById('deposit-goal-id').value);
    const goal   = window.savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    const note = document.getElementById('deposit-note').value.trim();
    const deposit = { amount: amt, note, date: new Date().toLocaleDateString() };
    goal.deposits = goal.deposits || [];
    goal.deposits.push(deposit);
    goal.saved = Math.min(goal.target, goal.saved + amt);

    const wasComplete = goal.saved >= goal.target;

    window.saveToStorage();
    renderGoals();
    updateSavingsSummary();
    window.logActivity('savings', `Deposited ₪${window.fmt(amt)} into ${goal.emoji} ${goal.name}`);
    window.updateOverviewDashboard();
    closeDepositModal();

    if (wasComplete) {
        setTimeout(() => {
            Swal.fire({
                title: '🎉 Goal Reached!',
                html: `<strong>${goal.emoji} ${goal.name}</strong> is now complete!<br>You saved ₪${window.fmt(goal.target)}.`,
                icon: 'success',
                confirmButtonColor: '#16a34a'
            });
        }, 300);
    }
});

/* ─── Delete Goal ─── */
window.deleteGoal = async function(goalId) {
    const goal = window.savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    const result = await Swal.fire({
        title: `Delete "${goal.name}"?`,
        text: 'All deposits in this goal will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete goal',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;
    window.savingsGoals = window.savingsGoals.filter(g => g.id !== goalId);
    window.saveToStorage();
    renderGoals();
    updateSavingsSummary();
    window.updateOverviewDashboard();
};

/* ─── Render Goal Cards ─── */
window.renderGoals = function() {
    const grid   = document.getElementById('goals-grid');
    const goals  = window.savingsGoals;

    if (goals.length === 0) {
        grid.innerHTML = `
            <div class="empty-state goals-empty">
                <div class="empty-icon">◎</div>
                <h3>No savings goals yet</h3>
                <p>Create your first goal to start tracking your savings progress.</p>
                <button class="btn btn-savings" onclick="document.getElementById('openGoalModal').click()">+ Create First Goal</button>
            </div>`;
        return;
    }

    grid.innerHTML = goals.map(goal => {
        const pct      = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
        const complete = goal.saved >= goal.target;
        const remaining = Math.max(0, goal.target - goal.saved);
        const deadlineStr = goal.deadline ? `Due: ${goal.deadline}` : 'No deadline';
        const deposits = goal.deposits || [];

        const historyItems = deposits.length > 0
            ? deposits.slice().reverse().map(d =>
                `<li><span>${d.date}${d.note ? ' — ' + escHtmlSav(d.note) : ''}</span><span style="font-weight:700;color:var(--clr-savings);">+₪${window.fmt(d.amount)}</span></li>`
              ).join('')
            : '<li style="color:var(--clr-subtle)">No deposits yet</li>';

        return `
        <div class="goal-card ${complete ? 'complete' : ''}" id="goal-card-${goal.id}">
            <div class="goal-card-top">
                <span class="goal-emoji">${goal.emoji}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="goal-badge ${complete ? 'complete' : 'active'}">${complete ? '✓ Complete' : 'Active'}</span>
                </div>
            </div>

            <div>
                <div class="goal-name">${escHtmlSav(goal.name)}</div>
                <div class="goal-deadline">${deadlineStr}</div>
            </div>

            <div class="goal-amounts">
                <div>
                    <div class="goal-saved-label">Saved</div>
                    <div class="goal-saved-val">₪${window.fmt(goal.saved)}</div>
                </div>
                <div>
                    <div class="goal-target-label">Target</div>
                    <div class="goal-target-val">₪${window.fmt(goal.target)}</div>
                </div>
            </div>

            <div>
                <div class="progress-track">
                    <div class="progress-fill ${complete ? 'complete' : ''}" style="width:${pct}%"></div>
                </div>
                <div class="goal-pct-row" style="margin-top:6px;">
                    <span class="goal-pct">${pct.toFixed(1)}% funded</span>
                    <span class="goal-remaining">${complete ? '🎉 Reached!' : '₪' + window.fmt(remaining) + ' to go'}</span>
                </div>
            </div>

            <div class="goal-card-footer">
                ${!complete ? `<button class="btn btn-savings btn-icon" onclick="openDepositModal(${goal.id})" style="flex:1;">+ Deposit</button>` : ''}
                <button class="btn btn-outline btn-icon" onclick="deleteGoal(${goal.id})" title="Delete goal">🗑</button>
            </div>

            <button class="goal-history-toggle" onclick="toggleHistory(${goal.id})">
                ▾ ${deposits.length} deposit${deposits.length !== 1 ? 's' : ''}
            </button>
            <div class="goal-history" id="history-${goal.id}">
                <ul class="deposit-list">${historyItems}</ul>
            </div>
        </div>`;
    }).join('');
};

window.toggleHistory = function(goalId) {
    const el  = document.getElementById('history-' + goalId);
    const btn = el.previousElementSibling;
    el.classList.toggle('open');
    btn.textContent = btn.textContent.replace(el.classList.contains('open') ? '▾' : '▸', el.classList.contains('open') ? '▸' : '▾');
};

/* ─── Summary Bar ─── */
function updateSavingsSummary() {
    const goals    = window.savingsGoals;
    const totalSaved  = goals.reduce((s, g) => s + g.saved,   0);
    const totalTarget = goals.reduce((s, g) => s + g.target,  0);
    const needed      = Math.max(0, totalTarget - totalSaved);
    const completed   = goals.filter(g => g.saved >= g.target).length;

    document.getElementById('sav-total-saved').textContent   = '₪ ' + window.fmt(totalSaved);
    document.getElementById('sav-total-target').textContent  = '₪ ' + window.fmt(totalTarget);
    document.getElementById('sav-total-needed').textContent  = '₪ ' + window.fmt(needed);
    document.getElementById('sav-completed-count').textContent = completed;
}

/* ─── Public getter for overview ─── */
window.getSavingsSum = function() {
    return (window.savingsGoals || []).reduce((s, g) => s + g.saved, 0);
};

/* ─── addGoalFromData (used by demo loader) ─── */
window.addGoalFromData = function(data) {
    window.savingsGoals.push({
        id:       Date.now() + Math.random(),
        name:     data.name,
        target:   data.target,
        saved:    data.saved || 0,
        emoji:    data.emoji || '🎯',
        deadline: data.deadline || '',
        deposits: data.saved > 0
            ? [{ amount: data.saved, note: 'Demo deposit', date: new Date().toLocaleDateString() }]
            : []
    });
};

/* ─── Helper ─── */
function escHtmlSav(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
    renderGoals();
    updateSavingsSummary();
});
