import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { db } from './db/database.js';
import { seedDemoPatient } from './db/seedDemo.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import patientRoutes from './routes/patientRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables across workspace locations & CWD
const rootEnv = path.resolve(__dirname, '../../../.env');
const serverEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(serverEnv)) dotenv.config({ path: serverEnv });
if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Security & Header hardening
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all /api routes
app.use('/api', rateLimiter({ windowMs: 60 * 1000, max: 120 }));

// Mount API routes
app.use('/api/patient', patientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/record', recordRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'MedLens Clinical Information Intelligence System',
    timestamp: new Date().toISOString(),
    costConstraint: '₹0 / $0 — Open-Source Deterministic Engine Active'
  });
});

// Catch-all 404 for unmatched /api routes (prevents returning HTML for invalid API requests)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API Endpoint Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production if built
const clientDist = process.env.CLIENT_DIST_PATH || path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global safe error handling
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    error: 'System Processing Error',
    message: err.message || 'An unexpected error occurred during processing.'
  });
});

// Auto-seed demo patient if database is completely fresh
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  if (count.count === 0) {
    seedDemoPatient();
  }
} catch (e) {
  console.warn('[Startup] Demo check warning:', e.message);
}

const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` MedLens Clinical Intelligence API Server Running`);
  console.log(` Port: ${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'production'} (₹0 / $0 Stack)`);
  console.log(`======================================================\n`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    try {
      db.close();
      console.log('[Database] SQLite database connection closed.');
    } catch (err) {
      console.warn('[Database] Error closing SQLite connection:', err.message);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
