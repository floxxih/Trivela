import { useEffect, useState } from 'react';
import {
  submitRegisterTransaction,
  checkParticipantStatus,
  normalizeError,
  CAMPAIGN_CONTRACT_ID,
} from './stellar';

/**
 * RegisterCampaign — lets the connected wallet register as a campaign
 * participant by calling the campaign contract's `register(participant)`.
 *
 * Props
 * ─────
 * @param {string} walletAddress – Connected Stellar public key.
 */
export default function RegisterCampaign({ walletAddress }) {
  const [isRegistered, setIsRegistered] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  /* On mount (and when the wallet changes), check participant status. */
  useEffect(() => {
    if (!walletAddress || !CAMPAIGN_CONTRACT_ID) {
      setIsRegistered(null);
      return;
    }

    let cancelled = false;
    setIsChecking(true);
    setError('');

    checkParticipantStatus(walletAddress)
      .then((registered) => {
        if (!cancelled) setIsRegistered(registered);
      })
      .catch((err) => {
        if (!cancelled) setError(normalizeError(err));
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const handleRegister = async () => {
    if (!walletAddress) return;

    setIsRegistering(true);
    setError('');
    setTxHash('');

    try {
      const { hash, alreadyRegistered } = await submitRegisterTransaction(walletAddress);
      setTxHash(hash);
      setIsRegistered(true);

      if (alreadyRegistered) {
        setError('You were already registered in this campaign.');
      }
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setIsRegistering(false);
    }
  };

  if (!CAMPAIGN_CONTRACT_ID) return null;

  const statusLabel = isChecking
    ? 'Checking…'
    : isRegistered === true
      ? '✓ Registered'
      : isRegistered === false
        ? 'Not registered'
        : '—';

  return (
    <div className="register-section">
      <p className="register-heading">Campaign registration</p>

      <div className="register-status">
        <span className="register-status-label">Participant status</span>
        <strong className={isRegistered ? 'register-active' : ''}>
          {statusLabel}
        </strong>
      </div>

      {!isRegistered && (
        <button
          type="button"
          className="btn btn-primary btn-button"
          disabled={isRegistering || isChecking || !walletAddress}
          onClick={handleRegister}
        >
          {isRegistering ? 'Signing…' : 'Register in campaign'}
        </button>
      )}

      {txHash && (
        <p className="register-success">
          ✓ Registered successfully —{' '}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            view transaction
          </a>
        </p>
      )}

      {error && <p className="register-error">{error}</p>}
    </div>
  );
}
