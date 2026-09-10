import type { ReactNode } from 'react';

interface ContentPanelProps {
  children: ReactNode;
  className?: string;
  overflow?: boolean;
  padding?: boolean;
}

/** Standard page content surface — glass panel with consistent radius */
export function ContentPanel({
  children,
  className = '',
  overflow = false,
  padding = false,
}: ContentPanelProps) {
  return (
    <div
      className={`content-panel ${overflow ? 'overflow-hidden' : ''} ${padding ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
