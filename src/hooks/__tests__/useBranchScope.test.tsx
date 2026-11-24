import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useBranchScope,
  ACTIVE_BRANCH_STORAGE_KEY,
  BRANCH_CHANGED_EVENT,
} from '../useBranchScope';
import { useAuthStore } from '../../stores/useAuthStore';

describe('useBranchScope', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null });
  });

  it('Store Owner follows Topbar branch selection (ALL and specific branch) reactively', () => {
    localStorage.setItem(
      ACTIVE_BRANCH_STORAGE_KEY,
      JSON.stringify({ id: 'br-001', code: 'CH-Q1', name: 'Chi nhánh Q1' })
    );
    useAuthStore.setState({
      user: {
        id: 'owner-1',
        role: 'STORE_OWNER',
        branchId: undefined,
      } as any,
    });

    const { result } = renderHook(() => useBranchScope());

    expect(result.current.isStoreOwner).toBe(true);
    expect(result.current.isBranchLocked).toBe(false);
    expect(result.current.scopedBranchId).toBe('br-001');
    expect(result.current.scopedBranchIdOrAll).toBe('br-001');

    act(() => {
      window.dispatchEvent(
        new CustomEvent(BRANCH_CHANGED_EVENT, {
          detail: { id: 'ALL', code: 'ALL', name: 'Toàn hệ thống' },
        })
      );
    });

    expect(result.current.scopedBranchId).toBe('');
    expect(result.current.scopedBranchIdOrAll).toBe('ALL');

    act(() => {
      window.dispatchEvent(
        new CustomEvent(BRANCH_CHANGED_EVENT, {
          detail: { id: 'br-002', code: 'CH-Q7', name: 'Chi nhánh Q7' },
        })
      );
    });

    expect(result.current.scopedBranchId).toBe('br-002');
    expect(result.current.scopedBranchIdOrAll).toBe('br-002');
  });

  it('Employee is strictly locked to user.branchId and ignores Topbar branch events', () => {
    localStorage.setItem(
      ACTIVE_BRANCH_STORAGE_KEY,
      JSON.stringify({ id: 'br-other', code: 'CH-OTHER', name: 'Chi nhánh khác' })
    );
    useAuthStore.setState({
      user: {
        id: 'emp-1',
        role: 'EMPLOYEE',
        branchId: 'br-own',
      } as any,
    });

    const { result } = renderHook(() => useBranchScope('store_owner'));

    expect(result.current.isEmployee).toBe(true);
    expect(result.current.isStoreOwner).toBe(false);
    expect(result.current.isBranchLocked).toBe(true);
    expect(result.current.lockedBranchId).toBe('br-own');
    expect(result.current.scopedBranchId).toBe('br-own');
    expect(result.current.scopedBranchIdOrAll).toBe('br-own');

    act(() => {
      window.dispatchEvent(
        new CustomEvent(BRANCH_CHANGED_EVENT, {
          detail: { id: 'br-002', code: 'CH-Q7', name: 'Chi nhánh Q7' },
        })
      );
    });

    expect(result.current.scopedBranchId).toBe('br-own');
  });
});

