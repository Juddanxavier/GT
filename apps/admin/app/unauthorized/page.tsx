'use client';

import { useRouter } from 'next/navigation';
import { Button, Card } from '@heroui/react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md text-center">
        <Card.Header>
          <Card.Title className="text-2xl">Access Denied</Card.Title>
          <Card.Description>
            You do not have permission to access the admin panel.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <p className="text-sm text-muted">
            The admin panel is restricted to authorized staff members only.
            If you believe this is an error, please contact your administrator.
          </p>
          <Button variant="outline" fullWidth onPress={() => router.push('/login')}>
            Return to login
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
}
