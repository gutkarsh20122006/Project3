const { getServerSession } = require('next-auth');
const { authOptions } = require('./auth/[...nextauth]');
const { listDocumentsByUser } = require('../../lib/db');
const { sendError } = require('../../lib/errors');

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
    return sendError(res, 401, 'You must be signed in to view documents');
  }

  try {
    const documents = await listDocumentsByUser(session.user.id, { take: 100 });
    return res.status(200).json({ success: true, documents });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to list documents:', err);
    return sendError(res, 500, 'Failed to load documents');
  }
}
