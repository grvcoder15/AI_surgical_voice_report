const express = require('express');
const multer = require('multer');
const logger = require('../../utils/logger');
const dbService = require('../../services/dbService');
const retellService = require('../../services/retellService');
const { parseFileToText } = require('../../utils/fileParser');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const sanitizeSingleLine = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const buildPublishVersionName = (version, fileName) => {
  const baseFileName = sanitizeSingleLine(fileName).replace(/\.[^.]+$/, '');
  const compactFileName = baseFileName.slice(0, 28);
  const label = compactFileName ? `KB v${version} - ${compactFileName}` : `KB v${version}`;
  return label.slice(0, 60);
};

const buildPublishVersionDescription = ({ fileName, knowledgeBaseId, responseEngineType, uploadedAtIso }) => {
  const safeFileName = sanitizeSingleLine(fileName);
  const safeKnowledgeBaseId = sanitizeSingleLine(knowledgeBaseId);
  const safeEngine = sanitizeSingleLine(responseEngineType);
  const safeTimestamp = sanitizeSingleLine(uploadedAtIso);

  const description = `KB sync from ${safeFileName}. Retell KB ${safeKnowledgeBaseId} attached to ${safeEngine} at ${safeTimestamp}.`;
  return description.slice(0, 300);
};

router.use(requireAuth);

// Upload new KB version
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const steps = [];
    const addStep = (step, status, message) => {
      steps.push({ step, status, message, timestamp: new Date().toISOString() });
    };

    addStep('upload_received', 'completed', 'Upload request received');

    if (!req.file) {
      return res.status(400).json({ error: 'File is required', steps });
    }

    addStep('file_validation', 'completed', `File accepted: ${req.file.originalname}`);

    const settings = await dbService.getSettings();
    if (!settings?.selected_agent_id) {
      addStep('agent_check', 'failed', 'No agent selected in settings');
      return res.status(400).json({ error: 'Please select an agent in settings before upload', steps });
    }

    if (!settings?.retell_api_key_encrypted) {
      addStep('retell_auth', 'failed', 'Retell API key is not configured');
      return res.status(400).json({ error: 'Please connect Retell before uploading a KB', steps });
    }

    addStep('agent_check', 'completed', `Target agent: ${settings.selected_agent_name || settings.selected_agent_id}`);
    addStep('retell_auth', 'completed', 'Retell credentials found');

    const content = await parseFileToText(req.file);
    if (!content) {
      addStep('content_extraction', 'failed', 'No readable text found in file');
      return res.status(400).json({ error: 'Uploaded file has no readable text', steps });
    }

    addStep('content_extraction', 'completed', 'Readable content extracted from file');

    addStep('retell_sync', 'in-progress', 'Uploading knowledge base to Retell');

    const retellSync = await retellService.syncAgentKnowledgeBase(
      settings.retell_api_key_encrypted,
      settings.selected_agent_id,
      req.file,
      settings.selected_agent_name
    );

    addStep(
      'retell_sync',
      'completed',
      `Retell KB ${retellSync.createdKnowledgeBase.knowledge_base_id} attached to ${retellSync.responseEngineType}`
    );

    if (retellSync.deletedKnowledgeBaseIds.length) {
      addStep(
        'retell_cleanup',
        'completed',
        `Removed ${retellSync.deletedKnowledgeBaseIds.length} stale Retell KB reference(s)`
      );
    }

    if (retellSync.failedDeleteKnowledgeBaseIds.length) {
      addStep(
        'retell_cleanup',
        'warning',
        `New KB is active, but ${retellSync.failedDeleteKnowledgeBaseIds.length} old Retell KB(s) could not be deleted`
      );
    }

    const nextVersion = await dbService.getNextKBVersion();
    const publishVersionName = buildPublishVersionName(nextVersion, req.file.originalname);
    const publishVersionDescription = buildPublishVersionDescription({
      fileName: req.file.originalname,
      knowledgeBaseId: retellSync.createdKnowledgeBase.knowledge_base_id,
      responseEngineType: retellSync.responseEngineType,
      uploadedAtIso: new Date().toISOString()
    });

    addStep('retell_publish', 'in-progress', 'Publishing updated agent in Retell');
    const publishResult = await retellService.publishAgent(
      settings.retell_api_key_encrypted,
      settings.selected_agent_id,
      retellSync.agentType,
      {
        versionName: publishVersionName,
        versionDescription: publishVersionDescription
      }
    );
    const publishMetadataMessage = publishResult.metadata.applied
      ? `Agent published successfully with version metadata (${publishResult.metadata.usedFallback ? 'description-only fallback' : 'name + description'})`
      : 'Agent published successfully';
    addStep('retell_publish', 'completed', publishMetadataMessage);

    const savedKB = await dbService.saveKBVersion(
      nextVersion,
      req.file.originalname,
      content,
      settings.selected_agent_id,
      {
        retellKnowledgeBaseId: retellSync.createdKnowledgeBase.knowledge_base_id,
        retellSyncStatus: retellSync.failedDeleteKnowledgeBaseIds.length ? 'synced-with-cleanup-warning' : 'synced',
        retellSyncedAt: new Date()
      },
      settings.selected_agent_name || null
    );

    addStep('database_save', 'completed', `Saved as version ${nextVersion}`);
    addStep('done', 'completed', 'Knowledge base updated, synced, and published in Retell');

    logger.info(`KB version ${nextVersion} uploaded: ${req.file.originalname}`);

    return res.status(201).json({
      message: 'Knowledge base uploaded, synced, and published successfully',
      version: nextVersion,
      filename: savedKB.filename,
      id: savedKB.id,
      agentId: settings.selected_agent_id,
      agentName: settings.selected_agent_name,
      retellKnowledgeBaseId: retellSync.createdKnowledgeBase.knowledge_base_id,
      publishVersionName,
      publishVersionDescription,
      publishMetadataFallbackUsed: publishResult.metadata.usedFallback,
      steps
    });
  } catch (error) {
    logger.error(`Error uploading KB: ${error.message}`);
    const message = error.message || 'Unable to upload KB';

    if (message.toLowerCase().includes('invalid or unauthorized')) {
      return res.status(401).json({ error: message });
    }

    if (message.toLowerCase().includes('retell api error (4')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
});

// Get KB history
router.get('/history', async (req, res) => {
  try {
    const history = await dbService.getKBHistory(50);

    return res.status(200).json(history);
  } catch (error) {
    logger.error(`Error fetching KB history: ${error.message}`);
    return res.status(500).json({ error: 'Unable to fetch KB history' });
  }
});

// Get latest KB version
router.get('/latest', async (req, res) => {
  try {
    const latestKB = await dbService.getLatestKB();

    if (!latestKB) {
      return res.status(404).json({ error: 'No KB versions found' });
    }

    return res.status(200).json(latestKB);
  } catch (error) {
    logger.error(`Error fetching latest KB: ${error.message}`);
    return res.status(500).json({ error: 'Unable to fetch latest KB' });
  }
});

module.exports = router;
