require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes   = require('./routes/upload');
const analysisRoutes = require('./routes/analysis');
const budgetRoutes   = require('./routes/budget');
const goalsRoutes    = require('./routes/goals');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ── Routes ─────────────────────────────────────────────────
app.use('/api/upload',   uploadRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/budget',   budgetRoutes);
app.use('/api/goals',    goalsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── 404 / Error handlers ───────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 FinPulse API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
