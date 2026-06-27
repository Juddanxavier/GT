'use client';

import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { usePageTitle } from '@/lib/use-page-title';

export default function UnauthorizedPage() {
  usePageTitle('Access Denied');
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-200 mx-auto">
          <ShieldX size={28} className="text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Access Denied</h1>
          <p className="text-sm text-gray-500 leading-relaxed">You do not have permission to access the admin panel. If you believe this is an error, please contact your administrator.</p>
        </div>
        <button type="button" onClick={() => router.push('/login')}
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">
          Return to login
        </button>
      </div>
    </div>
  );
}
