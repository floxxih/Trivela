import assert from 'node:assert/strict';
import test from 'node:test';
import { createSqliteCampaignRepository } from './sqliteCampaignRepository.js';

function seedCampaigns() {
  return [
    {
      name: 'Welcome Campaign',
      description: 'Rewards for onboarding',
      active: true,
      rewardPerAction: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      name: 'Builder Sprint',
      description: 'Dev tooling campaign',
      active: false,
      rewardPerAction: 25,
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ];
}

test('sqlite campaign repository lists, filters, and searches campaigns', () => {
  const repository = createSqliteCampaignRepository({ seed: seedCampaigns() });

  assert.equal(repository.list().length, 2);
  assert.equal(repository.list({ active: true }).length, 1);
  assert.equal(repository.list({ active: false }).length, 1);
  assert.equal(repository.list({ q: 'builder' }).length, 1);
});

test('sqlite campaign repository creates, updates, and deletes campaigns', () => {
  const repository = createSqliteCampaignRepository();

  const created = repository.create({
    name: 'Launch Quest',
    description: 'Initial launch rewards',
    rewardPerAction: 40,
  });

  assert.equal(created.name, 'Launch Quest');
  assert.equal(created.active, true);

  const updated = repository.update(created.id, {
    name: 'Launch Quest Updated',
    active: false,
  });

  assert.equal(updated.name, 'Launch Quest Updated');
  assert.equal(updated.active, false);

  assert.equal(repository.delete(created.id), true);
  assert.equal(repository.getById(created.id), undefined);
  assert.equal(repository.delete(created.id), false);
});
