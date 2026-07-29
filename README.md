# Nexnetra url -- nexnethra.vercel.app

Nexnetra is an AI-powered cybersecurity platform for URL scanning, email analysis, password strength evaluation, incident reporting, and threat intelligence — all with a modern dashboard and AI assistant guidance.

## Features

- **Multi-layer URL Scanner** — Normalization, domain/IP analysis, SSL cert inspection, redirect chain tracing, brand impersonation detection, heuristic threat scoring, threat intelligence feed lookup, and cached results
- **Email Analysis** — Header parsing, SPF/DKIM/DMARC validation, and phishing detection
- **Password Analysis** — Strength scoring, entropy calculation, breach simulation
- **Security Dashboard** — Risk summary with quick-scan action, score breakdown, and recent activity
- **AI Assistant** — Conversational guidance powered by Gemini/OpenRouter
- **Incident Reporting** — Submit, track, and manage security incidents
- **Threat Intelligence Feed** — Curated threat data and lookup integration
- **Authentication** — JWT-based auth with bcrypt password hashing, TOTP-ready, and rate-limited endpoints
- **Settings** — Theme toggle (dark/light), profile management, and security preferences
- **Production Ready** — Helmet security headers, HTTPS via self-signed certs, CORS configuration, and Render deployment template

## Project Structure

```
nexnetra/
├── frontend/          # React (Vite) SPA
│   └── src/
│       ├── api/       # API client with auth interceptors
│       ├── components/# Reusable UI components
│       ├── pages/     # Page-level views (7 pages)
│       └── routes/    # Route definitions
├── backend/           # Express REST API
│   └── src/
│       ├── controllers/  # Request handlers
│       ├── routes/       # API endpoints (8 route modules)
│       ├── middleware/   # Auth, rate limiting
│       ├── services/     # Analyzers, URL scanner (6 sub-modules)
│       ├── utils/        # DB, store, password analyzer, etc.
│       └── prompts/      # AI prompt templates
├── database/          # SQL migration files
├── scripts/           # SSL cert generation, dev tooling
├── ssl/               # Self-signed certificates for HTTPS
└── ARCHITECTURE.md    # Detailed architecture notes
```

## Run Locally

1. Copy `.env.example` to `.env` and update the values.
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

Deployable on Render via `render.yaml`. Set the following environment variables:

| Variable        | Description                          |
|-----------------|--------------------------------------|
| `JWT_SECRET`    | Strong random secret for JWT signing |
| `CLIENT_ORIGIN` | Deployed frontend URL                |
| `PORT`          | Server port (default: 4000)          |

For production, consider swapping the JSON file store for PostgreSQL or Supabase.
