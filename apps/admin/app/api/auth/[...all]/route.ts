import { getAuth } from '@/lib/auth-server';
import { toNextJsHandler } from 'better-auth/next-js';

const { GET, POST } = toNextJsHandler(async (request) => {
  const auth = getAuth();
  return auth.handler(request);
});

export { GET, POST };
