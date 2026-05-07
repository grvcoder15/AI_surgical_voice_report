const express = require('express');
const logger = require('../../utils/logger');
const dbService = require('../../services/dbService');

const router = express.Router();

// Health check endpoint (no auth required for now)
router.get('/', async (req, res) => {
  try {
    const health = await dbService.healthCheck();
    return res.status(200).json({
      status: 'ok',
      database: health.status,
      timestamp: health.timestamp,
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: error.message,
    });
  }
});

module.exports = router;
