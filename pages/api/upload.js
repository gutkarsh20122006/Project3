const formidable = require('formidable');
const fs = require('fs/promises');
const path = require('path');
const { getServerSession } = require('next-auth');
const { authOptions } = require('./auth/[...nextauth]');
const { prisma } = require('../../lib/prisma');
const { sendError } = require('../../lib/errors');
const { checkRateLimit, getRateLimitKey } = require('../../lib/rateLimit');
const {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} = require('../../lib/validation');

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseForm(req) {
  const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  const form = new formidable.IncomingForm({
    maxFileSize: MAX_UPLOAD_SIZE_BYTES,
    keepExtensions: true,
    uploadDir,
    multiples: false,
    filter({ mimetype }) {
      return mimetype === 'application/pdf';
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
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
    return sendError(res, 401, 'You must be signed in to upload documents');
  }

  const rateLimit = checkRateLimit({
    key: getRateLimitKey(req, 'upload', session.user.id),
    limit: Number(process.env.RATE_LIMIT_UPLOAD || '10'),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  });

  if (!rateLimit.allowed) {
    return sendError(res, 429, 'Upload rate limit exceeded. Please slow down.', {
      resetAt: rateLimit.resetAt,
    });
  }

  let files;
  try {
    ({ files } = await parseForm(req));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Upload parse error:', err);
    if (err.message?.includes('maxFileSize')) {
      return sendError(
        res,
        413,
        `File too large. Maximum size is ${MAX_UPLOAD_SIZE_MB} MB.`,
        { maxSizeBytes: MAX_UPLOAD_SIZE_BYTES }
      );
    }
    if (err.message?.includes('mimetype')) {
      return sendError(res, 415, 'Only PDF files are allowed.');
    }
    return sendError(res, 400, `Upload failed: ${err.message}`);
  }

  const file = files.file;
  const uploadedFile = Array.isArray(file) ? file[0] : file;

  if (!uploadedFile) {
    return sendError(res, 400, 'No file was uploaded.');
  }

  const originalName = uploadedFile.originalFilename || 'document.pdf';
  const fileSize = uploadedFile.size;

  if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
    return sendError(
      res,
      413,
      `File too large. Maximum size is ${MAX_UPLOAD_SIZE_MB} MB.`,
      { maxSizeBytes: MAX_UPLOAD_SIZE_BYTES }
    );
  }

  let document;
  let destPath;

  try {
    document = await prisma.document.create({
      data: {
        title: originalName,
        fileSize,
        userId: session.user.id,
        processingStatus: 'PENDING',
      },
      select: {
        id: true,
        title: true,
        fileSize: true,
        processingStatus: true,
        createdAt: true,
      },
    });

    // Move the uploaded file to a deterministic path keyed by document id.
    // In production, replace this with an object store such as S3 / Cloudflare R2.
    destPath = path.join(process.cwd(), 'tmp', 'uploads', `${document.id}.pdf`);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.rename(uploadedFile.filepath, destPath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist uploaded file:', err);

    // Best-effort cleanup of the temporary file.
    try {
      await fs.unlink(uploadedFile.filepath);
    } catch {
      // ignore cleanup errors
    }

    if (document) {
      await prisma.document.update({
        where: { id: document.id },
        data: { processingStatus: 'FAILED', processingError: 'Failed to persist uploaded file.' },
      });
    }

    return sendError(res, 500, 'Failed to persist uploaded file.');
  }

  return res.status(201).json({
    success: true,
    document,
  });
}
