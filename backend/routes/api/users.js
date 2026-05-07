const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../../middleware/auth');
const dbService = require('../../services/dbService');
const logger = require('../../utils/logger');

const router = express.Router();

const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);

// GET /api/users/me - fetch full profile from DB
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await dbService.getUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_number || null,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error(`Error fetching user profile: ${error.message}`);
    return res.status(500).json({ error: 'Unable to fetch profile' });
  }
});

// PUT /api/users/me - update phone number
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { phone } = req.body;
    const normalized = String(phone || '').trim();
    if (!normalized) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const updated = await dbService.updateUserPhone(req.user.sub, normalized);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      message: 'Phone number updated',
      user: {
        id: updated.id,
        email: updated.email,
        phone: updated.phone_number || null,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    logger.error(`Error updating phone: ${error.message}`);
    return res.status(500).json({ error: 'Unable to update phone number' });
  }
});

// PUT /api/users/change-password
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await dbService.getUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await dbService.updateUserPassword(req.user.sub, newHash);

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error(`Error changing password: ${error.message}`);
    return res.status(500).json({ error: 'Unable to change password' });
  }
});

module.exports = router;
