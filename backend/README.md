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
- `TRIVELA_API_KEY`: Optional API key for write endpoints (see below)

## API Key Authentication

Write endpoints (`POST`, `PUT`, `DELETE`) are protected by an **optional** API
key. The behaviour depends on whether `TRIVELA_API_KEY` is set:

| `TRIVELA_API_KEY` | Behaviour |
|---|---|
| **Not set** (default) | All endpoints are open — convenient for local development. |
| **Set to a value** | Write endpoints require the key. Read endpoints (`GET`) remain open. |

### Supplying the key

Include it in one of two ways:

```
# Header (recommended)
X-API-Key: <your-key>

# Query parameter
GET /api/v1/campaigns?api_key=<your-key>
```

If the key is missing or wrong the API responds with `401 Unauthorized`.

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
