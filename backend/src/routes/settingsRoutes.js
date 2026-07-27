import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import * as settings from '../controllers/settingsController.js';

const router = Router();
router.use(requireAuth);

// Profile
router.get('/profile', settings.getProfile);
router.patch('/profile', settings.updateProfile);

// Security - Password
router.post('/security/change-password', settings.changePassword);

// Security - MFA (re-exported from authController)
router.post('/security/mfa/setup', settings.startMfaSetup);
router.post('/security/mfa/confirm', settings.confirmMfaSetup);
router.post('/security/mfa/disable', settings.disableMfa);

// Security - Sessions
router.get('/security/sessions', settings.getSessions);
router.delete('/security/sessions/:sessionId', settings.revokeSession);

// API Keys
router.get('/api-keys', settings.getApiKeys);
router.post('/api-keys', settings.createApiKey);
router.post('/api-keys/:keyId/revoke', settings.revokeApiKey);

// Notifications
router.get('/notifications', settings.getNotificationPreferences);
router.put('/notifications', settings.updateNotificationPreferences);

// Team
router.get('/team', settings.getTeamMembers);
router.post('/team/invite', settings.inviteTeamMember);
router.patch('/team/:memberId/role', settings.updateTeamMemberRole);
router.delete('/team/:memberId', settings.removeTeamMember);

// Theme
router.get('/theme', settings.getTheme);
router.put('/theme', settings.updateTheme);

// Quiet Hours
router.get('/quiet-hours', settings.getQuietHours);
router.put('/quiet-hours', settings.updateQuietHours);

// IP Blocklist
router.get('/ip-blocklist', settings.getIpBlocklist);
router.post('/ip-blocklist', settings.addIpBlocklist);
router.delete('/ip-blocklist/:ipId', settings.removeIpBlocklist);

// OAuth Providers
router.get('/oauth', settings.getOAuthProviders);
router.put('/oauth/:provider', settings.updateOAuthProvider);

// Auto-Remediation
router.get('/auto-remediation', settings.getAutoRemediation);
router.put('/auto-remediation', settings.updateAutoRemediation);

// Incident Auto-Close
router.get('/incident-auto-close', settings.getIncidentAutoClose);
router.put('/incident-auto-close', settings.updateIncidentAutoClose);

// Rate Limiting
router.get('/rate-limits', settings.getRateLimitConfig);
router.put('/rate-limits', settings.updateRateLimitConfig);

// Health Checks
router.get('/health', settings.getHealthStatus);

// Keyboard Shortcuts
router.get('/shortcuts', settings.getKeyboardShortcuts);
router.put('/shortcuts/:action', settings.updateKeyboardShortcut);

// Danger Zone
router.delete('/account', settings.deleteAccount);
router.get('/export', settings.exportUserData);

export default router;
