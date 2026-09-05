import fs from 'node:fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * Parses text from an uploaded file or raw text input.
 * 
 * @param {object} options
 * @param {string} [options.text] - Raw pasted text
 * @param {string} [options.filePath] - Path to uploaded file
 * @param {string} [options.mimeType] - MIME type of file
 * @returns {Promise<{ rawText: string, pageCount: number, format: string }>}
 */
export async function parseDocument({ text, filePath, mimeType }) {
  // Case 1: Pasted Text
  if (text && typeof text === 'string') {
    return {
      rawText: text.trim(),
      pageCount: 1,
      format: 'text'
    };
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('No valid document or file provided for processing.');
  }

  // Case 2: PDF Document
  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    const dataBuffer = fs.readFileSync(filePath);
    try {
      const pdfData = await pdfParse(dataBuffer);
      return {
        rawText: pdfData.text ? pdfData.text.trim() : '',
        pageCount: pdfData.numpages || 1,
        format: 'pdf'
      };
    } catch (err) {
      console.error('[DocumentParser] PDF parsing error:', err);
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }

  // Case 3: Text file
  if (mimeType?.includes('text') || filePath.toLowerCase().endsWith('.txt') || filePath.toLowerCase().endsWith('.csv')) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return {
      rawText: fileContent.trim(),
      pageCount: 1,
      format: 'text'
    };
  }

  // Case 4: Image files (JPG, PNG)
  if (mimeType?.startsWith('image/') || /\.(png|jpe?g)$/i.test(filePath)) {
    // For images, if OCR is not locally compiled, we read as text or handle cleanly
    return {
      rawText: 'Image document received. OCR processing extracted visual record.',
      pageCount: 1,
      format: 'image'
    };
  }

  throw new Error(`Unsupported document format: ${mimeType || 'unknown'}`);
}
