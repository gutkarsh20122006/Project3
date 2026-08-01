import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Upload, MessageSquare, Search, Shield } from 'lucide-react';

export function Hero() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
            Chat with your PDFs using AI
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600">
            Upload documents, ask questions, and get accurate answers grounded in your own content.
            Built with pgvector, OpenAI embeddings, and Claude.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isAuthenticated ? '/documents' : '/auth/signup'}
              className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg hover:shadow-xl transition"
            >
              {isAuthenticated ? 'Go to documents' : 'Get started free'}
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
            >
              Learn more
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="features">
          <FeatureCard
            icon={<Upload className="w-6 h-6" />}
            title="Upload PDFs"
            description="Securely upload PDFs up to 5 MB. Server-side validation keeps abuse out."
          />
          <FeatureCard
            icon={<Search className="w-6 h-6" />}
            title="Vector retrieval"
            description="Every document is chunked, embedded, and indexed in Postgres with pgvector."
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Ask questions"
            description="Chat naturally and get answers cited from the exact passages in your document."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Rate limited"
            description="Built-in abuse protection on every endpoint protects your API budget."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-100 text-primary-700 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}
