const fs = require('fs/promises');
const path = require('path');
const { getServerSession } = require('next-auth');
const { authOptions } = require('./auth/[...nextauth]');
const { prisma } = require('../../lib/prisma');
const { sendError } = require('../../lib/errors');
const { checkRateLimit, getRateLimitKey } = require('../../lib/rateLimit');
const { processRequestSchema } = require('../../lib/validation');
const { parsePdf } = require('../../lib/pdfParser');
const { chunkText } = require('../../lib/chunker');
const { embedBatch } = require('../../lib/embedder');

/**
 * Process a pending PDF document: chunk, embed, and persist chunks.
 *
 * @param {Object} params
 * @param {string} params.documentId
 * @param {string} params.filePath
 */
async function processDocument({ documentId, filePath }) {
  await prisma.document.update({
    where: { id: documentId },
    data: { processingStatus: 'PROCESSING' },
  });

  let parsed;
  try {
    parsed = await parsePdf(filePath);
  } catch (err) {
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'FAILED', processingError: err.message },
    });
    throw err;
  }

  const { chunks, truncated, totalTokens } = chunkText(parsed.text);
  if (chunks.length === 0) {
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'FAILED', processingError: 'No usable text chunks found.' },
    });
    throw new Error('No usable text chunks found.');
  }

  // Generate embeddings in batches.
  const batchSize = 96;
  const chunkRecords = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await embedBatch(batch.map((c) => c.content));

    if (embeddings.length !== batch.length) {
      throw new Error('Embedding batch size mismatch');
    }

    embeddings.forEach((embedding, idx) => {
      const chunk = batch[idx];
      chunkRecords.push({
        documentId,
        content: chunk.content,
        embedding,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
      });
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.chunk.createMany({ data: chunkRecords });
    await tx.document.update({
      where: { id: documentId },
      data: {
        pageCount: parsed.pageCount,
        totalTokens,
        truncated,
        processingStatus: 'COMPLETED',
        processingError: null,
      },
    });
  });
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
    return sendError(res, 401, 'You must be signed in to process documents');
  }

  let body;
  try {
    body = processRequestSchema.parse(req.body);
  } catch (err) {
    const issues = err?.issues?.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return sendError(res, 400, 'Invalid request body', { issues });
  }

  const rateLimit = checkRateLimit({
    key: getRateLimitKey(req, 'process', session.user.id),
    limit: Number(process.env.RATE_LIMIT_PROCESS || '20'),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  });

  if (!rateLimit.allowed) {
    return sendError(res, 429, 'Processing rate limit exceeded. Please slow down.', {
      resetAt: rateLimit.resetAt,
    });
  }

  const document = await prisma.document.findFirst({
    where: { id: body.documentId, userId: session.user.id },
  });

  if (!document) {
    return sendError(res, 404, 'Document not found');
  }

  if (document.processingStatus === 'PROCESSING') {
    return sendError(res, 409, 'Document is already being processed');
  }

  if (document.processingStatus === 'COMPLETED') {
    return sendError(res, 409, 'Document has already been processed');
  }

  const filePath = path.join(process.cwd(), 'tmp', 'uploads', `${document.id}.pdf`);

  try {
    await processDocument({ documentId: document.id, filePath });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Document processing failed:', err);

    const updated = await prisma.document.findUnique({
      where: { id: document.id },
      select: { processingStatus: true, processingError: true },
    });

    return sendError(res, 422, `Processing failed: ${err.message}`, {
      documentId: document.id,
      status: updated?.processingStatus,
      error: updated?.processingError,
    });
  } finally {
    // Best-effort cleanup of the temporary file.
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore cleanup errors
    }
  }

  const finalDocument = await prisma.document.findUnique({
    where: { id: document.id },
    select: {
      id: true,
      title: true,
      fileSize: true,
      pageCount: true,
      totalTokens: true,
      truncated: true,
      processingStatus: true,
      createdAt: true,
    },
  });

  return res.status(200).json({
    success: true,
    document: finalDocument,
    warning: finalDocument?.truncated
      ? 'The PDF text was long and has been truncated for processing. Content near the end of the document may not be searchable.'
      : undefined,
  });
}
