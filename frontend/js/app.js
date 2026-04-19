// ── Main App Controller ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Date
  document.getElementById('dateDisplay').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // ── Navigation ──────────────────────────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const titleMap = {
    dashboard: ['Dashboard','Your financial health at a glance'],
    upload:    ['Upload Documents','Import your financial data'],
    budget:    ['Budget Planner','AI-generated monthly budget plan'],
    goals:     ['Goals Planner','Track and achieve your financial goals'],
    insights:  ['AI Insights','Deep analysis of your financial patterns'],
    chat:      ['AI Coach','Your personal financial advisor']
  };

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const sec = link.dataset.section;
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('sec-' + sec).classList.add('active');
      const [t, st] = titleMap[sec] || ['',''];
      pageTitle.textContent = t;
      pageSubtitle.textContent = st;
      // close sidebar on mobile
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // ── Language Switcher ─────────────────────────────────
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  // Apply saved language on load
  applyTranslations();

  // ── Upload ──────────────────────────────────────────────
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');

  document.getElementById('browseBtn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFiles(fileInput.files);
  });

  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  async function handleFiles(files) {
    const prog = document.getElementById('uploadProgress');
    const fill = document.getElementById('progressFill');
    const status = document.getElementById('uploadStatus');
    prog.classList.remove('hidden');
    let pct = 0;
    const iv = setInterval(() => { pct = Math.min(pct + 8, 85); fill.style.width = pct + '%'; }, 120);

    const file = files[0];
    const text = await file.text();
    const result = parseFile(text, file.name);

    clearInterval(iv);
    fill.style.width = '100%';
    status.textContent = result ? '✅ Analysed successfully!' : '⚠️ Could not parse file. Try the sample data or ensure correct format.';

    if (result) {
      const inc = result.income || SAMPLE.monthlyData[SAMPLE.monthlyData.length-1].income;
      const exp = result.expenses || SAMPLE.monthlyData[SAMPLE.monthlyData.length-1].expenses;
      const cats = Object.keys(result.categories || {}).length ? result.categories : SAMPLE.categories;
      applyData(inc, exp, cats, SAMPLE.monthlyData);
      addHistoryItem(file.name);
    }

    setTimeout(() => { prog.classList.add('hidden'); fill.style.width = '0%'; }, 2500);
  }

  document.getElementById('loadSampleBtn').addEventListener('click', () => {
    const last = SAMPLE.monthlyData[SAMPLE.monthlyData.length - 1];
    applyData(last.income, last.expenses, SAMPLE.categories, SAMPLE.monthlyData);
    addHistoryItem('sample_data.json (Demo)');
    showToast(t('sample_loaded'));
  });

  // ── Preview Sample Data Modal ────────────────────────────
  const previewModal = document.getElementById('previewModal');
  const previewModalBody = document.getElementById('previewModalBody');
  const previewBtn = document.getElementById('previewSampleBtn');
  const closePreviewBtn = document.getElementById('closePreviewBtn');

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const csvContent = `Date,Description,Category,Type,Amount
2023-11-01,Acme Corp Salary,Salary,Income,72000
2023-11-02,Landlord Rent,Rent/Housing,Expense,18000
2023-11-05,Grocery Mart,Food & Dining,Expense,4200
2023-11-08,Uber Rides,Transport,Expense,1500
2023-11-12,Netflix & Spotify,Entertainment,Expense,800
2023-11-15,Electric Bill,Utilities,Expense,1200
2023-11-18,Amazon Shopping,Shopping,Expense,3500
2023-11-20,Pharmacy,Healthcare,Expense,500
2023-11-22,Online Course,Education,Expense,2200
2023-11-25,Restaurant Dinner,Food & Dining,Expense,5300
2023-11-28,Gas Station,Transport,Expense,2700
2023-11-29,Movie Tickets,Entertainment,Expense,3000
2023-11-30,Water & Internet,Utilities,Expense,1600
2023-11-30,Misc Purchases,Shopping,Expense,2000
2023-11-30,Doctor Visit,Healthcare,Expense,1000
2023-11-30,Others,Others,Expense,1500
`;
      previewModalBody.innerHTML = `
        <p style="margin-bottom:12px;color:var(--text-muted);font-size:0.9rem;">
          This is an example of a typical CSV format you can upload. The system automatically parses <b>Amount</b>, <b>Type</b> (Income/Expense), and <b>Category</b> columns.
        </p>
        <pre class="sample-code">${csvContent}</pre>
      `;
      previewModal.classList.add('active');
    });
  }

  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', () => {
      previewModal.classList.remove('active');
    });
  }

  // Close modal when clicking outside
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      previewModal.classList.remove('active');
    }
  });

  function addHistoryItem(name) {
    const list = document.getElementById('historyList');
    const empty = list.querySelector('.empty-state');
    if (empty) empty.remove();
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<span><i class="fas fa-file-alt" style="color:var(--accent);margin-right:8px"></i>${name}</span><span>${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>`;
    list.prepend(item);
  }

  // ── Apply Data ──────────────────────────────────────────
  function applyData(income, expenses, categories, monthlyData) {
    const savings = income - expenses;
    const score = computeHealthScore(income, expenses);
    const savingsRate = savings / income;

    // Update state
    Object.assign(FinState, { income, expenses, savings, healthScore: score, categories, monthlyData, dataLoaded: true });

    // Stats
    document.getElementById('totalIncome').textContent = '₹' + income.toLocaleString('en-IN');
    document.getElementById('totalExpenses').textContent = '₹' + expenses.toLocaleString('en-IN');
    document.getElementById('totalSavings').textContent = '₹' + savings.toLocaleString('en-IN');
    document.getElementById('savingsRate').textContent = (savingsRate * 100).toFixed(1) + '%';
    document.getElementById('incomeTrend').innerHTML = `<i class="fas fa-caret-up"></i> +8.3%`;
    document.getElementById('expenseTrend').innerHTML = `<i class="fas fa-caret-down"></i> -4.2%`;
    document.getElementById('savingsTrend').innerHTML = `<i class="fas fa-caret-up"></i> +37%`;
    document.getElementById('ratioTrend').innerHTML = `<i class="fas fa-caret-up"></i> +5.1%`;

    // Health score ring
    drawHealthRing(score);
    document.getElementById('healthScoreValue').textContent = score;
    document.getElementById('healthSummary').textContent = getHealthSummary(score, savingsRate, income, expenses);

    // Badges
    const lbl = getHealthLabel(score);
    const badges = [
      { text: lbl.label, cls: lbl.cls },
      { text: (savingsRate * 100).toFixed(0) + '% Savings Rate', cls: savingsRate >= 0.2 ? 'badge-good' : 'badge-warn' },
      { text: expenses < income * 0.7 ? 'Low Expense Ratio' : 'High Expense Ratio', cls: expenses < income * 0.7 ? 'badge-good' : 'badge-bad' }
    ];
    document.getElementById('scoreBadges').innerHTML = badges.map(b => `<span class="badge ${b.cls}">${b.text}</span>`).join('');

    // Charts
    drawIncomeExpense(monthlyData);
    drawSpendingPie(categories);
    drawSavingsTrajectory(savings, monthlyData);

    // Alerts
    const alerts = generateAlerts(income, expenses, categories);
    document.getElementById('alertsList').innerHTML = alerts.map(a =>
      `<div class="alert-item ${a.type}"><i class="fas ${a.icon}"></i><span>${a.text}</span></div>`
    ).join('');

    // Budget
    const budgetItems = generateBudgetPlan(income, categories);
    renderBudget(budgetItems);
    drawBudgetVsActual(budgetItems);

    // Insights
    renderInsights(generateInsights());

    // Goals refresh
    renderGoals();
  }

  // ── Budget Render ───────────────────────────────────────
  function renderBudget(items) {
    const grid = document.getElementById('budgetGrid');
    grid.innerHTML = items.map(item => {
      const pct = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 100) : 0;
      const over = item.actual > item.budget;
      const barColor = over ? '#ef4444' : item.color;
      return `<div class="budget-item">
        <div class="budget-item-header">
          <span class="budget-cat">${item.icon} ${item.name}</span>
          <span class="budget-amt" style="color:${item.color}">₹${item.budget.toLocaleString('en-IN')}</span>
        </div>
        <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
        <div class="budget-meta">
          <span>Actual: ₹${(item.actual||0).toLocaleString('en-IN')}</span>
          <span style="color:${over?'#ef4444':'#22c55e'}">${over?'▲ Over':'▼ Under'} by ₹${Math.abs(item.budget-(item.actual||0)).toLocaleString('en-IN')}</span>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('regenerateBudget').addEventListener('click', () => {
    if (!FinState.dataLoaded) { showToast(t('load_first')); return; }
    renderBudget(generateBudgetPlan(FinState.income, FinState.categories));
    showToast(t('budget_refreshed'));
  });

  // ── Goals ───────────────────────────────────────────────
  document.getElementById('addGoalBtn').addEventListener('click', () => {
    const name = document.getElementById('goalName').value.trim();
    const amount = parseFloat(document.getElementById('goalAmount').value);
    const months = parseInt(document.getElementById('goalMonths').value);
    const priority = document.getElementById('goalPriority').value;
    if (!name || !amount || !months) { showToast(t('fill_fields')); return; }
    FinState.goals.push({ id: Date.now(), name, amount, months, priority, saved: 0 });
    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
    document.getElementById('goalMonths').value = '';
    renderGoals();
    showToast(t('goal_added', { name }));
  });

  function renderGoals() {
    const list = document.getElementById('goalsList');
    if (!FinState.goals.length) {
      list.innerHTML = `<div class="empty-state-large"><i class="fas fa-bullseye"></i><p>Add your first financial goal to get started</p></div>`;
      return;
    }
    const monthlySavings = FinState.savings || 25000;
    const perGoal = FinState.goals.length > 0 ? monthlySavings / FinState.goals.length : 0;

    list.innerHTML = FinState.goals.map(g => {
      // Run Monte Carlo for this goal
      const mc = runMonteCarlo({ ...g, saved: g.saved || 0 }, perGoal, FinState.income || 78000);
      const prob = mc.successProbability;
      const probColor = prob >= 75 ? '#22c55e' : prob >= 45 ? '#f59e0b' : '#ef4444';
      const probLabel = prob >= 75 ? '✅ High Confidence' : prob >= 45 ? '⚠️ Moderate' : '❌ At Risk';
      const p10Final = mc.p10[mc.p10.length - 1];
      const p90Final = mc.p90[mc.p90.length - 1];
      const pct = Math.min(((g.saved || 0) / g.amount) * 100, 100);

      return `<div class="goal-card">
        <button class="goal-remove" onclick="removeGoal(${g.id})"><i class="fas fa-times"></i></button>
        <div class="goal-card-header">
          <span class="goal-name">${g.name}</span>
          <span class="goal-priority ${g.priority}">${g.priority === 'high' ? '🔴 High' : g.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}</span>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
          <div class="goal-progress-text"><span>₹${(g.saved||0).toLocaleString('en-IN')} saved</span><span>₹${g.amount.toLocaleString('en-IN')} goal</span></div>
        </div>
        <div class="goal-stats">
          <div class="goal-stat"><span class="goal-stat-value">${g.months}mo</span><span class="goal-stat-label">Target</span></div>
          <div class="goal-stat"><span class="goal-stat-value" style="color:${probColor}">${prob.toFixed(0)}%</span><span class="goal-stat-label">MC Success Rate</span></div>
        </div>
        <div class="mc-range" style="margin-top:10px;padding:8px 10px;background:rgba(99,102,241,0.07);border-radius:8px;font-size:.78rem;color:var(--text-dim)">
          <span style="display:block;margin-bottom:3px;font-weight:600;color:var(--text)">Monte Carlo Range (${mc.simCount.toLocaleString()} sims)</span>
          <span>📉 Pessimistic (P10): ₹${Math.round(p10Final).toLocaleString('en-IN')}</span>&nbsp;&nbsp;
          <span>📈 Optimistic (P90): ₹${Math.round(p90Final).toLocaleString('en-IN')}</span>
        </div>
        <div class="goal-forecast" style="margin-top:8px;color:${probColor}">
          ${probLabel} — ${prob.toFixed(0)}% chance of hitting ₹${g.amount.toLocaleString('en-IN')} in ${g.months} months at ₹${Math.ceil(perGoal).toLocaleString('en-IN')}/mo
        </div>
      </div>`;
    }).join('');

    if (FinState.goals.length) {
      drawGoalsForecast(FinState.goals, monthlySavings, FinState.income || 78000);
      renderGoalsAI(monthlySavings);
    } else {
      document.getElementById('goalsAiContent').innerHTML =
        '<p class="goals-ai-empty">Add goals and load your financial data to receive AI-powered recommendations.</p>';
      document.getElementById('goalsAiBadge').textContent = '';
    }
  }

  function renderGoalsAI(monthlySavings) {
    const content = document.getElementById('goalsAiContent');
    const badge   = document.getElementById('goalsAiBadge');
    const income   = FinState.income   || 78000;
    const expenses = FinState.expenses || 49000;

    const analysis = analyzeGoals(FinState.goals, monthlySavings, income, expenses);
    if (!analysis) return;

    const { summary, recs } = analysis;
    const scoreColor = summary.avgSuccessRate >= 75 ? '#22c55e' : summary.avgSuccessRate >= 45 ? '#f59e0b' : '#ef4444';

    badge.textContent = `${summary.totalGoals} goal${summary.totalGoals > 1 ? 's' : ''} · Avg success ${summary.avgSuccessRate}%`;
    badge.style.color = scoreColor;

    content.innerHTML = `
      <div class="goals-summary-stats">
        <div class="gs-stat">
          <span class="gs-stat-value" style="color:${scoreColor}">${summary.avgSuccessRate}%</span>
          <span class="gs-stat-label">Avg Success Rate</span>
        </div>
        <div class="gs-stat">
          <span class="gs-stat-value" style="color:#22c55e">${summary.onTrack}</span>
          <span class="gs-stat-label">On Track</span>
        </div>
        <div class="gs-stat">
          <span class="gs-stat-value" style="color:#f59e0b">${summary.moderate}</span>
          <span class="gs-stat-label">Moderate Risk</span>
        </div>
        <div class="gs-stat">
          <span class="gs-stat-value" style="color:#ef4444">${summary.atRisk}</span>
          <span class="gs-stat-label">At Risk</span>
        </div>
      </div>
      <div class="goals-recs">
        ${recs.map(r => `
          <div class="goal-rec ${r.type}">
            <span class="rec-icon">${r.icon}</span>
            <div class="rec-body">
              <div class="rec-title ${r.type}">${r.title}</div>
              <div class="rec-text">${r.text}</div>
            </div>
          </div>`).join('')}
      </div>
    `;
  }


  window.removeGoal = function(id) {
    FinState.goals = FinState.goals.filter(g => g.id !== id);
    renderGoals();
  };

  // ── Insights ────────────────────────────────────────────
  function renderInsights(insights) {
    document.getElementById('insightsGrid').innerHTML = insights.map(ins =>
      `<div class="insight-card">
        <div class="insight-icon">${ins.icon}</div>
        <div class="insight-title">${ins.title}</div>
        <div class="insight-text">${ins.text}</div>
      </div>`
    ).join('');
  }

  // ── Chat ────────────────────────────────────────────────
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');

  function appendMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'bot'}`;
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    div.innerHTML = `
      <div class="message-avatar"><i class="fas fa-${isUser ? 'user' : 'robot'}"></i></div>
      <div class="message-bubble">${formatted}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendMessage(msg) {
    if (!msg.trim()) return;
    appendMessage(msg, true);
    chatInput.value = '';
    setTimeout(() => {
      const reply = getAIResponse(msg);
      appendMessage(reply, false);
    }, 600);
  }

  document.getElementById('sendChatBtn').addEventListener('click', () => sendMessage(chatInput.value));
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(chatInput.value); });

  // Suggestion chips — use the English key as the actual query
  const chipMsgs = { chip1: "How's my financial health?", chip2: 'Where am I overspending?', chip3: 'How can I save more?', chip4: 'Create a budget plan for me' };
  document.querySelectorAll('.suggestion-chip[id]').forEach(chip => {
    chip.addEventListener('click', () => sendMessage(chipMsgs[chip.id] || chip.textContent));
  });

  // ── Toast ────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;padding:12px 22px;border-radius:12px;font-size:.9rem;z-index:9999;animation:fadeUp .3s ease;box-shadow:0 8px 24px rgba(99,102,241,.4);font-family:Inter,sans-serif;font-weight:500';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Initial empty charts (placeholders) ─────────────────
  drawIncomeExpense(SAMPLE.monthlyData.map(d => ({ ...d, income: 0, expenses: 0 })));
});
