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

// URL normalization for Vercel Serverless Rewrites
app.use((req, res, next) => {
  const matchedPath = req.headers['x-matched-path'];
  if (matchedPath && req.url !== matchedPath) {
    req.url = matchedPath;
  }
  next();
});

// Apply rate limiting to all /api routes
app.use('/api', rateLimiter({ windowMs: 60 * 1000, max: 120 }));

// Health check handler
const healthHandler = (req, res) => {
  res.json({
    status: 'healthy',
    system: 'MedLens Clinical Information Intelligence System',
    timestamp: new Date().toISOString(),
    costConstraint: '₹0 / $0 — Open-Source Deterministic Engine Active',
    environment: process.env.VERCEL ? 'vercel-serverless' : (process.env.NODE_ENV || 'development')
  });
};

// Mount API routes (supports both /api/* and direct /* if rewritten)
const mountRoutes = (prefix = '/api') => {
  app.use(`${prefix}/patient`, patientRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
  app.use(`${prefix}/record`, recordRoutes);
  app.use(`${prefix}/export`, exportRoutes);
  app.use(`${prefix}/audit`, auditRoutes);
  app.get(`${prefix}/health`, healthHandler);
};

mountRoutes('/api');
mountRoutes('');

// Catch-all 404 for unmatched /api routes (prevents returning HTML for invalid API requests)
app.all(['/api/*', '/patient/*', '/reports/*', '/record/*', '/export/*', '/audit/*'], (req, res) => {
  res.status(404).json({
    error: 'API Endpoint Not Found',
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production if built (standalone server mode)
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

export default app;
