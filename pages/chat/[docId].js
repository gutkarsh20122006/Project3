import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ChatMessage from '../../components/ChatMessage';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';

export default function ChatDocPage() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const { docId } = router.query;

  const [document, setDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const fetchChat = async () => {
    if (!docId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/chat/${docId}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load chat');
      }
      setDocument(data.document);
      setMessages(data.messages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && docId) {
      fetchChat();
    }
  }, [status, docId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setError(null);
    setWarning(null);

    // Optimistically add user message.
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: 'user', content: userMessage, sources: null },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, message: userMessage }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get a response');
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id?.startsWith('temp-'));
        return [
          ...withoutTemp,
          { role: 'user', content: userMessage, sources: null },
          data.message,
        ];
      });

      if (data.warnings?.documentTruncated || data.warnings?.contextTruncated) {
        setWarning(
          'Some document content or retrieved context was truncated, so the answer may not cover the full document.'
        );
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.filter((m) => !m.id?.startsWith('temp-')));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {document?.title || 'Chat'}
          </h1>
          <p className="text-xs text-slate-500">
            {document?.processingStatus === 'COMPLETED'
              ? 'Document is ready'
              : 'Document is not ready yet'}
          </p>
        </div>
      </div>

      {document?.truncated && (
        <Alert type="warning" className="mb-4" title="Document truncated">
          This PDF was long and had to be truncated during processing. Content near the end may not
          be searchable.
        </Alert>
      )}

      {warning && (
        <Alert type="warning" className="mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {warning}
          </div>
        </Alert>
      )}

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="flex-1 overflow-y-auto bg-slate-100 rounded-2xl p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <p className="text-lg font-medium">Start the conversation</p>
            <p className="text-sm">Ask a question about this document.</p>
          </div>
        ) : (
          messages.map((message, idx) => <ChatMessage key={message.id || idx} message={message} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something about this document..."
          disabled={sending || document?.processingStatus !== 'COMPLETED'}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-500"
        />
        <Button
          type="submit"
          isLoading={sending}
          disabled={!input.trim() || sending || document?.processingStatus !== 'COMPLETED'}
        >
          <Send className="w-4 h-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
