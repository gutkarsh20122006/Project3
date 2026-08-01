const { prisma } = require('./prisma');

/**
 * @typedef {import('@prisma/client').Document} Document
 * @typedef {import('@prisma/client').Chunk} Chunk
 * @typedef {import('@prisma/client').Message} Message
 */

/**
 * Create a document record.
 * @param {Object} data
 * @param {string} data.userId
 * @param {string} data.title
 * @param {number} data.fileSize
 * @param {number} [data.pageCount]
 * @param {number} [data.totalTokens]
 * @param {boolean} [data.truncated]
 * @returns {Promise<Document>}
 */
async function createDocument(data) {
  return prisma.document.create({ data });
}

/**
 * Find a document by id, ensuring it belongs to the user.
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<Document | null>}
 */
async function getDocumentById(id, userId) {
  return prisma.document.findFirst({
    where: { id, userId },
  });
}

/**
 * List documents for a user, newest first.
 * @param {string} userId
 * @param {Object} [options]
 * @param {number} [options.take=50]
 * @returns {Promise<Document[]>}
 */
async function listDocumentsByUser(userId, { take = 50 } = {}) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

/**
 * Delete a document and its related chunks/messages.
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<{ count: number }>}
 */
async function deleteDocument(id, userId) {
  return prisma.document.deleteMany({
    where: { id, userId },
  });
}

/**
 * Insert chunks in batches.
 * @param {Array<{ documentId: string, content: string, embedding: number[], chunkIndex: number, pageNumber?: number, tokenCount?: number }>} chunks
 * @returns {Promise<{ count: number }>}
 */
async function createChunks(chunks) {
  if (chunks.length === 0) return { count: 0 };

  const vectors = chunks.map((chunk) => ({
    documentId: chunk.documentId,
    content: chunk.content,
    embedding: chunk.embedding,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber ?? null,
    tokenCount: chunk.tokenCount ?? null,
  }));

  const { count } = await prisma.chunk.createMany({
    data: vectors,
    skipDuplicates: false,
  });

  return { count };
}

/**
 * Create a chat message.
 * @param {Object} data
 * @param {string} data.documentId
 * @param {string} data.userId
 * @param {'user' | 'assistant'} data.role
 * @param {string} data.content
 * @param {any} [data.sources]
 * @returns {Promise<Message>}
 */
async function createMessage(data) {
  return prisma.message.create({ data });
}

/**
 * Load chat history for a document.
 * @param {string} documentId
 * @param {string} userId
 * @param {Object} [options]
 * @param {number} [options.take=100]
 * @returns {Promise<Message[]>}
 */
async function listMessagesForDocument(documentId, userId, { take = 100 } = {}) {
  return prisma.message.findMany({
    where: { documentId, userId },
    orderBy: { createdAt: 'asc' },
    take,
  });
}

module.exports = {
  createDocument,
  getDocumentById,
  listDocumentsByUser,
  deleteDocument,
  createChunks,
  createMessage,
  listMessagesForDocument,
};
