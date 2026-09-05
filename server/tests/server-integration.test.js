import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEntry = path.resolve(__dirname, '../src/index.js');

console.log('--- Running MedLens Server Integration & Production Health Check ---');

const testPort = 5099;
const serverProcess = spawn('node', [serverEntry], {
  env: { ...process.env, PORT: String(testPort), NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';
serverProcess.stdout.on('data', (d) => { serverOutput += d.toString(); });
serverProcess.stderr.on('data', (d) => { serverOutput += d.toString(); });

async function runChecks() {
  // Wait up to 5 seconds for server to start
  const startTime = Date.now();
  let started = false;
  while (Date.now() - startTime < 6000) {
    try {
      const res = await fetch(`http://localhost:${testPort}/api/health`);
      if (res.ok) {
        started = true;
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  assert.strictEqual(started, true, 'Server failed to start within 6 seconds. Logs:\n' + serverOutput);
  console.log('✓ Server started successfully on port', testPort);

  // Check 1: Health Check Endpoint
  const healthRes = await fetch(`http://localhost:${testPort}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'healthy');
  assert.strictEqual(typeof healthData.costConstraint, 'string');
  console.log('✓ /api/health returned healthy status 200 JSON.');

  // Check 2: API 404 Endpoint (must be JSON, not HTML)
  const notFoundRes = await fetch(`http://localhost:${testPort}/api/nonexistent-endpoint`);
  assert.strictEqual(notFoundRes.status, 404);
  const notFoundData = await notFoundRes.json();
  assert.strictEqual(notFoundData.error, 'API Endpoint Not Found');
  console.log('✓ Unmatched /api/* route correctly returned 404 JSON (preventing HTML leak).');

  // Check 3: Client SPA Static Serving
  const rootRes = await fetch(`http://localhost:${testPort}/`);
  assert.strictEqual(rootRes.status, 200);
  const rootText = await rootRes.text();
  assert.strictEqual(rootText.includes('<div id="root">'), true);
  console.log('✓ Production client index.html served correctly from dist.');

  // Check 4: Patient Demo Endpoint
  const demoRes = await fetch(`http://localhost:${testPort}/api/patient/demo`, { method: 'POST' });
  assert.strictEqual(demoRes.status, 200);
  const demoData = await demoRes.json();
  assert.strictEqual(demoData.success, true);
  assert.strictEqual(demoData.patient.is_demo, 1);
  console.log('✓ Demo patient auto-seeding endpoint verified.');

  console.log('\n======================================================');
  console.log('ALL INTEGRATION & PRODUCTION CHECKS PASSED (4/4)!');
  console.log('======================================================\n');
}

try {
  await runChecks();
} catch (err) {
  console.error('Integration check failed:', err);
  process.exitCode = 1;
} finally {
  serverProcess.kill('SIGTERM');
}
