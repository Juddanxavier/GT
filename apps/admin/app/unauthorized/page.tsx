'use client';

import { useRouter } from 'next/navigation';
import { Button, Card } from '@heroui/react';
import { ShieldX } from 'lucide-react';
import { usePageTitle } from '@/lib/use-page-title';

export default function UnauthorizedPage() {
  usePageTitle('Access Denied');
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <Card.Content className="p-8 space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-danger/10 mx-auto">
            <ShieldX size={28} className="text-danger" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted">You do not have permission to access the admin panel.</p>
          </div>
          <p className="text-sm text-muted">The admin panel is restricted to authorized staff members only. If you believe this is an error, please contact your administrator.</p>
          <Button variant="outline" fullWidth onPress={() => router.push('/login')}>Return to login</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
