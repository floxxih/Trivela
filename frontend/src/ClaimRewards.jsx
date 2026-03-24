import { useState } from 'react';
import { submitClaimTransaction, normalizeError } from './stellar';

/**
 * ClaimRewards — lets the user enter a points amount, sign a Soroban
 * `claim(user, amount)` transaction via Freighter, and see the result.
 *
 * Props
 * ─────
 * @param {string}   walletAddress   – Connected Stellar public key.
 * @param {function} onClaimSuccess  – Called with the new balance string after
 *                                     a successful claim so the parent can
 *                                     refresh its display.
 */
export default function ClaimRewards({ walletAddress, onClaimSuccess }) {
  const [amount, setAmount] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [claimError, setClaimError] = useState('');

  const parsedAmount = Number(amount);
  const isValid = Number.isInteger(parsedAmount) && parsedAmount > 0;

  const handleClaim = async () => {
    if (!walletAddress || !isValid) return;

    setIsClaiming(true);
    setClaimError('');
    setTxHash('');

    try {
      const { hash, newBalance } = await submitClaimTransaction(
        walletAddress,
        parsedAmount,
      );

      setTxHash(hash);
      setAmount('');

      if (onClaimSuccess) {
        onClaimSuccess(newBalance);
      }
    } catch (error) {
      setClaimError(normalizeError(error));
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="claim-section">
      <p className="claim-heading">Claim rewards</p>

      <div className="claim-form">
        <label htmlFor="claim-amount" className="claim-label">
          Amount to claim
        </label>
        <div className="claim-input-row">
          <input
            id="claim-amount"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 100"
            className="claim-input"
            value={amount}
            disabled={isClaiming || !walletAddress}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-button"
            disabled={!walletAddress || !isValid || isClaiming}
            onClick={handleClaim}
          >
            {isClaiming ? 'Signing…' : 'Claim'}
          </button>
        </div>
      </div>

      {txHash && (
        <p className="claim-success">
          ✓ Claimed successfully —{' '}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            view transaction
          </a>
        </p>
      )}

      {claimError && <p className="claim-error">{claimError}</p>}
    </div>
  );
}
