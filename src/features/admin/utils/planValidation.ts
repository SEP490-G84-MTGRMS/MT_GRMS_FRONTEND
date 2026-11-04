/**
 * Subscription Plan Validation Utilities
 */

export function validatePlanCode(code: string, existingCodes: string[] = []): { isValid: boolean; error?: string } {
  const formatted = code.trim().toUpperCase();
  if (!formatted) {
    return { isValid: false, error: 'Mã gói không được để trống' };
  }
  if (!/^[A-Z0-9_]+$/.test(formatted)) {
    return { isValid: false, error: 'Mã gói chỉ gồm chữ cái in hoa, số và dấu gạch dưới (_)' };
  }
  if (existingCodes.includes(formatted)) {
    return { isValid: false, error: 'Mã gói đã tồn tại trên hệ thống' };
  }
  return { isValid: true };
}

export function validatePlanPricing(monthlyPrice: number, yearlyPrice: number): { isValid: boolean; error?: string } {
  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
    return { isValid: false, error: 'Giá tháng phải lớn hơn hoặc bằng 0' };
  }
  if (!Number.isFinite(yearlyPrice) || yearlyPrice < 0) {
    return { isValid: false, error: 'Giá năm phải lớn hơn hoặc bằng 0' };
  }
  return { isValid: true };
}

export function validatePlanQuotas(quotas: {
  maxBranches: number;
  maxEmployees: number;
  maxStorageGb: number;
}): { isValid: boolean; error?: string } {
  // -1 means unlimited
  if (quotas.maxBranches !== -1 && quotas.maxBranches < 1) {
    return { isValid: false, error: 'Số chi nhánh tối thiểu là 1 hoặc -1 (vô hạn)' };
  }
  if (quotas.maxEmployees !== -1 && quotas.maxEmployees < 1) {
    return { isValid: false, error: 'Số nhân viên tối thiểu là 1 hoặc -1 (vô hạn)' };
  }
  if (quotas.maxStorageGb < 1) {
    return { isValid: false, error: 'Dung lượng lưu trữ tối thiểu là 1 GB' };
  }
  return { isValid: true };
}

export function canDeletePlan(activeTenantCount: number): { canDelete: boolean; reason?: string } {
  if (activeTenantCount > 0) {
    return {
      canDelete: false,
      reason: `Không thể xóa gói dịch vụ đang có ${activeTenantCount} cửa hàng sử dụng`,
    };
  }
  return { canDelete: true };
}
