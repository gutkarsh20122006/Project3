# Tutorial

This tutorial walks through running DocuChat locally and chatting with your first PDF.

## 1. Install dependencies

```bash
npm install
```

## 2. Set up environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

You need:

- A PostgreSQL database with the `pgvector` extension.
- An OpenAI API key for embeddings.
- An Anthropic API key for Claude answers.
- A `NEXTAUTH_SECRET` (any long random string).

## 3. Prepare the database

Enable `pgvector`:

```bash
psql "$DATABASE_URL" -f sql/enable-pgvector.sql
```

Push the schema:

```bash
npx prisma db push
```

## 4. Start the app

```bash
npm run dev
```

## 5. Create an account

Open [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup) and create an account.

## 6. Upload a PDF

Go to [http://localhost:3000/documents](http://localhost:3000/documents), choose a PDF under 5 MB, and click **Upload PDF**. The app will chunk and embed the document automatically.

## 7. Chat with the document

Once processing completes, click **Chat** on the document card and ask questions. Answers include source chunk references.
