import { useEffect, useState } from 'react';
import Header from './components/Header';
import CreateCampaign from './CreateCampaign';
import { apiUrl } from './config';
import { logSafeEvent } from './lib/safeAnalytics';
import './Landing.css';

export default function AdminCampaigns({
  theme,
  onToggleTheme,
  walletAddress,
  walletBalance,
  isWalletLoading,
  isWalletBalanceLoading,
  onConnectWallet,
  onDisconnectWallet,
}) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/v1/campaigns'));
      const payload = await response.json();
      setCampaigns(payload.data || []);
      logSafeEvent('admin_campaigns_loaded', { count: payload.data?.length ?? 0 });
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <div className="landing">
      <Header
        theme={theme}
        onToggleTheme={onToggleTheme}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        isWalletLoading={isWalletLoading}
        isWalletBalanceLoading={isWalletBalanceLoading}
        onConnectWallet={onConnectWallet}
        onDisconnectWallet={onDisconnectWallet}
      />
      <main id="main-content" className="landing-main" tabIndex="-1">
        <section className="section">
          <h2 className="section-title">Protected admin campaigns UI</h2>
          <p className="section-subtitle">
            Uses session-only API key storage and never exposes admin credentials on public pages.
          </p>
          {loading ? <p>Loading campaigns…</p> : null}
          <CreateCampaign campaigns={campaigns} onCampaignCreated={loadCampaigns} />
        </section>
      </main>
    </div>
  );
}
