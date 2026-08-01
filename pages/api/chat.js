const { getServerSession } = require('next-auth');
const { authOptions } = require('./auth/[...nextauth]');
const { prisma } = require('../../lib/prisma');
const { sendError } = require('../../lib/errors');
const { checkRateLimit, getRateLimitKey } = require('../../lib/rateLimit');
const { chatRequestSchema } = require('../../lib/validation');
const { embed } = require('../../lib/embedder');
const { searchChunks } = require('../../lib/vectorSearch');
const { getAnswer } = require('../../lib/claudeRAG');
const { listMessagesForDocument } = require('../../lib/db');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '128kb',
    },
  },
};

/**
 * Build a context string from retrieved chunks and detect truncation.
 *
 * @param {Array<{ content: string; chunkIndex: number; pageNumber: number | null; similarity: number }>} sources
 * @param {number} maxContextChars
 * @returns {{ context: string; sources: any[]; truncated: boolean }}
 */
function buildContext(sources, maxContextChars = 80_000) {
  const included = [];
  let context = '';
  let truncated = false;

  for (const source of sources) {
    const addition = `\n[Chunk ${source.chunkIndex}${
      source.pageNumber ? `, page ${source.pageNumber}` : ''
    }]\n${source.content}\n`;

    if (context.length + addition.length > maxContextChars) {
      truncated = true;
      break;
    }

    context += addition;
    included.push({
      chunkIndex: source.chunkIndex,
      pageNumber: source.pageNumber,
      content: source.content,
      similarity: source.similarity,
    });
  }

  return { context: context.trim(), sources: included, truncated };
}

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return sendError(res, 401, 'You must be signed in to chat');
  }

  let body;
  try {
    body = chatRequestSchema.parse(req.body);
  } catch (err) {
    const issues = err?.issues?.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return sendError(res, 400, 'Invalid request body', { issues });
  }

  const rateLimit = checkRateLimit({
    key: getRateLimitKey(req, `chat:${session.user.id}`, session.user.id),
    limit: Number(process.env.RATE_LIMIT_CHAT || '30'),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  });

  if (!rateLimit.allowed) {
    return sendError(res, 429, 'Chat rate limit exceeded. Please slow down.', {
      resetAt: rateLimit.resetAt,
    });
  }

  const document = await prisma.document.findFirst({
    where: { id: body.documentId, userId: session.user.id },
    select: {
      id: true,
      title: true,
      processingStatus: true,
      truncated: true,
    },
  });

  if (!document) {
    return sendError(res, 404, 'Document not found');
  }

  if (document.processingStatus !== 'COMPLETED') {
    return sendError(res, 409, 'Document is still being processed. Please wait and try again.', {
      status: document.processingStatus,
    });
  }

  // Embed the user query and find similar chunks.
  let sources = [];
  let context = '';
  let contextTruncated = false;

  try {
    const queryEmbedding = await embed(body.message);
    const chunks = await searchChunks({
      documentId: document.id,
      queryEmbedding,
      topK: 5,
      similarityThreshold: 0.7,
    });

    const ctx = buildContext(chunks);
    context = ctx.context;
    sources = ctx.sources;
    contextTruncated = ctx.truncated;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Retrieval failed:', err);
    return sendError(res, 500, 'Failed to retrieve relevant document passages.');
  }

  // Build recent history from previous messages (current query is not persisted yet).
  const recentMessages = await listMessagesForDocument(document.id, session.user.id, { take: 6 });
  const history = recentMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  // Query Claude.
  let answer;
  let answerTruncated = false;
  try {
    const result = await getAnswer({
      query: body.message,
      context,
      history,
    });
    answer = result.answer;
    answerTruncated = result.truncated;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Claude request failed:', err);
    return sendError(res, 502, 'The AI assistant failed to generate a response. Please try again.');
  }

  // Persist both messages together.
  let assistantMessage;
  try {
    const [userRecord, assistantRecord] = await prisma.$transaction([
      prisma.message.create({
        data: {
          documentId: document.id,
          userId: session.user.id,
          role: 'user',
          content: body.message,
        },
      }),
      prisma.message.create({
        data: {
          documentId: document.id,
          userId: session.user.id,
          role: 'assistant',
          content: answer,
          sources,
        },
      }),
    ]);
    assistantMessage = assistantRecord;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist chat messages:', err);
    return sendError(res, 500, 'Failed to save the conversation.');
  }

  return res.status(200).json({
    success: true,
    message: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      sources: assistantMessage.sources,
      createdAt: assistantMessage.createdAt,
    },
    warnings: {
      documentTruncated: document.truncated,
      contextTruncated: contextTruncated || answerTruncated,
    },
  });
}
