
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT NOT NULL DEFAULT '',
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code_hash TEXT,
  verification_code_expiry BIGINT,
  verification_attempts INTEGER NOT NULL DEFAULT 0,
  last_code_sent_at BIGINT NOT NULL DEFAULT 0,
  mfa_enabled   BOOLEAN NOT NULL DEFAULT false,
  mfa_secret    TEXT,
  mfa_pending_secret TEXT,
  theme         TEXT NOT NULL DEFAULT 'dark',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL,
  reporter    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Open',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  timestamp   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  family_id   TEXT NOT NULL,
  expires_at  BIGINT NOT NULL,
  created_at  TEXT NOT NULL,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,
  last_used_at BIGINT,
  created_at   TEXT NOT NULL,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_critical  BOOLEAN NOT NULL DEFAULT true,
  email_high      BOOLEAN NOT NULL DEFAULT true,
  email_medium    BOOLEAN NOT NULL DEFAULT true,
  email_low       BOOLEAN NOT NULL DEFAULT false,
  inapp_critical  BOOLEAN NOT NULL DEFAULT true,
  inapp_high      BOOLEAN NOT NULL DEFAULT true,
  inapp_medium    BOOLEAN NOT NULL DEFAULT true,
  inapp_low       BOOLEAN NOT NULL DEFAULT false
);

-- Quiet hours
CREATE TABLE IF NOT EXISTS quiet_hours (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT NOT NULL DEFAULT '22:00',
  end_time   TEXT NOT NULL DEFAULT '07:00',
  timezone   TEXT NOT NULL DEFAULT 'UTC'
);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_user ON quiet_hours(user_id);

-- IP Blocklist
CREATE TABLE IF NOT EXISTS ip_blocklist (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  reason     TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, ip_address)
);
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_user ON ip_blocklist(user_id);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','analyst','viewer')),
  invited_by TEXT REFERENCES users(id),
  invited_at TEXT NOT NULL,
  joined_at  TEXT,
  UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(org_id);

-- Active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address      TEXT,
  user_agent      TEXT,
  refresh_token_id TEXT REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL,
  last_activity   BIGINT NOT NULL,
  is_current      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- OAuth provider configs
CREATE TABLE IF NOT EXISTS oauth_provider_configs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK(provider IN ('google','github','microsoft')),
  enabled       BOOLEAN NOT NULL DEFAULT false,
  client_id     TEXT,
  client_secret TEXT,
  created_at    TEXT NOT NULL,
  UNIQUE(user_id, provider)
);

-- Auto-remediation config
CREATE TABLE IF NOT EXISTS auto_remediation_config (
  user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT false,
  auto_block_ip     BOOLEAN NOT NULL DEFAULT false,
  auto_kill_process BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT true
);

-- Incident auto-close config
CREATE TABLE IF NOT EXISTS incident_auto_close_config (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  hours   INTEGER NOT NULL DEFAULT 72
);

-- Rate limit config
CREATE TABLE IF NOT EXISTS rate_limit_configs (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_max     INTEGER NOT NULL DEFAULT 100,
  default_window  INTEGER NOT NULL DEFAULT 15,
  admin_max       INTEGER NOT NULL DEFAULT 200,
  analyst_max     INTEGER NOT NULL DEFAULT 150,
  viewer_max      INTEGER NOT NULL DEFAULT 50
);

-- Health check status (system-wide, not per-user)
CREATE TABLE IF NOT EXISTS health_status (
  id          TEXT PRIMARY KEY,
  service     TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'unknown',
  last_checked BIGINT,
  message     TEXT
);

-- Keyboard shortcuts
CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action  TEXT NOT NULL,
  keys    TEXT NOT NULL,
  UNIQUE(user_id, action)
);
CREATE INDEX IF NOT EXISTS idx_keyboard_shortcuts_user ON keyboard_shortcuts(user_id);

-- URL scan cache
CREATE TABLE IF NOT EXISTS url_scans (
  url_hash   TEXT PRIMARY KEY,
  url        TEXT NOT NULL,
  result     JSONB NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_url_scans_expires ON url_scans(expires_at);

-- Add columns to existing users table if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expiry BIGINT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
