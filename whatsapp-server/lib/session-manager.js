/**
 * WhatsApp Session Manager — Baileys Session Handler with PostgreSQL and Sleep Mode
 * 
 * Generic, app-agnostic session management:
 * - Manages multiple concurrent WhatsApp sessions (one per clientId)
 * - Persists session auth state to PostgreSQL database (JSONB)
 * - Supports SLEEP mode: Lazy loads connections on demand and goes to sleep when idle to save RAM.
 * - Supports DAEMON mode: Keeps connections open continuously.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const db = require('./db');
const { usePostgresAuthState } = require('./pg-session-store');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// In-memory store of active/sleeping sessions
// Map<clientId, { socket, qr, qrDataUrl, status, phoneNumber, retryCount }>
const sessions = new Map();

// Timer storage for Sleep mode idle-disconnects
// Map<clientId, NodeJS.Timeout>
const idleTimers = {};

// Event listeners map for external consumers
// Map<clientId, Map<event, Set<callback>>>
const eventListeners = new Map();

/**
 * Get logger for a specific client
 */
function getLogger(clientId) {
  return pino({ level: LOG_LEVEL }).child({ client: clientId });
}

/**
 * Emit event to listeners
 */
function emitEvent(clientId, event, data) {
  const listeners = eventListeners.get(clientId);
  if (listeners && listeners.has(event)) {
    for (const cb of listeners.get(event)) {
      try { cb(data); } catch (e) { /* ignore listener errors */ }
    }
  }
}

/**
 * Register an event listener for a client
 */
function onEvent(clientId, event, callback) {
  if (!eventListeners.has(clientId)) {
    eventListeners.set(clientId, new Map());
  }
  const clientListeners = eventListeners.get(clientId);
  if (!clientListeners.has(event)) {
    clientListeners.set(event, new Set());
  }
  clientListeners.get(event).add(callback);
}

/**
 * Remove an event listener
 */
function offEvent(clientId, event, callback) {
  const listeners = eventListeners.get(clientId);
  if (listeners && listeners.has(event)) {
    listeners.get(event).delete(callback);
  }
}

/**
 * Initialize or reconnect a WhatsApp session for the given clientId.
 * If a session already exists and is connected, returns it.
 */
async function initSession(clientId) {
  // If already connected, return existing session
  const existing = sessions.get(clientId);
  if (existing && existing.status === 'connected') {
    resetIdleTimer(clientId);
    return { status: 'connected', phoneNumber: existing.phoneNumber };
  }

  const logger = getLogger(clientId);
  logger.info('Initializing Postgres-backed WhatsApp session');

  const { state, saveCreds } = await usePostgresAuthState(clientId);
  const { version } = await fetchLatestBaileysVersion();

  const sessionData = {
    socket: null,
    qr: null,
    qrDataUrl: null,
    status: 'connecting',
    phoneNumber: null,
    retryCount: 0,
  };

  sessions.set(clientId, sessionData);

  const socket = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
  });

  sessionData.socket = socket;

  // Handle connection updates
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessionData.qr = qr;
      try {
        sessionData.qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      } catch (e) {
        logger.error('Failed to generate QR data URL:', e.message);
      }
      sessionData.status = 'waiting_for_qr';
      emitEvent(clientId, 'qr', { qr, qrDataUrl: sessionData.qrDataUrl });
      logger.info('QR code generated — waiting for scan');
    }

    if (connection === 'open') {
      sessionData.status = 'connected';
      sessionData.qr = null;
      sessionData.qrDataUrl = null;
      sessionData.retryCount = 0;

      // Extract phone number from socket user id
      const jid = socket.user?.id;
      if (jid) {
        sessionData.phoneNumber = jid.split(':')[0].split('@')[0];
      }

      emitEvent(clientId, 'connected', { phoneNumber: sessionData.phoneNumber });
      logger.info(`Connected as ${sessionData.phoneNumber}`);

      // Start the idle timeout timer
      resetIdleTimer(clientId);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const wasSleeping = sessionData.status === 'sleeping';
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !wasSleeping;

      // Clear existing idle timer
      if (idleTimers[clientId]) {
        clearTimeout(idleTimers[clientId]);
        delete idleTimers[clientId];
      }

      // Preserve sleeping status if closed intentionally by sleepSession()
      if (wasSleeping) {
        sessionData.status = 'sleeping';
      } else {
        sessionData.status = 'disconnected';
      }
      sessionData.qr = null;
      sessionData.qrDataUrl = null;

      if (statusCode === DisconnectReason.loggedOut) {
        logger.info('Session logged out — cleaning Postgres credentials');
        await db.query('DELETE FROM whatsapp_sessions WHERE session_id = $1', [clientId]);
        sessions.delete(clientId);
        emitEvent(clientId, 'disconnected', { reason: 'logged_out' });
      } else if (shouldReconnect && sessionData.retryCount < 5) {
        sessionData.retryCount++;
        const delay = Math.min(sessionData.retryCount * 2000, 30000);
        logger.info(`Reconnecting in ${delay}ms (attempt ${sessionData.retryCount})...`);
        setTimeout(() => initSession(clientId), delay);
        emitEvent(clientId, 'reconnecting', { attempt: sessionData.retryCount });
      } else if (!wasSleeping) {
        logger.error('Max reconnection attempts reached or connection closed');
        sessions.delete(clientId);
        emitEvent(clientId, 'disconnected', { reason: 'max_retries' });
      }
    }
  });

  // Save credentials on update
  socket.ev.on('creds.update', saveCreds);

  return { status: 'connecting', message: 'Session initializing — scan QR code to connect' };
}

/**
 * Get or initialize socket connection (Lazy loading helper for routes/message queues)
 */
async function getOrInitSocket(clientId) {
  const status = await getStatus(clientId);
  if (!status.hasAuthData) {
    return null; // No credentials in Postgres, cannot open socket
  }

  const session = sessions.get(clientId);
  if (session && session.socket && session.status === 'connected') {
    resetIdleTimer(clientId);
    return session.socket;
  }

  // Session exists in database but socket is not open/connected (e.g. sleeping or not loaded in memory)
  console.log(`[${clientId}] Lazy loading WhatsApp socket for message dispatch...`);
  await initSession(clientId);

  // Poll connection state until open (wait up to 15 seconds)
  let attempts = 0;
  while (attempts < 30) {
    const currentSession = sessions.get(clientId);
    if (currentSession && currentSession.status === 'connected' && currentSession.socket) {
      resetIdleTimer(clientId);
      return currentSession.socket;
    }
    if (currentSession && currentSession.status === 'disconnected') {
      return null; // Connection closed or failed
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;
  }

  console.error(`[${clientId}] Lazy load socket handshake timed out`);
  return null;
}

/**
 * Resets the idle timeout timer. If a session remains idle, it goes to sleep.
 */
function resetIdleTimer(clientId) {
  if (process.env.WHATSAPP_MODE !== 'SLEEP') return;

  if (idleTimers[clientId]) {
    clearTimeout(idleTimers[clientId]);
  }

  const timeoutMs = parseInt(process.env.WHATSAPP_IDLE_TIMEOUT) || 300000; // Default: 5 minutes

  idleTimers[clientId] = setTimeout(() => {
    sleepSession(clientId);
  }, timeoutMs);
}

/**
 * Gracefully puts a connected session to sleep to free up memory, preserving auth credentials.
 */
function sleepSession(clientId) {
  const session = sessions.get(clientId);
  if (session) {
    const logger = getLogger(clientId);
    logger.info('Suspending WhatsApp socket connection (Sleep Mode)');
    session.status = 'sleeping'; // Set state first so close listener doesn't trigger reconnect
    if (session.socket) {
      try {
        session.socket.end(); // Gracefully close WebSocket
      } catch (e) {
        // Ignore close errors
      }
    }
    session.socket = null;
  }

  if (idleTimers[clientId]) {
    clearTimeout(idleTimers[clientId]);
    delete idleTimers[clientId];
  }
}

/**
 * Get the current session in memory
 */
function getSession(clientId) {
  return sessions.get(clientId) || null;
}

/**
 * Get the Baileys socket for a clientId (if currently open)
 */
function getSocket(clientId) {
  const session = sessions.get(clientId);
  return session?.socket || null;
}

/**
 * Get the current QR code data URL for a clientId
 */
function getQR(clientId) {
  const session = sessions.get(clientId);
  if (!session) {
    return { connected: false, qr: null, message: 'No session found. Initialize first.' };
  }
  if (session.status === 'connected') {
    return { connected: true, phoneNumber: session.phoneNumber, qr: null };
  }
  return {
    connected: false,
    qr: session.qrDataUrl || null,
    status: session.status,
  };
}

/**
 * Get the connection status for a clientId (checks memory & database)
 */
async function getStatus(clientId) {
  const session = sessions.get(clientId);
  
  // Query database to see if valid credentials exist
  let hasAuthData = false;
  try {
    const res = await db.query(
      "SELECT COUNT(*) FROM whatsapp_sessions WHERE session_id = $1 AND key = 'creds'",
      [clientId]
    );
    hasAuthData = parseInt(res.rows[0].count) > 0;
  } catch (err) {
    console.error(`Postgres connection error in getStatus for ${clientId}:`, err.message);
  }

  if (!session) {
    return {
      exists: false,
      hasAuthData,
      status: 'inactive',
      phoneNumber: null,
    };
  }

  return {
    exists: true,
    hasAuthData,
    status: session.status,
    phoneNumber: session.phoneNumber,
  };
}

/**
 * Disconnect and remove session credentials from memory and database
 */
async function disconnectSession(clientId, removeAuth = true) {
  const session = sessions.get(clientId);
  if (session?.socket) {
    try {
      await session.socket.logout();
    } catch (e) {
      try { session.socket.end(); } catch (e2) { /* ignore */ }
    }
  }

  // Clear idle timers
  if (idleTimers[clientId]) {
    clearTimeout(idleTimers[clientId]);
    delete idleTimers[clientId];
  }

  sessions.delete(clientId);

  if (removeAuth) {
    await db.query('DELETE FROM whatsapp_sessions WHERE session_id = $1', [clientId]);
  }

  eventListeners.delete(clientId);
  return { success: true, message: 'Session disconnected' };
}

/**
 * Restore all saved sessions from database on server startup.
 * Queries PostgreSQL for all unique session_ids with a registered creds state.
 */
async function restoreAllSessions() {
  try {
    const res = await db.query("SELECT DISTINCT session_id FROM whatsapp_sessions WHERE key = 'creds'");
    const clientIds = res.rows.map(r => r.session_id);

    const results = [];
    const mode = process.env.WHATSAPP_MODE || 'SLEEP';

    for (const clientId of clientIds) {
      if (mode === 'SLEEP') {
        // In Sleep mode, do not open WebSockets on startup. Register them as sleeping.
        sessions.set(clientId, {
          socket: null,
          qr: null,
          qrDataUrl: null,
          status: 'sleeping',
          phoneNumber: null,
          retryCount: 0,
        });
        results.push({ clientId, restored: true, mode: 'sleeping' });
      } else {
        // DAEMON mode — establish connection immediately
        try {
          console.log(`Restoring session (Daemon mode): ${clientId}`);
          await initSession(clientId);
          results.push({ clientId, restored: true, mode: 'daemon' });
        } catch (e) {
          console.error(`Failed to restore session ${clientId}:`, e.message);
          results.push({ clientId, restored: false, error: e.message });
        }
      }
    }

    return results;
  } catch (err) {
    console.error('Failed to restore sessions from database:', err.message);
    return [];
  }
}

/**
 * Get list of all registered session IDs and their statuses
 */
function getAllSessions() {
  const result = [];
  for (const [clientId, session] of sessions) {
    result.push({
      clientId,
      status: session.status,
      phoneNumber: session.phoneNumber,
    });
  }
  return result;
}

module.exports = {
  initSession,
  getOrInitSocket,
  sleepSession,
  getSession,
  getSocket,
  getQR,
  getStatus,
  disconnectSession,
  restoreAllSessions,
  getAllSessions,
  onEvent,
  offEvent,
};
