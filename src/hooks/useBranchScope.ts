import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export const ACTIVE_BRANCH_STORAGE_KEY = 'mtgrms_active_branch';
export const BRANCH_CHANGED_EVENT = 'mtgrms:branch-changed';

export interface ActiveBranchInfo {
  id: string; // 'ALL' or branch UUID
  code: string;
  name: string;
}

const ALL_BRANCH: ActiveBranchInfo = {
  id: 'ALL',
  code: 'ALL',
  name: 'Toàn hệ thống',
};

export function readStoredActiveBranch(): ActiveBranchInfo {
  try {
    const raw = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
    if (!raw) return ALL_BRANCH;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && parsed.id.trim()) {
      return {
        id: parsed.id,
        code: typeof parsed.code === 'string' ? parsed.code : '',
        name: typeof parsed.name === 'string' ? parsed.name : '',
      };
    }
  } catch {
    // ignore malformed localStorage
  }
  return ALL_BRANCH;
}

export interface BranchScopeResult {
  isStoreOwner: boolean;
  isEmployee: boolean;
  /** True when user is branch-scoped Employee and cannot switch branches. */
  isBranchLocked: boolean;
  /** Employee's assigned branchId, or '' for Store Owner. */
  lockedBranchId: string;
  /** Current Topbar branch selection (only active for Store Owner). */
  topbarBranch: ActiveBranchInfo;
  /** '' when ALL (Store Owner), or branch UUID (Topbar selection for Owner / assigned branch for Employee). */
  scopedBranchId: string;
  /** 'ALL' when ALL (Store Owner), or branch UUID. */
  scopedBranchIdOrAll: string;
}

/**
 * Shared RBAC + Topbar branch synchronization hook:
 * - Store Owner / Admin: follows Topbar BranchSelectorDropdown ('ALL' = all branches, or specific branchId).
 * - Employee / Staff / Cashier: strictly locked to user.branchId.
 */
export function useBranchScope(
  defaultRole?: 'store_owner' | 'employee'
): BranchScopeResult {
  const user = useAuthStore((s) => s.user);
  const rawRole = (user?.role ?? '').trim().toUpperCase().replace(/[-_\s]/g, '');
  const isEmployeeAuth =
    rawRole === 'EMPLOYEE' || rawRole === 'STAFF' || rawRole === 'CASHIER';
  const isEmployee = isEmployeeAuth || defaultRole === 'employee';
  const isStoreOwner = !isEmployee;
  const userBranchId = user?.branchId || '';

  const [topbarBranch, setTopbarBranch] = useState<ActiveBranchInfo>(() =>
    readStoredActiveBranch()
  );

  useEffect(() => {
    if (!isStoreOwner) return;

    // Re-sync on mount in case storage updated before mount
    setTopbarBranch(readStoredActiveBranch());

    const handleBranchChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<Partial<ActiveBranchInfo>>).detail;
      if (detail && typeof detail.id === 'string' && detail.id.trim()) {
        setTopbarBranch({
          id: detail.id,
          code: detail.code || '',
          name: detail.name || '',
        });
      } else {
        setTopbarBranch(readStoredActiveBranch());
      }
    };

    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === ACTIVE_BRANCH_STORAGE_KEY) {
        setTopbarBranch(readStoredActiveBranch());
      }
    };

    window.addEventListener(BRANCH_CHANGED_EVENT, handleBranchChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(BRANCH_CHANGED_EVENT, handleBranchChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isStoreOwner]);

  const lockedBranchId = isEmployee ? userBranchId : '';
  const scopedBranchId = isEmployee
    ? userBranchId
    : topbarBranch.id === 'ALL'
      ? ''
      : topbarBranch.id;
  const scopedBranchIdOrAll = scopedBranchId || 'ALL';

  return {
    isStoreOwner,
    isEmployee,
    isBranchLocked: isEmployee,
    lockedBranchId,
    topbarBranch: isStoreOwner ? topbarBranch : ALL_BRANCH,
    scopedBranchId,
    scopedBranchIdOrAll,
  };
}

