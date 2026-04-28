const express = require('express');
const router = express.Router();
const gptService = require('../services/gptService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const processedCalls = new Map();
const PROCESSED_CALL_TTL_MS = 15 * 60 * 1000;

function pruneProcessedCalls() {
  const now = Date.now();

  for (const [callId, timestamp] of processedCalls.entries()) {
    if (now - timestamp > PROCESSED_CALL_TTL_MS) {
      processedCalls.delete(callId);
    }
  }
}

/**
 * POST /webhook/call-ended
 * Handles the Retell call-ended webhook
 * Expected Retell payload structure:
 * {
 *   "event": "call_ended",
 *   "call": {
 *     "call_id": "...",
 *     "transcript": "...",
 *     "agent_name": "...",
 *     ...
 *   }
 * }
 */
router.post('/call-ended', async (req, res) => {
  try {
    logger.info('Received call-ended webhook from Retell');
    
    // Extract data from Retell's payload structure
    const event = req.body.event;
    const callData = req.body.call || {};
    
    const transcript = callData.transcript;
    const callId = callData.call_id;
    const agentName = callData.agent_name || 'Unknown Agent';
    const duration = callData.duration_ms ? Math.round(callData.duration_ms / 1000) : 0;

    pruneProcessedCalls();
    
    // Log full payload for debugging (first time only)
    logger.info(`Event: ${event}`);
    logger.info(`Call ID: ${callId}`);
    logger.info(`Agent: ${agentName}`);
    logger.info(`Duration: ${duration} seconds`);

    if (event !== 'call_ended') {
      logger.info(`Ignoring non-terminal Retell event: ${event}`);
      return res.status(200).json({
        success: true,
        ignored: true,
        message: `Ignored event ${event}`,
        call_id: callId
      });
    }
    
    // Validate required fields
    if (!callId) {
      logger.error('Missing call_id in webhook payload');
      return res.status(400).json({ error: 'Missing call_id' });
    }

    if (!transcript) {
      logger.error('Missing transcript in webhook payload');
      logger.error(`Received payload keys: ${Object.keys(req.body).join(', ')}`);
      return res.status(400).json({ 
        error: 'Missing transcript',
        received_keys: Object.keys(req.body)
      });
    }

    if (processedCalls.has(callId)) {
      logger.warn(`Duplicate call-ended webhook ignored for call: ${callId}`);
      return res.status(200).json({
        success: true,
        ignored: true,
        message: 'Duplicate webhook ignored',
        call_id: callId
      });
    }

    processedCalls.set(callId, Date.now());
    
    logger.info(`Transcript length: ${transcript.length} characters`);
    logger.info(`Transcript preview: ${transcript.substring(0, 200)}...`);
    
    // Step 1: Generate report using GPT
    logger.info('Generating surgical report using AI...');
    const report = await gptService.generateReport(transcript);
    logger.info('✅ Report generated successfully');
    
    // Step 2: Send report via email
    logger.info('Sending report via email...');
    await emailService.sendEmail(report, callId);
    logger.info('✅ Email sent successfully');
    
    // Respond to Retell webhook
    res.status(200).json({ 
      success: true, 
      message: 'Surgical report generated and sent successfully',
      call_id: callId,
      transcript_length: transcript.length,
      report_length: report.length
    });
    
  } catch (error) {
    const failedCallId = req.body.call && req.body.call.call_id;
    if (failedCallId) {
      processedCalls.delete(failedCallId);
    }

    logger.error(`❌ Error processing webhook: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      message: error.message 
    });
  }
});

module.exports = router;
