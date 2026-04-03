const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');
const { sendError } = require('./utils/response');

// Route imports
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const walletRoutes = require('./routes/walletRoutes');
const ratingRoutes = require('./routes/ratingRoutes');

const createApp = () => {
  const app = express();

  // ── Security & Parsing Middleware ──────────────────────────────────────────
  app.use(
    cors({
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10kb' })); // Limit body size
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── Logging ────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Health Check ───────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Campus Parcel API is running.',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/ratings', ratingRoutes);

  // ── 404 Handler ────────────────────────────────────────────────────────────
  app.use((req, res) => {
    sendError(res, `Route ${req.originalUrl} not found.`, 404);
  });

  // ── Centralized Error Handler ──────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
