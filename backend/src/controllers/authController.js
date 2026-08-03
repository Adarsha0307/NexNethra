import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { analyzePassword } from '../utils/passwordAnalyzer.js';
import { sendVerificationCodeEmail, sendPasswordResetEmail } from '../utils/email.js';
import {
  generateCode,
  hashCode,
  verifyCode,
  getExpiryTimestamp,
  isExpired,
  RESEND_COOLDOWN_MS,
} from '../utils/verificationCode.js';
import {
  generateSecret,
  buildOtpAuthUrl,
  generateQrCodeDataUrl,
  verifyToken,
} from '../utils/totp.js';
import * as userStore from '../utils/userStore.js';
import { generateRefreshToken, storeRefreshToken, rotateRefreshToken, revokeUserTokens } from '../utils/refreshTokens.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = '15m';
const MFA_PENDING_TOKEN_TTL = '5m';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
}

function signAccessToken(userId, email) {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

async function issueTokens(userId, email) {
  const accessToken = signAccessToken(userId, email);
  const refreshToken = generateRefreshToken();
  const familyId = crypto.randomUUID();
  await storeRefreshToken(userId, refreshToken, familyId);
  return { accessToken, refreshToken };
}

export async function register(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const emailNormalized = String(email).trim().toLowerCase();

    const analysis = analyzePassword(password, {
      email: emailNormalized,
      firstName,
      lastName,
    });
    if (!analysis.valid) {
      return res.status(400).json({ error: 'Weak password.', reasons: analysis.reasons });
    }

    const existing = await userStore.findUserByEmail(emailNormalized);
    if (existing) {
      return res.status(400).json({ error: 'Unable to register with these details.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const code = generateCode();
    const verificationCodeHash = hashCode(code);
    const verificationCodeExpiry = getExpiryTimestamp();

    const user = await userStore.createUser({
      firstName,
      lastName,
      email: emailNormalized,
      passwordHash,
      verificationCodeHash,
      verificationCodeExpiry,
    });

    console.log('[register] Generating OTP and sending to:', emailNormalized);
    try {
      await sendVerificationCodeEmail(emailNormalized, code);
      console.log('[register] Verification email sent successfully.');
    } catch (emailErr) {
      console.error('[register] Failed to send verification email:', emailErr.message);
    }

    return res.status(201).json({
      message: 'Account created. Check your email for a verification code.',
      userId: user.id,
      devCode: !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_') ? code : undefined,
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Something went wrong during registration.' });
  }
}

export async function verifyEmail(req, res) {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code are required.' });
    }

    const user = await userStore.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified.' });
    }

    if (user.verificationAttempts >= 5) {
      return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpiry) {
      return res.status(400).json({ error: 'No verification code has been sent. Request a new one.' });
    }

    if (isExpired(user.verificationCodeExpiry)) {
      return res.status(400).json({ error: 'Verification code has expired. Request a new one.' });
    }

    if (!verifyCode(code, user.verificationCodeHash)) {
      await userStore.updateUser(user.id, { verificationAttempts: user.verificationAttempts + 1 });
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await userStore.updateUser(user.id, {
      emailVerified: true,
      verificationCodeHash: null,
      verificationCodeExpiry: null,
      verificationAttempts: 0,
    });

    return res.json({ message: 'Email verified. Your account is now active.' });
  } catch (err) {
    console.error('verifyEmail error:', err);
    return res.status(500).json({ error: 'Something went wrong verifying your email.' });
  }
}

export async function resendVerificationCode(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const user = await userStore.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    const elapsed = Date.now() - (user.lastCodeSentAt || 0);
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new code.` });
    }

    const code = generateCode();
    const verificationCodeHash = hashCode(code);
    const verificationCodeExpiry = getExpiryTimestamp();

    await userStore.updateUser(user.id, {
      verificationCodeHash,
      verificationCodeExpiry,
      verificationAttempts: 0,
      lastCodeSentAt: Date.now(),
    });

    try {
      await sendVerificationCodeEmail(user.email, code);
    } catch (emailErr) {
      console.warn('Failed to send verification email:', emailErr.message);
    }

    return res.json({
      message: 'A new verification code has been sent.',
      devCode: !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_') ? code : undefined,
    });
  } catch (err) {
    console.error('resendVerificationCode error:', err);
    return res.status(500).json({ error: 'Something went wrong while resending the code.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await userStore.findUserByEmail(String(email).trim().toLowerCase());

    const invalidCredsError = () => res.status(401).json({ error: 'Invalid email or password.' });

    if (!user) return invalidCredsError();

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return invalidCredsError();

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', userId: user.id });
    }

    if (user.mfaEnabled) {
      const pendingToken = jwt.sign(
        { userId: user.id, scope: 'mfa_pending' },
        getJwtSecret(),
        { expiresIn: MFA_PENDING_TOKEN_TTL }
      );
      return res.json({ mfaRequired: true, pendingToken });
    }

    const tokens = await issueTokens(user.id, user.email);
    return res.json(tokens);
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Something went wrong during login.' });
  }
}

export async function verifyLoginMfa(req, res) {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) {
      return res.status(400).json({ error: 'pendingToken and code are required.' });
    }

    let payload;
    try {
      payload = jwt.verify(pendingToken, getJwtSecret());
    } catch (err) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (payload.scope !== 'mfa_pending') {
      return res.status(401).json({ error: 'Invalid session token.' });
    }

    const user = await userStore.findUserById(payload.userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA is not properly configured for this account.' });
    }

    const valid = verifyToken(code, user.mfaSecret);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect authentication code.' });
    }

    const tokens = await issueTokens(user.id, user.email);
    return res.json(tokens);
  } catch (err) {
    console.error('verifyLoginMfa error:', err);
    return res.status(500).json({ error: 'Something went wrong verifying MFA.' });
  }
}

export async function refreshToken(req, res) {
  try {
    const { refreshToken: rawToken } = req.body;
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ error: 'refreshToken is required.' });
    }

    const result = await rotateRefreshToken(rawToken);

    if (result.error === 'INVALID_TOKEN') {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
    if (result.error === 'EXPIRED') {
      return res.status(401).json({ error: 'Refresh token has expired. Please log in again.' });
    }
    if (result.error === 'THEFT_DETECTED') {
      console.warn('[SECURITY] Refresh token reuse detected — all tokens revoked for user.');
      return res.status(401).json({ error: 'Session revoked due to suspicious activity. Please log in again.' });
    }

    const user = await userStore.findUserById(result.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const accessToken = signAccessToken(user.id, user.email);
    return res.json({ accessToken, refreshToken: result.token });
  } catch (err) {
    console.error('refreshToken error:', err);
    return res.status(500).json({ error: 'Something went wrong refreshing the token.' });
  }
}

export async function logout(req, res) {
  try {
    const userId = req.user?.userId;
    if (userId) {
      await revokeUserTokens(userId);
    }
    return res.json({ message: 'Logged out.' });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ error: 'Something went wrong during logout.' });
  }
}

export async function startMfaSetup(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const user = await userStore.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const secret = generateSecret();
    const otpAuthUrl = buildOtpAuthUrl(user.email, secret);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);

    await userStore.updateUser(user.id, { mfaPendingSecret: secret });

    return res.json({ qrCodeDataUrl, secret });
  } catch (err) {
    console.error('startMfaSetup error:', err);
    return res.status(500).json({ error: 'Something went wrong starting MFA setup.' });
  }
}

export async function confirmMfaSetup(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required.' });

    const user = await userStore.findUserById(userId);
    if (!user || !user.mfaPendingSecret) {
      return res.status(400).json({ error: 'No MFA setup in progress.' });
    }

    const valid = verifyToken(code, user.mfaPendingSecret);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }

    await userStore.updateUser(user.id, {
      mfaEnabled: true,
      mfaSecret: user.mfaPendingSecret,
      mfaPendingSecret: null,
    });

    return res.json({ message: 'MFA has been enabled on your account.' });
  } catch (err) {
    console.error('confirmMfaSetup error:', err);
    return res.status(500).json({ error: 'Something went wrong confirming MFA setup.' });
  }
}

export async function disableMfa(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    await userStore.updateUser(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaPendingSecret: null,
    });

    return res.json({ message: 'MFA has been disabled.' });
  } catch (err) {
    console.error('disableMfa error:', err);
    return res.status(500).json({ error: 'Something went wrong disabling MFA.' });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const emailNormalized = String(email).trim().toLowerCase();
    const user = await userStore.findUserByEmail(emailNormalized);

    // Always respond the same way to avoid user enumeration
    const genericMessage = 'If an account exists for that email, a reset code has been sent.';

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const code = generateCode();
    await userStore.updateUser(user.id, {
      resetCodeHash: hashCode(code),
      resetCodeExpiry: getExpiryTimestamp(),
    });

    try {
      await sendPasswordResetEmail(user.email, code);
    } catch (emailErr) {
      console.warn('Failed to send password reset email:', emailErr.message);
    }

    return res.json({
      message: genericMessage,
      devCode: !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_') ? code : undefined,
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Something went wrong requesting a password reset.' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and new password are required.' });
    }

    const emailNormalized = String(email).trim().toLowerCase();
    const user = await userStore.findUserByEmail(emailNormalized);
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (!user.resetCodeHash || !user.resetCodeExpiry) {
      return res.status(400).json({ error: 'No password reset request found. Request a new code.' });
    }

    if (isExpired(user.resetCodeExpiry)) {
      return res.status(400).json({ error: 'Reset code has expired. Request a new one.' });
    }

    if (!verifyCode(code, user.resetCodeHash)) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    const analysis = analyzePassword(password, { email: emailNormalized });
    if (!analysis.valid) {
      return res.status(400).json({ error: 'Weak password.', reasons: analysis.reasons });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await userStore.updateUser(user.id, {
      passwordHash,
      resetCodeHash: null,
      resetCodeExpiry: null,
    });

    await revokeUserTokens(user.id);

    return res.json({ message: 'Password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Something went wrong resetting the password.' });
  }
}
