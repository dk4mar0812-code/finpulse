// ── Chart Helpers ──────────────────────────────────────────
const C = {};   // chart instances cache

function destroyChart(id) {
  if (C[id]) { C[id].destroy(); delete C[id]; }
}

const PALETTE = ['#6366f1','#ec4899','#06b6d4','#f59e0b','#22c55e','#a855f7','#ef4444','#14b8a6','#f97316'];

// Health score ring
window.drawHealthRing = function(score) {
  destroyChart('ring');
  const ctx = document.getElementById('healthScoreRing').getContext('2d');
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  C['ring'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, 'rgba(255,255,255,0.05)'],
        borderWidth: 0, circumference: 270, rotation: -135
      }]
    },
    options: { cutout: '78%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 1200 } }
  });
};

// Income vs Expenses line chart
window.drawIncomeExpense = function(monthlyData) {
  destroyChart('ie');
  const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
  C['ie'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthlyData.map(d => d.month),
      datasets: [
        { label: 'Income', data: monthlyData.map(d => d.income), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#22c55e', pointRadius: 5 },
        { label: 'Expenses', data: monthlyData.map(d => d.expenses), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#ef4444', pointRadius: 5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#8892a8', usePointStyle: true } } },
      scales: {
        x: { ticks: { color: '#8892a8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8892a8', callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
};

// Spending pie
window.drawSpendingPie = function(categories) {
  destroyChart('pie');
  const ctx = document.getElementById('spendingPieChart').getContext('2d');
  const labels = Object.keys(categories);
  const data = Object.values(categories);
  C['pie'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 0 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#8892a8', font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}` } }
      }
    }
  });
};

// Savings trajectory forecast
window.drawSavingsTrajectory = function(monthlySavings, monthlyData) {
  destroyChart('traj');
  const ctx = document.getElementById('savingsTrajectoryChart').getContext('2d');
  const historical = monthlyData.map(d => d.income - d.expenses);
  let cumulative = 0;
  const cumHist = historical.map(s => { cumulative += s; return cumulative; });

  // Forecast 6 more months
  const avgSaving = historical.reduce((a,b) => a+b,0) / historical.length;
  const forecastCum = [];
  for (let i = 1; i <= 6; i++) forecastCum.push(cumulative + avgSaving * i);

  const histLabels = monthlyData.map(d => d.month);
  const fcastLabels = ['May','Jun','Jul','Aug','Sep','Oct'];
  const allLabels = [...histLabels, ...fcastLabels];

  C['traj'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        { label: 'Actual Savings', data: [...cumHist, ...Array(6).fill(null)], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#6366f1' },
        { label: 'Forecast', data: [...Array(histLabels.length - 1).fill(null), cumHist[cumHist.length-1], ...forecastCum], borderColor: '#06b6d4', borderDash: [6,4], backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#06b6d4' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8892a8', usePointStyle: true } } },
      scales: {
        x: { ticks: { color: '#8892a8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8892a8', callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
};

// Budget vs Actual bar chart
window.drawBudgetVsActual = function(budgetItems) {
  destroyChart('bva');
  const ctx = document.getElementById('budgetVsActualChart').getContext('2d');
  C['bva'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: budgetItems.map(b => b.name),
      datasets: [
        { label: 'Budget', data: budgetItems.map(b => b.budget), backgroundColor: 'rgba(99,102,241,0.6)', borderRadius: 6 },
        { label: 'Actual', data: budgetItems.map(b => b.actual), backgroundColor: budgetItems.map(b => b.actual > b.budget ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'), borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8892a8', usePointStyle: true } } },
      scales: {
        x: { ticks: { color: '#8892a8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8892a8', callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
};

// Goals forecast with Monte Carlo confidence bands
window.drawGoalsForecast = function(goals, monthlySavings, income) {
  destroyChart('goals');
  const ctx = document.getElementById('goalsForecastChart').getContext('2d');
  if (!goals.length) return;

  // For multi-goal: allocate savings equally; run MC per goal
  const perGoal = monthlySavings / goals.length;
  const maxMonths = Math.max(...goals.map(g => g.months), 6);
  const labels = Array.from({ length: maxMonths + 1 }, (_, i) => i === 0 ? 'Now' : `M${i}`);

  const datasets = [];
  goals.forEach((g, i) => {
    const mc = runMonteCarlo({ ...g, saved: g.saved || 0 }, perGoal, income || 78000);
    const col = PALETTE[i % PALETTE.length];
    const hex = col;

    // P10-P90 fill band
    datasets.push({
      label: `${g.name} (90th%)`,
      data: mc.p90.slice(0, maxMonths + 1),
      borderColor: 'transparent',
      backgroundColor: hex + '18',
      fill: '+1', tension: 0.4, pointRadius: 0, order: 3
    });
    datasets.push({
      label: `${g.name} (10th%)`,
      data: mc.p10.slice(0, maxMonths + 1),
      borderColor: 'transparent',
      backgroundColor: hex + '18',
      fill: false, tension: 0.4, pointRadius: 0, order: 3
    });
    // Median (P50) line
    datasets.push({
      label: `${g.name} — median (${mc.successProbability.toFixed(0)}% success)`,
      data: mc.p50.slice(0, maxMonths + 1),
      borderColor: hex, backgroundColor: hex + '33',
      fill: false, tension: 0.4, pointRadius: 4, pointBackgroundColor: hex,
      borderWidth: 2.5, order: 1
    });
    // Goal target line
    datasets.push({
      label: `${g.name} target`,
      data: Array(maxMonths + 1).fill(g.amount),
      borderColor: hex, borderDash: [5, 4],
      backgroundColor: 'transparent', pointRadius: 0,
      borderWidth: 1.5, order: 2
    });
  });

  C['goals'] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#8892a8', usePointStyle: true, font: { size: 11 },
            filter: item => !item.text.includes('(90th%)') && !item.text.includes('(10th%)')
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label.includes('90th') || ctx.dataset.label.includes('10th')) return null;
              return ` ${ctx.dataset.label}: ₹${Math.round(ctx.raw).toLocaleString('en-IN')}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8892a8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8892a8', callback: v => '₹' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
};

