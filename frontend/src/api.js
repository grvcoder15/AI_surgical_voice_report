import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '';
export const TOKEN_KEY = process.env.REACT_APP_TOKEN_STORAGE_KEY || 'surgical_token';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT_MS || '30000', 10)
});

const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const parseJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const json = atob(padded);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) {
    return true;
  }

  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (!exp) {
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= exp;
};

export const hasActiveToken = () => {
  const token = getToken();
  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    clearSession();
    return false;
  }

  return true;
};

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || error?.response?.data?.error || fallbackMessage;
  return new Error(message);
};

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);

export const validateSession = async () => {
  if (!hasActiveToken()) {
    return false;
  }

  try {
    await client.get('/api/users/me', {
      headers: authHeaders()
    });
    return true;
  } catch (error) {
    clearSession();
    return false;
  }
};

export const login = async (password) => {
  try {
    const response = await client.post('/api/auth/login', password);
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Login failed');
  }
};

export const signup = async (payload) => {
  try {
    const response = await client.post('/api/auth/signup', payload);
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Signup failed');
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const response = await client.post('/api/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to request password reset');
  }
};

export const resetPasswordWithToken = async (token, newPassword) => {
  try {
    const response = await client.post('/api/auth/reset-password', { token, newPassword });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to reset password');
  }
};

export const getRetellStatus = async () => {
  try {
    const response = await client.get('/api/retell/status', {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to fetch Retell status');
  }
};

export const connectRetell = async (apiKey, agentId, agentName = null) => {
  try {
    const response = await client.post(
      '/api/retell/connect',
      {
        apiKey,
        agentId,
        agentName
      },
      {
        headers: authHeaders()
      }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to connect Retell');
  }
};

export const disconnectRetell = async () => {
  try {
    const response = await client.post(
      '/api/retell/disconnect',
      {},
      {
        headers: authHeaders()
      }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to disconnect Retell');
  }
};

export const getAgents = async () => {
  try {
    const response = await client.get('/api/retell/agents', {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to fetch agents');
  }
};

export const uploadKB = async (file, onProgress) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await client.post('/api/kb/upload', formData, {
      headers: {
        ...authHeaders()
      },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) {
          return;
        }
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    });

    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to upload knowledge base');
  }
};

export const getKBHistory = async () => {
  try {
    const response = await client.get('/api/kb/history', {
      headers: authHeaders()
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to fetch upload history');
  }
};

export const getProfile = async () => {
  try {
    const response = await client.get('/api/users/me', {
      headers: authHeaders()
    });
    return response.data.user;
  } catch (error) {
    throw normalizeError(error, 'Unable to fetch profile');
  }
};

export const updatePhone = async (phone) => {
  try {
    const response = await client.put(
      '/api/users/me',
      { phone },
      { headers: authHeaders() }
    );
    return response.data.user;
  } catch (error) {
    throw normalizeError(error, 'Unable to update phone number');
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await client.put(
      '/api/users/change-password',
      { currentPassword, newPassword },
      { headers: authHeaders() }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Unable to change password');
  }
};
