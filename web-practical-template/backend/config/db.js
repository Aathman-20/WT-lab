// backend/config/db.js
// Purpose: connect Mongoose to MongoDB (Atlas "mongodb+srv://" OR local "mongodb://").
// Exports an async function that server.js AWAITS. It throws on failure (it never calls process.exit).
//
// DNS NOTE: mongodb+srv:// URIs need a DNS SRV lookup. Node uses its own resolver (c-ares) for that,
// which can fail with "querySrv ECONNREFUSED" even when Windows nslookup works.
//   - DNS_SERVERS in .env  -> use those DNS servers from the start (process-wide).
//   - otherwise            -> try the default resolver first; if the SRV lookup fails, retry ONCE with
//                             public DNS (8.8.8.8, 8.8.4.4). Set DNS_FALLBACK=off to disable that retry.
// Limitation: this only helps if your network allows DNS queries to those servers.

const dns = require('dns');
const mongoose = require('mongoose');

// Fail immediately instead of buffering queries for 10s when the DB is down.
mongoose.set('bufferCommands', false);

const FALLBACK_DNS = ['8.8.8.8', '8.8.4.4'];

function parseList(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function validateUri(uri) {
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error('MONGODB_URI is missing or invalid. It must start with mongodb:// or mongodb+srv:// (check backend/.env).');
  }
}

function isSrvDnsError(err) {
  // Node reports SRV failures as: "querySrv ECONNREFUSED _mongodb._tcp.<host>"
  return /querySrv/.test(String(err && err.message)) || (err && err.syscall === 'querySrv');
}

async function tryConnect(uri) {
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

async function connectDB() {
  // CHANGE HERE: set MONGODB_URI in backend/.env (Atlas or local). The fallback below is local only.
  const uri = process.env.MONGODB_URI;
  validateUri(uri);

  const explicit = parseList(process.env.DNS_SERVERS);
  if (explicit.length) {
    dns.setServers(explicit);
    console.log(`[DNS] Using DNS servers from .env: ${explicit.join(', ')}`);
  }

  let conn;
  try {
    conn = await tryConnect(uri);
  } catch (err) {
    const canFallback = uri.startsWith('mongodb+srv://') && !explicit.length
      && String(process.env.DNS_FALLBACK).toLowerCase() !== 'off' && isSrvDnsError(err);
    if (!canFallback) throw err;

    console.warn(`[DNS] SRV lookup failed with default resolver (${err.message}).`);
    console.warn(`[DNS] Retrying once with ${FALLBACK_DNS.join(', ')} ...`);
    dns.setServers(FALLBACK_DNS);
    conn = await tryConnect(uri); // a second failure is thrown to the caller
  }

  console.log(`[MongoDB] Connected to host: ${conn.connection.host}`);
  console.log(`[MongoDB] Active database: ${conn.connection.name}`);
  return conn;
}

module.exports = connectDB;
