/**
 * WhatsApp Session Manager — Baileys Multi-Session Handler
 * 
 * Generic, app-agnostic session management:
 * - Manages multiple concurrent WhatsApp sessions (one per clientId)
 * - Handles QR code generation, connection state, reconnection
 * - Persists auth state to disk via Baileys' useMultiFileAuthState
 * - Restores saved sessions on server start
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const AUTH_DIR = process.env.AUTH_DIR || './auth_info';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// In-memory store of active sessions
// Map<clientId, { socket, qr, status, phoneNumber, retryCount }>
const sessions = new Map();

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
    return { status: 'connected', phoneNumber: existing.phoneNumber };
  }

  const logger = getLogger(clientId);
  const authDir = path.join(AUTH_DIR, clientId);

  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
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
      // New QR code generated — convert to data URL
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

      // Extract phone number from socket
      const jid = socket.user?.id;
      if (jid) {
        sessionData.phoneNumber = jid.split(':')[0].split('@')[0];
      }

      emitEvent(clientId, 'connected', { phoneNumber: sessionData.phoneNumber });
      logger.info(`Connected as ${sessionData.phoneNumber}`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      sessionData.status = 'disconnected';
      sessionData.qr = null;
      sessionData.qrDataUrl = null;

      if (statusCode === DisconnectReason.loggedOut) {
        // User logged out — clean up auth data
        logger.info('Session logged out — cleaning auth data');
        cleanupAuthData(clientId);
        sessions.delete(clientId);
        emitEvent(clientId, 'disconnected', { reason: 'logged_out' });
      } else if (shouldReconnect && sessionData.retryCount < 5) {
        // Reconnect with backoff
        sessionData.retryCount++;
        const delay = Math.min(sessionData.retryCount * 2000, 30000);
        logger.info(`Reconnecting in ${delay}ms (attempt ${sessionData.retryCount})...`);
        setTimeout(() => initSession(clientId), delay);
        emitEvent(clientId, 'reconnecting', { attempt: sessionData.retryCount });
      } else {
        logger.error('Max reconnection attempts reached or unrecoverable error');
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
 * Get the current session for a clientId (or null if not found)
 */
function getSession(clientId) {
  return sessions.get(clientId) || null;
}

/**
 * Get the Baileys socket for a clientId (for sending messages)
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
 * Get the connection status for a clientId
 */
function getStatus(clientId) {
  const session = sessions.get(clientId);
  if (!session) {
    // Check if auth data exists on disk (session can be restored)
    const authDir = path.join(AUTH_DIR, clientId);
    const hasAuthData = fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;
    return {
      exists: false,
      hasAuthData,
      status: 'inactive',
      phoneNumber: null,
    };
  }
  return {
    exists: true,
    hasAuthData: true,
    status: session.status,
    phoneNumber: session.phoneNumber,
  };
}

/**
 * Disconnect and optionally remove a session
 * @param {string} clientId
 * @param {boolean} removeAuth - If true, also delete auth data from disk
 */
async function disconnectSession(clientId, removeAuth = true) {
  const session = sessions.get(clientId);
  if (session?.socket) {
    try {
      await session.socket.logout();
    } catch (e) {
      // If logout fails, just end the connection
      try { session.socket.end(); } catch (e2) { /* ignore */ }
    }
  }

  sessions.delete(clientId);

  if (removeAuth) {
    cleanupAuthData(clientId);
  }

  // Clean up event listeners
  eventListeners.delete(clientId);

  return { success: true, message: 'Session disconnected' };
}

/**
 * Remove auth data from disk for a clientId
 */
function cleanupAuthData(clientId) {
  const authDir = path.join(AUTH_DIR, clientId);
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }
}

/**
 * Restore all saved sessions from disk on server startup.
 * Scans the AUTH_DIR for subdirectories (each is a clientId) and
 * attempts to reconnect.
 */
async function restoreAllSessions() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    return [];
  }

  const entries = fs.readdirSync(AUTH_DIR, { withFileTypes: true });
  const clientIds = entries
    .filter(e => e.isDirectory())
    .map(e => e.name);

  const results = [];
  for (const clientId of clientIds) {
    try {
      console.log(`Restoring session: ${clientId}`);
      await initSession(clientId);
      results.push({ clientId, restored: true });
    } catch (e) {
      console.error(`Failed to restore session ${clientId}:`, e.message);
      results.push({ clientId, restored: false, error: e.message });
    }
  }

  return results;
}

/**
 * Get list of all active session IDs and their statuses
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
