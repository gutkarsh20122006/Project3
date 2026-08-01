const { z } = require('zod');

const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES || '5242880');
const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || '5');

const chatRequestSchema = z.object({
  documentId: z.string().min(1, 'Document id is required'),
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message is too long (max 2000 characters)'),
});

const processRequestSchema = z.object({
  documentId: z.string().min(1, 'Document id is required'),
});

const documentIdParamSchema = z.object({
  docId: z.string().min(1, 'Document id is required'),
});

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

module.exports = {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  chatRequestSchema,
  processRequestSchema,
  documentIdParamSchema,
  signUpSchema,
};
