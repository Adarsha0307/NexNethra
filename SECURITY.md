# Security Policy

## Supported Versions

Nexnethra is continuously deployed — the live production versions below are the only currently supported releases:

| Version | Supported          |
|---------|--------------------|
| main (latest) | :white_check_mark: |
| < 0.1.0   | :x: |

**Live deployments:**
- Frontend: `https://nex-nethra-frontend.vercel.app` (auto-deploy from `main`)
- Backend API: `https://nexnetra-backend.onrender.com` (auto-deploy from `main`)

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

To report a vulnerability privately:

1. Email **nexnethra@gmail.com** with the subject `[Nexnethra Security] <short description>`
2. Include:
   - Affected URL/endpoint and environment (production/local)
   - Steps to reproduce (minimal, concrete)
   - Impact — what an attacker could gain
   - Suggested fix (if known)

Reports are acknowledged **within 48 hours**, and you'll receive a status update every 5 business days until resolution.

## What's In Scope

- `frontend/` — React (Vite) SPA: XSS, auth/session handling, client-side secrets, insecure dependencies
- `backend/` — Express API: authentication (JWT, bcrypt, TOTP MFA), authorization, input validation, rate limiting, SQL injection, SSRF, API key handling
- Deployment config — `vercel.json`, `render.yaml`, CSP/security headers

**Out of scope:** third-party services (Vercel, Render, SendGrid, OpenRouter, PostgreSQL), social engineering, and issues already resolved in `main`.

## Security Measures in Place

- JWT auth with bcrypt password hashing and token rotation/theft detection
- TOTP multi-factor authentication
- Helmet security headers + CSP, rate limiting on sensitive endpoints
- Input validation and normalization on analysis endpoints
- Dependabot monitoring for dependency advisories

## Responsible Disclosure

We follow a 90-day coordinated disclosure window. We ask researchers to:
- Avoid testing that disrupts production (use the local build via `npm run dev`)
- Not access or modify data belonging to other users
- Share findings privately first; public disclosure after a fix is deployed
