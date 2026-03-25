# Trivela

**Trivela** is a Stellar Soroban-based **campaign and rewards platform**. It lets campaign operators create on-chain campaigns, register participants, award points via smart contracts, and let users claim rewards-all on the Stellar network. The project is built for the [Stellar Wave on Drips](https://www.drips.network/wave/stellar) and is designed for open-source contributors.

## Deploying to Testnet

Use the bundled deploy script to build both contracts, deploy them to Stellar testnet, and save the resulting contract IDs for the frontend.

```bash
STELLAR_SOURCE=alice npm run deploy:testnet
```

Optional environment variables:

- `STELLAR_NETWORK`: network alias to pass to `stellar` (defaults to `testnet`)
- `STELLAR_SOURCE`: Stellar CLI identity used for deploys
- `TRIVELA_ENV_OUT`: env file to write contract IDs into (defaults to `.env.testnet`)

The script writes:

```bash
VITE_REWARDS_CONTRACT_ID=...
VITE_CAMPAIGN_CONTRACT_ID=...
```
