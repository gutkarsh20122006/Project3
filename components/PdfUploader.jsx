import React, { useRef, useState } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { MAX_UPLOAD_SIZE_MB } from '../lib/validation';

const ALLOWED_TYPE = 'application/pdf';

export default function PdfUploader({ onUpload, isUploading }) {
  const fileInput = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    if (file.type !== ALLOWED_TYPE) return 'Only PDF files are allowed.';
    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      return `File exceeds the ${MAX_UPLOAD_SIZE_MB} MB limit.`;
    }
    return null;
  };

  const handleChange = (e) => {
    setError(null);
    const file = e.target.files?.[0];
    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setError(null);
    const file = e.dataTransfer.files?.[0];
    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setError(null);
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition
          ${selectedFile ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF"
      >
        <input
          type="file"
          accept="application/pdf"
          ref={fileInput}
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-900 font-medium">
              {selectedFile ? selectedFile.name : 'Click or drag a PDF here'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              PDF only, up to {MAX_UPLOAD_SIZE_MB} MB
            </p>
          </div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <File className="w-5 h-5 text-primary-600 shrink-0" />
            <span className="text-sm text-slate-700 truncate">{selectedFile.name}</span>
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <button
            onClick={clearSelection}
            className="p-1 text-slate-400 hover:text-rose-600 transition"
            aria-label="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        isLoading={isUploading}
        disabled={!selectedFile || isUploading}
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Upload PDF'}
      </Button>
    </div>
  );
}
