import React from 'react';
import Link from 'next/link';
import { FileText, MessageSquare, Trash2, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { Button } from './ui/Button';

const statusConfig = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  PROCESSING: { label: 'Processing', icon: Loader2, color: 'text-primary-600 bg-primary-50' },
  COMPLETED: { label: 'Ready', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  FAILED: { label: 'Failed', icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
};

export default function DocumentCard({ document, onDelete, isDeleting }) {
  const status = statusConfig[document.processingStatus] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  const isReady = document.processingStatus === 'COMPLETED';

  const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate" title={document.title}>
              {document.title}
            </h3>
            <p className="text-sm text-slate-500">
              {formattedDate} · {(document.fileSize / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
        >
          <StatusIcon className={`w-3.5 h-3.5 ${document.processingStatus === 'PROCESSING' ? 'animate-spin' : ''}`} />
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex-1">
        {document.processingStatus === 'FAILED' && document.processingError && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">
            {document.processingError}
          </p>
        )}
        {isReady && document.totalTokens && (
          <p className="text-sm text-slate-600">
            {document.totalTokens.toLocaleString()} tokens · {document.pageCount || '?'} pages
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        {isReady ? (
          <Link href={`/chat/${document.id}`} className="flex-1">
            <Button variant="primary" className="w-full">
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" className="flex-1" disabled>
            <MessageSquare className="w-4 h-4" />
            Chat
          </Button>
        )}
        <Button
          variant="ghost"
          isLoading={isDeleting}
          disabled={isDeleting}
          onClick={() => onDelete(document.id)}
          aria-label="Delete document"
          className="text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
