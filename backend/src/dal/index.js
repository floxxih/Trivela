import { assertCampaignRepository } from './campaignRepository.js';
import { createSqliteCampaignRepository } from './sqliteCampaignRepository.js';

export function createDal({
  dbPath = ':memory:',
  campaigns = [],
  campaignRepository,
} = {}) {
  return {
    campaigns: assertCampaignRepository(
      campaignRepository
        ?? createSqliteCampaignRepository({
          dbPath,
          seed: campaigns,
        }),
    ),
  };
}
