# Nexnetra Architecture Plan

## Overview
Nexnetra is an AI-powered cybersecurity platform for education, analysis, and incident reporting. The project is split into a React frontend and an Express backend with a future PostgreSQL database and AI integration layer.

## Recommended structure
- frontend/src/components: reusable UI components
- frontend/src/pages: page-level views
- frontend/src/routes: route definitions
- backend/src/controllers: request handlers
- backend/src/routes: API endpoints
- backend/src/middleware: auth, validation, logging
- backend/src/utils: helpers and validators
- backend/src/prompts: AI prompt templates
- uploads/: file upload storage

## Milestones
1. Project planning and workspace setup
2. UI foundation and routing
3. Authentication and backend API
4. AI assistant integration
5. Security analyzers
6. Incident reporting and admin tools

## Security principles
- Validate every input
- Use JWT for authenticated sessions
- Hash passwords with bcrypt
- Keep secrets in environment variables
- Use CORS and rate limiting later in the project
