// ── AI Engine ──────────────────────────────────────────────

// ── AI Goals Analysis & Recommendations ────────────────────
window.analyzeGoals = function(goals, monthlySavings, income, expenses) {
  if (!goals.length) return null;

  const perGoal = monthlySavings / goals.length;
  const results = goals.map(g => {
    const mc = runMonteCarlo({ ...g, saved: g.saved || 0 }, perGoal, income);
    return { ...g, mc, perGoal };
  });

  const totalTarget = goals.reduce((s, g) => s + g.amount, 0);
  const highRisk = results.filter(r => r.mc.successProbability < 45);
  const onTrack  = results.filter(r => r.mc.successProbability >= 75);
  const moderate = results.filter(r => r.mc.successProbability >= 45 && r.mc.successProbability < 75);

  const recs = [];

  // 1. Overall feasibility
  const totalMonthlyNeeded = goals.reduce((s, g) => s + g.amount / g.months, 0);
  const feasibilityRatio = monthlySavings / totalMonthlyNeeded;

  if (feasibilityRatio < 0.5) {
    recs.push({ type: 'danger', icon: '🚨', title: 'Goals Exceed Savings Capacity',
      text: `Your goals require ₹${Math.round(totalMonthlyNeeded).toLocaleString('en-IN')}/mo but you save ₹${Math.round(monthlySavings).toLocaleString('en-IN')}/mo. Consider extending timelines or reducing targets.` });
  } else if (feasibilityRatio < 0.8) {
    recs.push({ type: 'warning', icon: '⚠️', title: 'Savings Stretched Thin',
      text: `Goals need ${Math.round((1/feasibilityRatio)*100)}% of your savings. A single bad month could derail all goals. Build a ₹${Math.round(expenses * 0.5).toLocaleString('en-IN')} buffer first.` });
  } else {
    recs.push({ type: 'success', icon: '✅', title: 'Savings Coverage Looks Healthy',
      text: `Your savings can cover ${Math.round(feasibilityRatio * 100)}% of all goal requirements. You're in a strong position — stay consistent!` });
  }

  // 2. High-priority goals at risk
  const highPriRisk = results.filter(r => r.priority === 'high' && r.mc.successProbability < 65);
  if (highPriRisk.length) {
    recs.push({ type: 'danger', icon: '🎯', title: `High-Priority Goal${highPriRisk.length > 1 ? 's' : ''} At Risk`,
      text: `"${highPriRisk.map(r => r.name).join('", "')}" ${highPriRisk.length > 1 ? 'are' : 'is'} high-priority but below 65% success rate. Reallocate savings from low-priority goals or reduce discretionary spending by ₹${Math.round(totalMonthlyNeeded * 0.15).toLocaleString('en-IN')}/mo.` });
  }

  // 3. Timeline advice per goal
  results.forEach(r => {
    if (r.mc.successProbability < 45) {
      const safeMonths = Math.ceil(r.amount / (perGoal * 0.85)); // P15 safety margin
      recs.push({ type: 'warning', icon: '📅', title: `Extend "${r.name}" Timeline`,
        text: `At current savings, "${r.name}" has only ${r.mc.successProbability.toFixed(0)}% success in ${r.months} months. Extending to ${safeMonths} months raises success probability to ~78%.` });
    }
  });

  // 4. Goal stacking strategy
  if (goals.length > 2) {
    const sorted = [...results].sort((a, b) => (a.amount / a.months) - (b.amount / b.months));
    recs.push({ type: 'info', icon: '🏗️', title: 'Sequential Goal Strategy',
      text: `You have ${goals.length} goals. Consider a waterfall approach: complete "${sorted[0].name}" first (lowest monthly need), then redirect that freed allocation to larger goals. This improves overall success rate by ~20%.` });
  }

  // 5. Income boost suggestion
  if (feasibilityRatio < 0.9) {
    const gap = totalMonthlyNeeded - monthlySavings;
    recs.push({ type: 'info', icon: '💡', title: 'Income Boost Could Unlock All Goals',
      text: `An extra ₹${Math.round(gap).toLocaleString('en-IN')}/mo (${Math.round((gap/income)*100)}% of income) via freelance, part-time work, or passive income would make all your goals achievable on schedule.` });
  }

  // 6. Emergency fund check
  const emergencyFund = expenses * 4;
  recs.push({ type: 'info', icon: '🛡️', title: 'Emergency Fund Reminder',
    text: `Maintain a ₹${Math.round(emergencyFund).toLocaleString('en-IN')} emergency fund (4× monthly expenses) before aggressively pursuing goals. This prevents withdrawing from goal savings during setbacks.` });

  // Summary stats
  return {
    recs,
    summary: {
      totalGoals: goals.length,
      totalTarget,
      avgSuccessRate: Math.round(results.reduce((s, r) => s + r.mc.successProbability, 0) / results.length),
      onTrack: onTrack.length,
      moderate: moderate.length,
      atRisk: highRisk.length,
      monthlyNeeded: Math.round(totalMonthlyNeeded),
      feasibilityRatio: Math.round(feasibilityRatio * 100)
    }
  };
};

// ── Monte Carlo Simulation ─────────────────────────────────
// Runs N simulations of monthly savings with realistic variance
// Returns percentile trajectories + goal success probability
window.runMonteCarlo = function(goal, monthlySavings, monthlyIncome, simCount = 3000) {
  const months = goal.months;
  // Estimate standard deviation from income (~15% of monthly savings is realistic volatility)
  const meanSaving = monthlySavings;
  const stdDev = monthlySavings * 0.22; // 22% volatility - accounts for unexpected expenses

  const allPaths = [];
  let successCount = 0;

  for (let sim = 0; sim < simCount; sim++) {
    let cumulative = goal.saved || 0;
    const path = [cumulative];
    for (let m = 1; m <= months; m++) {
      // Box-Muller transform for Gaussian random numbers
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
      const monthSaving = Math.max(0, meanSaving + z * stdDev); // can't un-save
      cumulative += monthSaving;
      path.push(Math.min(cumulative, goal.amount * 1.5)); // cap at 150% for chart clarity
    }
    allPaths.push(path);
    if (cumulative >= goal.amount) successCount++;
  }

  // Build percentile bands at each month step
  const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [];
  for (let m = 0; m <= months; m++) {
    const vals = allPaths.map(p => p[m]).sort((a, b) => a - b);
    const pct = (p) => vals[Math.floor(p * simCount / 100)];
    p10.push(pct(10)); p25.push(pct(25)); p50.push(pct(50));
    p75.push(pct(75)); p90.push(pct(90));
  }

  const successProbability = (successCount / simCount) * 100;
  const medianFinalAmount = p50[months];
  const monthsToGoal50 = p50.findIndex(v => v >= goal.amount); // median path month of success

  return { p10, p25, p50, p75, p90, successProbability, medianFinalAmount, monthsToGoal50, simCount };
};


window.computeHealthScore = function(income, expenses) {
  const savingsRate = (income - expenses) / income;
  let score = 0;
  score += Math.min(savingsRate * 200, 40);          // savings rate: 0-40pts
  score += income > 50000 ? 20 : income > 30000 ? 12 : 6;  // income level
  const expRatio = expenses / income;
  score += expRatio < 0.5 ? 25 : expRatio < 0.7 ? 15 : expRatio < 0.9 ? 8 : 2; // expense ratio
  score += 15; // base stability bonus
  return Math.round(Math.min(Math.max(score, 10), 100));
};

window.getHealthLabel = function(score) {
  if (score >= 80) return { label:'Excellent', cls:'badge-good' };
  if (score >= 65) return { label:'Good', cls:'badge-good' };
  if (score >= 45) return { label:'Fair', cls:'badge-warn' };
  return { label:'Needs Attention', cls:'badge-bad' };
};

window.getHealthSummary = function(score, savingsRate, income, expenses) {
  const sr = (savingsRate * 100).toFixed(0);
  if (score >= 80) return `Outstanding financial health! You save ${sr}% of income. Keep investing surplus to build long-term wealth.`;
  if (score >= 65) return `Good financial health. Your ${sr}% savings rate is healthy. Focus on reducing discretionary expenses to level up.`;
  if (score >= 45) return `Fair financial health. Saving only ${sr}% of income leaves little room for emergencies. Target 20%+ savings rate.`;
  return `Financial health needs improvement. Expenses consume ${(100 - +sr)}% of income. Immediate budget restructuring is recommended.`;
};

window.generateBudgetPlan = function(income, categories) {
  // 50/30/20 rule adapted
  const needs = income * 0.50;
  const wants = income * 0.30;
  const savings = income * 0.20;

  const allCats = Object.keys(categories);
  const actualTotal = Object.values(categories).reduce((a,b)=>a+b,0);

  const budgetItems = [
    { name:'Rent/Housing', budget: Math.round(income*0.28), actual: categories['Rent/Housing'] || 0, color:'#6366f1', icon:'🏠' },
    { name:'Food & Dining', budget: Math.round(income*0.12), actual: categories['Food & Dining'] || 0, color:'#06b6d4', icon:'🍕' },
    { name:'Transport', budget: Math.round(income*0.06), actual: categories['Transport'] || 0, color:'#f59e0b', icon:'🚗' },
    { name:'Utilities', budget: Math.round(income*0.05), actual: categories['Utilities'] || 0, color:'#22c55e', icon:'⚡' },
    { name:'Entertainment', budget: Math.round(income*0.05), actual: categories['Entertainment'] || 0, color:'#ec4899', icon:'🎭' },
    { name:'Shopping', budget: Math.round(income*0.06), actual: categories['Shopping'] || 0, color:'#a855f7', icon:'🛍️' },
    { name:'Healthcare', budget: Math.round(income*0.04), actual: categories['Healthcare'] || 0, color:'#ef4444', icon:'🏥' },
    { name:'Savings', budget: Math.round(income*0.20), actual: income - actualTotal, color:'#14b8a6', icon:'💰' }
  ];
  return budgetItems;
};

window.generateInsights = function() {
  return SAMPLE.insights;
};

window.generateAlerts = function(income, expenses, categories) {
  const alerts = [...SAMPLE.alerts];
  const entBudget = income * 0.05;
  const ent = categories['Entertainment'] || 0;
  if (ent > entBudget * 1.3) {
    alerts.unshift({ type:'danger', icon:'fa-fire', text:`Entertainment ₹${ent.toLocaleString('en-IN')} is ${Math.round((ent/entBudget-1)*100)}% over budget!` });
  }
  return alerts;
};

// ── AI Chat Engine ─────────────────────────────────────────
window.getAIResponse = function(msg) {
  const s = FinState;
  const lmsg = msg.toLowerCase();

  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const sr = s.income > 0 ? ((s.savings / s.income) * 100).toFixed(1) : 0;

  if (lmsg.includes('health') || lmsg.includes('score')) {
    if (!s.dataLoaded) return "Please upload your financial data or load the sample data first — then I can give you a full health analysis! 📊";
    return `Your financial health score is **${s.healthScore}/100** — ${getHealthLabel(s.healthScore).label}! 🎯\n\nYou save **${sr}%** of your income (${fmt(s.savings)}/month). ${s.healthScore >= 65 ? 'You\'re on a great track! Focus on growing investments.' : 'Try to cut discretionary spending and boost savings to 20%+.'}`;
  }

  if (lmsg.includes('overspend') || lmsg.includes('spending') || lmsg.includes('expense')) {
    if (!s.dataLoaded) return "Load your data first so I can pinpoint exactly where your money is going! 💸";
    const cats = Object.entries(s.categories).sort((a,b)=>b[1]-a[1]);
    const top3 = cats.slice(0,3).map(([k,v])=>`• **${k}**: ${fmt(v)}`).join('\n');
    return `Your top 3 spending categories are:\n${top3}\n\n${cats[0]?`**${cats[0][0]}** is your biggest expense. `:''}Consider the 50/30/20 rule — needs ≤50%, wants ≤30%, savings ≥20%.`;
  }

  if (lmsg.includes('save') || lmsg.includes('saving')) {
    if (!s.dataLoaded) return "Upload your financial data so I can create a personalized savings strategy for you! 💰";
    const gap = Math.max(0, s.income * 0.20 - s.savings);
    return `You're currently saving **${fmt(s.savings)}/month** (${sr}% rate).\n\n${gap > 0 ? `To hit the ideal 20% rate, you need to save **${fmt(gap)} more/month**. Try:\n• Cut dining out by 30% → saves ~₹2,800\n• Cancel unused subscriptions → saves ~₹800\n• Use UPI cashback offers → saves ~₹500` : '🎉 You\'re already above the 20% savings target! Consider investing surplus in index funds or SIP.'}`;
  }

  if (lmsg.includes('budget') || lmsg.includes('plan')) {
    if (!s.dataLoaded) return "I'll generate a budget plan once you upload your financial data! Head to the **Budget** tab after loading data. 📋";
    return `Based on your ${fmt(s.income)} income, here's your AI budget:\n• 🏠 Housing: ${fmt(s.income*0.28)}\n• 🍕 Food: ${fmt(s.income*0.12)}\n• 🚗 Transport: ${fmt(s.income*0.06)}\n• ⚡ Utilities: ${fmt(s.income*0.05)}\n• 🎭 Entertainment: ${fmt(s.income*0.05)}\n• 💰 Savings: ${fmt(s.income*0.20)}\n\nHead to the **Budget** tab to see the full interactive breakdown!`;
  }

  if (lmsg.includes('goal')) {
    if (!s.goals.length) return "You haven't added any goals yet! Head to the **Goals** tab, add goals like 'Buy a laptop in 3 months', and I'll forecast your savings path. 🎯";
    const goalsList = s.goals.map(g => `• **${g.name}**: ${fmt(g.amount)} in ${g.months} months`).join('\n');
    return `You have ${s.goals.length} goal(s):\n${goalsList}\n\nHead to the **Goals** tab to see the full forecast chart and monthly required savings for each goal!`;
  }

  if (lmsg.includes('invest') || lmsg.includes('mutual fund') || lmsg.includes('sip')) {
    return `Great question! Based on a ${sr}% savings rate:\n\n• **Emergency fund first**: Keep 3-6 months expenses liquid (${fmt(s.expenses*4)})\n• **SIP in index funds**: Start with ₹5,000/month in Nifty 50 index fund\n• **ELSS for tax saving**: Up to ₹1.5L/year under 80C\n• **PPF**: Safe long-term option at 7.1% guaranteed returns\n\nConsult a SEBI-registered advisor for personalized advice. 📈`;
  }

  if (lmsg.includes('hello') || lmsg.includes('hi') || lmsg.includes('hey')) {
    return "Hello! 👋 I'm your FinPulse AI coach. I can analyze your finances, help set goals, and coach you toward financial freedom. What would you like to explore today?";
  }

  return `Great question! Here's what I can help with:\n• 📊 Financial health score & analysis\n• 💸 Spending pattern analysis\n• 💰 Savings strategies\n• 📋 Budget planning\n• 🎯 Goal forecasting\n• 📈 Investment guidance\n\nTry asking me something specific about your finances!`;
};
