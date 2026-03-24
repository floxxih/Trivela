import { useEffect, useState } from 'react';
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
import './Landing.css';

const GITHUB_REPO = 'https://github.com/FinesseStudioLab/Trivela';
const GITHUB_ISSUES = 'https://github.com/FinesseStudioLab/Trivela/issues';
const STELLAR_DOCS = 'https://developers.stellar.org/docs';
const DRIP_WAVE = 'https://www.drips.network/wave/stellar';
const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const REWARDS_CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID || '';
const DEFAULT_NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

function getFreighterApi() {
  const freighterApi = window.freighterApi;

  if (!freighterApi) {
    throw new Error('Freighter API is unavailable. Install or unlock the Freighter browser extension.');
  }

  return freighterApi;
}

function formatPoints(points) {
  if (typeof points === 'bigint') {
    return points.toString();
  }

  if (typeof points === 'number') {
    return String(points);
  }

  return '0';
}

function normalizeError(error) {
  if (!error) {
    return 'Unable to load points right now.';
  }

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

async function getWalletAddress() {
  const freighterApi = getFreighterApi();
  const freighterStatus = await freighterApi.isConnected();
  if (freighterStatus.error) {
    throw new Error(freighterStatus.error);
  }

  if (!freighterStatus.isConnected) {
    throw new Error('Freighter extension was not detected. Install or unlock Freighter to connect a wallet.');
  }

  const existingAddress = await freighterApi.getAddress();
  if (existingAddress.error) {
    throw new Error(existingAddress.error);
  }

  if (existingAddress.address) {
    return existingAddress.address;
  }

  const access = await freighterApi.requestAccess();
  if (access.error) {
    throw new Error(access.error);
  }

  if (!access.address) {
    throw new Error('Freighter did not return a wallet address.');
  }

  return access.address;
}

async function fetchRewardsBalance(walletAddress) {
  if (!REWARDS_CONTRACT_ID) {
    throw new Error('Set VITE_REWARDS_CONTRACT_ID to load on-chain points.');
  }

  const server = new rpc.Server(SOROBAN_RPC_URL);
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new Contract(REWARDS_CONTRACT_ID);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: DEFAULT_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('balance', nativeToScVal(Address.fromString(walletAddress))))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (simulation.error) {
    throw new Error(simulation.error);
  }

  if (!simulation.result) {
    throw new Error('Soroban RPC returned no result for rewards balance.');
  }

  return scValToNative(simulation.result.retval);
}

export default function Landing() {
  const [campaigns, setCampaigns] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [points, setPoints] = useState(null);
  const [pointsError, setPointsError] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isPointsLoading, setIsPointsLoading] = useState(false);

  useEffect(() => {
    const api = import.meta.env.VITE_API_URL || '';
    fetch(`${api}/api/v1/campaigns`)
      .then((r) => r.json())
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  const loadPoints = async (address = walletAddress) => {
    if (!address) {
      setPoints(null);
      setPointsError('Connect a wallet to load your rewards balance.');
      return;
    }

    setIsPointsLoading(true);
    setPointsError('');

    try {
      const balance = await fetchRewardsBalance(address);
      setPoints(formatPoints(balance));
    } catch (error) {
      setPoints(null);
      setPointsError(normalizeError(error));
    } finally {
      setIsPointsLoading(false);
    }
  };

  const connectWallet = async () => {
    setIsWalletLoading(true);
    setPointsError('');

    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
      await loadPoints(address);
    } catch (error) {
      setWalletAddress('');
      setPoints(null);
      setPointsError(normalizeError(error));
    } finally {
      setIsWalletLoading(false);
    }
  };

  return (
    <div className="landing">
      <nav className="nav">
        <a href="/" className="nav-logo">
          <span className="nav-logo-icon">◇</span>
          Trivela
        </a>
        <div className="nav-links">
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">Contribute</a>
          <a href={STELLAR_DOCS} target="_blank" rel="noopener noreferrer">Stellar</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-badge">
          Open source · Built for <a href={DRIP_WAVE} target="_blank" rel="noopener noreferrer">Stellar Wave</a>
        </div>
        <h1 className="hero-title">
          Campaigns & rewards
          <br />
          <span className="hero-title-accent">on Stellar Soroban</span>
        </h1>
        <p className="hero-subtitle">
          Create on-chain campaigns, award points via smart contracts, and let users claim rewards.
          Full stack: Rust contracts, Node API, React frontend — ready for contributors.
        </p>
        <div className="hero-cta">
          <a href={GITHUB_REPO} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            View repository
          </a>
          <a href={GITHUB_ISSUES} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
            Pick an issue · Contribute
          </a>
        </div>
        <div className="hero-stats">
          <span><strong>50</strong> open issues</span>
          <span className="hero-stats-dot">·</span>
          <span><strong>3</strong> stacks</span>
          <span className="hero-stats-dot">·</span>
          <span>Rust · Node · React</span>
        </div>
      </header>

      <section className="section rewards-panel">
        <div className="rewards-card">
          <div>
            <p className="rewards-eyebrow">Wallet rewards</p>
            <h2 className="rewards-title">My points</h2>
            <p className="rewards-copy">
              Connect your Freighter wallet to read your rewards balance directly from the deployed Soroban contract.
            </p>
          </div>

          <div className="rewards-balance">
            <span className="rewards-balance-label">Available points</span>
            <strong>{points ?? '—'}</strong>
          </div>

          <div className="rewards-actions">
            <button
              type="button"
              className="btn btn-primary btn-button"
              onClick={connectWallet}
              disabled={isWalletLoading}
            >
              {isWalletLoading ? 'Connecting…' : walletAddress ? 'Reconnect wallet' : 'Connect wallet'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-button"
              onClick={() => loadPoints()}
              disabled={!walletAddress || isPointsLoading}
            >
              {isPointsLoading ? 'Refreshing…' : 'Refresh points'}
            </button>
          </div>

          {walletAddress && (
            <p className="rewards-wallet">
              Connected wallet: <span>{walletAddress}</span>
            </p>
          )}

          {pointsError && <p className="rewards-error">{pointsError}</p>}
        </div>
      </section>

      <section className="section features">
        <h2 className="section-title">What’s in the stack</h2>
        <p className="section-subtitle">Soroban contracts, API, and frontend — all open for contribution.</p>
        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
            </div>
            <h3>Soroban contracts</h3>
            <p>Rust rewards & campaign contracts: points, credit, claim, participant registration. Deploy on Stellar testnet or mainnet.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            </div>
            <h3>Backend API</h3>
            <p>Node.js + Express: campaigns CRUD, health checks, config for Soroban RPC. Ready for a database and production.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
            </div>
            <h3>React frontend</h3>
            <p>Vite + Stellar SDK. Landing, campaign list, and hooks for wallet connect and contract calls.</p>
          </article>
        </div>
      </section>

      <section className="section how">
        <h2 className="section-title">How it works</h2>
        <div className="how-grid">
          <div className="how-step">
            <span className="how-num">1</span>
            <h3>Deploy contracts</h3>
            <p>Build and deploy the rewards and campaign contracts to Stellar (testnet or mainnet).</p>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <h3>Run API & frontend</h3>
            <p>Start the backend and frontend locally or in the cloud. Connect to your Soroban RPC.</p>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <h3>Contribute</h3>
            <p>Pick an issue from the repo — backend, frontend, or smart contract — and open a PR.</p>
          </div>
        </div>
      </section>

      {campaigns.length > 0 && (
        <section className="section campaigns-preview">
          <h2 className="section-title">Live campaigns</h2>
          <ul className="campaigns-list">
            {campaigns.slice(0, 3).map((c) => (
              <li key={c.id} className="campaign-item">
                <strong>{c.name}</strong>
                <span className="campaign-meta">{c.active ? 'Active' : 'Inactive'} · {c.rewardPerAction} pts</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cta-band">
        <div className="cta-band-inner">
          <h2 className="cta-band-title">Ready to contribute?</h2>
          <p className="cta-band-text">50 labeled issues across smart contracts, backend, and frontend. Part of the Stellar Wave on Drips.</p>
          <a href={GITHUB_ISSUES} className="btn btn-primary btn-large" target="_blank" rel="noopener noreferrer">
            Browse issues on GitHub
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-logo-icon">◇</span>
            <span>Trivela</span>
          </div>
          <div className="footer-links">
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">Repository</a>
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">Issues</a>
            <a href={STELLAR_DOCS} target="_blank" rel="noopener noreferrer">Stellar</a>
            <a href={DRIP_WAVE} target="_blank" rel="noopener noreferrer">Drip Wave</a>
          </div>
          <p className="footer-legal">
            Part of the Stellar ecosystem. Apache-2.0.
          </p>
        </div>
      </footer>
    </div>
  );
}
