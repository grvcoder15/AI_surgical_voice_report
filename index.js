require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_MAX_PAYLOAD = process.env.WEBHOOK_MAX_PAYLOAD || '10mb';

// Middleware
app.use(express.json({ limit: WEBHOOK_MAX_PAYLOAD }));
app.use(express.urlencoded({ extended: true, limit: WEBHOOK_MAX_PAYLOAD }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  logger.info('Health check called');
  res.status(200).json({ 
    status: 'ok', 
    message: 'AI Surgical Voice Report API is running',
    timestamp: new Date().toISOString()
  });
});

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

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
  logger.info(`Webhook endpoint at http://localhost:${PORT}/webhook/call-ended`);
});
