import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import https from 'https';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';

import authRoutes from './routes/authRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import analyzerRoutes from './routes/analyzerRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import threatRoutes from './routes/threatRoutes.js';
import scoreRoutes from './routes/scoreRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';
import { migrate } from './utils/migrate.js';
import { originCheck } from './middleware/originCheck.js';
import { getJwtSecret } from './utils/auth.js';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
dotenv.config({ path: path.resolve(__dirname2, '../../.env') });
const frontendDist = path.join(__dirname2, '../../frontend/dist');

// — Startup sanity checks (#24): fail fast with a clear message —
function assertEnv(name, { minLength } = {}) {
  const value = process.env[name];
  if (!value || (minLength && value.length < minLength)) {
    throw new Error(`Environment variable ${name} is missing or too short. Check backend .env (see .env.example).`);
  }
  return value;
}
assertEnv('JWT_SECRET', { minLength: 32 });
if (process.env.NODE_ENV === 'production') {
  assertEnv('DATABASE_URL');
  assertEnv('CLIENT_ORIGIN');
}

// — Error tracking (#21): enabled when SENTRY_DSN is configured —
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
  console.log('[Sentry] Error tracking enabled.');
}

const app = express();
const requestedPort = Number(process.env.PORT) || 4000;
const sslCertPath = process.env.SSL_CERT_PATH || path.resolve(__dirname2, '../../ssl/cert.pem');
const sslKeyPath = process.env.SSL_KEY_PATH || path.resolve(__dirname2, '../../ssl/key.pem');

// — Middleware —

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
const allowedOrigins = (process.env.CLIENT_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', originCheck(allowedOrigins));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nexnetra backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/analyze', analyzerRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/threats', threatRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({ message: 'Authenticated profile access', user: req.user });
});

// Serve built frontend if available
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// — Error handling / crash containment (#22) —

let httpServer;
let httpsServer;

function onFatal(error, label) {
  console.error(`[${label}]`, error);
  if (process.env.SENTRY_DSN) Sentry.captureException(error);
  // Graceful shutdown: stop accepting connections, then exit.
  try { httpServer?.close(); } catch { /* ignore */ }
  try { httpsServer?.close(); } catch { /* ignore */ }
  setTimeout(() => process.exit(1), 500);
}

process.on('uncaughtException', (err) => onFatal(err, 'uncaughtException'));
process.on('unhandledRejection', (reason) => onFatal(reason instanceof Error ? reason : new Error(String(reason)), 'unhandledRejection'));

app.use((err, req, res, next) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.message?.includes('not allowed by CORS') ? 403 : 500);
  console.error('[express-error]', err.message);
  res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message });
});

async function start() {
  await migrate();

  // — HTTP server: serves API on Render (SSL handled by platform) —
  httpServer = http.createServer(app).listen(requestedPort, () => {
    console.log(`[HTTP]  Nexnetra backend listening on port ${requestedPort}`);
  });

  // — Optional HTTPS server for local SSL —
  const httpsPort = Number(process.env.SSL_PORT) || 4443;
  try {
    if (fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
      const sslOptions = {
        cert: fs.readFileSync(sslCertPath),
        key: fs.readFileSync(sslKeyPath),
      };
      httpsServer = https.createServer(sslOptions, app).listen(httpsPort, () => {
        console.log(`[HTTPS] Nexnetra backend listening on port ${httpsPort}`);
      });
    } else {
      console.log('[HTTPS] SSL certificates not found. HTTPS server not started.');
      console.log(`        Run: npm run setup-ssl`);
    }
  } catch (err) {
    console.error('[HTTPS] Failed to start HTTPS server:', err.message);
  }
}

start().catch(err => { console.error('Server startup failed:', err); process.exit(1); });