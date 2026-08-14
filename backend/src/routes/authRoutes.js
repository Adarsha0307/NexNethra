import express from 'express';
const router = express.Router();

import * as authController from '../controllers/authController.js';
import {
  loginLimiter,
  registerLimiter,
  verifyCodeLimiter,
  resendCodeLimiter,
  mfaVerifyLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../middleware/authRateLimiters.js';
import { requireAuth } from '../middleware/requireAuth.js';

router.post('/register', registerLimiter, authController.register);
router.post('/verify-email', verifyCodeLimiter, authController.verifyEmail);
router.post('/resend-code', resendCodeLimiter, authController.resendVerificationCode);
router.post('/login', loginLimiter, authController.login);
router.post('/login/verify-mfa', mfaVerifyLimiter, authController.verifyLoginMfa);
router.post('/mfa/setup', requireAuth, authController.startMfaSetup);
router.post('/mfa/confirm', requireAuth, authController.confirmMfaSetup);
router.post('/mfa/disable', requireAuth, authController.disableMfa);
router.post('/refresh', refreshLimiter, authController.refreshToken);
// Logout must not require a valid token — expired sessions still need cookie cleanup.
router.post('/logout', authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

export default router;
