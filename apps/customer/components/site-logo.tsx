import Image from 'next/image';
import type { ReactNode } from 'react';
import { images } from '@/lib/images';
import { useTenantConfig } from '@/lib/use-tenant-config';

interface SiteLogoProps {
  className?: string;
  height?: number;
  priority?: boolean;
  withBackdrop?: boolean;
}

const backdropCls =
  'rounded-lg bg-white px-2 py-1 shadow-[0_2px_12px_rgba(12,25,41,0.12)] ring-1 ring-black/5';

export function SiteLogo({
  className = '',
  height = 36,
  priority = false,
  withBackdrop = false,
}: SiteLogoProps): ReactNode {
  const config = useTenantConfig();

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span
        className={`inline-flex items-center justify-center ${withBackdrop ? backdropCls : ''}`}
      >
        <Image
          src={images.logo}
          alt={config.name}
          width={height}
          height={height}
          className="object-contain"
          style={{ height, width: height }}
          priority={priority}
        />
      </span>
    </span>
  );
}
