import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function GlassCard({
  children,
  className = '',
  as = 'div',
  padding = 'none',
  hover = false,
}: GlassCardProps) {
  const Tag = as;
  return (
    <Tag
      className={`glass-panel rounded-lg border-0 ${paddingMap[padding]} ${hover ? 'glass-panel-hover' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}
