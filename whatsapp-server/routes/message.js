/**
 * WhatsApp Session API — Message Routes
 * 
 * Generic endpoints for sending messages via WhatsApp:
 * - POST /api/message/send       — Send a single message (queued)
 * - POST /api/message/send-bulk  — Send multiple messages (queued)
 * - GET  /api/message/queue/:clientId — Get queue status
 * - POST /api/message/settings/:clientId — Update queue settings
 * - GET  /api/message/settings/:clientId — Get queue settings
 * - DELETE /api/message/queue/:clientId — Clear completed messages
 */

const express = require('express');
const router = express.Router();
const {
  enqueueMessage,
  enqueueMessages,
  getQueueStatus,
  updateSettings,
  getSettings,
  clearCompletedMessages,
} = require('../lib/message-queue');
const { getStatus } = require('../lib/session-manager');

// POST /api/message/send — Send a single message
router.post('/send', (req, res) => {
  const { clientId, to, text } = req.body;

  if (!clientId || !to || !text) {
    return res.status(400).json({ error: 'clientId, to, and text are required' });
  }

  // Check if session is connected
  const status = getStatus(clientId);
  if (status.status !== 'connected') {
    return res.status(400).json({
      error: 'Session is not connected',
      sessionStatus: status.status,
    });
  }

  const entry = enqueueMessage(clientId, to, text);
  res.json({
    success: true,
    message: 'Message queued for delivery',
    entry,
  });
});

// POST /api/message/send-bulk — Send multiple messages
router.post('/send-bulk', (req, res) => {
  const { clientId, messages } = req.body;

  if (!clientId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'clientId and messages array are required' });
  }

  // Validate each message
  for (let i = 0; i < messages.length; i++) {
    if (!messages[i].to || !messages[i].text) {
      return res.status(400).json({ error: `Message at index ${i} is missing 'to' or 'text'` });
    }
  }

  // Check if session is connected
  const status = getStatus(clientId);
  if (status.status !== 'connected') {
    return res.status(400).json({
      error: 'Session is not connected',
      sessionStatus: status.status,
    });
  }

  const entries = enqueueMessages(clientId, messages);
  res.json({
    success: true,
    message: `${entries.length} message(s) queued for delivery`,
    entries,
  });
});

// GET /api/message/queue/:clientId — Get queue status
router.get('/queue/:clientId', (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const status = getQueueStatus(clientId);
  res.json(status);
});

// POST /api/message/settings/:clientId — Update queue settings
router.post('/settings/:clientId', (req, res) => {
  const { clientId } = req.params;
  const { minDelayMs, maxDelayMs, maxDailyMessages } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const updated = updateSettings(clientId, { minDelayMs, maxDelayMs, maxDailyMessages });
  res.json({
    success: true,
    settings: updated,
  });
});

// GET /api/message/settings/:clientId — Get queue settings
router.get('/settings/:clientId', (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const settings = getSettings(clientId);
  res.json(settings);
});

// DELETE /api/message/queue/:clientId — Clear completed messages
router.delete('/queue/:clientId', (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const result = clearCompletedMessages(clientId);
  res.json(result);
});

module.exports = router;
