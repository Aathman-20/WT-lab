// backend/server.js
// Purpose: Express app. The HTTP server starts ONLY after MongoDB has connected.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // load .env BEFORE reading process.env

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// CHANGE HERE: update route import if renamed for another entity.
const studentRoutes = require('./routes/studentRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (works even if DB drops later; reports DB state).
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected'
  });
});

// Guard: never run CRUD against an unavailable database (e.g. connection lost after startup).
function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database is unavailable. Please try again shortly.' });
  }
  next();
}

// CHANGE HERE: update the API endpoint (e.g. '/api/books').
app.use('/api/students', requireDb, studentRoutes);

// Unknown /api paths -> JSON 404
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));

// Serve frontend so http://localhost:5000 opens index.html
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Central error handler (keeps the real cause in the server log)
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack || err.message);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }
  res.status(500).json({ success: false, message: 'An unexpected server error occurred. Please try again.' });
});

async function start() {
  await connectDB(); // 1. database first; throws on failure

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => { // 2. only now start HTTP
    console.log(`[Server] Running at http://localhost:${PORT}`);
    console.log(`[Server] REST endpoint: http://localhost:${PORT}/api/students`);
    console.log(`[Server] Health check:  http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE'
      ? `[Server] Port ${PORT} is already in use. Stop the other process or change PORT in .env.`
      : `[Server] Failed to start: ${err.message}`);
    process.exit(1);
  });

  mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Connection lost.'));
  mongoose.connection.on('reconnected', () => console.log('[MongoDB] Reconnected.'));

  process.on('SIGINT', async () => {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('[Startup] Could not start the application.');
  console.error(`[Startup] Reason: ${err.message}`);
  if (err.code) console.error(`[Startup] Error code: ${err.code}`);
  console.error('[Startup] See README.md -> Troubleshooting (DNS / Atlas / local MongoDB).');
  process.exit(1);
});
