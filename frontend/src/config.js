import { Contract, Networks, rpc } from '@stellar/stellar-sdk';

const DEFAULT_SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || '');
export const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || DEFAULT_SOROBAN_RPC_URL;
export const REWARDS_CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID || '';
export const CAMPAIGN_CONTRACT_ID = import.meta.env.VITE_CAMPAIGN_CONTRACT_ID || '';
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

export function apiUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  return `${API_BASE_URL}${path}`;
}

export function createSorobanServer() {
  return new rpc.Server(SOROBAN_RPC_URL);
}

export function getRewardsContract() {
  return REWARDS_CONTRACT_ID ? new Contract(REWARDS_CONTRACT_ID) : null;
}

export function getCampaignContract() {
  return CAMPAIGN_CONTRACT_ID ? new Contract(CAMPAIGN_CONTRACT_ID) : null;
}
