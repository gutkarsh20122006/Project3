import React from 'react';

export function Spinner({ className = 'w-8 h-8' }) {
  return (
    <div className={`border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin ${className}`} />
  );
}
