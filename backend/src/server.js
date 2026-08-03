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

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
dotenv.config({ path: path.resolve(__dirname2, '../../.env') });
const frontendDist = path.join(__dirname2, '../../frontend/dist');

const app = express();
const requestedPort = Number(process.env.PORT) || 4000;
const sslCertPath = process.env.SSL_CERT_PATH || path.resolve(__dirname2, '../../ssl/cert.pem');
const sslKeyPath = process.env.SSL_KEY_PATH || path.resolve(__dirname2, '../../ssl/key.pem');

// — Middleware —

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

// TEMPORARY: diagnostic env check (REMOVE AFTER USE)
app.get('/api/diag', (req, res) => {
  const has = (v) => !!process.env[v];
  res.json({
    RESEND_API_KEY_loaded: has('RESEND_API_KEY'),
    RESEND_API_KEY_exists: has('RESEND_API_KEY') ? typeof process.env.RESEND_API_KEY : 'unset',
    RESEND_FROM_loaded: has('RESEND_FROM'),
    RESEND_FROM: process.env.RESEND_FROM || 'unset',
    DATABASE_URL_loaded: has('DATABASE_URL'),
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'unset',
    OPENROUTER_API_KEY_loaded: has('OPENROUTER_API_KEY'),
  });
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

async function start() {
  await migrate();

  // — HTTP server: serves API on Render (SSL handled by platform) —
  http.createServer(app).listen(requestedPort, () => {
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
      https.createServer(sslOptions, app).listen(httpsPort, () => {
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
