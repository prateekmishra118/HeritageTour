require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { testConnection, closePool } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const heritageRoutes = require('./routes/heritageRoutes');
const guideRoutes = require('./routes/guideRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Core middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Tourism & Heritage Management Platform API is running',
    database: 'Oracle Database'
  });
});

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/heritage', heritageRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// ---- 404 handler for unmatched API routes (always return JSON, never HTML) ----
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// ---- Serve the frontend for any other route ----
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Global error handler - always return JSON ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.'
  });
});

// ---- Start server after verifying Oracle connectivity ----
async function startServer() {
  try {
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Oracle Database connection verified.');
    } else {
      console.warn('⚠️  Oracle Database connection test returned no result.');
    }
  } catch (err) {
    console.error('❌ Failed to connect to Oracle Database:', err.message);
    console.error('   The server will still start, but API calls that need the database will fail.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Smart Tourism & Heritage Management Platform running at http://localhost:${PORT}`);
  });
}

startServer();

// ---- Graceful shutdown ----
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

module.exports = app;
