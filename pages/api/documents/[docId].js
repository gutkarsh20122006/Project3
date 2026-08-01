const fs = require('fs/promises');
const path = require('path');
const { getServerSession } = require('next-auth');
const { authOptions } = require('../auth/[...nextauth]');
const { prisma } = require('../../../lib/prisma');
const { getDocumentById, deleteDocument } = require('../../../lib/db');
const { sendError } = require('../../../lib/errors');

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return sendError(res, 401, 'You must be signed in');
  }

  const { docId } = req.query;
  if (!docId || typeof docId !== 'string') {
    return sendError(res, 400, 'Document id is required');
  }

  if (req.method === 'GET') {
    const document = await getDocumentById(docId, session.user.id);
    if (!document) {
      return sendError(res, 404, 'Document not found');
    }
    return res.status(200).json({ success: true, document });
  }

  if (req.method === 'DELETE') {
    // Delete related chunks and messages via cascade, then remove temp file if present.
    const deleted = await deleteDocument(docId, session.user.id);
    if (deleted.count === 0) {
      return sendError(res, 404, 'Document not found');
    }

    const tempPath = path.join(process.cwd(), 'tmp', 'uploads', `${docId}.pdf`);
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore cleanup errors
    }

    return res.status(200).json({ success: true, message: 'Document deleted' });
  }

  return sendError(res, 405, 'Method not allowed');
}
