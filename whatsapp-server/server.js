/**
 * WhatsApp Web Session API Server
 * 
 * A generic, app-agnostic WhatsApp session management API built on Baileys.
 * Provides REST endpoints for:
 * - Multi-session management (init, QR, status, disconnect)
 * - Message sending with per-session rate-limited queuing
 * - Health monitoring
 * 
 * Can be used by any application via HTTP API calls.
 * Authentication: shared secret via X-WA-SECRET header.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const { initDatabase } = require('./lib/db');
const { restoreAllSessions } = require('./lib/session-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public health check (no auth required)
app.use('/api/health', require('./routes/health'));

// Protected routes (require X-WA-SECRET)
app.use('/api/session', authMiddleware, require('./routes/session'));
app.use('/api/message', authMiddleware, require('./routes/message'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n========================================`);
  console.log(`  WhatsApp Session API`);
  console.log(`  Running on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);

  // Initialize PostgreSQL schema
  try {
    await initDatabase();
  } catch (error) {
    console.error('Failed to initialize database schema. Exiting.');
    process.exit(1);
  }

  // Restore any previously saved sessions
  try {
    const restored = await restoreAllSessions();
    if (restored.length > 0) {
      console.log(`Restored ${restored.filter(r => r.restored).length}/${restored.length} sessions (mode: ${process.env.WHATSAPP_MODE || 'SLEEP'})`);
    } else {
      console.log('No saved sessions to restore');
    }
  } catch (error) {
    console.error('Error restoring sessions:', error.message);
  }
});
