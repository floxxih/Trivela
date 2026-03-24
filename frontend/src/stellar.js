/**
 * Shared Stellar / Soroban constants and utility helpers.
 *
 * Centralizes configuration and common routines so that Landing, ClaimRewards,
 * and future components can reuse them without duplication.
 */

import {
    Address,
    Contract,
    Networks,
    TransactionBuilder,
    BASE_FEE,
    scValToNative,
    nativeToScVal,
    rpc,
} from '@stellar/stellar-sdk';

/* ---------- environment configuration ---------- */

export const SOROBAN_RPC_URL =
    import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

export const REWARDS_CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID || '';

export const NETWORK_PASSPHRASE =
    import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

/* ---------- Freighter helpers ---------- */

/**
 * Return the injected Freighter browser API or throw.
 */
export function getFreighterApi() {
    const freighterApi = window.freighterApi;

    if (!freighterApi) {
        throw new Error(
            'Freighter API is unavailable. Install or unlock the Freighter browser extension.',
        );
    }

    return freighterApi;
}

/**
 * Connect the Freighter wallet and return the public key.
 */
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

/**
 * Safely format a raw balance value (bigint | number) to a display string.
 */
export function formatPoints(points) {
    if (typeof points === 'bigint') return points.toString();
    if (typeof points === 'number') return String(points);
    return '0';
}

/**
 * Turn an unknown error value into a human-readable message.
 */
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

/**
 * Simulate a read-only `balance(user)` call and return the raw result.
 */
export async function fetchRewardsBalance(walletAddress) {
    if (!REWARDS_CONTRACT_ID) {
        throw new Error('Set VITE_REWARDS_CONTRACT_ID to load on-chain points.');
    }

    const server = new rpc.Server(SOROBAN_RPC_URL);
    const sourceAccount = await server.getAccount(walletAddress);
    const contract = new Contract(REWARDS_CONTRACT_ID);

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

/**
 * Build, sign (Freighter), submit, and poll a `claim(user, amount)` call.
 *
 * Returns `{ hash: string, newBalance: string }` on success.
 */
export async function submitClaimTransaction(walletAddress, amount) {
    if (!REWARDS_CONTRACT_ID) {
        throw new Error('Set VITE_REWARDS_CONTRACT_ID before claiming rewards.');
    }

    const server = new rpc.Server(SOROBAN_RPC_URL);
    const sourceAccount = await server.getAccount(walletAddress);
    const contract = new Contract(REWARDS_CONTRACT_ID);

    /* 1. Build the transaction */
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

    /* 2. Simulate & prepare (assembles auth + resources) */
    const preparedTx = await server.prepareTransaction(tx);

    /* 3. Sign with Freighter */
    const freighterApi = getFreighterApi();
    const signResult = await freighterApi.signTransaction(preparedTx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: walletAddress,
    });

    if (signResult.error) throw new Error(signResult.error);

    /* 4. Re-construct the signed transaction */
    const signedTx = TransactionBuilder.fromXDR(
        signResult.signedTxXdr,
        NETWORK_PASSPHRASE,
    );

    /* 5. Submit */
    const sendResult = await server.sendTransaction(signedTx);
    if (sendResult.status === 'ERROR') {
        throw new Error(sendResult.errorResult?.toString() || 'Transaction submission failed.');
    }

    /* 6. Poll until finalised */
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
