/**
 * Trivela Backend API
 * Serves campaign data, health, and Stellar/Soroban RPC proxy for the frontend.
 */

import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';
import createApiKeyAuth from './middleware/apiKeyAuth.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { paginateItems } from './pagination.js';
import { checkSorobanRpcHealth } from './sorobanRpc.js';

const DEFAULT_PORT = 3001;
const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;
const LEGACY_API_PREFIX = '/api';
const API_V1_PREFIX = '/api/v1';

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultCampaigns() {
  return [
    {
      id: '1',
      name: 'Welcome Campaign',
      description: 'Earn points for completing onboarding',
      active: true,
      rewardPerAction: 10,
      createdAt: new Date().toISOString(),
    },
  ];
}

function cloneCampaigns(campaigns) {
  return campaigns.map((campaign) => ({ ...campaign }));
}

function nextCampaignId(campaigns) {
  const maxId = campaigns.reduce((currentMax, campaign) => {
    const parsed = Number.parseInt(campaign.id, 10);
    return Number.isFinite(parsed) ? Math.max(currentMax, parsed) : currentMax;
  }, 0);

  return String(maxId + 1);
}

export function createApp(options = {}) {
  const apiKey = options.apiKey ?? process.env.TRIVELA_API_KEY ?? '';
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? '*';
  const stellarNetwork = options.stellarNetwork ?? process.env.STELLAR_NETWORK ?? 'testnet';
  const sorobanRpcUrl = options.sorobanRpcUrl ?? process.env.SOROBAN_RPC_URL ?? DEFAULT_RPC_URL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const campaigns = cloneCampaigns(options.campaigns ?? defaultCampaigns());
  const rateLimitWindowMs = normalizePositiveInteger(
    options.rateLimit?.windowMs ?? process.env.RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  );
  const rateLimitMaxRequests = normalizePositiveInteger(
    options.rateLimit?.maxRequests ?? process.env.RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  );

  const app = express();
  const requireApiKey = createApiKeyAuth({ apiKey });
  const rateLimiter = createRateLimiter({
    windowMs: rateLimitWindowMs,
    maxRequests: rateLimitMaxRequests,
    timeProvider: options.rateLimit?.timeProvider,
  });

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  async function buildHealthPayload() {
    const rpc = await checkSorobanRpcHealth({
      rpcUrl: sorobanRpcUrl,
      fetchImpl,
    });

    return {
      status: rpc.status === 'ok' ? 'ok' : 'degraded',
      service: 'trivela-api',
      timestamp: new Date().toISOString(),
      rpc,
    };
  }

  app.get('/health', async (_req, res) => {
    const payload = await buildHealthPayload();
    res.json(payload);
  });

  app.get('/health/rpc', async (_req, res) => {
    const rpc = await checkSorobanRpcHealth({
      rpcUrl: sorobanRpcUrl,
      fetchImpl,
    });
    res.status(rpc.status === 'ok' ? 200 : 503).json(rpc);
  });

  function apiInfo(req, res) {
    const usingLegacyPrefix =
      req.path.startsWith(LEGACY_API_PREFIX) && !req.path.startsWith(API_V1_PREFIX);

    res.json({
      name: 'Trivela API',
      version: '0.1.0',
      prefix: API_V1_PREFIX,
      endpoints: {
        health: 'GET /health',
        healthRpc: 'GET /health/rpc',
        info: `GET ${API_V1_PREFIX}`,
        campaigns: `GET ${API_V1_PREFIX}/campaigns`,
        campaign: `GET ${API_V1_PREFIX}/campaigns/:id`,
        deleteCampaign: `DELETE ${API_V1_PREFIX}/campaigns/:id`,
      },
      compatibility: {
        legacyPrefix: LEGACY_API_PREFIX,
        legacyRoutesSupported: true,
        migrationNote: 'Prefer /api/v1/* routes. Legacy /api/* routes remain available for compatibility.',
        usingLegacyPrefix,
      },
      stellar: {
        network: stellarNetwork,
        rpcUrl: sorobanRpcUrl,
      },
      rateLimit: {
        keying: 'per API key when present, otherwise per IP address',
        windowMs: rateLimitWindowMs,
        maxRequests: rateLimitMaxRequests,
      },
    });
  }

  function listCampaigns(req, res) {
    res.json(paginateItems(campaigns, req.query));
  }

  function getCampaignById(req, res) {
    const campaign = campaigns.find((entry) => entry.id === req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json(campaign);
  }

  function createCampaign(req, res) {
    const { name, description, rewardPerAction } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const campaign = {
      id: nextCampaignId(campaigns),
      name,
      description: description || '',
      active: true,
      rewardPerAction: rewardPerAction ?? 0,
      createdAt: new Date().toISOString(),
    };

    campaigns.push(campaign);
    return res.status(201).json(campaign);
  }

  function updateCampaign(req, res) {
    const campaign = campaigns.find((entry) => entry.id === req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    Object.assign(campaign, req.body, { id: campaign.id });
    return res.json(campaign);
  }

  function deleteCampaign(req, res) {
    const index = campaigns.findIndex((entry) => entry.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    campaigns.splice(index, 1);
    return res.status(204).end();
  }

  function registerApiRoutes(prefix) {
    app.get(prefix, rateLimiter, apiInfo);
    app.get(`${prefix}/campaigns`, rateLimiter, listCampaigns);
    app.get(`${prefix}/campaigns/:id`, rateLimiter, getCampaignById);
    app.post(`${prefix}/campaigns`, rateLimiter, requireApiKey, createCampaign);
    app.put(`${prefix}/campaigns/:id`, rateLimiter, requireApiKey, updateCampaign);
    app.delete(`${prefix}/campaigns/:id`, rateLimiter, requireApiKey, deleteCampaign);
  }

  registerApiRoutes(API_V1_PREFIX);
  registerApiRoutes(LEGACY_API_PREFIX);

  return app;
}

export function startServer(options = {}) {
  const app = createApp(options);
  const port = options.port ?? process.env.PORT ?? DEFAULT_PORT;

  return app.listen(port, () => {
    console.log(`Trivela API running at http://localhost:${port}`);
  });
}

const isExecutedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
  startServer();
}
