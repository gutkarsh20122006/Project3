import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import PdfUploader from '../components/PdfUploader';
import DocumentCard from '../components/DocumentCard';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { RefreshCw, FileText } from 'lucide-react';

export default function DocumentsPage() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load documents');
      }
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDocuments();
    }
  }, [status]);

  const handleUpload = async (file) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setSuccess(`Uploaded "${data.document.title}". Processing...`);
      setProcessingId(data.document.id);

      // Trigger async processing.
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: data.document.id }),
      });
      const processData = await processRes.json();

      if (!processData.success) {
        throw new Error(processData.error?.message || 'Processing failed');
      }

      setDocuments((prev) => [processData.document, ...prev]);
      setSuccess(`"${processData.document.title}" is ready to chat.`);
      if (processData.warning) {
        setSuccess(processData.warning);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProcessingId(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    setDeletingId(docId);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete document');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess('Document deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your documents</h1>
          <p className="mt-1 text-slate-600">
            Upload PDFs and start a conversation with them.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchDocuments}
          disabled={loading}
          className="self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}
      {success && <Alert type="success" className="mb-6">{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload PDF</h2>
            <PdfUploader onUpload={handleUpload} isUploading={uploading} />
            {processingId && (
              <p className="mt-4 text-sm text-primary-700 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                Processing document...
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No documents yet</h3>
              <p className="text-slate-600 mt-1">Upload your first PDF to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={handleDelete}
                  isDeleting={deletingId === doc.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
