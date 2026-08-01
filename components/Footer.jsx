import React from 'react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-bold text-lg">DocuChat</h4>
            <p className="mt-2 text-sm text-slate-400">
              Production-grade RAG chat over your PDF documents.
            </p>
          </div>
          <div>
            <h5 className="text-white font-semibold">Stack</h5>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              <li>Next.js + React</li>
              <li>PostgreSQL + pgvector</li>
              <li>OpenAI Embeddings</li>
              <li>Anthropic Claude</li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-semibold">Security</h5>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              <li>Server-side file validation</li>
              <li>Per-user rate limiting</li>
              <li>Password hashing with bcrypt</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 text-sm text-slate-500">
          © {new Date().getFullYear()} DocuChat. Built for production review.
        </div>
      </div>
    </footer>
  );
}
