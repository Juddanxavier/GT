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
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, oklch(var(--foreground)/0.3) 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
      <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-accent/15 blur-[100px] animate-[pulse-glow_6s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 rounded-full bg-accent/10 blur-[100px] animate-[pulse-glow_8s_ease-in-out_infinite_2s]" />

      <div className="w-full max-w-md animate-[fade-up_0.5s_ease-out]">
        <div className="rounded-sm border border-border/60 bg-surface/80 backdrop-blur-xl p-8 text-center space-y-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-gradient-to-br from-danger/20 to-danger/5 ring-1 ring-danger/20 mx-auto">
            <ShieldX size={28} className="text-danger" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Access Denied</h1>
            <p className="text-sm text-muted leading-relaxed">You do not have permission to access the admin panel. If you believe this is an error, please contact your administrator.</p>
          </div>
          <Button variant="outline" fullWidth onPress={() => router.push('/login')} className="h-11 font-medium">Return to login</Button>
        </div>
      </div>
    </div>
  );
}
