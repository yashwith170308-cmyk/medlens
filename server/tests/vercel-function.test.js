import assert from 'node:assert';
import http from 'node:http';
import app from '../../api/index.js';

console.log('--- Testing Vercel Serverless Function Entrypoint (api/index.js) ---');

// Create server using the exact app exported by api/index.js
const server = http.createServer(app);

await new Promise((resolve) => {
  server.listen(5098, resolve);
});

console.log('✓ Vercel serverless function entrypoint mounted on test port 5098');

async function runVercelChecks() {
  const base = 'http://localhost:5098';

  // Check 1: Health check
  const healthRes = await fetch(`${base}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'healthy');
  console.log('✓ /api/health via api/index.js returned healthy status 200.');

  // Check 2: Patient current
  const patientRes = await fetch(`${base}/api/patient/current`);
  assert.strictEqual(patientRes.status, 200);
  const patientData = await patientRes.json();
  assert.strictEqual(Boolean(patientData.patient), true);
  console.log('✓ /api/patient/current retrieved patient data:', patientData.patient.name);

  // Check 3: Simulated Vercel x-matched-path header rewrite
  const rewriteRes = await fetch(`${base}/api/index.js`, {
    headers: { 'x-matched-path': '/api/health' }
  });
  assert.strictEqual(rewriteRes.status, 200);
  const rewriteData = await rewriteRes.json();
  assert.strictEqual(rewriteData.status, 'healthy');
  console.log('✓ Vercel rewrite simulation with x-matched-path header correctly resolved.');

  // Check 4: Unmatched route returns 404 JSON
  const notFoundRes = await fetch(`${base}/api/unknown-endpoint`);
  assert.strictEqual(notFoundRes.status, 404);
  const notFoundData = await notFoundRes.json();
  assert.strictEqual(notFoundData.error, 'API Endpoint Not Found');
  console.log('✓ Unmatched route correctly returns 404 JSON.');

  // Check 5: Patient demo seeding
  const demoRes = await fetch(`${base}/api/patient/demo`, { method: 'POST' });
  assert.strictEqual(demoRes.status, 200);
  const demoData = await demoRes.json();
  assert.strictEqual(demoData.success, true);
  console.log('✓ Demo patient auto-seeding via serverless handler verified.');

  // Check 6: Report processing pipeline
  const pasteRes = await fetch(`${base}/api/reports/paste`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: 'demo-patient-alex-mercer',
      text: 'Hemoglobin: 12.5 g/dL (Reference: 13.0 - 17.0 g/dL)\nFasting Glucose 105 mg/dL (70 - 99)',
      filename: 'Vercel_Test_Report.txt'
    })
  });
  assert.strictEqual(pasteRes.status, 200);
  const pasteData = await pasteRes.json();
  assert.strictEqual(pasteData.success, true);
  assert.strictEqual(pasteData.extractedCount >= 2, true);
  console.log('✓ Report parsing & extraction pipeline via serverless handler verified.');

  console.log('\n======================================================');
  console.log('ALL VERCEL FUNCTION ENTRYPOINT CHECKS PASSED (6/6)!');
  console.log('======================================================\n');
}

try {
  await runVercelChecks();
} catch (e) {
  console.error('Vercel check failed:', e);
  process.exitCode = 1;
} finally {
  server.close();
}
