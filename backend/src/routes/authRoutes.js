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
router.post('/logout', requireAuth, authController.logout);

export default router;
