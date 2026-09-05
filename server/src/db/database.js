import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'medlens.sqlite');
export const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'clinician',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    symptoms TEXT,
    conditions TEXT,
    allergies TEXT,
    medications TEXT,
    notes TEXT,
    is_demo INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    category TEXT NOT NULL,
    report_date TEXT,
    raw_text TEXT NOT NULL,
    file_type TEXT NOT NULL,
    is_previous INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lab_results (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    raw_test_name TEXT NOT NULL,
    observed_value REAL,
    value_text TEXT NOT NULL,
    unit TEXT,
    reference_range_raw TEXT,
    range_low REAL,
    range_high REAL,
    status TEXT NOT NULL,
    source_type TEXT DEFAULT 'AI-extracted',
    source_page INTEGER DEFAULT 1,
    source_snippet TEXT NOT NULL,
    verification_status TEXT DEFAULT 'Requires verification',
    verified_by TEXT,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_a TEXT NOT NULL,
    source_b TEXT NOT NULL,
    status TEXT DEFAULT 'Unresolved',
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clarifications (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    question TEXT NOT NULL,
    context_field TEXT NOT NULL,
    user_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('[Database] SQLite initialized at:', dbPath);
