import { describe, expect, it } from 'vitest';
import { isTrialRegistrationIntent } from './RegisterPage';
import { mapBackendStoreToFrontend } from '../store/api/storeApi';

describe('homepage trial onboarding', () => {
  it('chỉ bật Trial khi intent chính xác là trial', () => {
    expect(isTrialRegistrationIntent('trial')).toBe(true);
    expect(isTrialRegistrationIntent(null)).toBe(false);
    expect(isTrialRegistrationIntent('standard')).toBe(false);
  });

  it('hiển thị tenant chưa có plan bằng nhãn trung tính', () => {
    const store = mapBackendStoreToFrontend({
      id: 'tenant-1', subdomain: 'store-1', name: 'Store', code: 'S1',
      status: 'ACTIVE', branchCount: 1, maxBranches: 1, staffCount: 1, maxStaff: 1,
    });
    expect(store.currentPlan).toBe('Chưa chọn gói');
  });
});
