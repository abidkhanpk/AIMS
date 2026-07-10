/**
 * WhatsApp Session API — Session Management Routes
 * 
 * Generic endpoints for managing WhatsApp sessions:
 * - POST /api/session/init/:clientId   — Initialize a new session
 * - GET  /api/session/qr/:clientId     — Get QR code for linking
 * - GET  /api/session/status/:clientId — Get session status
 * - DELETE /api/session/:clientId      — Disconnect and remove session
 */

const express = require('express');
const router = express.Router();
const {
  initSession,
  getQR,
  getStatus,
  disconnectSession,
} = require('../lib/session-manager');

// POST /api/session/init/:clientId — Initialize session
router.post('/init/:clientId', async (req, res) => {
  const { clientId } = req.params;

  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const result = await initSession(clientId);
    res.json(result);
  } catch (error) {
    console.error(`Error initializing session ${clientId}:`, error.message);
    res.status(500).json({ error: 'Failed to initialize session', details: error.message });
  }
});

// GET /api/session/qr/:clientId — Get QR code
router.get('/qr/:clientId', (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const result = getQR(clientId);
  res.json(result);
});

// GET /api/session/status/:clientId — Get session status
router.get('/status/:clientId', async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const result = await getStatus(clientId);
  res.json(result);
});

// DELETE /api/session/:clientId — Disconnect session
router.delete('/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const removeAuth = req.query.removeAuth !== 'false'; // default: true

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const result = await disconnectSession(clientId, removeAuth);
    res.json(result);
  } catch (error) {
    console.error(`Error disconnecting session ${clientId}:`, error.message);
    res.status(500).json({ error: 'Failed to disconnect session', details: error.message });
  }
});

module.exports = router;
