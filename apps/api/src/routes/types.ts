import type { AuthVariables } from '../middleware/auth';
import type { BranchVariables } from '../middleware/branch';
import type { TenantVariables } from '../middleware/tenant';

export type AppVariables = AuthVariables & TenantVariables & BranchVariables;
