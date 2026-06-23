import type { AuthVariables } from '../middleware/auth';
import type { TenantVariables } from '../middleware/tenant';
import type { BranchVariables } from '../middleware/branch';

export type AppVariables = AuthVariables & TenantVariables & BranchVariables;
