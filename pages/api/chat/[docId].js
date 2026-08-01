const { getServerSession } = require('next-auth');
const { authOptions } = require('../auth/[...nextauth]');
const { listMessagesForDocument, getDocumentById } = require('../../../lib/db');
const { sendError } = require('../../../lib/errors');

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return sendError(res, 401, 'You must be signed in');
  }

  const { docId } = req.query;
  if (!docId || typeof docId !== 'string') {
    return sendError(res, 400, 'Document id is required');
  }

  const document = await getDocumentById(docId, session.user.id);
  if (!document) {
    return sendError(res, 404, 'Document not found');
  }

  try {
    const messages = await listMessagesForDocument(docId, session.user.id, { take: 200 });
    return res.status(200).json({ success: true, document, messages });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load chat history:', err);
    return sendError(res, 500, 'Failed to load chat history');
  }
}
