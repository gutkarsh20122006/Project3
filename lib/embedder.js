const { OpenAI } = require('openai');

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;

/**
 * @returns {OpenAI}
 */
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate an embedding for a single text string.
 * @param {string} text
 * @param {Object} [options]
 * @param {string} [options.model]
 * @returns {Promise<number[]>}
 */
async function embed(text, { model = DEFAULT_MODEL } = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('embed() requires a non-empty string');
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error('embed() requires a non-empty string');
  }

  const openai = getClient();
  const response = await openai.embeddings.create({
    model,
    input: trimmed,
    encoding_format: 'float',
    dimensions: DEFAULT_DIMENSIONS,
  });

  const embedding = response.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== DEFAULT_DIMENSIONS) {
    throw new Error('Unexpected embedding shape from OpenAI');
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in a single request.
 * @param {string[]} texts
 * @param {Object} [options]
 * @param {string} [options.model]
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts, { model = DEFAULT_MODEL } = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const validTexts = texts
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => t.length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  const openai = getClient();
  const response = await openai.embeddings.create({
    model,
    input: validTexts,
    encoding_format: 'float',
    dimensions: DEFAULT_DIMENSIONS,
  });

  return response.data.map((item) => {
    if (!Array.isArray(item.embedding) || item.embedding.length !== DEFAULT_DIMENSIONS) {
      throw new Error('Unexpected embedding shape from OpenAI');
    }
    return item.embedding;
  });
}

module.exports = {
  embed,
  embedBatch,
  DEFAULT_MODEL,
  DEFAULT_DIMENSIONS,
};
