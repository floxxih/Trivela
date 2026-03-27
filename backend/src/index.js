/**
 * Trivela Backend API
 * Serves campaign data, health, and Stellar/Soroban RPC proxy for the frontend.
 */

import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';
import createApiKeyAuth from './middleware/apiKeyAuth.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import logger from './middleware/logger.js';
import { paginateItems } from './pagination.js';
import { checkSorobanRpcHealth } from './sorobanRpc.js';
import { createDb } from './db.js';

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

function defaultSeed() {
  return [
    {
      name: 'Welcome Campaign',
      description: 'Earn points for completing onboarding',
      active: true,
      rewardPerAction: 10,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function createApp(options = {}) {
  const apiKey = options.apiKey ?? process.env.TRIVELA_API_KEY ?? '';
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? '*';
  const stellarNetwork = options.stellarNetwork ?? process.env.STELLAR_NETWORK ?? 'testnet';
  const sorobanRpcUrl = options.sorobanRpcUrl ?? process.env.SOROBAN_RPC_URL ?? DEFAULT_RPC_URL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const dbPath = options.dbPath ?? process.env.DB_PATH ?? ':memory:';
  const rateLimitWindowMs = normalizePositiveInteger(
    options.rateLimit?.windowMs ?? process.env.RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  );
  const rateLimitMaxRequests = normalizePositiveInteger(
    options.rateLimit?.maxRequests ?? process.env.RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  );

  // When an explicit campaigns seed is provided (legacy test path), use it;
  // otherwise fall back to the default "Welcome Campaign" row.
  const seed = options.campaigns ?? defaultSeed();
  const db = createDb(dbPath, seed);

  const app = express();
  const requireApiKey = createApiKeyAuth({ apiKey });
  const rateLimiter = createRateLimiter({
    windowMs: rateLimitWindowMs,
    maxRequests: rateLimitMaxRequests,
    timeProvider: options.rateLimit?.timeProvider,
  });

  app.use(cors({ origin: corsOrigin }));
  app.use(logger);
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
        createCampaign: `POST ${API_V1_PREFIX}/campaigns`,
        updateCampaign: `PUT ${API_V1_PREFIX}/campaigns/:id`,
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
    const activeFilter =
      req.query.active !== undefined
        ? req.query.active === 'true'
        : undefined;
    const items = db.getAll({ active: activeFilter });
    res.json(paginateItems(items, req.query));
  }

  function getCampaignById(req, res) {
    const campaign = db.getById(req.params.id);
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
    const campaign = db.create({ name, description, rewardPerAction });
    return res.status(201).json(campaign);
  }

  function updateCampaign(req, res) {
    const existing = db.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const updated = db.update(req.params.id, req.body);
    return res.json(updated);
  }

  function deleteCampaign(req, res) {
    const deleted = db.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
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
