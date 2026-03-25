# Trivela Frontend

React + Vite app that talks to the Trivela API and, when wired, Stellar/Soroban for wallet and contract interactions.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api`, `/api/v1`, and `/health` to the backend on port `3001`.

## Environment variables

Create a `.env.local` file in `frontend/` when you need to point the app at non-default services.

```bash
VITE_API_URL=http://localhost:3001
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_REWARDS_CONTRACT_ID=CC...
VITE_CAMPAIGN_CONTRACT_ID=CC...
```

- `VITE_API_URL`: Base URL used for frontend `fetch` calls. Leave empty to use the local Vite proxy.
- `VITE_SOROBAN_RPC_URL`: Soroban RPC endpoint used by frontend contract helpers. Defaults to Stellar testnet RPC.
- `VITE_REWARDS_CONTRACT_ID`: Optional rewards contract ID for frontend Soroban calls.
- `VITE_CAMPAIGN_CONTRACT_ID`: Optional campaign contract ID for frontend Soroban calls.

## API routing

The frontend targets `/api/v1/*` routes by default. Legacy `/api/*` routes are still supported by the backend for backward compatibility, but new integrations should use the v1 prefix.

## Config usage

The frontend reads these values from [src/config.js](/Users/CMI-James/od/Trivela/frontend/src/config.js):

- API requests are built with `apiUrl(...)`.
- Soroban RPC access goes through `createSorobanServer()`.
- Rewards and campaign contract IDs are exposed through `getRewardsContract()` and `getCampaignContract()`.

## Stellar integration

Use `@stellar/stellar-sdk` for:

- Connecting to Soroban RPC
- Building and signing transactions
- Invoking the rewards and campaign contracts

See [Stellar Developers](https://developers.stellar.org/docs) and the root README for deployment flows.
