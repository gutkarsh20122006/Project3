const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Maximum context characters to send to Claude. If context exceeds this,
 * a warning is surfaced so the response is not silently degraded.
 */
const MAX_CONTEXT_CHARS = 80_000;

/**
 * @returns {Anthropic}
 */
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  return new Anthropic({ apiKey });
}

/**
 * Build the system prompt for RAG.
 * @param {string} context
 * @returns {string}
 */
function buildSystemPrompt(context) {
  return [
    'You are a helpful research assistant. Answer the user\'s question using only the provided document excerpts.',
    'If the answer is not found in the excerpts, say so clearly. Do not make up facts.',
    'Cite relevant source chunks naturally in your answer (e.g., "According to the document...").',
    '',
    'Document excerpts:\n---\n',
    context,
    '\n---',
  ].join('\n');
}

/**
 * Truncate context if needed and return truncation flag.
 * @param {string} context
 * @param {number} maxChars
 * @returns {{ context: string; truncated: boolean }}
 */
function prepareContext(context, maxChars = MAX_CONTEXT_CHARS) {
  if (context.length <= maxChars) {
    return { context, truncated: false };
  }

  // Try to truncate at a newline boundary.
  const slice = context.slice(0, maxChars);
  const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '));
  const safeCut = lastBreak > maxChars * 0.8 ? lastBreak + 1 : maxChars;
  return { context: context.slice(0, safeCut), truncated: true };
}

/**
 * Query Claude with a user message and retrieved context.
 *
 * @param {Object} params
 * @param {string} params.query
 * @param {string} params.context
 * @param {Array<{ role: 'user' | 'assistant'; content: string }>} [params.history]
 * @param {string} [params.model]
 * @param {number} [params.maxTokens]
 * @param {number} [params.temperature]
 * @returns {Promise<{ answer: string; truncated: boolean }>}
 */
async function getAnswer({
  query,
  context,
  history = [],
  model = DEFAULT_MODEL,
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature = DEFAULT_TEMPERATURE,
}) {
  if (!query || typeof query !== 'string') {
    throw new Error('getAnswer requires a non-empty query');
  }

  const { context: safeContext, truncated } = prepareContext(context || '');
  const system = buildSystemPrompt(safeContext);

  const messages = [
    ...history.filter((m) => m.role === 'user' || m.role === 'assistant'),
    { role: 'user', content: query },
  ];

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages,
  });

  const content = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!content) {
    throw new Error('Claude returned an empty answer');
  }

  return { answer: content, truncated };
}

module.exports = {
  getAnswer,
  prepareContext,
  buildSystemPrompt,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  MAX_CONTEXT_CHARS,
};
