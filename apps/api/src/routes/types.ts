import type { AuthVariables } from '../middleware/auth';
import type { BranchVariables } from '../middleware/branch';
import type { TenantVariables } from '../middleware/tenant';
import type { LoggerVariables } from '../logger';

export type AppVariables = AuthVariables & TenantVariables & BranchVariables & LoggerVariables;
