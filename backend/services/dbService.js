const db = require('../config/db');
const logger = require('../utils/logger');

class DBService {
  async initializeSchema() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          retell_api_key_encrypted TEXT,
          selected_agent_id TEXT,
          selected_agent_name TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        ALTER TABLE settings
        ADD COLUMN IF NOT EXISTS retell_agent_type TEXT
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash)'
      );

      await db.query(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
          id SERIAL PRIMARY KEY,
          version INTEGER NOT NULL,
          filename TEXT NOT NULL,
          content TEXT NOT NULL,
          agent_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        ALTER TABLE knowledge_base
        ADD COLUMN IF NOT EXISTS retell_knowledge_base_id TEXT
      `);

      await db.query(`
        ALTER TABLE knowledge_base
        ADD COLUMN IF NOT EXISTS retell_sync_status TEXT
      `);

      await db.query(`
        ALTER TABLE knowledge_base
        ADD COLUMN IF NOT EXISTS retell_synced_at TIMESTAMP
      `);

      await db.query(`
        ALTER TABLE knowledge_base
        ADD COLUMN IF NOT EXISTS agent_name TEXT
      `);

      await db.query('CREATE INDEX IF NOT EXISTS idx_kb_version ON knowledge_base(version DESC)');
      logger.info('Database schema initialized');
    } catch (error) {
      logger.error(`Error initializing schema: ${error.message}`);
      throw error;
    }
  }

  serializeUser(user) {
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phone_number,
      createdAt: user.created_at
    };
  }

  async createUser({ email, passwordHash, phoneNumber }) {
    try {
      const result = await db.query(
        `INSERT INTO users (email, password_hash, phone_number)
         VALUES ($1, $2, $3)
         RETURNING id, email, phone_number, created_at`,
        [email, passwordHash, phoneNumber]
      );
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const result = await db.query(
        `SELECT id, email, password_hash, phone_number, created_at
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching user by email: ${error.message}`);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const result = await db.query(
        `SELECT id, email, password_hash, phone_number, created_at
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching user by id: ${error.message}`);
      throw error;
    }
  }

  async updateUserPhone(id, phoneNumber) {
    try {
      const result = await db.query(
        `UPDATE users
         SET phone_number = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, phone_number, created_at`,
        [phoneNumber, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating phone number: ${error.message}`);
      throw error;
    }
  }

  async updateUserPassword(id, passwordHash) {
    try {
      await db.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, id]
      );
    } catch (error) {
      logger.error(`Error updating password: ${error.message}`);
      throw error;
    }
  }

  async createPasswordResetToken(userId, tokenHash, expiresAt) {
    try {
      const result = await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
        [userId, tokenHash, expiresAt]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error creating password reset token: ${error.message}`);
      throw error;
    }
  }

  async getValidPasswordResetToken(tokenHash) {
    try {
      const result = await db.query(
        `SELECT id, user_id AS "userId", expires_at AS "expiresAt"
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [tokenHash]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching password reset token: ${error.message}`);
      throw error;
    }
  }

  async markPasswordResetTokenUsed(id) {
    try {
      await db.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE id = $1`,
        [id]
      );
    } catch (error) {
      logger.error(`Error marking reset token as used: ${error.message}`);
      throw error;
    }
  }

  async invalidateUserPasswordResetTokens(userId) {
    try {
      await db.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1
           AND used_at IS NULL`,
        [userId]
      );
    } catch (error) {
      logger.error(`Error invalidating user reset tokens: ${error.message}`);
      throw error;
    }
  }

  async getSettings() {
    try {
      const result = await db.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching settings: ${error.message}`);
      throw error;
    }
  }

  async saveSettings(retellApiKey, selectedAgentId, selectedAgentName) {
    try {
      const existingSettings = await this.getSettings();

      if (existingSettings) {
        const result = await db.query(
          `UPDATE settings
           SET retell_api_key_encrypted = $1,
               selected_agent_id = $2,
               selected_agent_name = $3,
               updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [retellApiKey, selectedAgentId, selectedAgentName, existingSettings.id]
        );
        return result.rows[0];
      }

      const result = await db.query(
        `INSERT INTO settings (retell_api_key_encrypted, selected_agent_id, selected_agent_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [retellApiKey, selectedAgentId, selectedAgentName]
      );
      return result.rows[0];
    } catch (error) {
      logger.error(`Error saving settings: ${error.message}`);
      throw error;
    }
  }

  async clearSettings() {
    try {
      const existingSettings = await this.getSettings();

      if (existingSettings) {
        await db.query(
          `UPDATE settings
           SET retell_api_key_encrypted = NULL,
               selected_agent_id = NULL,
               selected_agent_name = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [existingSettings.id]
        );
        return;
      }

      await db.query(
        `INSERT INTO settings (retell_api_key_encrypted, selected_agent_id, selected_agent_name)
         VALUES (NULL, NULL, NULL)`
      );
    } catch (error) {
      logger.error(`Error clearing settings: ${error.message}`);
      throw error;
    }
  }

  async getNextKBVersion() {
    try {
      const result = await db.query(
        'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM knowledge_base'
      );
      return Number(result.rows[0].next_version);
    } catch (error) {
      logger.error(`Error getting next KB version: ${error.message}`);
      throw error;
    }
  }

  async saveKBVersion(version, filename, content, agentId = null, retellSync = {}, agentName = null) {
    try {
      const retellKnowledgeBaseId = retellSync.retellKnowledgeBaseId || null;
      const retellSyncStatus = retellSync.retellSyncStatus || (retellKnowledgeBaseId ? 'synced' : 'local-only');
      const retellSyncedAt = retellSync.retellSyncedAt || (retellKnowledgeBaseId ? new Date() : null);

      const result = await db.query(
        `INSERT INTO knowledge_base (
           version,
           filename,
           content,
           agent_id,
           agent_name,
           retell_knowledge_base_id,
           retell_sync_status,
           retell_synced_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          version,
          filename,
          content,
          agentId,
          agentName,
          retellKnowledgeBaseId,
          retellSyncStatus,
          retellSyncedAt
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error(`Error saving KB version: ${error.message}`);
      throw error;
    }
  }

  async getKBHistory(limit = 20) {
    try {
      const result = await db.query(
        `SELECT
           id,
           version,
           filename,
           agent_id AS "agentId",
           agent_name AS "agentName",
           retell_knowledge_base_id AS "retellKnowledgeBaseId",
           retell_sync_status AS "retellSyncStatus",
           retell_synced_at AS "retellSyncedAt",
           created_at AS "createdAt"
         FROM knowledge_base
         ORDER BY version DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching KB history: ${error.message}`);
      throw error;
    }
  }

  async getLatestKB() {
    try {
      const result = await db.query(
        `SELECT
           id,
           version,
           filename,
           content,
           agent_id AS "agentId",
           retell_knowledge_base_id AS "retellKnowledgeBaseId",
           retell_sync_status AS "retellSyncStatus",
           retell_synced_at AS "retellSyncedAt",
           created_at AS "createdAt"
         FROM knowledge_base
         ORDER BY version DESC
         LIMIT 1`
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching latest KB: ${error.message}`);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const result = await db.query('SELECT NOW() AS current_time');
      return { status: 'ok', timestamp: result.rows[0].current_time };
    } catch (error) {
      logger.error(`Database health check failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DBService();
