const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

const MAX_PDF_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES || '5242880');

/**
 * @typedef {Object} PdfParseResult
 * @property {string} text
 * @property {number} pageCount
 * @property {boolean} truncated
 * @property {string|null} warning
 */

/**
 * Validate that a buffer looks like a PDF by checking its magic bytes.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer.slice(0, 4).toString('ascii') === '%PDF';
}

/**
 * Extract text from a PDF file asynchronously with robust error handling.
 *
 * @param {string} filePath
 * @param {Object} [options]
 * @param {number} [options.maxChars]
 * @returns {Promise<PdfParseResult>}
 */
async function parsePdf(filePath, { maxChars = 250_000 } = {}) {
  let buffer;
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_PDF_SIZE_BYTES) {
      throw new Error(
        `PDF exceeds maximum allowed size of ${Math.round(
          MAX_PDF_SIZE_BYTES / 1024 / 1024
        )} MB.`
      );
    }

    buffer = await fs.readFile(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Uploaded file could not be found for processing.');
    }
    throw new Error(`Failed to read uploaded file: ${err.message}`);
  }

  if (!isPdfBuffer(buffer)) {
    throw new Error('The uploaded file is not a valid PDF.');
  }

  let result;
  try {
    result = await pdfParse(buffer, { max: 0 });
  } catch (err) {
    const message = err?.message || String(err);
    if (/password/i.test(message) || /encrypted/i.test(message)) {
      throw new Error('The PDF is password-protected. Please remove encryption and try again.');
    }
    if (/invalid|corrupt/i.test(message)) {
      throw new Error('The PDF appears to be corrupted and could not be parsed.');
    }
    throw new Error(`PDF parsing failed: ${message}`);
  }

  if (!result || typeof result.text !== 'string') {
    throw new Error('No readable text could be extracted from this PDF.');
  }

  const text = result.text.trim();
  if (text.length === 0) {
    throw new Error('This PDF contains no extractable text (it may be a scanned image).');
  }

  const truncated = text.length > maxChars;
  const safeText = truncated ? text.slice(0, maxChars) : text;

  return {
    text: safeText,
    pageCount: typeof result.numpages === 'number' ? result.numpages : null,
    truncated,
    warning: truncated
      ? `The PDF text was truncated to ${maxChars.toLocaleString()} characters to stay within processing limits. Some content at the end of the document may not be searchable.`
      : null,
  };
}

module.exports = {
  parsePdf,
  isPdfBuffer,
  MAX_PDF_SIZE_BYTES,
};
