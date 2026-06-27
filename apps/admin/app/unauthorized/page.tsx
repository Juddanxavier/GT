'use client';

import { useRouter } from 'next/navigation';
import { Button, Card } from '@heroui/react';
import { ShieldX } from 'lucide-react';
import { usePageTitle } from '@/lib/use-page-title';

export default function UnauthorizedPage() {
  usePageTitle('Access Denied');
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(var(--accent)/0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,_oklch(var(--accent)/0.05),transparent_50%)]" />
      <Card className="w-full max-w-sm relative">
        <Card.Content className="p-8 flex flex-col items-center text-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-danger/10">
            <ShieldX size={24} className="text-danger" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Access Denied</h1>
            <p className="text-sm text-muted">You do not have permission to access the admin panel.</p>
          </div>
          <p className="text-xs text-muted leading-relaxed">The admin panel is restricted to authorized staff. If you believe this is an error, please contact your administrator.</p>
          <Button variant="outline" fullWidth onPress={() => router.push('/login')}>Return to login</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
