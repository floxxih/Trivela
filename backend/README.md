# Trivela Backend

REST API for the Trivela campaign and rewards platform. Handles campaign metadata, health checks, and Soroban RPC configuration for the frontend.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment

- `PORT`: Server port (default `3001`)
- `CORS_ORIGIN`: Allowed origin for CORS
- `STELLAR_NETWORK`: `testnet` or `mainnet`
- `SOROBAN_RPC_URL`: Soroban RPC URL exposed in API metadata

## API

Preferred routes:

- `GET /health`
- `GET /api/v1`
- `GET /api/v1/campaigns`
- `GET /api/v1/campaigns/:id`

Backward-compatible legacy routes remain available under `/api/*` for now:

- `GET /api`
- `GET /api/campaigns`
- `GET /api/campaigns/:id`

Migration note: new integrations should use `/api/v1/*`. Existing clients on `/api/*` continue to work.
