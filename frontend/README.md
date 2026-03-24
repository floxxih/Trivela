# Trivela Frontend

React + Vite app that talks to the Trivela API and, when wired, Stellar/Soroban for wallet and contract interactions.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api`, `/api/v1`, and `/health` to the backend on port `3001`.

## Env

- `VITE_API_URL`: Base URL for API requests. Leave empty to use the local Vite proxy.

## API routing

The frontend now targets `/api/v1/*` routes by default. Legacy `/api/*` routes are still supported by the backend for backward compatibility, but new integrations should use the v1 prefix.

## Stellar integration

Use `@stellar/stellar-sdk` for:

- Connecting to Soroban RPC
- Building and signing transactions
- Invoking the rewards and campaign contracts

See [Stellar Developers](https://developers.stellar.org/docs) and the root README for contract IDs and flows.
