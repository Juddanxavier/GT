'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { getUser } from '@/types/auth';
import { setTenantFilter, setBranchFilter } from './api';
import { authClient } from './auth-client';

type FilterContextValue = {
  tenantFilter: string;
  branchFilter: string;
  filterVersion: number;
  setTenant: (id: string) => void;
  setBranch: (id: string) => void;
};

const STORAGE_TENANT = 'tenantFilter';
const STORAGE_BRANCH = 'branchFilter';

function load(key: string): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}

function save(key: string, id: string) {
  try { localStorage.setItem(key, id); } catch { /* noop */ }
}

const FilterContext = createContext<FilterContextValue>({
  tenantFilter: '',
  branchFilter: '',
  filterVersion: 0,
  setTenant: () => {},
  setBranch: () => {},
});

export function TenantFilterProvider({ children }: { children: ReactNode }) {
  const [tenantFilter, setTenantFilterState] = useState(() => {
    const saved = load(STORAGE_TENANT);
    if (saved) setTenantFilter(saved);
    return saved;
  });
  const [branchFilter, setBranchFilterState] = useState(() => {
    const saved = load(STORAGE_BRANCH);
    if (saved) setBranchFilter(saved);
    return saved;
  });
  const [filterVersion, setFilterVersion] = useState(0);
  const { data: session } = authClient.useSession();
  const prevUserId = useRef<string | undefined>(undefined);

  // Reset filters when the authenticated user changes (logout / different user logs in)
  useEffect(() => {
    const currentId = getUser(session)?.id;
    if (prevUserId.current && prevUserId.current !== currentId) {
      localStorage.removeItem(STORAGE_TENANT);
      localStorage.removeItem(STORAGE_BRANCH);
      setTenantFilterState('');
      setBranchFilterState('');
      setTenantFilter(null);
      setBranchFilter(null);
      setFilterVersion((v) => v + 1);
    }
    prevUserId.current = currentId;
  }, [session]);

  // Auto-set tenant from user account for non-superadmins
  const user = session?.user as { id: string; role?: string; tenantId?: string } | undefined;
  const isSuperadmin = user?.role === 'superadmin';
  const isTenantAdmin = user?.role === 'tenant-admin';
  const canFilterBranches = isSuperadmin || isTenantAdmin;

  useEffect(() => {
    if (isSuperadmin) {
      const saved = load(STORAGE_TENANT);
      setTenantFilter(saved || null);
    } else if (user?.tenantId) {
      setTenantFilter(user.tenantId);
      setTenantFilterState(user.tenantId);
    }
  }, [isSuperadmin, user?.tenantId]);

  // Branch filtering is only available to tenant-admin / superadmin. Staff are
  // scoped to their own branch server-side, so never send X-Branch-ID for them.
  useEffect(() => {
    if (!canFilterBranches) {
      localStorage.removeItem(STORAGE_BRANCH);
      setBranchFilterState('');
      setBranchFilter(null);
      return;
    }
    const saved = load(STORAGE_BRANCH);
    setBranchFilter(saved || null);
  }, [canFilterBranches]);

  const setTenant = useCallback((id: string) => {
    save(STORAGE_TENANT, id);
    setTenantFilterState(id);
    setTenantFilter(id || null);
    // Reset branch when tenant changes (branches are tenant-specific)
    save(STORAGE_BRANCH, '');
    setBranchFilterState('');
    setBranchFilter(null);
    setFilterVersion((v) => v + 1);
  }, []);

  const setBranch = useCallback((id: string) => {
    save(STORAGE_BRANCH, id);
    setBranchFilterState(id);
    setBranchFilter(id || null);
    setFilterVersion((v) => v + 1);
  }, []);

  return (
    <FilterContext.Provider value={{ tenantFilter, branchFilter, filterVersion, setTenant, setBranch }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useTenantFilter() {
  return useContext(FilterContext);
}
