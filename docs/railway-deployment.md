# Railway Deployment Guide

This document covers deployment guidelines and port binding configurations for deploying the `cf-engine` Fastify backend service on Railway.

## Port and Host Configuration

### 1. Dynamic `PORT` Environment Variable
- Railway automatically injects a `PORT` environment variable into the running container environment.
- The server reads `process.env.PORT` dynamically and falls back to `3001` for local development.
- Do **not** hardcode a fixed port in deployment configurations or source code.

### 2. Binding Host (`0.0.0.0`)
- Railway requires web services to bind to host `0.0.0.0` to receive external incoming HTTP traffic.
- Binding to `localhost` or `127.0.0.1` will cause Railway health checks to fail with 502 Bad Gateway errors.
- The backend listens on `process.env.HOST || '0.0.0.0'`.

### 3. Health Check Path
- The service provides an unauthenticated health check endpoint at `/api/health`.
- Configure Railway's service Health Check path to `/api/health` to verify service availability.
- The endpoint returns HTTP 200 with JSON payload `{ "status": "ok" }`.

### 4. Environment Variables
Ensure the following variables are configured in Railway's Service Settings:
- `APIFY_API_TOKEN`
- `APIFY_1688_ACTOR_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
