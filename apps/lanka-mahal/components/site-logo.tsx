import Image from 'next/image';
import type { ReactNode } from 'react';
import { images } from '@/lib/images';

interface SiteLogoProps {
  className?: string;
  height?: number;
  priority?: boolean;
  showName?: boolean;
  nameClassName?: string;
  withBackdrop?: boolean;
}

const backdropCls =
  'rounded-lg bg-white px-2.5 py-1.5 shadow-[0_2px_12px_rgba(12,25,41,0.12)] ring-1 ring-black/5';

export function SiteLogo({
  className = '',
  height = 48,
  priority = false,
  showName = false,
  nameClassName = 'hidden font-semibold text-brand-navy sm:inline',
  withBackdrop = false,
}: SiteLogoProps): ReactNode {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`inline-flex items-center justify-center ${withBackdrop ? backdropCls : ''}`}
      >
        <Image
          src={images.logo}
          alt="Lanka Mahal"
          width={height * 2.2}
          height={height}
          className="h-auto w-auto object-contain"
          style={{ height, width: 'auto', maxHeight: height }}
          priority={priority}
        />
      </span>
      {showName && <span className={nameClassName}>Lanka Mahal</span>}
    </span>
  );
}
