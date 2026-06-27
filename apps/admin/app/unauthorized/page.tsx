'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { ShieldX } from 'lucide-react';
import { usePageTitle } from '@/lib/use-page-title';

export default function UnauthorizedPage() {
  usePageTitle('Access Denied');
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(var(--accent)/0.06),transparent_60%),radial-gradient(ellipse_at_bottom,_oklch(var(--accent)/0.03),transparent_60%)]" />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-xl shadow-2xl shadow-black/20 p-10 text-center space-y-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-danger/20 to-danger/5 ring-1 ring-danger/20 mx-auto">
            <ShieldX size={28} className="text-danger" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Access Denied</h1>
            <p className="text-sm text-muted leading-relaxed">You do not have permission to access the admin panel. If you believe this is an error, please contact your administrator.</p>
          </div>
          <Button variant="outline" fullWidth onPress={() => router.push('/login')} className="h-11">Return to login</Button>
        </div>
      </div>
    </div>
  );
}
