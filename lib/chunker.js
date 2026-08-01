/**
 * Split text into overlapping chunks while trying to respect paragraph
 * boundaries. Returns metadata including whether the input was truncated.
 *
 * @typedef {Object} ChunkResult
 * @property {Array<{ content: string; chunkIndex: number; tokenCount: number }>} chunks
 * @property {boolean} truncated
 * @property {number} totalTokens
 */

const DEFAULT_MAX_CHARS_PER_CHUNK = 1500;
const DEFAULT_CHUNK_OVERLAP_CHARS = 150;
const DEFAULT_MAX_TOTAL_CHARS = 250_000; // ~60k tokens hard ceiling before warning

/**
 * Rough token estimate: ~4 characters per token for English text.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Find the best split point near the target length, preferring newlines.
 * @param {string} text
 * @param {number} targetLength
 * @returns {number}
 */
function findSplitPoint(text, targetLength) {
  if (targetLength >= text.length) return text.length;

  const searchWindow = text.slice(
    Math.max(0, targetLength - 100),
    Math.min(text.length, targetLength + 100)
  );

  const newlineIndex = searchWindow.lastIndexOf('\n');
  if (newlineIndex !== -1) {
    return Math.max(0, targetLength - 100) + newlineIndex + 1;
  }

  const spaceIndex = searchWindow.lastIndexOf(' ');
  if (spaceIndex !== -1) {
    return Math.max(0, targetLength - 100) + spaceIndex + 1;
  }

  return targetLength;
}

/**
 * Chunk text with overlap.
 * @param {string} text
 * @param {Object} [options]
 * @param {number} [options.maxCharsPerChunk]
 * @param {number} [options.overlapChars]
 * @param {number} [options.maxTotalChars]
 * @returns {ChunkResult}
 */
function chunkText(
  text,
  {
    maxCharsPerChunk = DEFAULT_MAX_CHARS_PER_CHUNK,
    overlapChars = DEFAULT_CHUNK_OVERLAP_CHARS,
    maxTotalChars = DEFAULT_MAX_TOTAL_CHARS,
  } = {}
) {
  if (!text || typeof text !== 'string') {
    return { chunks: [], truncated: false, totalTokens: 0 };
  }

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized.length === 0) {
    return { chunks: [], truncated: false, totalTokens: 0 };
  }

  const truncatedSource = normalized.length > maxTotalChars;
  const source = truncatedSource ? normalized.slice(0, maxTotalChars) : normalized;

  const chunks = [];
  let position = 0;
  let chunkIndex = 0;

  while (position < source.length) {
    const remaining = source.length - position;
    const targetEnd = Math.min(remaining, maxCharsPerChunk);
    const splitPoint = findSplitPoint(source.slice(position), targetEnd);
    const end = position + splitPoint;

    const content = source.slice(position, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        chunkIndex,
        tokenCount: estimateTokens(content),
      });
      chunkIndex += 1;
    }

    if (end >= source.length) break;

    // Advance with overlap, but never backwards.
    position = Math.max(end - overlapChars, position + 1);
  }

  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

  return {
    chunks,
    truncated: truncatedSource,
    totalTokens,
  };
}

module.exports = {
  chunkText,
  estimateTokens,
  DEFAULT_MAX_CHARS_PER_CHUNK,
  DEFAULT_CHUNK_OVERLAP_CHARS,
  DEFAULT_MAX_TOTAL_CHARS,
};
