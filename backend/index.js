require('dotenv').config();
const cors = require('cors');
const express = require('express');
const webhookRoutes = require('./routes/webhook');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/api/settings');
const kbRoutes = require('./routes/api/kb');
const healthRoutes = require('./routes/api/health');
const usersRoutes = require('./routes/api/users');
const dbService = require('./services/dbService');
const { requireEnv } = require('./utils/env');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_MAX_PAYLOAD = process.env.WEBHOOK_MAX_PAYLOAD || '10mb';
const CORS_ORIGINS = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '*';

const resolveCorsOrigin = (origin, callback) => {
  if (!CORS_ORIGINS || CORS_ORIGINS === '*') {
    callback(null, true);
    return;
  }

  const allowedOrigins = CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean);
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('CORS origin denied'));
};

// Middleware
app.use(cors({ origin: resolveCorsOrigin }));
app.use(express.json({ limit: WEBHOOK_MAX_PAYLOAD }));
app.use(express.urlencoded({ extended: true, limit: WEBHOOK_MAX_PAYLOAD }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  logger.info('Root health check called');
  res.status(200).json({ 
    status: 'ok', 
    message: 'AI Surgical Voice Report API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/retell', settingsRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/users', usersRoutes);

// Webhook routes
app.use('/webhook', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    logger.error(`Payload too large: ${err.message}`);
    return res.status(413).json({
      error: 'Payload too large',
      message: `Webhook body exceeds the configured limit (${WEBHOOK_MAX_PAYLOAD}).`
    });
  }

  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  requireEnv('DATABASE_URL');
  requireEnv('AUTH_TOKEN_SECRET');
  await dbService.initializeSchema();

  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info('Health check path: /health');
    logger.info('DB Health path: /api/health');
    logger.info('Auth path: /api/auth');
    logger.info('User path: /api/users/me');
    logger.info('Retell path: /api/retell');
    logger.info('KB path: /api/kb');
    logger.info('Webhook path: /webhook/call-ended');
  });
}

startServer().catch((error) => {
  logger.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
