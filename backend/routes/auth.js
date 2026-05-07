const express = require('express');
const logger = require('../utils/logger');
const authService = require('../services/authService');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;
    const result = await authService.signup({ email, password, phoneNumber });

    logger.info(`User signed up: ${result.user.email}`);
    return res.status(201).json({
      token: result.token,
      user: result.user,
      message: 'Signup successful'
    });
  } catch (error) {
    logger.error(`Signup error: ${error.message}`);
    return res.status(error.statusCode || 400).json({ error: error.message || 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    logger.info(`User logged in: ${result.user.email}`);
    return res.status(200).json({
      token: result.token,
      user: result.user,
      message: 'Login successful'
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return res.status(error.statusCode || 400).json({ error: error.message || 'Login failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword({ email });

    logger.info(`Password reset requested for email: ${String(email || '').trim().toLowerCase()}`);
    return res.status(200).json({ message: result.message });
  } catch (error) {
    logger.error(`Forgot-password error: ${error.message}`);
    return res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Unable to process forgot-password request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });

    logger.info('Password reset completed successfully');
    return res.status(200).json({ message: result.message });
  } catch (error) {
    logger.error(`Reset-password error: ${error.message}`);
    return res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Unable to reset password' });
  }
});

module.exports = router;
