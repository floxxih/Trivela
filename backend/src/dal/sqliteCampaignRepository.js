import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS campaigns (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL DEFAULT '',
  active            INTEGER NOT NULL DEFAULT 1,
  reward_per_action INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL
);
`;

function rowToCampaign(row) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    active: row.active === 1,
    rewardPerAction: row.reward_per_action,
    createdAt: row.created_at,
  };
}

export function createSqliteCampaignRepository({
  dbPath = ':memory:',
  seed = [],
} = {}) {
  const db = new Database(dbPath);
  db.exec(SCHEMA);

  if (seed.length > 0) {
    const count = db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n;
    if (count === 0) {
      const insert = db.prepare(
        'INSERT INTO campaigns (name, description, active, reward_per_action, created_at) VALUES (?, ?, ?, ?, ?)',
      );
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          insert.run(
            row.name,
            row.description ?? '',
            row.active ? 1 : 0,
            row.rewardPerAction ?? 0,
            row.createdAt ?? new Date().toISOString(),
          );
        }
      });
      insertMany(seed);
    }
  }

  function list({ active, q } = {}) {
    const hasQuery = typeof q === 'string' && q.length > 0;
    const queryTerm = hasQuery ? `%${q.toLowerCase()}%` : null;

    if (active !== undefined && hasQuery) {
      return db
        .prepare(
          'SELECT * FROM campaigns WHERE active = ? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?) ORDER BY id ASC',
        )
        .all(active ? 1 : 0, queryTerm, queryTerm)
        .map(rowToCampaign);
    }

    if (hasQuery) {
      return db
        .prepare(
          'SELECT * FROM campaigns WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? ORDER BY id ASC',
        )
        .all(queryTerm, queryTerm)
        .map(rowToCampaign);
    }

    if (active !== undefined) {
      return db
        .prepare('SELECT * FROM campaigns WHERE active = ? ORDER BY id ASC')
        .all(active ? 1 : 0)
        .map(rowToCampaign);
    }

    return db
      .prepare('SELECT * FROM campaigns ORDER BY id ASC')
      .all()
      .map(rowToCampaign);
  }

  function getById(id) {
    const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(id));
    return row ? rowToCampaign(row) : undefined;
  }

  function create({ name, description = '', rewardPerAction = 0 }) {
    const createdAt = new Date().toISOString();
    const info = db
      .prepare(
        'INSERT INTO campaigns (name, description, active, reward_per_action, created_at) VALUES (?, ?, 1, ?, ?)',
      )
      .run(name, description, rewardPerAction, createdAt);

    return getById(info.lastInsertRowid);
  }

  function update(id, fields) {
    const allowed = ['name', 'description', 'active', 'rewardPerAction'];
    const columnMap = {
      name: 'name',
      description: 'description',
      active: 'active',
      rewardPerAction: 'reward_per_action',
    };
    const sets = [];
    const values = [];

    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${columnMap[key]} = ?`);
        values.push(key === 'active' ? (fields[key] ? 1 : 0) : fields[key]);
      }
    }

    if (sets.length === 0) {
      return getById(id);
    }

    values.push(Number(id));
    db.prepare(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return getById(id);
  }

  function remove(id) {
    const info = db.prepare('DELETE FROM campaigns WHERE id = ?').run(Number(id));
    return info.changes > 0;
  }

  return {
    list,
    getById,
    create,
    update,
    delete: remove,
  };
}
