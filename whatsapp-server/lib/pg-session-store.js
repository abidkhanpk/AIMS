/**
 * PostgreSQL Auth State Provider for Baileys
 * 
 * Provides database-backed credentials & signal keys storage.
 * Uses BufferJSON serialize/deserialize handlers to maintain binary data integrity.
 */

const { BufferJSON, initAuthCreds, proto } = require('@whiskeysockets/baileys');
const db = require('./db');

/**
 * Creates a Baileys auth state that persists state inside PostgreSQL database
 * 
 * @param {string} sessionId - Unique identifier (JID / phone number / Client ID)
 */
async function usePostgresAuthState(sessionId) {
  
  // Helper to read JSON state from database
  async function readData(key) {
    try {
      const res = await db.query(
        'SELECT value FROM whatsapp_sessions WHERE session_id = $1 AND key = $2',
        [sessionId, key]
      );
      if (res.rows.length === 0) return null;
      return JSON.parse(res.rows[0].value, BufferJSON.reviver);
    } catch (err) {
      console.error(`Postgres auth store: failed to read key ${key}:`, err.message);
      return null;
    }
  }

  // Helper to write JSON state to database (or remove if value is null)
  async function writeData(key, value) {
    try {
      if (value === null || value === undefined) {
        await db.query(
          'DELETE FROM whatsapp_sessions WHERE session_id = $1 AND key = $2',
          [sessionId, key]
        );
      } else {
        const valueStr = JSON.stringify(value, BufferJSON.replacer);
        await db.query(
          `INSERT INTO whatsapp_sessions (session_id, key, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (session_id, key)
           DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [sessionId, key, valueStr]
        );
      }
    } catch (err) {
      console.error(`Postgres auth store: failed to write key ${key}:`, err.message);
    }
  }

  // Fetch or initialize credentials
  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeData('creds', creds);
  }

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        await Promise.all(
          ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (value) {
              if (type === 'app-state-sync-key') {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }
          })
        );
        return data;
      },
      set: async (data) => {
        const tasks = [];
        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            const value = data[category][id];
            const key = `${category}-${id}`;
            tasks.push(writeData(key, value));
          }
        }
        await Promise.all(tasks);
      }
    }
  };

  return {
    state,
    saveCreds: async () => {
      await writeData('creds', state.creds);
    }
  };
}

module.exports = {
  usePostgresAuthState,
};
