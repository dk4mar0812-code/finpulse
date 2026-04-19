// ── App State ──────────────────────────────────────────────
window.FinState = {
  income: 0, expenses: 0, savings: 0, healthScore: 0,
  categories: {}, months: [], goals: [], dataLoaded: false,
  monthlyData: []
};

// ── Sample Data ────────────────────────────────────────────
window.SAMPLE = {
  monthlyData: [
    { month:'Nov', income:72000, expenses:54000 },
    { month:'Dec', income:72000, expenses:61000 },
    { month:'Jan', income:75000, expenses:58000 },
    { month:'Feb', income:75000, expenses:52000 },
    { month:'Mar', income:78000, expenses:57000 },
    { month:'Apr', income:78000, expenses:49000 }
  ],
  categories: {
    'Rent/Housing':18000,'Food & Dining':9500,'Transport':4200,
    'Entertainment':3800,'Utilities':2800,'Shopping':5500,
    'Healthcare':1500,'Education':2200,'Others':1500
  },
  alerts: [
    { type:'danger', icon:'fa-fire', text:'Entertainment spending up 42% vs last month — ₹3,800 vs ₹2,670 average.' },
    { type:'warning', icon:'fa-exclamation-circle', text:'Shopping expenses (₹5,500) exceed 10% of income. Consider cutting by ₹1,500.' },
    { type:'success', icon:'fa-check-circle', text:'Great job! Savings rate improved to 37% this month — best in 6 months.' },
    { type:'info', icon:'fa-lightbulb', text:'You could save ₹4,200 extra/month by optimising dining and subscriptions.' }
  ],
  insights: [
    { icon:'📈', title:'Income Growth Trend', text:'Your income grew 8.3% over 6 months. At this pace, you\'ll hit ₹85k/month by October.' },
    { icon:'🍕', title:'Food Spending Spike', text:'Dining out accounts for 19% of expenses. Cooking 3 days/week could save ₹2,800/month.' },
    { icon:'💳', title:'Expense Volatility', text:'Your expenses swing ±₹9,000/month — building a ₹25k buffer fund is recommended.' },
    { icon:'🏠', title:'Housing Ratio', text:'Rent is 36% of income — slightly above ideal 30%. Consider renegotiating or sharing costs.' },
    { icon:'🎯', title:'Savings Momentum', text:'Consistent saving in past 3 months. Projected annual saving: ₹3.48 lakh at current rate.' },
    { icon:'⚡', title:'Utility Optimisation', text:'Utilities steady at ₹2,800. Switching to a prepaid energy plan could save ₹400/month.' }
  ]
};

// ── CSV/JSON Parser ────────────────────────────────────────
window.parseFile = function(text, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'json') {
    try { return processJSON(JSON.parse(text)); } catch(e) { return null; }
  }
  return parseCSV(text);
};

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
  const rows = lines.slice(1).map(l => {
    const vals = l.split(',').map(v => v.trim().replace(/"/g,''));
    const obj = {};
    headers.forEach((h,i) => obj[h] = vals[i] || '');
    return obj;
  });
  return processRows(rows, headers);
}

function processRows(rows, headers) {
  let income = 0, expenses = 0, cats = {};
  const hasAmount = headers.some(h => h.includes('amount') || h.includes('credit') || h.includes('debit'));
  rows.forEach(r => {
    const amt = parseFloat(r.amount || r.credit || r.debit || r.value || 0);
    const type = (r.type || r.category || '').toLowerCase();
    const cat = r.category || r.description || 'Others';
    if (isNaN(amt)) return;
    if (type.includes('credit') || type.includes('income') || type.includes('salary')) {
      income += Math.abs(amt);
    } else {
      expenses += Math.abs(amt);
      cats[cat] = (cats[cat] || 0) + Math.abs(amt);
    }
  });
  if (!income && !expenses) return null;
  return { income, expenses, categories: cats };
}

function processJSON(data) {
  if (Array.isArray(data)) return processRows(data, Object.keys(data[0] || {}));
  if (data.income !== undefined) return data;
  return null;
}
