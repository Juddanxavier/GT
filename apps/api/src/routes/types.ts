import type { AuthVariables } from '../middleware/auth';
import type { TenantVariables } from '../middleware/tenant';

export type AppVariables = AuthVariables & TenantVariables;
