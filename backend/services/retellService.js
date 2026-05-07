const { Blob } = require('buffer');
const axios = require('axios');
const logger = require('../utils/logger');

const RETELL_BASE_URL = process.env.RETELL_BASE_URL || 'https://api.retellai.com';

const RETELL_TIMEOUT_MS = Number(process.env.RETELL_TIMEOUT_MS || 30000);

const normalizeAgents = (payload) => {
  const candidates = [payload?.agents, payload?.data, payload];
  const rawList = candidates.find((item) => Array.isArray(item)) || [];

  return rawList
    .map((agent) => ({
      id: agent?.agent_id || agent?.id || '',
      name: agent?.agent_name || agent?.name || 'Unnamed Agent'
    }))
    .filter((agent) => agent.id);
};

const isAuthError = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

const isNotFoundError = (error) => error?.response?.status === 404;

const buildRetellError = (error, fallbackMessage) => {
  const status = error?.response?.status;
  const responseMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.statusText ||
    error?.message ||
    fallbackMessage;

  if (status) {
    return new Error(`Retell API error (${status}): ${responseMessage}`);
  }

  return new Error(responseMessage);
};

const requestRetell = async ({ apiKey, method = 'get', path, data, params, headers = {} }) => {
  return axios({
    method,
    url: `${RETELL_BASE_URL}${path}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...headers
    },
    data,
    params,
    timeout: RETELL_TIMEOUT_MS
  });
};

const buildListParams = () => ({
  is_latest: true,
  limit: 1000
});

const normalizeKnowledgeBaseIds = (knowledgeBaseIds) => {
  if (!Array.isArray(knowledgeBaseIds)) {
    return [];
  }

  return knowledgeBaseIds.filter(Boolean);
};

const buildKnowledgeBaseName = (fileName, agentName) => {
  const sanitizedAgentName = String(agentName || 'Agent')
    .replace(/[^a-zA-Z0-9 _-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sanitizedFileName = String(fileName || 'Upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9 _-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const baseName = `${sanitizedAgentName} ${sanitizedFileName}`.trim().slice(0, 40);
  return baseName || `KB-${Date.now()}`;
};

const buildKnowledgeBaseForm = (knowledgeBaseName, file) => {
  const formData = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.mimetype || 'application/octet-stream'
  });

  formData.append('knowledge_base_name', knowledgeBaseName);
  formData.append('knowledge_base_files', blob, file.originalname || 'knowledge-base.txt');

  return formData;
};

const fetchVoiceAgent = async (apiKey, agentId) => {
  const response = await requestRetell({
    apiKey,
    path: `/get-agent/${agentId}`
  });

  return {
    agentType: 'voice',
    ...response.data
  };
};

const fetchChatAgent = async (apiKey, agentId) => {
  const response = await requestRetell({
    apiKey,
    path: `/get-chat-agent/${agentId}`
  });

  return {
    agentType: 'chat',
    ...response.data
  };
};

const fetchAgentById = async (apiKey, agentId) => {
  try {
    return await fetchVoiceAgent(apiKey, agentId);
  } catch (voiceAgentError) {
    if (isAuthError(voiceAgentError)) {
      throw new Error('Retell API key is invalid or unauthorized');
    }

    if (isNotFoundError(voiceAgentError)) {
      try {
        return await fetchChatAgent(apiKey, agentId);
      } catch (chatAgentError) {
        if (isAuthError(chatAgentError)) {
          throw new Error('Retell API key is invalid or unauthorized');
        }

        throw buildRetellError(chatAgentError, 'Unable to load selected agent from Retell');
      }
    }

    throw buildRetellError(voiceAgentError, 'Unable to load selected agent from Retell');
  }
};

const fetchRetellLlm = async (apiKey, llmId) => {
  const response = await requestRetell({
    apiKey,
    path: `/get-retell-llm/${llmId}`
  });

  return response.data;
};

const fetchConversationFlow = async (apiKey, conversationFlowId) => {
  const response = await requestRetell({
    apiKey,
    path: `/get-conversation-flow/${conversationFlowId}`
  });

  return response.data;
};

const createKnowledgeBase = async (apiKey, file, knowledgeBaseName) => {
  const formData = buildKnowledgeBaseForm(knowledgeBaseName, file);
  const response = await requestRetell({
    apiKey,
    method: 'post',
    path: '/create-knowledge-base',
    data: formData
  });

  return response.data;
};

const updateRetellLlmKnowledgeBases = async (apiKey, llmId, knowledgeBaseIds) => {
  const response = await requestRetell({
    apiKey,
    method: 'patch',
    path: `/update-retell-llm/${llmId}`,
    data: {
      knowledge_base_ids: knowledgeBaseIds
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};

const updateConversationFlowKnowledgeBases = async (apiKey, conversationFlowId, knowledgeBaseIds) => {
  const response = await requestRetell({
    apiKey,
    method: 'patch',
    path: `/update-conversation-flow/${conversationFlowId}`,
    data: {
      knowledge_base_ids: knowledgeBaseIds
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};

const deleteKnowledgeBase = async (apiKey, knowledgeBaseId) => {
  await requestRetell({
    apiKey,
    method: 'delete',
    path: `/delete-knowledge-base/${knowledgeBaseId}`
  });
};

const publishAgent = async (apiKey, agentId, agentType = 'voice', publishMetadata = null) => {
  const publishPath = agentType === 'chat' ? `/publish-chat-agent/${agentId}` : `/publish-agent/${agentId}`;
  const versionName = String(publishMetadata?.versionName || '').trim();
  const versionDescription = String(publishMetadata?.versionDescription || '').trim();
  const payload = {};

  if (versionName) {
    payload.version_name = versionName;
  }

  if (versionDescription) {
    payload.version_description = versionDescription;
  }

  let metadataApplied = false;
  let usedFallback = false;

  if (Object.keys(payload).length > 0) {
    try {
      await requestRetell({
        apiKey,
        method: 'post',
        path: publishPath,
        data: payload,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      metadataApplied = true;
    } catch (metadataError) {
      usedFallback = true;
      logger.warn(
        `Retell publish metadata unsupported or failed, retrying plain publish: ${metadataError.message}`
      );
      await requestRetell({
        apiKey,
        method: 'post',
        path: publishPath,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } else {
    await requestRetell({
      apiKey,
      method: 'post',
      path: publishPath,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  return {
    published: true,
    metadata: {
      applied: metadataApplied,
      usedFallback,
      versionName,
      versionDescription
    }
  };
};

const replaceKnowledgeBaseAssignments = async ({
  apiKey,
  previousKnowledgeBaseIds,
  applyKnowledgeBaseIds,
  createdKnowledgeBaseId
}) => {
  try {
    await applyKnowledgeBaseIds([createdKnowledgeBaseId]);
  } catch (error) {
    try {
      await deleteKnowledgeBase(apiKey, createdKnowledgeBaseId);
    } catch (cleanupError) {
      logger.warn(
        `Failed to delete newly created Retell KB ${createdKnowledgeBaseId} after update failure: ${cleanupError.message}`
      );
    }

    throw error;
  }

  const deletedKnowledgeBaseIds = [];
  const failedDeleteKnowledgeBaseIds = [];

  for (const knowledgeBaseId of previousKnowledgeBaseIds) {
    if (!knowledgeBaseId || knowledgeBaseId === createdKnowledgeBaseId) {
      continue;
    }

    try {
      await deleteKnowledgeBase(apiKey, knowledgeBaseId);
      deletedKnowledgeBaseIds.push(knowledgeBaseId);
    } catch (error) {
      failedDeleteKnowledgeBaseIds.push(knowledgeBaseId);
      logger.warn(`Failed to delete stale Retell KB ${knowledgeBaseId}: ${error.message}`);
    }
  }

  return {
    deletedKnowledgeBaseIds,
    failedDeleteKnowledgeBaseIds
  };
};

const fetchAgents = async (apiKey) => {
  try {
    const response = await requestRetell({
      apiKey,
      path: '/list-agents',
      params: buildListParams()
    });
    return normalizeAgents(response.data);
  } catch (voiceAgentError) {
    if (isAuthError(voiceAgentError)) {
      throw new Error('Retell API key is invalid or unauthorized');
    }

    const status = voiceAgentError?.response?.status;

    // Some accounts may only have chat agents enabled.
    if (status === 404) {
      try {
        const chatResponse = await requestRetell({
          apiKey,
          path: '/list-chat-agents',
          params: buildListParams()
        });
        return normalizeAgents(chatResponse.data);
      } catch (chatAgentError) {
        if (isAuthError(chatAgentError)) {
          throw new Error('Retell API key is invalid or unauthorized');
        }

        throw buildRetellError(chatAgentError, 'Unable to fetch agents from Retell');
      }
    }

    throw buildRetellError(voiceAgentError, 'Unable to fetch agents from Retell');
  }
};

const syncAgentKnowledgeBase = async (apiKey, agentId, file, agentName) => {
  const agent = await fetchAgentById(apiKey, agentId);
  const responseEngine = agent?.response_engine;

  if (!responseEngine?.type) {
    throw new Error('Selected Retell agent is missing response engine configuration');
  }

  const knowledgeBaseName = buildKnowledgeBaseName(file?.originalname, agentName || agent?.agent_name || agentId);
  const createdKnowledgeBase = await createKnowledgeBase(apiKey, file, knowledgeBaseName);
  const createdKnowledgeBaseId = createdKnowledgeBase?.knowledge_base_id;

  if (!createdKnowledgeBaseId) {
    throw new Error('Retell did not return a knowledge base ID for the uploaded file');
  }

  if (responseEngine.type === 'retell-llm') {
    const llm = await fetchRetellLlm(apiKey, responseEngine.llm_id);
    const previousKnowledgeBaseIds = normalizeKnowledgeBaseIds(llm?.knowledge_base_ids);
    const cleanupResult = await replaceKnowledgeBaseAssignments({
      apiKey,
      previousKnowledgeBaseIds,
      createdKnowledgeBaseId,
      applyKnowledgeBaseIds: (knowledgeBaseIds) =>
        updateRetellLlmKnowledgeBases(apiKey, responseEngine.llm_id, knowledgeBaseIds)
    });

    return {
      agentType: agent.agentType,
      responseEngineType: responseEngine.type,
      createdKnowledgeBase,
      previousKnowledgeBaseIds,
      ...cleanupResult
    };
  }

  if (responseEngine.type === 'conversation-flow') {
    const conversationFlow = await fetchConversationFlow(apiKey, responseEngine.conversation_flow_id);
    const previousKnowledgeBaseIds = normalizeKnowledgeBaseIds(conversationFlow?.knowledge_base_ids);
    const cleanupResult = await replaceKnowledgeBaseAssignments({
      apiKey,
      previousKnowledgeBaseIds,
      createdKnowledgeBaseId,
      applyKnowledgeBaseIds: (knowledgeBaseIds) =>
        updateConversationFlowKnowledgeBases(apiKey, responseEngine.conversation_flow_id, knowledgeBaseIds)
    });

    return {
      agentType: agent.agentType,
      responseEngineType: responseEngine.type,
      createdKnowledgeBase,
      previousKnowledgeBaseIds,
      ...cleanupResult
    };
  }

  try {
    await deleteKnowledgeBase(apiKey, createdKnowledgeBaseId);
  } catch (cleanupError) {
    logger.warn(
      `Failed to delete unsupported response-engine KB ${createdKnowledgeBaseId}: ${cleanupError.message}`
    );
  }

  throw new Error(`Unsupported Retell response engine type: ${responseEngine.type}`);
};

module.exports = {
  fetchAgents,
  syncAgentKnowledgeBase,
  publishAgent
};