import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const styles = {
  info: 'bg-primary-50 text-primary-800 border-primary-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function Alert({ type = 'info', title, children, className }) {
  const Icon = icons[type];
  return (
    <div
      className={twMerge(
        clsx('rounded-xl border p-4 flex gap-3', styles[type]),
        className
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
