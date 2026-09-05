import app from './app.js';
import { db } from './db/database.js';

const PORT = process.env.PORT || 5000;

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
