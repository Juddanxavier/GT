import type { ReactNode } from 'react';
import { PageHeader as SharedPageHeader } from '@repo/ui/page-header';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * Thin delegation to `@repo/ui/page-header`, which owns the page `h1` for
 * every admin route (AC-7). Keep the props admin pages already use and add
 * nothing here.
 */
export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <SharedPageHeader title={title} description={subtitle} icon={icon} actions={action} />
  );
}
