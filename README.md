# DocuChat — RAG Chat over PDFs

A production-grade Next.js application that lets users upload PDF documents, embeds them with OpenAI, stores them in PostgreSQL with `pgvector`, and answers questions using Anthropic Claude with retrieved context.

## Features

- **PDF upload** with client- and server-side validation (PDF only, 5 MB max).
- **Asynchronous PDF parsing** with async file I/O and user-friendly error handling for corrupted or password-protected files.
- **Semantic chunking** with overlap and paragraph boundary awareness.
- **OpenAI text-embedding-3-small** embeddings stored as `vector(1536)` in Postgres.
- **pgvector similarity search** for relevant passages.
- **Anthropic Claude** RAG answers with cited source chunks.
- **Rate limiting** on upload, process, and chat endpoints.
- **Email/password auth** via NextAuth.js with bcrypt-hashed passwords.
- **Responsive UI** built with Tailwind CSS.
- **Explicit truncation warnings** when PDF text or retrieved context is cut off.

## Tech stack

- Next.js 14 (Pages Router)
- React 18
- Prisma + PostgreSQL + pgvector
- NextAuth.js
- OpenAI Embeddings
- Anthropic Claude
- Tailwind CSS

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-strong-random-string-at-least-32-chars"
ANTHROPIC_API_KEY="sk-ant-api03-..."
OPENAI_API_KEY="sk-..."
```

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

### 3. Prepare the database

Enable `pgvector` in your Postgres database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then push the Prisma schema:

```bash
npx prisma db push
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Production build

```bash
npm run build
npm start
```

## Project structure

```
components/          # React UI components
lib/                 # Core business logic (chunker, embedder, vector search, Claude, etc.)
pages/               # Next.js pages and API routes
prisma/              # Prisma schema
sql/                 # Postgres setup scripts
styles/              # Tailwind entry CSS
```

## Notes

- Uploaded files are temporarily stored in `tmp/uploads/`. For production deployments, replace this with an object store (S3, R3, etc.) or process uploads in a background job queue.
- The in-memory rate limiter works for single-instance deployments. For multi-instance production environments, replace it with a Redis-backed store such as Upstash Redis.
