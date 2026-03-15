# Trivela Frontend

React + Vite app that talks to the Trivela API and (when wired) Stellar/Soroban for wallet connect and contract calls.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` and `/health` to the backend (port 3001).

## Env

- `VITE_API_URL` – Base URL for API (default: '' for proxy)

## Stellar integration

Use `@stellar/stellar-sdk` for:

- Connecting to Soroban RPC
- Building/signing transactions
- Invoking the rewards and campaign contracts

See [Stellar Developers](https://developers.stellar.org/docs) and the root README for contract IDs and flows.
