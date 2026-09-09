import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthAlert({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
