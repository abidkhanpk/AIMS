/**
 * WhatsApp Session API — Message Queue
 * 
 * Per-session message queuing with configurable rate limiting.
 * Processes messages one-by-one with random delays to prevent account blocks.
 * 
 * Generic — no app-specific logic. Just handles queuing and sending text
 * messages via a Baileys socket.
 */

const { getOrInitSocket } = require('./session-manager');

// Default settings from env
const DEFAULT_MIN_DELAY = parseInt(process.env.DEFAULT_MIN_DELAY_MS) || 5000;
const DEFAULT_MAX_DELAY = parseInt(process.env.DEFAULT_MAX_DELAY_MS) || 15000;
const DEFAULT_MAX_DAILY = parseInt(process.env.DEFAULT_MAX_DAILY_MESSAGES) || 50;

// Per-session queues
// Map<clientId, { queue, processing, settings, stats }>
const queues = new Map();

/**
 * Get or create a queue for a client
 */
function getQueue(clientId) {
  if (!queues.has(clientId)) {
    queues.set(clientId, {
      queue: [],          // Array of { id, to, text, status, error, createdAt, sentAt }
      processing: false,
      settings: {
        minDelayMs: DEFAULT_MIN_DELAY,
        maxDelayMs: DEFAULT_MAX_DELAY,
        maxDailyMessages: DEFAULT_MAX_DAILY,
      },
      stats: {
        sentToday: 0,
        lastResetDate: new Date().toDateString(),
      },
    });
  }
  return queues.get(clientId);
}

/**
 * Update queue settings for a client
 */
function updateSettings(clientId, settings) {
  const q = getQueue(clientId);
  if (settings.minDelayMs !== undefined) q.settings.minDelayMs = Math.max(1000, settings.minDelayMs);
  if (settings.maxDelayMs !== undefined) q.settings.maxDelayMs = Math.max(q.settings.minDelayMs, settings.maxDelayMs);
  if (settings.maxDailyMessages !== undefined) q.settings.maxDailyMessages = Math.max(1, settings.maxDailyMessages);
  return q.settings;
}

/**
 * Get queue settings for a client
 */
function getSettings(clientId) {
  return getQueue(clientId).settings;
}

/**
 * Generate a random delay between min and max
 */
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a simple unique ID
 */
function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Reset daily counter if the date has changed
 */
function checkDailyReset(q) {
  const today = new Date().toDateString();
  if (q.stats.lastResetDate !== today) {
    q.stats.sentToday = 0;
    q.stats.lastResetDate = today;
  }
}

/**
 * Format phone number for WhatsApp JID.
 * Accepts: +923001234567, 923001234567, 03001234567
 * Returns: 923001234567@s.whatsapp.net
 */
function formatPhoneJid(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/[^\d]/g, '');

  // If starts with 0, assume local Pakistani number — replace 0 with 92
  // This is a reasonable default; callers can always pass full international format
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '92' + cleaned.substring(1);
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Enqueue a single message
 * @returns {object} The queued message entry with its ID
 */
function enqueueMessage(clientId, to, text) {
  const q = getQueue(clientId);
  const entry = {
    id: generateId(),
    to,
    text,
    status: 'queued',    // queued, sending, sent, failed
    error: null,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
  q.queue.push(entry);

  // Start processing if not already
  if (!q.processing) {
    processQueue(clientId);
  }

  return entry;
}

/**
 * Enqueue multiple messages
 * @returns {Array} Array of queued message entries
 */
function enqueueMessages(clientId, messages) {
  const results = [];
  for (const msg of messages) {
    results.push(enqueueMessage(clientId, msg.to, msg.text));
  }
  return results;
}

/**
 * Process the message queue for a client — sends one message at a time
 * with random delays between each.
 */
async function processQueue(clientId) {
  const q = getQueue(clientId);
  if (q.processing) return;
  q.processing = true;

  while (true) {
    // Find next queued message
    const nextMsg = q.queue.find(m => m.status === 'queued');
    if (!nextMsg) break;

    // Check daily limit
    checkDailyReset(q);
    if (q.stats.sentToday >= q.settings.maxDailyMessages) {
      console.log(`[${clientId}] Daily message limit (${q.settings.maxDailyMessages}) reached. Remaining messages stay queued.`);
      break;
    }

    // Get socket
    const socket = await getOrInitSocket(clientId);
    if (!socket) {
      console.error(`[${clientId}] No active socket — cannot send messages. Queue paused.`);
      break;
    }

    // Send the message
    nextMsg.status = 'sending';
    try {
      const jid = formatPhoneJid(nextMsg.to);
      await socket.sendMessage(jid, { text: nextMsg.text });
      nextMsg.status = 'sent';
      nextMsg.sentAt = new Date().toISOString();
      q.stats.sentToday++;
      console.log(`[${clientId}] Sent message to ${nextMsg.to} (${q.stats.sentToday}/${q.settings.maxDailyMessages} today)`);
    } catch (error) {
      nextMsg.status = 'failed';
      nextMsg.error = error.message || 'Unknown error';
      console.error(`[${clientId}] Failed to send to ${nextMsg.to}:`, error.message);
    }

    // Wait random delay before next message
    const delay = randomDelay(q.settings.minDelayMs, q.settings.maxDelayMs);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  q.processing = false;

  // Trigger fast-sleep on queue completion if in sleep mode
  if (process.env.WHATSAPP_MODE === 'SLEEP') {
    setTimeout(() => {
      // Re-verify no new messages have been queued in the meantime
      const nextMsg = q.queue.find(m => m.status === 'queued');
      if (!nextMsg && !q.processing) {
        const { sleepSession } = require('./session-manager');
        sleepSession(clientId);
      }
    }, 10000); // 10 seconds grace period (to allow consecutive queued requests)
  }
}

/**
 * Get queue status for a client
 */
function getQueueStatus(clientId) {
  const q = getQueue(clientId);
  checkDailyReset(q);

  const queued = q.queue.filter(m => m.status === 'queued').length;
  const sending = q.queue.filter(m => m.status === 'sending').length;
  const sent = q.queue.filter(m => m.status === 'sent').length;
  const failed = q.queue.filter(m => m.status === 'failed').length;

  return {
    total: q.queue.length,
    queued,
    sending,
    sent,
    failed,
    processing: q.processing,
    settings: q.settings,
    sentToday: q.stats.sentToday,
    maxDailyMessages: q.settings.maxDailyMessages,
    messages: q.queue.slice(-50), // Last 50 messages
  };
}

/**
 * Clear completed/failed messages from queue (keeps only queued/sending)
 */
function clearCompletedMessages(clientId) {
  const q = getQueue(clientId);
  q.queue = q.queue.filter(m => m.status === 'queued' || m.status === 'sending');
  return { cleared: true };
}

module.exports = {
  enqueueMessage,
  enqueueMessages,
  getQueueStatus,
  updateSettings,
  getSettings,
  clearCompletedMessages,
  formatPhoneJid,
};
