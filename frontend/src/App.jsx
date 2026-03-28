import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import CampaignDetail from './CampaignDetail';
import { applyTheme, getPreferredTheme, THEME_STORAGE_KEY } from './theme';
import {
  getWalletAddress,
  fetchWalletBalance,
  formatWalletBalance,
  normalizeError,
} from './stellar';

export default function App() {
  const [theme, setTheme] = useState(() => getPreferredTheme());
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isWalletBalanceLoading, setIsWalletBalanceLoading] = useState(false);
  const [walletError, setWalletError] = useState('');

  useEffect(() => {
    applyTheme(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const loadWalletBalance = async (address) => {
    if (!address) {
      setWalletBalance('');
      return;
    }

    setIsWalletBalanceLoading(true);

    try {
      const balance = await fetchWalletBalance(address);
      setWalletBalance(formatWalletBalance(balance));
    } catch (_error) {
      setWalletBalance('Unavailable');
    } finally {
      setIsWalletBalanceLoading(false);
    }
  };

  const connectWallet = async () => {
    setIsWalletLoading(true);
    setWalletError('');

    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
      await loadWalletBalance(address);
    } catch (error) {
      setWalletAddress('');
      setWalletBalance('');
      setWalletError(normalizeError(error));
    } finally {
      setIsWalletLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setWalletBalance('');
    setWalletError('');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing
            theme={theme}
            onToggleTheme={toggleTheme}
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            isWalletLoading={isWalletLoading}
            isWalletBalanceLoading={isWalletBalanceLoading}
            walletError={walletError}
            onConnectWallet={connectWallet}
            onDisconnectWallet={disconnectWallet}
          />
        }
      />
      <Route
        path="/campaign/:id"
        element={
          <CampaignDetail
            theme={theme}
            onToggleTheme={toggleTheme}
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            isWalletLoading={isWalletLoading}
            isWalletBalanceLoading={isWalletBalanceLoading}
            onConnectWallet={connectWallet}
            onDisconnectWallet={disconnectWallet}
          />
        }
      />
    </Routes>
  );
}
