const { prisma } = require('./prisma');

const DEFAULT_TOP_K = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

/**
 * Find the top-k chunks most similar to a query embedding.
 *
 * @param {Object} params
 * @param {string} params.documentId
 * @param {number[]} params.queryEmbedding
 * @param {number} [params.topK]
 * @param {number} [params.similarityThreshold]
 * @returns {Promise<Array<{ id: string; content: string; chunkIndex: number; pageNumber: number | null; similarity: number }>>}
 */
async function searchChunks({
  documentId,
  queryEmbedding,
  topK = DEFAULT_TOP_K,
  similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
}) {
  if (!documentId || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    throw new Error('searchChunks requires documentId and a non-empty queryEmbedding');
  }

  // pgvector operator <=> returns cosine distance for normalized vectors.
  // OpenAI embeddings are normalized, so 1 - distance ≈ cosine similarity.
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw`
    SELECT
      c.id,
      c.content,
      c."chunkIndex",
      c."pageNumber",
      1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "Chunk" c
    WHERE c."documentId" = ${documentId}
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;

  return (results || [])
    .map((row) => ({
      id: row.id,
      content: row.content,
      chunkIndex: row.chunkIndex,
      pageNumber: row.pageNumber,
      similarity: Number(row.similarity),
    }))
    .filter((row) => row.similarity >= similarityThreshold);
}

module.exports = {
  searchChunks,
  DEFAULT_TOP_K,
  DEFAULT_SIMILARITY_THRESHOLD,
};
