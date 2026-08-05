import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../utils/db.js';
import * as userStore from '../utils/userStore.js';
import { generateSecret, buildOtpAuthUrl, generateQrCodeDataUrl, verifyToken } from '../utils/totp.js';
import { revokeUserTokens } from '../utils/refreshTokens.js';

const SALT_ROUNDS = 10;

function apiKeyPrefix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let prefix = 'nx_';
  for (let i = 0; i < 8; i++) prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  return prefix;
}

async function toCamel(rows) {
  return rows.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
  });
}

// === 1. PROFILE ===

export async function getProfile(req, res) {
  try {
    const user = await userStore.findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { passwordHash, mfaSecret, mfaPendingSecret, verificationCodeHash, verificationCodeExpiry, verificationAttempts, lastCodeSentAt, ...safe } = user;
    return res.json(safe);
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { displayName, firstName, lastName, avatarUrl } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    const user = await userStore.updateUser(req.user.userId, updates);
    const { passwordHash, mfaSecret, mfaPendingSecret, verificationCodeHash, verificationCodeExpiry, verificationAttempts, lastCodeSentAt, ...safe } = user;
    return res.json(safe);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

// === 2. SECURITY — Password Change ===

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    const user = await userStore.findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userStore.updateUser(user.id, { passwordHash });
    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
}

// === 2. SECURITY — MFA ===

export { startMfaSetup, confirmMfaSetup, disableMfa } from './authController.js';

// === 2. SECURITY — Active Sessions ===

export async function getSessions(req, res) {
  try {
    const { rows } = await query(
      `SELECT s.id, s.ip_address, s.user_agent, s.created_at, s.last_activity, s.is_current
       FROM user_sessions s WHERE s.user_id = $1 ORDER BY s.last_activity DESC`,
      [req.user.userId]
    );
    return res.json(await toCamel(rows));
  } catch (err) {
    console.error('getSessions error:', err);
    return res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
}

export async function revokeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const { rowCount } = await query(
      'DELETE FROM user_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Session not found.' });
    return res.json({ message: 'Session revoked.' });
  } catch (err) {
    console.error('revokeSession error:', err);
    return res.status(500).json({ error: 'Failed to revoke session.' });
  }
}

// === 3. API KEYS ===

export async function getApiKeys(req, res) {
  try {
    const { rows } = await query(
      `SELECT id, name, key_prefix, last_used_at, created_at, revoked_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    return res.json(await toCamel(rows));
  } catch (err) {
    console.error('getApiKeys error:', err);
    return res.status(500).json({ error: 'Failed to fetch API keys.' });
  }
}

export async function createApiKey(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const rawKey = apiKeyPrefix() + '_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const id = crypto.randomUUID();
    const created = new Date().toISOString();
    await query(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, req.user.userId, name, keyHash, rawKey.slice(0, 11), created]
    );
    return res.status(201).json({ id, name, key: rawKey, keyPrefix: rawKey.slice(0, 11), createdAt: created });
  } catch (err) {
    console.error('createApiKey error:', err);
    return res.status(500).json({ error: 'Failed to create API key.' });
  }
}

export async function revokeApiKey(req, res) {
  try {
    const { keyId } = req.params;
    const { rowCount } = await query(
      `UPDATE api_keys SET revoked_at = $1 WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`,
      [new Date().toISOString(), keyId, req.user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'API key not found or already revoked.' });
    return res.json({ message: 'API key revoked.' });
  } catch (err) {
    console.error('revokeApiKey error:', err);
    return res.status(500).json({ error: 'Failed to revoke API key.' });
  }
}

// === 4. NOTIFICATIONS ===

export async function getNotificationPreferences(req, res) {
  try {
    const { rows } = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) {
      return res.json({
        emailCritical: true, emailHigh: true, emailMedium: true, emailLow: false,
        inappCritical: true, inappHigh: true, inappMedium: true, inappLow: false,
      });
    }
    const prefs = await toCamel(rows);
    return res.json(prefs[0]);
  } catch (err) {
    console.error('getNotificationPreferences error:', err);
    return res.status(500).json({ error: 'Failed to fetch notification preferences.' });
  }
}

export async function updateNotificationPreferences(req, res) {
  try {
    const { emailCritical, emailHigh, emailMedium, emailLow, inappCritical, inappHigh, inappMedium, inappLow } = req.body;
    await query(
      `INSERT INTO notification_preferences (user_id, email_critical, email_high, email_medium, email_low, inapp_critical, inapp_high, inapp_medium, inapp_low)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         email_critical = EXCLUDED.email_critical,
         email_high = EXCLUDED.email_high,
         email_medium = EXCLUDED.email_medium,
         email_low = EXCLUDED.email_low,
         inapp_critical = EXCLUDED.inapp_critical,
         inapp_high = EXCLUDED.inapp_high,
         inapp_medium = EXCLUDED.inapp_medium,
         inapp_low = EXCLUDED.inapp_low`,
      [req.user.userId, !!emailCritical, !!emailHigh, !!emailMedium, !!emailLow,
       !!inappCritical, !!inappHigh, !!inappMedium, !!inappLow]
    );
    return res.json({ message: 'Notification preferences updated.' });
  } catch (err) {
    console.error('updateNotificationPreferences error:', err);
    return res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
}

// === 5. TEAM ===

export async function getTeamMembers(req, res) {
  try {
    const { rows } = await query(
      `SELECT tm.id, tm.org_id, tm.user_id, tm.role, tm.invited_at, tm.joined_at,
              u.email, u.display_name, u.avatar_url
       FROM team_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.org_id = (SELECT org_id FROM team_members WHERE user_id = $1 LIMIT 1)
       ORDER BY tm.joined_at NULLS LAST, tm.invited_at DESC`,
      [req.user.userId]
    );
    return res.json(await toCamel(rows));
  } catch (err) {
    console.error('getTeamMembers error:', err);
    return res.status(500).json({ error: 'Failed to fetch team members.' });
  }
}

export async function inviteTeamMember(req, res) {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'Email and role are required.' });
    if (!['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, analyst, or viewer.' });
    }
    const invitedUser = await userStore.findUserByEmail(email);
    if (!invitedUser) return res.status(404).json({ error: 'User not found with that email.' });
    const { rows: orgRows } = await query(
      'SELECT org_id FROM team_members WHERE user_id = $1 LIMIT 1',
      [req.user.userId]
    );
    const orgId = orgRows.length > 0 ? orgRows[0].org_id : req.user.userId;
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO team_members (id, org_id, user_id, role, invited_by, invited_at)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (org_id, user_id) DO UPDATE SET role = $4`,
      [id, orgId, invitedUser.id, role, req.user.userId, new Date().toISOString()]
    );
    return res.status(201).json({ message: `Invitation sent to ${email}.` });
  } catch (err) {
    console.error('inviteTeamMember error:', err);
    return res.status(500).json({ error: 'Failed to invite team member.' });
  }
}

export async function updateTeamMemberRole(req, res) {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    if (!['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, analyst, or viewer.' });
    }
    const { rowCount } = await query(
      `UPDATE team_members SET role = $1 WHERE id = $2 AND org_id = (SELECT org_id FROM team_members WHERE user_id = $3 LIMIT 1)`,
      [role, memberId, req.user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Member not found.' });
    return res.json({ message: 'Role updated.' });
  } catch (err) {
    console.error('updateTeamMemberRole error:', err);
    return res.status(500).json({ error: 'Failed to update role.' });
  }
}

export async function removeTeamMember(req, res) {
  try {
    const { memberId } = req.params;
    const { rowCount } = await query(
      `DELETE FROM team_members WHERE id = $1 AND org_id = (SELECT org_id FROM team_members WHERE user_id = $2 LIMIT 1)`,
      [memberId, req.user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Member not found.' });
    return res.json({ message: 'Member removed.' });
  } catch (err) {
    console.error('removeTeamMember error:', err);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
}

// === 6. THEME ===

export async function getTheme(req, res) {
  try {
    const user = await userStore.findUserById(req.user.userId);
    return res.json({ theme: user?.theme || 'dark' });
  } catch (err) {
    console.error('getTheme error:', err);
    return res.status(500).json({ error: 'Failed to fetch theme.' });
  }
}

export async function updateTheme(req, res) {
  try {
    const { theme } = req.body;
    if (!['dark', 'light'].includes(theme)) {
      return res.status(400).json({ error: 'Theme must be dark or light.' });
    }
    await userStore.updateUser(req.user.userId, { theme });
    return res.json({ theme });
  } catch (err) {
    console.error('updateTheme error:', err);
    return res.status(500).json({ error: 'Failed to update theme.' });
  }
}

// === 7. DANGER ZONE — Delete Account ===

export async function deleteAccount(req, res) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required to delete account.' });
    const user = await userStore.findUserById(req.user.userId);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Password is incorrect.' });
    await revokeUserTokens(user.id);
    await query('DELETE FROM activities WHERE user_id = $1', [user.id]);
    await query('DELETE FROM team_members WHERE invited_by = $1', [user.id]);
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    return res.json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('deleteAccount error:', err);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
}

// === 8. QUIET HOURS ===

export async function getQuietHours(req, res) {
  try {
    const { rows } = await query('SELECT * FROM quiet_hours WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) {
      return res.json({ enabled: false, startTime: '22:00', endTime: '07:00', timezone: 'UTC' });
    }
    return res.json((await toCamel(rows))[0]);
  } catch (err) {
    console.error('getQuietHours error:', err);
    return res.status(500).json({ error: 'Failed to fetch quiet hours.' });
  }
}

export async function updateQuietHours(req, res) {
  try {
    const { enabled, startTime, endTime, timezone } = req.body;
    const values = [!!enabled, startTime || '22:00', endTime || '07:00', timezone || 'UTC', req.user.userId];
    const { rowCount } = await query(
      `UPDATE quiet_hours SET enabled = $1, start_time = $2, end_time = $3, timezone = $4 WHERE user_id = $5`,
      values
    );
    if (rowCount === 0) {
      await query(
        `INSERT INTO quiet_hours (id, user_id, enabled, start_time, end_time, timezone) VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), req.user.userId, ...values]
      );
    }
    const { rows } = await query('SELECT * FROM quiet_hours WHERE user_id = $1', [req.user.userId]);
    return res.json((await toCamel(rows))[0]);
  } catch (err) {
    console.error('updateQuietHours error:', err);
    return res.status(500).json({ error: 'Failed to update quiet hours.' });
  }
}

// === 9. IP BLOCKLIST ===

export async function getIpBlocklist(req, res) {
  try {
    const { rows } = await query(
      'SELECT * FROM ip_blocklist WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    return res.json(await toCamel(rows));
  } catch (err) {
    console.error('getIpBlocklist error:', err);
    return res.status(500).json({ error: 'Failed to fetch IP blocklist.' });
  }
}

export async function addIpBlocklist(req, res) {
  try {
    const { ipAddress, reason } = req.body;
    if (!ipAddress) return res.status(400).json({ error: 'IP address is required.' });
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO ip_blocklist (id, user_id, ip_address, reason, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id, ip_address) DO UPDATE SET reason = $4',
      [id, req.user.userId, ipAddress, reason || '', new Date().toISOString()]
    );
    return res.status(201).json({ message: `IP ${ipAddress} added to blocklist.` });
  } catch (err) {
    console.error('addIpBlocklist error:', err);
    return res.status(500).json({ error: 'Failed to add IP to blocklist.' });
  }
}

export async function removeIpBlocklist(req, res) {
  try {
    const { ipId } = req.params;
    const { rowCount } = await query(
      'DELETE FROM ip_blocklist WHERE id = $1 AND user_id = $2',
      [ipId, req.user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'IP not found in blocklist.' });
    return res.json({ message: 'IP removed from blocklist.' });
  } catch (err) {
    console.error('removeIpBlocklist error:', err);
    return res.status(500).json({ error: 'Failed to remove IP from blocklist.' });
  }
}

// === 10. OAuth PROVIDERS ===

export async function getOAuthProviders(req, res) {
  try {
    const { rows } = await query(
      'SELECT id, provider, enabled, client_id FROM oauth_provider_configs WHERE user_id = $1',
      [req.user.userId]
    );
    return res.json(await toCamel(rows));
  } catch (err) {
    console.error('getOAuthProviders error:', err);
    return res.status(500).json({ error: 'Failed to fetch OAuth providers.' });
  }
}

export async function updateOAuthProvider(req, res) {
  try {
    const { provider } = req.params;
    const { enabled, clientId, clientSecret } = req.body;
    if (!['google', 'github', 'microsoft'].includes(provider)) {
      return res.status(400).json({ error: 'Provider must be google, github, or microsoft.' });
    }
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO oauth_provider_configs (id, user_id, provider, enabled, client_id, client_secret, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id, provider) DO UPDATE SET enabled = EXCLUDED.enabled, client_id = EXCLUDED.client_id, client_secret = COALESCE(EXCLUDED.client_secret, oauth_provider_configs.client_secret)`,
      [id, req.user.userId, provider, !!enabled, clientId || '', clientSecret || null, new Date().toISOString()]
    );
    return res.json({ message: `${provider} configuration updated.` });
  } catch (err) {
    console.error('updateOAuthProvider error:', err);
    return res.status(500).json({ error: 'Failed to update OAuth provider.' });
  }
}

// === 11. AUTO-REMEDIATION ===

export async function getAutoRemediation(req, res) {
  try {
    const { rows } = await query('SELECT * FROM auto_remediation_config WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) {
      return res.json({ enabled: false, autoBlockIp: false, autoKillProcess: false, requiresApproval: true });
    }
    return res.json((await toCamel(rows))[0]);
  } catch (err) {
    console.error('getAutoRemediation error:', err);
    return res.status(500).json({ error: 'Failed to fetch auto-remediation config.' });
  }
}

export async function updateAutoRemediation(req, res) {
  try {
    const { enabled, autoBlockIp, autoKillProcess, requiresApproval } = req.body;
    await query(
      `INSERT INTO auto_remediation_config (user_id, enabled, auto_block_ip, auto_kill_process, requires_approval)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         auto_block_ip = EXCLUDED.auto_block_ip,
         auto_kill_process = EXCLUDED.auto_kill_process,
         requires_approval = EXCLUDED.requires_approval`,
      [req.user.userId, !!enabled, !!autoBlockIp, !!autoKillProcess, requiresApproval !== undefined ? !!requiresApproval : true]
    );
    return res.json({ message: 'Auto-remediation config updated.' });
  } catch (err) {
    console.error('updateAutoRemediation error:', err);
    return res.status(500).json({ error: 'Failed to update auto-remediation config.' });
  }
}

// === 12. INCIDENT AUTO-CLOSE ===

export async function getIncidentAutoClose(req, res) {
  try {
    const { rows } = await query('SELECT * FROM incident_auto_close_config WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) return res.json({ enabled: false, hours: 72 });
    return res.json((await toCamel(rows))[0]);
  } catch (err) {
    console.error('getIncidentAutoClose error:', err);
    return res.status(500).json({ error: 'Failed to fetch incident auto-close config.' });
  }
}

export async function updateIncidentAutoClose(req, res) {
  try {
    const { enabled, hours } = req.body;
    await query(
      `INSERT INTO incident_auto_close_config (user_id, enabled, hours)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, hours = EXCLUDED.hours`,
      [req.user.userId, !!enabled, hours || 72]
    );
    return res.json({ message: 'Incident auto-close config updated.' });
  } catch (err) {
    console.error('updateIncidentAutoClose error:', err);
    return res.status(500).json({ error: 'Failed to update incident auto-close config.' });
  }
}

// === 13. RATE LIMITING ===

export async function getRateLimitConfig(req, res) {
  try {
    const { rows } = await query('SELECT * FROM rate_limit_configs WHERE user_id = $1', [req.user.userId]);
    if (rows.length === 0) {
      return res.json({ defaultMax: 100, defaultWindow: 15, adminMax: 200, analystMax: 150, viewerMax: 50 });
    }
    return res.json((await toCamel(rows))[0]);
  } catch (err) {
    console.error('getRateLimitConfig error:', err);
    return res.status(500).json({ error: 'Failed to fetch rate limit config.' });
  }
}

export async function updateRateLimitConfig(req, res) {
  try {
    const { defaultMax, defaultWindow, adminMax, analystMax, viewerMax } = req.body;
    await query(
      `INSERT INTO rate_limit_configs (user_id, default_max, default_window, admin_max, analyst_max, viewer_max)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         default_max = EXCLUDED.default_max,
         default_window = EXCLUDED.default_window,
         admin_max = EXCLUDED.admin_max,
         analyst_max = EXCLUDED.analyst_max,
         viewer_max = EXCLUDED.viewer_max`,
      [req.user.userId, defaultMax || 100, defaultWindow || 15, adminMax || 200, analystMax || 150, viewerMax || 50]
    );
    return res.json({ message: 'Rate limit config updated.' });
  } catch (err) {
    console.error('updateRateLimitConfig error:', err);
    return res.status(500).json({ error: 'Failed to update rate limit config.' });
  }
}

// === 14. HEALTH CHECKS ===

export async function getHealthStatus(req, res) {
  try {
    const { rows } = await query('SELECT * FROM health_status ORDER BY service');
    const services = [
      { service: 'backend', status: 'healthy', lastChecked: Date.now(), message: 'API server is running' },
      { service: 'database', status: 'healthy', lastChecked: Date.now(), message: 'PostgreSQL connected' },
      { service: 'ai-provider', status: 'unknown', lastChecked: null, message: 'Not configured' },
      { service: 'email', status: process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY ? 'healthy' : 'unhealthy', lastChecked: null, message: process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY ? 'Email provider configured' : 'No email provider key set' },
      { service: 'ssl', status: 'healthy', lastChecked: null, message: 'HTTPS active' },
    ];
    for (const svc of services) {
      const existing = rows.find(r => r.service === svc.service);
      if (existing) {
        svc.status = existing.status;
        svc.lastChecked = existing.last_checked;
        svc.message = existing.message;
      }
    }
    return res.json(services);
  } catch (err) {
    console.error('getHealthStatus error:', err);
    return res.status(500).json({ error: 'Failed to fetch health status.' });
  }
}

// === 15. KEYBOARD SHORTCUTS ===

export async function getKeyboardShortcuts(req, res) {
  try {
    const { rows } = await query(
      'SELECT * FROM keyboard_shortcuts WHERE user_id = $1 ORDER BY action',
      [req.user.userId]
    );
    if (rows.length === 0) {
      const defaults = [
        { action: 'goToDashboard', keys: 'g d' },
        { action: 'goToAssistant', keys: 'g a' },
        { action: 'goToAnalyzer', keys: 'g n' },
        { action: 'goToIncidents', keys: 'g i' },
        { action: 'goToSettings', keys: 'g s' },
        { action: 'newIncident', keys: 'n i' },
        { action: 'search', keys: '/' },
        { action: 'help', keys: '?' },
      ];
      for (const s of defaults) {
        await query(
          'INSERT INTO keyboard_shortcuts (id, user_id, action, keys) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [crypto.randomUUID(), req.user.userId, s.action, s.keys]
        );
      }
      const { rows: inserted } = await query(
        'SELECT * FROM keyboard_shortcuts WHERE user_id = $1 ORDER BY action', [req.user.userId]
      );
      return res.json(await toCamel(inserted));
    }
    return res.json(await toCamel(rows));
  } catch (err) {
    console.error('getKeyboardShortcuts error:', err);
    return res.status(500).json({ error: 'Failed to fetch keyboard shortcuts.' });
  }
}

export async function updateKeyboardShortcut(req, res) {
  try {
    const { action } = req.params;
    const { keys } = req.body;
    if (!keys) return res.status(400).json({ error: 'Keys are required.' });
    const { rowCount } = await query(
      'UPDATE keyboard_shortcuts SET keys = $1 WHERE user_id = $2 AND action = $3',
      [keys, req.user.userId, action]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Shortcut not found.' });
    return res.json({ message: 'Shortcut updated.' });
  } catch (err) {
    console.error('updateKeyboardShortcut error:', err);
    return res.status(500).json({ error: 'Failed to update shortcut.' });
  }
}

// === 16. DANGER ZONE - Export Data ===

export async function exportUserData(req, res) {
  try {
    const user = await userStore.findUserById(req.user.userId);
    const { rows: incidents } = await query('SELECT * FROM incidents WHERE reporter = $1', [user.email]);
    const { rows: activities } = await query('SELECT * FROM activities WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100', [req.user.userId]);
    const { rows: sessions } = await query('SELECT * FROM user_sessions WHERE user_id = $1', [req.user.userId]);
    return res.json({
      exportedAt: new Date().toISOString(),
      user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
      incidents: await toCamel(incidents),
      activities: await toCamel(activities),
      sessions: await toCamel(sessions),
    });
  } catch (err) {
    console.error('exportUserData error:', err);
    return res.status(500).json({ error: 'Failed to export data.' });
  }
}
