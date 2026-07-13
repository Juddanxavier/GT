import { auth } from './auth';

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: string;
  tenantId?: string;
  branchId?: string;
  data?: Record<string, unknown>;
  phone?: string;
}

interface UpdateUserInput {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  branchId?: string;
}

interface BanUserInput {
  userId: string;
  banReason?: string;
  banExpiresIn?: number;
}

export async function createUser(input: CreateUserInput, extra?: Record<string, unknown>) {
  return (auth.api as any).createUser({ body: input, ...extra }) as Promise<{ user: { id: string; email: string; name: string; role: string; tenantId?: string; branchId?: string; createdAt: Date; updatedAt: Date } }>;
}

export async function updateUser(input: UpdateUserInput) {
  return (auth.api as any).updateUser({ body: { userId: input.userId, ...input } }) as Promise<{ user: { id: string } }>;
}

export async function banUser(input: BanUserInput, extra?: Record<string, unknown>) {
  return (auth.api as any).banUser({ body: input, ...extra }) as Promise<{ user: { id: string; banned: boolean } }>;
}

export async function unbanUser(input: { userId: string }, extra?: Record<string, unknown>) {
  return (auth.api as any).unbanUser({ body: input, ...extra }) as Promise<{ user: { id: string; banned: boolean } }>;
}

export async function requestPasswordReset(input: { email: string; redirectTo?: string }) {
  return (auth.api as any).requestPasswordReset({ body: input });
}
