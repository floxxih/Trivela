# Trivela Frontend

React + Vite app that talks to the Trivela API and, when wired, Stellar/Soroban for wallet and contract interactions.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api`, `/api/v1`, and `/health` to the backend on port `3001`.

## E2E tests

End-to-end tests live in `frontend/e2e/` and are powered by [Playwright](https://playwright.dev).

**Run locally:**

```bash
# From the repo root — build first so vite preview has a dist/ to serve
npm run build --workspace=frontend

# Then run the tests (Playwright starts vite preview automatically)
npm run test --workspace=frontend
```

Or from inside the `frontend/` directory:

```bash
npm run build
npm run test
```

**First-time setup** — install the Chromium browser binary once:

```bash
npx playwright install chromium
```

**Tests cover:**

- Page loads with the correct title and hero heading
- Campaigns section renders either a campaign list or an empty state after loading
- Clicking a campaign card navigates to the detail page (runs only when campaigns are present)

The Playwright config is at `frontend/playwright.config.js`. Tests run in Chromium only to keep CI fast.

## Storybook

Run Storybook from the frontend workspace:

```bash
npm run storybook
```

Build the static Storybook bundle with:

```bash
npm run build-storybook
```

## Env

- `VITE_API_URL`: Base URL for API requests. Leave empty to use the local Vite proxy.
- `VITE_SOROBAN_RPC_URL`: Soroban RPC endpoint for read/write contract calls.
- `VITE_REWARDS_CONTRACT_ID`: Rewards contract ID for balance and claim flows.
- `VITE_CAMPAIGN_CONTRACT_ID`: Campaign contract ID for participant registration.
- `VITE_STELLAR_NETWORK_PASSPHRASE`: Stellar network passphrase. Defaults to testnet.

## API routing

The frontend now targets `/api/v1/*` routes by default. Campaign loading uses the paginated response shape from `GET /api/v1/campaigns?page=1&limit=6`. Legacy `/api/*` routes are still supported by the backend for backward compatibility, but new integrations should use the v1 prefix.

## Stellar integration

Use `@stellar/stellar-sdk` for:

- Connecting to Soroban RPC
- Building and signing transactions
- Invoking the rewards and campaign contracts

See [Stellar Developers](https://developers.stellar.org/docs) and the root README for contract IDs and flows.
