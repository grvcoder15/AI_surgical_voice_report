const express = require('express');
const logger = require('../../utils/logger');
const dbService = require('../../services/dbService');
const retellService = require('../../services/retellService');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Get current Retell settings
router.get('/status', async (req, res) => {
  try {
    const settings = await dbService.getSettings();

    if (!settings) {
      return res.status(200).json({
        connected: false,
        message: 'No Retell settings configured',
      });
    }

    return res.status(200).json({
      connected: !!settings.retell_api_key_encrypted,
      agentId: settings.selected_agent_id,
      agentName: settings.selected_agent_name,
      hasApiKey: !!settings.retell_api_key_encrypted,
      message: 'Settings retrieved',
    });
  } catch (error) {
    logger.error(`Error fetching Retell status: ${error.message}`);
    return res.status(500).json({ error: 'Unable to fetch status' });
  }
});

// Save Retell API key and agent selection
router.post('/connect', async (req, res) => {
  try {
    const { apiKey, agentId, agentName } = req.body;

    if (!apiKey && !agentId && !agentName) {
      return res.status(400).json({ error: 'API key or agent data required' });
    }

    const settings = await dbService.getSettings();
    const resolvedApiKey = apiKey || settings?.retell_api_key_encrypted || null;

    if (!resolvedApiKey) {
      return res.status(400).json({ error: 'Retell API key is required' });
    }

    const agents = await retellService.fetchAgents(resolvedApiKey);

    let resolvedAgentId = agentId || settings?.selected_agent_id || null;
    let resolvedAgentName = agentName || settings?.selected_agent_name || null;

    if (resolvedAgentId) {
      const matched = agents.find((agent) => agent.id === resolvedAgentId);
      if (!matched) {
        return res.status(400).json({ error: 'Selected agent not found in Retell account' });
      }
      resolvedAgentName = matched.name;
    }

    if (!resolvedAgentId && agents.length === 1) {
      resolvedAgentId = agents[0].id;
      resolvedAgentName = agents[0].name;
    }

    const updatedSettings = await dbService.saveSettings(
      resolvedApiKey,
      resolvedAgentId,
      resolvedAgentName
    );

    logger.info('Retell settings updated');

    return res.status(200).json({
      message: 'Retell connection saved',
      settings: updatedSettings,
      connected: true,
      agents
    });
  } catch (error) {
    logger.error(`Error saving Retell settings: ${error.message}`);
    const message = error.message || 'Unable to save settings';

    if (message.toLowerCase().includes('invalid or unauthorized')) {
      return res.status(401).json({ error: message });
    }

    if (message.toLowerCase().includes('retell api error (4')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
});

// Get available agents (mock for now, will integrate with Retell API)
router.get('/agents', async (req, res) => {
  try {
    const settings = await dbService.getSettings();

    if (!settings?.retell_api_key_encrypted) {
      return res.status(400).json({ error: 'Connect Retell first to load agents' });
    }

    const agents = await retellService.fetchAgents(settings.retell_api_key_encrypted);
    return res.status(200).json(agents);
  } catch (error) {
    logger.error(`Error fetching agents: ${error.message}`);
    const message = error.message || 'Unable to fetch agents';

    if (message.toLowerCase().includes('invalid or unauthorized')) {
      return res.status(401).json({ error: message });
    }

    if (message.toLowerCase().includes('retell api error (4')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await dbService.clearSettings();
    return res.status(200).json({ connected: false, message: 'Disconnected successfully' });
  } catch (error) {
    logger.error(`Error disconnecting Retell: ${error.message}`);
    return res.status(500).json({ error: 'Unable to disconnect Retell' });
  }
});

module.exports = router;
