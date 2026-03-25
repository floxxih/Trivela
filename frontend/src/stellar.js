/**
 * Shared Stellar / Soroban constants and utility helpers.
 *
 * Centralizes configuration and common routines so that Landing, ClaimRewards,
 * and future components can reuse them without duplication.
 */

import {
  Address,
  TransactionBuilder,
  BASE_FEE,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import {
  CAMPAIGN_CONTRACT_ID,
  createSorobanServer,
  getCampaignContract,
  getRewardsContract,
  NETWORK_PASSPHRASE,
  REWARDS_CONTRACT_ID,
} from './config';

export {
  CAMPAIGN_CONTRACT_ID,
  NETWORK_PASSPHRASE,
  REWARDS_CONTRACT_ID,
} from './config';

/* ---------- Freighter helpers ---------- */

export function getFreighterApi() {
  const freighterApi = window.freighterApi;

  if (!freighterApi) {
    throw new Error(
      'Freighter API is unavailable. Install or unlock the Freighter browser extension.',
    );
  }

  return freighterApi;
}

export async function getWalletAddress() {
  const freighterApi = getFreighterApi();

  const freighterStatus = await freighterApi.isConnected();
  if (freighterStatus.error) throw new Error(freighterStatus.error);
  if (!freighterStatus.isConnected) {
    throw new Error(
      'Freighter extension was not detected. Install or unlock Freighter to connect a wallet.',
    );
  }

  const existingAddress = await freighterApi.getAddress();
  if (existingAddress.error) throw new Error(existingAddress.error);
  if (existingAddress.address) return existingAddress.address;

  const access = await freighterApi.requestAccess();
  if (access.error) throw new Error(access.error);
  if (!access.address) throw new Error('Freighter did not return a wallet address.');

  return access.address;
}

/* ---------- formatting ---------- */

export function formatPoints(points) {
  if (typeof points === 'bigint') return points.toString();
  if (typeof points === 'number') return String(points);
  return '0';
}

export function normalizeError(error) {
  if (!error) return 'Unable to load points right now.';

  const message =
    typeof error === 'string'
      ? error
      : error.message || error.toString?.() || 'Unable to load points right now.';

  if (/not found|missing|404/i.test(message)) {
    return 'Rewards contract is not deployed on the configured Soroban network yet.';
  }

  if (/unsupported address type/i.test(message)) {
    return 'Connected wallet address is invalid for Soroban calls.';
  }

  return message;
}

/* ---------- contract read helpers ---------- */

export async function fetchRewardsBalance(walletAddress) {
  const contract = getRewardsContract();
  if (!contract) {
    throw new Error('Set VITE_REWARDS_CONTRACT_ID to load on-chain points.');
  }

  const server = createSorobanServer();
  const sourceAccount = await server.getAccount(walletAddress);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('balance', nativeToScVal(Address.fromString(walletAddress))),
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (simulation.error) throw new Error(simulation.error);
  if (!simulation.result) {
    throw new Error('Soroban RPC returned no result for rewards balance.');
  }

  return scValToNative(simulation.result.retval);
}

/* ---------- contract write helpers ---------- */

const TX_POLL_INTERVAL_MS = 1500;
const TX_POLL_MAX_ATTEMPTS = 40;

export async function submitClaimTransaction(walletAddress, amount) {
  const contract = getRewardsContract();
  if (!contract) {
    throw new Error('Set VITE_REWARDS_CONTRACT_ID before claiming rewards.');
  }

  const server = createSorobanServer();
  const sourceAccount = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'claim',
        nativeToScVal(Address.fromString(walletAddress)),
        nativeToScVal(amount, { type: 'u64' }),
      ),
    )
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);

  const freighterApi = getFreighterApi();
  const signResult = await freighterApi.signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: walletAddress,
  });

  if (signResult.error) throw new Error(signResult.error);

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE,
  );

  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(sendResult.errorResult?.toString() || 'Transaction submission failed.');
  }

  let getResult;
  for (let i = 0; i < TX_POLL_MAX_ATTEMPTS; i++) {
    // eslint-disable-next-line no-await-in-loop
    getResult = await server.getTransaction(sendResult.hash);
    if (getResult.status !== 'NOT_FOUND') break;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL_MS));
  }

  if (!getResult || getResult.status === 'NOT_FOUND') {
    throw new Error('Transaction was submitted but could not be confirmed in time.');
  }

  if (getResult.status === 'FAILED') {
    throw new Error('Transaction failed on-chain. You may not have enough points.');
  }

  const newBalance = getResult.returnValue
    ? formatPoints(scValToNative(getResult.returnValue))
    : null;

  return { hash: sendResult.hash, newBalance };
}

/* ---------- campaign contract helpers ---------- */

export async function checkParticipantStatus(walletAddress) {
  const contract = getCampaignContract();
  if (!contract) {
    throw new Error('Set VITE_CAMPAIGN_CONTRACT_ID to check participant status.');
  }

  const server = createSorobanServer();
  const sourceAccount = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'is_participant',
        nativeToScVal(Address.fromString(walletAddress)),
      ),
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (simulation.error) throw new Error(simulation.error);
  if (!simulation.result) return false;

  return scValToNative(simulation.result.retval);
}

export async function submitRegisterTransaction(walletAddress) {
  const contract = getCampaignContract();
  if (!contract) {
    throw new Error('Set VITE_CAMPAIGN_CONTRACT_ID before registering.');
  }

  const server = createSorobanServer();
  const sourceAccount = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'register',
        nativeToScVal(Address.fromString(walletAddress)),
      ),
    )
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);

  const freighterApi = getFreighterApi();
  const signResult = await freighterApi.signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: walletAddress,
  });

  if (signResult.error) throw new Error(signResult.error);

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE,
  );

  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(
      sendResult.errorResult?.toString() || 'Registration transaction failed.',
    );
  }

  let getResult;
  for (let i = 0; i < TX_POLL_MAX_ATTEMPTS; i++) {
    // eslint-disable-next-line no-await-in-loop
    getResult = await server.getTransaction(sendResult.hash);
    if (getResult.status !== 'NOT_FOUND') break;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL_MS));
  }

  if (!getResult || getResult.status === 'NOT_FOUND') {
    throw new Error(
      'Registration transaction was submitted but could not be confirmed in time.',
    );
  }

  if (getResult.status === 'FAILED') {
    throw new Error('Registration transaction failed on-chain.');
  }

  const wasNew = getResult.returnValue
    ? scValToNative(getResult.returnValue)
    : true;

  return { hash: sendResult.hash, alreadyRegistered: !wasNew };
}
