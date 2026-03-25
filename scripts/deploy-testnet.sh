#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

NETWORK="${STELLAR_NETWORK:-testnet}"
SOURCE="${STELLAR_SOURCE:-}"
ENV_OUT="${TRIVELA_ENV_OUT:-.env.testnet}"
REWARDS_WASM="target/wasm32-unknown-unknown/release/trivela_rewards_contract.wasm"
CAMPAIGN_WASM="target/wasm32-unknown-unknown/release/trivela_campaign_contract.wasm"

if [ -z "$SOURCE" ]; then
  echo "STELLAR_SOURCE is required"
  exit 1
fi

if ! command -v stellar >/dev/null 2>&1; then
  echo "stellar CLI is required"
  exit 1
fi

echo "Building rewards and campaign contracts..."
cargo build --target wasm32-unknown-unknown --release -p trivela-rewards-contract -p trivela-campaign-contract

echo "Deploying rewards contract to ${NETWORK}..."
REWARDS_CONTRACT_ID="$(stellar contract deploy --wasm "$REWARDS_WASM" --source "$SOURCE" --network "$NETWORK")"

echo "Deploying campaign contract to ${NETWORK}..."
CAMPAIGN_CONTRACT_ID="$(stellar contract deploy --wasm "$CAMPAIGN_WASM" --source "$SOURCE" --network "$NETWORK")"

cat > "$ENV_OUT" <<EOF
VITE_REWARDS_CONTRACT_ID=$REWARDS_CONTRACT_ID
VITE_CAMPAIGN_CONTRACT_ID=$CAMPAIGN_CONTRACT_ID
EOF

echo "Rewards contract: $REWARDS_CONTRACT_ID"
echo "Campaign contract: $CAMPAIGN_CONTRACT_ID"
echo "Saved contract IDs to $ENV_OUT"
