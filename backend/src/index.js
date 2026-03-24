/**
 * Trivela Backend API
 * Serves campaign data, health, and Stellar/Soroban RPC proxy for the frontend.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;
const LEGACY_API_PREFIX = '/api';
const API_V1_PREFIX = '/api/v1';

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Health check for Drip and reviewers
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'trivela-api', timestamp: new Date().toISOString() });
});

// Placeholder campaigns (replace with DB later)
const campaigns = [
  {
    id: '1',
    name: 'Welcome Campaign',
    description: 'Earn points for completing onboarding',
    active: true,
    rewardPerAction: 10,
    createdAt: new Date().toISOString(),
  },
];

function apiInfo(req, res) {
  const usingLegacyPrefix = req.path.startsWith(LEGACY_API_PREFIX) && !req.path.startsWith(API_V1_PREFIX);

  res.json({
    name: 'Trivela API',
    version: '0.1.0',
    prefix: API_V1_PREFIX,
    endpoints: {
      health: 'GET /health',
      info: `GET ${API_V1_PREFIX}`,
      campaigns: `GET ${API_V1_PREFIX}/campaigns`,
      campaign: `GET ${API_V1_PREFIX}/campaigns/:id`,
    },
    compatibility: {
      legacyPrefix: LEGACY_API_PREFIX,
      legacyRoutesSupported: true,
      migrationNote: 'Prefer /api/v1/* routes. Legacy /api/* routes remain available for compatibility.',
      usingLegacyPrefix,
    },
    stellar: {
      network: process.env.STELLAR_NETWORK || 'testnet',
      rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    },
  });
}

function listCampaigns(_req, res) {
  res.json(campaigns);
}

function getCampaignById(req, res) {
  const campaign = campaigns.find((c) => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
}

function registerApiRoutes(prefix) {
  app.get(prefix, apiInfo);
  app.get(`${prefix}/campaigns`, listCampaigns);
  app.get(`${prefix}/campaigns/:id`, getCampaignById);
}

registerApiRoutes(API_V1_PREFIX);
registerApiRoutes(LEGACY_API_PREFIX);

app.listen(PORT, () => {
  console.log(`Trivela API running at http://localhost:${PORT}`);
});
