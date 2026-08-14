import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/utils/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: {},
}));

vi.mock('../src/utils/email.js', () => ({
  sendVerificationCodeEmail: vi.fn().mockResolvedValue(),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(),
}));

process.env.JWT_SECRET = 'test-secret-0123456789-0123456789-0123456789';
process.env.NODE_ENV = 'test';

// Build a minimal express app bound to the auth routes only.
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../src/routes/authRoutes.js';
import { originCheck } from '../src/middleware/originCheck.js';

const app = express();
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', originCheck(['http://localhost:5173']), authRoutes);

const { query } = await import('../src/utils/db.js');

function toCamelRow(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

const fakeUser = toCamelRow({
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  display_name: '',
  avatar_url: '',
  email: 'test@example.com',
  password_hash: null, // set in beforeAll
  email_verified: true,
  verification_code_hash: null,
  verification_code_expiry: null,
  verification_attempts: 0,
  last_code_sent_at: 0,
  mfa_enabled: false,
  mfa_secret: null,
  mfa_pending_secret: null,
  theme: 'dark',
  created_at: new Date().toISOString(),
});

describe('auth routes (cookie flow)', () => {
  beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    fakeUser.passwordHash = await bcrypt.hash('ValidPass123!', 4);
    query.mockReset();
    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM users WHERE LOWER(email)')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO refresh_tokens')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO users')) {
        return { rows: [fakeUser] };
      }
      if (sql.includes('UPDATE refresh_tokens')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT * FROM refresh_tokens')) {
        return { rows: [{
          id: 'rt-1',
          user_id: 'user-1',
          token_hash: 'x',
          family_id: 'fam-1',
          expires_at: Date.now() + 60000,
          created_at: new Date().toISOString(),
          revoked_at: null,
        }] };
      }
      return { rows: [] };
    });
  });

  afterAll(() => {
    vi.resetModules();
  });

  it('rejects weak passwords on register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.co', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.reasons).toBeDefined();
  });

  it('rejects login with non-string email instead of crashing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', process.env.CLIENT_ORIGIN)
      .send({ email: { nested: true }, password: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('issues HttpOnly cookies on successful login', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT')) return { rows: [fakeUser] };
      return { rows: [] };
    });
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', process.env.CLIENT_ORIGIN)
      .send({ email: 'test@example.com', password: 'ValidPass123!' });
    expect(res.status).toBe(200);
    const setCookies = res.headers['set-cookie'] || [];
    const joined = setCookies.join(';');
    expect(joined).toContain('nexnetra_access');
    expect(joined).toContain('nexnetra_refresh');
    expect(joined).toContain('HttpOnly');
    expect(res.body.accessToken).toBeUndefined(); // tokens never in body
  });

  it('refuses state-changing requests from disallowed origins', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'test@example.com', password: 'ValidPass123!' });
    expect(res.status).toBe(403);
  });
});