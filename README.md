# MedLens: Clinical Information Intelligence & Patient Intake System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cost Constraint](https://img.shields.io/badge/Cost-₹0%20%2F%20%240%20(100%25%20Free)-emerald.svg)](#zero-cost-architecture)
[![Node.js](https://img.shields.io/badge/Node.js-v22.5%2B%20%7C%20v24-brightgreen.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20(Native%20node%3Asqlite)-lightgrey.svg)](https://nodejs.org/api/sqlite.html)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TailwindCSS-cyan.svg)](https://react.dev/)

> **System Notice:** MedLens is an information organization and intelligence system, **NOT a diagnostic or treatment system**. It organizes, structures, normalizes, and reconciles fragmented clinical data to assist authorized human review. It does not provide medical diagnosis, prescribe treatments, or replace qualified healthcare providers.

---

## 1. What MedLens Is

MedLens is an open-source clinical information intelligence platform designed to ingest, normalize, and reconcile fragmented patient intake forms and diagnostic lab reports into a unified, traceable, and human-verified patient health record.

MedLens operates on a **₹0 / $0 Cost Constraint** using a dual-engine architecture:
1. **Deterministic Rule Engine (Primary & Always Active):** Operates 100% offline with zero external API calls, zero subscriptions, and zero vendor lock-in. Uses native `node:sqlite`, rule-based regular expressions, deterministic reference range evaluation, and terminology normalization.
2. **Optional Generative AI Layer (Free Tier):** Plugs into Google Gemini 1.5 Flash via a free-tier API key for natural language summary formatting, while remaining bound by strict non-doctor guardrails.

---

## 2. Problem It Solves

Modern healthcare data is chronically fragmented across disconnected sources:
- **Disjointed Intake Data:** Patient self-reported symptoms, allergies, and conditions are isolated in paper forms or siloed portals.
- **Unstructured Lab Reports:** Diagnostic facilities issue heterogeneous reports (PDF, images, plain text) with varying formats, non-standard naming conventions (e.g., `Hb`, `HGB`, `Hemoglobin`), and discordant reference intervals.
- **Undetected Clinical Discrepancies:** Dangerous contradictions—such as an intake claiming "No known allergies" while an older clinical note references a severe penicillin allergy—frequently slip through fast-paced clinical workflows.
- **Black-Box AI Risks:** Many healthcare AI tools hallucinate standard reference ranges or output speculative diagnostic claims with zero audit provenance.

MedLens addresses these challenges by providing:
- Automated clinical entity extraction with **verbatim provenance tracking** down to the line and snippet.
- **Zero-hallucination reference range evaluation** where missing laboratory bounds are transparently flagged as `Not determined`.
- Cross-source conflict detection between patient claims and medical documentation.
- A **Human-in-the-Loop Review Center** where clinicians inspect, correct, and certify every extracted observation.

---

## 3. Core Workflow Pipeline

MedLens processes clinical information through a strict, transparent 7-stage pipeline:

```
[ 1. Input ] ➔ [ 2. Extraction ] ➔ [ 3. Validation ] ➔ [ 4. Normalization ] ➔ [ 5. Analysis ] ➔ [ 6. Insight ] ➔ [ 7. Human Review ]
```

1. **Input:** Captures patient intake forms (symptoms, conditions, allergies, medications) or ingests laboratory reports (PDF documents, text files, image uploads, pasted text).
2. **Extraction:** Clinical NER parser identifies test names, observed values, units, reference range bounds, and physician remarks.
3. **Validation:** Checks numerical sanity, parses units, and extracts explicit laboratory reference intervals. Missing ranges are marked `Not determined`—never fabricated.
4. **Normalization:** Maps colloquial and regional test names to canonical clinical nomenclature via an embedded medical synonym dictionary (e.g., `FBS` &rarr; `Fasting Blood Glucose`).
5. **Analysis:** Deterministically compares values against reported bounds (`Within reported range`, `Below reported range`, `Above reported range`). Flags documentation discrepancies across intake and laboratory history.
6. **Insight:** Generates patient-friendly summaries, generates 3–5 targeted clarification inquiries regarding ambiguous disclosures, and builds longitudinal trend deltas.
7. **Human Review:** Certified clinicians review, edit, confirm, or reject AI-extracted data points with full audit trail logging.

---

## 4. Main Features

- **Clinical Intake & Demographics:** Captures personal identifiers, primary concerns, pre-existing conditions, allergies, and active medications. All intake fields are tagged as **User-provided**.
- **Multi-Format Document Ingestion:** Processes PDF laboratory files, plain text reports, and image records with client-side drag-and-drop.
- **Deterministic Reference Range Analyzer:**
  - Evaluates standard ranges (`13.0 - 17.0`), upper-bound caps (`< 200`), and lower-bound thresholds (`> 60`).
  - **Zero-Hallucination Policy:** If a report omits reference intervals, MedLens explicitly marks the status as `Not determined` and generates a clarification inquiry for the testing laboratory.
- **Cross-Source Conflict Center:** Detects discrepancies between intake declarations and medical records (e.g., Intake: `No known drug allergies (NKDA)` vs Report: `Prior reaction to Penicillin V`). Clinicians can acknowledge or resolve conflicts with rationale notes.
- **Longitudinal Report Comparison:** Tracks multi-visit lab values side-by-side (e.g., baseline vs current). Calculates exact numeric changes (&uarr; / &darr;) and percentage deltas without drawing speculative medical conclusions.
- **Evidence Mode & 3-Tier Provenance:**
  - **Tier 1:** AI-Generated statement
  - **Tier 2:** Supporting structured laboratory data
  - **Tier 3:** Verbatim source document snippet, file origin, and page number
- **Targeted Clarification Generator:** Generates 3–5 high-value questions for ambiguous patient statements (e.g., symptom onset, frequency triggers, missing fasting duration).
- **Human-in-the-Loop Review Modal:** Clinicians can edit observed values, adjust units, amend reference ranges, and promote items from `Requires verification` to `Human-verified`.
- **Privacy Mode:** One-click toggle in the header anonymizes patient identifiers (e.g., `Alex J. Mercer` &rarr; `A*** M***`, `ID` &rarr; `PT-****`) for demonstrations, screenshots, and screen shares.
- **Multi-Format Export Center:** Export complete records to structured JSON (interoperability payload), CSV (tabular laboratory results), or browser-printable clinical summaries.
- **HIPAA-Inspired Security & Audit Trail:** Tamper-evident logging of authentication, record views, edits, verifications, uploads, exports, and data purges without storing unprotected PHI in log lines.

---

## 5. System Architecture

```
                                  +---------------------------------------+
                                  |         MedLens Web Client            |
                                  |   (React 18 + Tailwind CSS + Vite)    |
                                  +-------------------+-------------------+
                                                      |
                                           HTTPS / JSON API (/api)
                                                      |
                                  +-------------------v-------------------+
                                  |         Express API Server            |
                                  | (Security Headers, Rate Limiting,     |
                                  |  MIME Whitelist, Error Handling)      |
                                  +---------+-------------------+---------+
                                            |                   |
                     +----------------------+                   +-----------------------+
                     |                                                                  |
+--------------------v--------------------+                            +----------------v--------------------+
|        Deterministic Clinical Core      |                            |       Optional Gemini 1.5 Layer     |
| - Terminology Normalizer                |                            | - Patient Summary Formulation       |
| - Deterministic Range Analyzer          |                            | - Non-Doctor Guardrails Enforced    |
| - Conflict & Discrepancy Detector       |                            | - Fallback to deterministic summary |
| - Clarification Inquiry Engine          |                            +-------------------------------------+
| - Longitudinal Delta Comparator         |
+--------------------+--------------------+
                     |
+--------------------v--------------------+
|        Storage & File Ingestion         |
| - SQLite via native node:sqlite         |
| - File Upload Sanitizer & Parser        |
| - Non-PHI Security Audit Logger         |
+-----------------------------------------+
```

### Provenance Tracking Model
Every data entity in the MedLens database is tagged with its provenance origin:
- `User-provided`: Intake information supplied directly by the patient or clinician.
- `AI-extracted`: Structured entities extracted from uploaded or pasted documents.
- `AI-generated`: Formatted narrative summaries and clarification prompts.
- `Human-verified`: Clinical records inspected, modified, and certified by an authorized clinician.

---

## 6. Technology Stack

- **Runtime:** Node.js v22.5.0+ or v24+ (utilizing the built-in native `node:sqlite` module).
- **Backend Framework:** Express 4 with security middleware (`helmet`-style custom headers, `cors`, `multer` with MIME and extension whitelisting, sliding-window rate limiting).
- **Database:** SQLite via Node.js native `DatabaseSync` (zero external daemon, zero setup, ₹0 cost).
- **Document Parsing:** `pdf-parse` for PDF text extraction; native streams for text/CSV.
- **Frontend:** React 18, Vite 6, Tailwind CSS 3, Lucide React icons.
- **Testing:** Node.js native test assertion suite (`node:assert`).

---

## 7. Local Development Setup

### Prerequisites
- **Node.js**: v22.5.0 or higher (recommended: Node.js 22 LTS or Node.js 24).
- **npm**: v10 or higher.

### Step-by-Step Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/medlens.git
   cd medlens
   ```

2. **Install Dependencies:**
   ```bash
   # Installs dependencies for both server and client
   npm run install:all
   ```

3. **Configure Environment Variables:**
   ```bash
   # Copy the sample environment file
   cp .env.example .env
   ```
   *(MedLens works out of the box with default settings; no API key is required).*

4. **Run in Development Mode:**
   ```bash
   # Terminal 1: Start Backend API (Port 5000)
   npm run dev:server

   # Terminal 2: Start Frontend Dev Server (Port 3000)
   npm run dev:client
   ```

5. **Access Application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Required Environment Variables

All configuration is loaded via environment variables or `.env`.

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `5000` | Port for the Express backend server. |
| `NODE_ENV` | Optional | `development` | Runtime mode: `development` or `production`. |
| `GEMINI_API_KEY` | Optional | *(empty)* | Google Gemini 1.5 Flash API Key (Free Tier). If omitted, MedLens operates 100% offline using its deterministic clinical summary engine. |
| `CORS_ORIGIN` | Optional | `*` | Allowed CORS origins for cross-origin setups. |
| `CLIENT_DIST_PATH` | Optional | `../../client/dist` | Custom path to the built frontend client assets for Docker or custom directories. |

### Example `.env`:
```env
PORT=5000
NODE_ENV=development
# GEMINI_API_KEY=your_free_gemini_api_key_here
```

---

## 9. Production Deployment Guide

MedLens is architected to compile into a self-contained fullstack web service where the Express server serves both the REST API (`/api/*`) and the compiled React single-page application (`client/dist`).

### Step 1: Build the Client
```bash
npm run build
```
This compiles Vite assets into `client/dist`.

### Step 2: Start the Production Server
```bash
npm start
```
The server will bind to `PORT` (e.g. `process.env.PORT` assigned by hosting platforms) and serve both the API and client from a single unified port.

### Deployment on Cloud Platforms (Render, Railway, Fly.io, Heroku)

#### Option A: Render / Railway / Heroku
- **Build Command:** `npm --prefix server install && npm --prefix client install && npm --prefix client run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Environment Variables:**
  - `NODE_ENV` = `production`
  - `PORT` = `5000` (or assigned automatically)
  - `GEMINI_API_KEY` = *(optional)*

#### Option B: Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm --prefix server install
RUN npm --prefix client install
COPY . .
RUN npm --prefix client run build
EXPOSE 5000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

---

## 10. Automated Testing

MedLens includes an automated verification suite validating all 6 core processing engines:

```bash
npm test
```

### Test Suite Coverage:
1. **Terminology Normalization:** Tests canonical resolution of synonyms (`hb` &rarr; `Hemoglobin`, `TLC` &rarr; `White Blood Cell Count`, `FBS` &rarr; `Fasting Blood Glucose`).
2. **Deterministic Reference Range Evaluation:** Validates numeric interval parsing (`13.0 - 17.0`, `< 200`, `> 60`) and asserts that missing ranges yield `Not determined` without hallucinating bounds.
3. **Clinical Entity Extraction:** Validates multi-pattern text and tabular NER extraction from sample laboratory texts.
4. **Conflict & Inconsistency Detection:** Asserts detection of cross-source contradictions between intake claims and clinical notes.
5. **Longitudinal Comparison:** Validates delta calculations (&uarr; / &darr;), difference values, and directional stability across reports.
6. **AI Summary Engine & Non-Doctor Guardrails:** Verifies verbatim presence of the mandatory disclaimer and 3-tier statement evidence linkages.

---

## 11. Security & Privacy Considerations

- **Secrets Isolation:** No API keys, credentials, or private tokens are embedded in frontend source code or client builds.
- **Repository Cleanliness:** Strict root `.gitignore` prevents staging or committing `.env`, active SQLite databases, logs, or uploaded medical documents.
- **Input Sanitization & Injection Prevention:** All database operations utilize parameterized queries through Node.js SQLite prepared statements, preventing SQL injection.
- **Secure File Ingestion:** Strict whitelist validation on file extensions (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.txt`, `.csv`), MIME types, a 10MB file size cap, and filename sanitization against directory traversal.
- **Rate Limiting:** Sliding-window rate limiter on `/api/*` endpoints (120 requests/minute per IP) prevents abuse.
- **Security Headers:** Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Audit Traceability:** Tamper-evident logging of all administrative and clinical actions with timestamps and user identifiers, without logging sensitive medical PHI.
- **Data Deletion Rights:** Clinicians can permanently purge individual lab reports or complete patient files, instantly cascading deletions across all associated findings and logging the deletion in the audit trail.

---

## 12. AI Safety Limitations & Non-Doctor Guardrails

MedLens is purpose-built to adhere to strict clinical AI safety standards:

1. **No Medical Diagnosis:** The system will never declare a diagnosis or classify a patient with a disease.
2. **No Treatment or Prescription Guidance:** The system will never recommend medications, change drug dosages, or propose therapies.
3. **No Unwarranted Certainty:** Output terminology communicates observations neutrally (e.g., "Result reported above reference bounds") rather than pathological assertions.
4. **Zero Range Hallucination:** Reference ranges are taken strictly from source documents. If omitted, status is transparently reported as `Not determined`.
5. **Mandatory Disclaimer:** The following disclaimer is embedded verbatim across all system outputs, summaries, exports, and UI headers:
   > *"MedLens is an information organization and understanding tool. It does not provide medical diagnosis or treatment recommendations. Please consult a qualified healthcare professional for medical advice."*

---

## 13. Synthetic Demo Workflow Walkthrough

MedLens comes pre-equipped with a comprehensive synthetic demo dataset for system evaluation without real patient data:

1. Launch MedLens and navigate to the application dashboard.
2. Click **Load Demo Patient** in the top navigation bar.
3. Observe the banner: `DEMO DATA — NOT A REAL PATIENT (SYNTHETIC CLINICAL RECORD FOR SYSTEM EVALUATION)`.
4. The system automatically populates synthetic patient **Alex J. Mercer (48M)** featuring:
   - **User-Provided Intake:** Fatigue symptoms and documented essential hypertension.
   - **Baseline Lab Report (March):** Baseline CBC and biochemistry.
   - **Current Comprehensive Lab Report (September):** Demonstrating values *Within reported range*, *Below reported range* (Hemoglobin), *Above reported range* (Fasting Glucose, Cholesterol), and *Not determined* (ESR with missing reference bounds).
   - **Active Conflict:** Intake claims "No known drug allergies (NKDA)", while historical report notes a 2021 cutaneous reaction to Penicillin V.
   - **Longitudinal Comparison:** Multi-point delta comparison showing Hemoglobin decrease (-0.9 g/dL) and WBC variation.
   - **Targeted Clarifications:** 4 auto-generated inquiries seeking onset duration and lab normative sheets.
   - **Evidence Mode:** Inspect 3-tier statement linkages directly tying summary points to raw report snippets.
   - **Human Review:** Open any laboratory row to adjust, correct, or mark as `Human-verified`.

---

## License

This project is licensed under the [MIT License](LICENSE).
