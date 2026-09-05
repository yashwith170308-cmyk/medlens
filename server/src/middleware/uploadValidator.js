import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
  'text/csv'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.csv']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent directory traversal or execution
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9_\.\-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}_${safeBase}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Extension check
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Invalid file extension "${ext}". Allowed types: PDF, JPG, JPEG, PNG, TXT.`));
  }

  // MIME type check
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase()) && file.mimetype !== 'application/octet-stream') {
    return cb(new Error(`Invalid MIME type "${file.mimetype}". Allowed types: PDF, JPG, PNG, TXT.`));
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size
  }
});
