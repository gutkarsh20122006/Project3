import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function ChunkSourceList({ sources }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const visibleSources = expanded ? sources : sources.slice(0, 2);

  return (
    <div className="text-sm">
      <p className="font-medium text-slate-700 mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary-600" />
        Sources ({sources.length})
      </p>
      <ul className="space-y-2">
        {visibleSources.map((source, idx) => (
          <li
            key={idx}
            className="bg-slate-50 border border-slate-100 rounded-lg p-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Chunk {source.chunkIndex}</span>
              {source.pageNumber && <span>Page {source.pageNumber}</span>}
              <span>Similarity {(source.similarity * 100).toFixed(1)}%</span>
            </div>
            <p className="text-slate-700 line-clamp-3">{source.content}</p>
          </li>
        ))}
      </ul>
      {sources.length > 2 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-xs"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" /> Show all sources
            </>
          )}
        </button>
      )}
    </div>
  );
}
