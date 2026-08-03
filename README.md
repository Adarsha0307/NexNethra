# Nexnetra

Frontend: https://nex-nethra-frontend.vercel.app
Backend: https://nexnetra-backend.onrender.com

Nexnetra is an AI-powered cybersecurity platform for URL scanning, email analysis, password strength evaluation, incident reporting, and threat intelligence — all with a modern dashboard and AI assistant guidance.

## Features

- **Multi-layer URL Scanner** — Normalization, domain/IP analysis, SSL cert inspection, redirect chain tracing, brand impersonation detection, heuristic threat scoring, threat intelligence feed lookup, and cached results
- **Email Analysis** — Header parsing, SPF/DKIM/DMARC validation, and phishing detection
- **Password Analysis** — Strength scoring, entropy calculation, breach simulation
- **Security Dashboard** — Risk summary with quick-scan action, score breakdown, and recent activity
- **AI Assistant** — Floating chat assistant powered by OpenRouter, available on every page
- **Incident Reporting** — Submit, track, and manage security incidents
- **Threat Intelligence Feed** — Curated threat data and lookup integration
- **Authentication** — JWT auth with bcrypt hashing, email verification + password reset via Resend (OTP codes), TOTP MFA, token rotation with theft detection, and rate-limited endpoints
- **Settings** — Theme toggle (dark/light), profile management, and security preferences
- **UI** — Animated OTP verification, cyber-themed animated background (matrix rain + particle network), glassmorphism design
- **Production Ready** — Helmet security headers, CORS configuration, PostgreSQL, and auto-deploy to Vercel + Render

## Project Structure

```
nexnetra/
├── frontend/          # React (Vite) SPA
│   └── src/
│       ├── api/       # API client with auth interceptors
│       ├── components/# Reusable UI components (OTP, cyber background, AI chat, buttons)
│       ├── pages/     # Page-level views
│       └── routes/    # Route definitions
├── backend/           # Express REST API
│   └── src/
│       ├── controllers/  # Request handlers
│       ├── routes/       # API endpoints (auth, dashboard, analyzer, incidents, etc.)
│       ├── middleware/   # Auth (JWT), rate limiting
│       ├── services/     # Analyzers, URL scanner sub-modules
│       ├── utils/        # PostgreSQL store, email (Resend), OTP, password analyzer
│       └── prompts/      # AI prompt templates
├── database/          # JSON seed data (imported once into PostgreSQL)
├── scripts/           # SSL cert generation, dev tooling
├── ssl/               # Self-signed certificates for local HTTPS
└── render.yaml        # Render deployment template
```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS 4, React Router, Framer Motion, Lucide icons
- **Backend**: Node.js, Express, PostgreSQL (pg), JWT, bcrypt, Resend (email)
- **AI**: OpenRouter API (assistant + analyzers)
- **Hosting**: Vercel (frontend, auto-deploy from `main`), Render (backend + PostgreSQL, auto-deploy from `main`)

## Run Locally

1. Copy `.env.example` to `.env` and update the values:
   ```
   DATABASE_URL=<postgresql connection string>
   JWT_SECRET=<random secret>
   CLIENT_ORIGIN=http://localhost:5173
   RESEND_API_KEY=<key from https://resend.com>
   RESEND_FROM=onboarding@resend.dev
   OPENROUTER_API_KEY=<key from https://openrouter.ai>
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the backend in one terminal:
   ```
   npm run dev:backend
   ```
4. Start the frontend in a second terminal:
   ```
   npm run dev
   ```
5. Start both simultaneously:
   ```
   npm run dev:all
   ```

## Build for Production

```
npm run build
npm start
```

## Deployment

### Frontend (Vercel)

- Project connected to GitHub `main` branch — auto-deploys on every push
- Root directory: `frontend`
- Set `VITE_API_URL=https://nexnetra-backend.onrender.com`
- `vercel.json` contains SPA rewrites for client-side routing

### Backend (Render)

- Deployed via `render.yaml` (or dashboard) — auto-deploys from GitHub `main`
- Root directory: `backend`

| Variable        | Description                                  |
|-----------------|----------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string (Render DB)     |
| `JWT_SECRET`    | Strong random secret for JWT signing         |
| `CLIENT_ORIGIN` | Deployed frontend URL                        |
| `RESEND_API_KEY`| Resend API key for OTP/password-reset emails |
| `RESEND_FROM`   | Sender address (e.g. `noreply@yourdomain.com`) |
| `OPENROUTER_API_KEY` | AI provider key                         |
| `PORT`          | Server port (Render sets this automatically) |

> **Email note**: while using `onboarding@resend.dev` as sender, Resend only delivers to the email of the account that owns the API key. Verify your own domain in Resend to send to any address.

> **Local note**: the local `.env` may contain an outdated `DATABASE_URL` — use the current Render PostgreSQL connection string.
