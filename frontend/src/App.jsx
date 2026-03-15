import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [health, setHealth] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error' }));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/campaigns`)
      .then((r) => r.json())
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Trivela</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>
          Stellar Soroban Campaign & Rewards Platform
        </p>
        {health && (
          <p style={{ fontSize: 14, color: health.status === 'ok' ? '#16a34a' : '#dc2626' }}>
            API: {health.status === 'ok' ? 'Connected' : 'Disconnected'}
          </p>
        )}
      </header>

      <section>
        <h2 style={{ fontSize: '1.25rem' }}>Campaigns</h2>
        {campaigns.length === 0 ? (
          <p style={{ color: '#64748b' }}>No campaigns yet. Deploy contracts and add campaigns via the API.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {campaigns.map((c) => (
              <li
                key={c.id}
                style={{
                  padding: 16,
                  background: '#fff',
                  borderRadius: 8,
                  marginBottom: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <strong>{c.name}</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{c.description}</p>
                <span style={{ fontSize: 12, color: c.active ? '#16a34a' : '#94a3b8' }}>
                  {c.active ? 'Active' : 'Inactive'} · {c.rewardPerAction} pts/action
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2e8f0', fontSize: 14, color: '#64748b' }}>
        Part of the Stellar ecosystem. Built for Drip Wave.
      </footer>
    </div>
  );
}
