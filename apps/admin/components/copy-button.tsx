'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import FlagKit from 'react-flagkit';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* fallback ignored */ }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors shrink-0"
      title={`Copy ${label || text}`}
    >
      {copied ? (
        <Check size={14} />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

export function Flag({ country, size = 16 }: { country: string; size?: number }) {
  const code = country.toUpperCase();
  return <FlagKit country={code} size={size} alt={code} className="inline-block shrink-0" />;
}

export function countryFromString(location: string): string | null {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && /^[A-Z]{2}$/i.test(last)) return last.toUpperCase();
  return null;
}
