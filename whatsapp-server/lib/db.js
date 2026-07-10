/**
 * WhatsApp Session API — PostgreSQL DB Connection & Schema Setup
 * 
 * Sets up the connection pool and initializes the required tables.
 * Generic and app-agnostic.
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/whatsapp_service';

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Initialize database schema
 */
async function initDatabase() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      session_id VARCHAR(100) NOT NULL,
      key VARCHAR(255) NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_id ON whatsapp_sessions(session_id);
  `;

  try {
    const client = await pool.connect();
    try {
      await client.query(queryText);
      console.log('PostgreSQL: whatsapp_sessions schema verified/created successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PostgreSQL Connection/Migration Error:', err.message);
    throw err;
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDatabase,
};
