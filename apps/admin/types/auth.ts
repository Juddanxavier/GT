import { z } from 'zod';

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['superadmin', 'tenant-admin', 'staff', 'customer']),
  tenantId: z.string().optional(),
  branchId: z.string().optional(),
  tenantName: z.string().optional(),
  branchName: z.string().optional(),
  tenantCountry: z.string().optional(),
  tenantSlug: z.string().optional(),
  image: z.string().nullable().optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export function getUser(session: { user?: unknown } | null): SessionUser | null {
  if (!session?.user) return null;
  const parsed = sessionUserSchema.safeParse(session.user);
  if (parsed.success) return parsed.data;
  return session.user as SessionUser;
}
