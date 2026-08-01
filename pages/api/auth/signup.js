const bcrypt = require('bcryptjs');
const { prisma } = require('../../../lib/prisma');
const { signUpSchema } = require('../../../lib/validation');
const { sendError } = require('../../../lib/errors');
const { checkRateLimit, getRateLimitKey } = require('../../../lib/rateLimit');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const rateLimit = checkRateLimit({
    key: getRateLimitKey(req, 'signup'),
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

  if (!rateLimit.allowed) {
    return sendError(res, 429, 'Too many sign-up attempts. Please try again later.', {
      resetAt: rateLimit.resetAt,
    });
  }

  let body;
  try {
    body = signUpSchema.parse(req.body);
  } catch (err) {
    const issues = err?.issues?.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return sendError(res, 400, 'Invalid sign-up data', { issues });
  }

  const email = body.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return sendError(res, 409, 'An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(body.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        hashedPassword,
      },
      select: { id: true, email: true, name: true },
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Sign-up failed:', err);
    return sendError(res, 500, 'Failed to create account. Please try again.');
  }
}
