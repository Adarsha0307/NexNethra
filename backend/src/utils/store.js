import { query } from './db.js';

export async function getStore() {
  const { rows: users } = await query('SELECT * FROM users');
  const { rows: incidents } = await query('SELECT * FROM incidents ORDER BY created_at DESC');
  const { rows: activities } = await query('SELECT * FROM activities ORDER BY timestamp DESC');
  return { users, incidents, activities };
}

export async function saveStore(store) {
  // For backward compatibility — does nothing;
  // data is persisted automatically via PG.
}

export async function addUser(user) {
  const { rows } = await query(
    `INSERT INTO users (id, first_name, last_name, email, password_hash, created_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [user.id, user.name || user.firstName || '', user.lastName || '',
     user.email, user.passwordHash, new Date().toISOString()]
  );
  return rows[0];
}

export async function getUsers() {
  const { rows } = await query('SELECT * FROM users ORDER BY created_at DESC');
  return rows;
}

export async function addIncident(incident) {
  const { rows } = await query(
    `INSERT INTO incidents (id, title, category, description, severity, reporter, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [incident.id, incident.title, incident.category, incident.description,
     incident.severity, incident.reporter, incident.status || 'Open',
     incident.createdAt || new Date().toISOString()]
  );
  return rows[0];
}

export async function getIncidents() {
  const { rows } = await query('SELECT * FROM incidents ORDER BY created_at DESC');
  return rows;
}

export async function addActivity(type, title, description, userId) {
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const timestamp = new Date().toISOString();
  const { rows } = await query(
    `INSERT INTO activities (id, user_id, type, title, description, timestamp)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, userId || null, type, title, description || null, timestamp]
  );
  return rows[0];
}

export async function getActivities(limit = 20, userId = null) {
  let sql, params;
  if (userId) {
    sql = 'SELECT * FROM activities WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2';
    params = [userId, limit];
  } else {
    sql = 'SELECT * FROM activities ORDER BY timestamp DESC LIMIT $1';
    params = [limit];
  }
  const { rows } = await query(sql, params);
  return rows;
}
