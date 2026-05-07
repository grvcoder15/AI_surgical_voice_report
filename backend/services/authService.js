const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const dbService = require('./dbService');
const emailService = require('./emailService');

const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 15);

function buildToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      phone: user.phone_number || null
    },
    process.env.AUTH_TOKEN_SECRET,
    {
      expiresIn: process.env.AUTH_TOKEN_TTL || '7d'
    }
  );
}

async function signup({ email, password, phoneNumber }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phoneNumber || '').trim();

  if (!normalizedEmail || !password || !normalizedPhone) {
    throw new Error('Email, password, and phone number are required');
  }

  const existingUser = await dbService.getUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await dbService.createUser({
    email: normalizedEmail,
    passwordHash,
    phoneNumber: normalizedPhone
  });

  return {
    token: buildToken(user),
    user: dbService.serializeUser(user)
  };
}

async function login({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required');
  }

  const user = await dbService.getUserByEmail(normalizedEmail);
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  return {
    token: buildToken(user),
    user: dbService.serializeUser(user)
  };
}

async function forgotPassword({ email }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const genericMessage =
    'If an account exists for this email, a password reset link has been sent.';

  const user = await dbService.getUserByEmail(normalizedEmail);
  if (!user) {
    return { message: genericMessage };
  }

  await dbService.invalidateUserPasswordResetTokens(user.id);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await dbService.createPasswordResetToken(user.id, tokenHash, expiresAt);

  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await emailService.sendPasswordResetEmail(user.email, resetLink, expiresAt);

  return { message: genericMessage };
}

async function resetPassword({ token, newPassword }) {
  const normalizedToken = String(token || '').trim();
  const normalizedPassword = String(newPassword || '');

  if (!normalizedToken || !normalizedPassword) {
    const error = new Error('Token and new password are required');
    error.statusCode = 400;
    throw error;
  }

  if (normalizedPassword.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
  const tokenRecord = await dbService.getValidPasswordResetToken(tokenHash);

  if (!tokenRecord) {
    const error = new Error('Invalid or expired reset token');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, SALT_ROUNDS);
  await dbService.updateUserPassword(tokenRecord.userId, passwordHash);
  await dbService.markPasswordResetTokenUsed(tokenRecord.id);
  await dbService.invalidateUserPasswordResetTokens(tokenRecord.userId);

  return { message: 'Password reset successful. Please login with your new password.' };
}

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword
};
