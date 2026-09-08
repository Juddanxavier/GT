import type { ReactNode } from 'react';

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  cream?: boolean;
  id?: string;
}

export function PageShell({ children }: { children: ReactNode }): ReactNode {
  return <div className="min-h-screen bg-brand-cream">{children}</div>;
}

export function PageSection({
  children,
  className = '',
  cream = false,
  id,
}: PageSectionProps): ReactNode {
  return (
    <section
      id={id}
      className={`premium-section ${cream ? 'bg-brand-cream' : 'bg-surface'} ${className}`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">{children}</div>
    </section>
  );
}
