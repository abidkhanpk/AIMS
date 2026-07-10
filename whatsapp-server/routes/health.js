/**
 * WhatsApp Session API — Health Check Route
 */

const express = require('express');
const router = express.Router();
const { getAllSessions } = require('../lib/session-manager');

// GET /api/health — server health check
router.get('/', (req, res) => {
  const sessions = getAllSessions();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeSessions: sessions.length,
    sessions: sessions.map(s => ({
      clientId: s.clientId,
      status: s.status,
      phoneNumber: s.phoneNumber,
    })),
  });
});

module.exports = router;
