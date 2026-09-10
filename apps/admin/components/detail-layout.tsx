import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export function DetailBack({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
    >
      <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
}

export function DetailShell({ children }: { children: ReactNode }) {
  return <div className="max-w-6xl mx-auto space-y-6">{children}</div>;
}

export function DetailGrid({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-5 min-w-0">{main}</div>
      <aside className="space-y-5 xl:sticky-sidebar">{aside}</aside>
    </div>
  );
}

export function DetailSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-glass glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-glass">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
