import { describe, it, expect } from 'vitest';
import {
  validatePlanCode,
  validatePlanPricing,
  validatePlanQuotas,
  canDeletePlan,
} from '../utils/planValidation';

describe('Subscription Plan Validation Unit Tests', () => {
  describe('validatePlanCode', () => {
    const existing = ['PLAN_STARTER', 'PLAN_BASIC', 'PLAN_ADVANCED'];

    it('should validate valid new plan codes', () => {
      expect(validatePlanCode('PLAN_ENTERPRISE', existing)).toEqual({ isValid: true });
      expect(validatePlanCode('CUSTOM_2026', existing)).toEqual({ isValid: true });
    });

    it('should reject empty or whitespace codes', () => {
      const res = validatePlanCode('   ', existing);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Mã gói không được để trống');
    });

    it('should reject duplicate plan codes', () => {
      const res = validatePlanCode('PLAN_BASIC', existing);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Mã gói đã tồn tại trên hệ thống');
    });

    it('should reject invalid characters like lowercase or special symbols', () => {
      const res = validatePlanCode('plan-invalid!', existing);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Mã gói chỉ gồm chữ cái in hoa, số và dấu gạch dưới (_)');
    });
  });

  describe('validatePlanPricing', () => {
    it('should allow valid prices', () => {
      expect(validatePlanPricing(500000, 5000000)).toEqual({ isValid: true });
      expect(validatePlanPricing(0, 0)).toEqual({ isValid: true }); // Free tier allowed
    });

    it('should reject negative monthly price', () => {
      const res = validatePlanPricing(-1000, 5000000);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Giá tháng phải lớn hơn hoặc bằng 0');
    });

    it('should reject negative yearly price', () => {
      const res = validatePlanPricing(500000, -20000);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Giá năm phải lớn hơn hoặc bằng 0');
    });
  });

  describe('validatePlanQuotas', () => {
    it('should allow valid quotas including unlimited (-1)', () => {
      expect(
        validatePlanQuotas({ maxBranches: -1, maxEmployees: -1, maxStorageGb: 100 })
      ).toEqual({ isValid: true });

      expect(
        validatePlanQuotas({ maxBranches: 3, maxEmployees: 10, maxStorageGb: 20 })
      ).toEqual({ isValid: true });
    });

    it('should reject zero or negative branch numbers (except -1)', () => {
      const res = validatePlanQuotas({ maxBranches: 0, maxEmployees: 5, maxStorageGb: 10 });
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Số chi nhánh tối thiểu là 1 hoặc -1 (vô hạn)');
    });

    it('should reject invalid storage quota (< 1 GB)', () => {
      const res = validatePlanQuotas({ maxBranches: 1, maxEmployees: 1, maxStorageGb: 0 });
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Dung lượng lưu trữ tối thiểu là 1 GB');
    });
  });

  describe('canDeletePlan safety rule', () => {
    it('should forbid deleting a plan with active tenants', () => {
      const res = canDeletePlan(24);
      expect(res.canDelete).toBe(false);
      expect(res.reason).toContain('24 cửa hàng sử dụng');
    });

    it('should allow deleting a plan with 0 active tenants', () => {
      const res = canDeletePlan(0);
      expect(res.canDelete).toBe(true);
    });
  });
});
