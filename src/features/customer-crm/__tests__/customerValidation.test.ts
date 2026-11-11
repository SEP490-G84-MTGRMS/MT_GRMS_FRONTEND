import { describe, it, expect } from 'vitest';
import {
  validateVietnamesePhone,
  validateDebtLimit,
  validateCollectionAmount,
  sanitizeCustomerText,
  normalizeDebtLimit,
  validateSafeCustomerText,
} from '../utils/customerValidation';

export {
  validateVietnamesePhone,
  validateDebtLimit,
  validateCollectionAmount,
  sanitizeCustomerText,
  normalizeDebtLimit,
  validateSafeCustomerText,
};

describe('Customer CRM Validation & Sanitization Unit Tests', () => {
  describe('validateVietnamesePhone', () => {
    it('should accept valid 10-digit Vietnamese phone numbers', () => {
      expect(validateVietnamesePhone('0912345678')).toBe(true);
      expect(validateVietnamesePhone('0387654321')).toBe(true);
      expect(validateVietnamesePhone('0765432109')).toBe(true);
    });

    it('should reject invalid phone lengths or prefixes', () => {
      expect(validateVietnamesePhone('12345')).toBe(false);
      expect(validateVietnamesePhone('0123456789')).toBe(false);
      expect(validateVietnamesePhone('09123456789')).toBe(false);
      expect(validateVietnamesePhone('abcdefghij')).toBe(false);
    });
  });

  describe('validateDebtLimit & normalizeDebtLimit', () => {
    it('should allow valid positive debt limits and zero', () => {
      expect(validateDebtLimit(0)).toBe(true);
      expect(validateDebtLimit(5000000)).toBe(true);
      expect(normalizeDebtLimit(5000000)).toBe(5000000);
    });

    it('should reject negative debt limits and clamp them to 0 in normalizeDebtLimit', () => {
      expect(validateDebtLimit(-1)).toBe(false);
      expect(validateDebtLimit(-5000000)).toBe(false);
      expect(normalizeDebtLimit(-5000000)).toBe(0);
    });
  });

  describe('sanitizeCustomerText & validateSafeCustomerText', () => {
    it('should strip XSS script tags and SQLi payloads from customer names', () => {
      expect(sanitizeCustomerText("Trần Ánh 🌟 <script>alert(1)</script> ' OR 1=1 --")).toBe(
        'Trần Ánh 🌟'
      );
      expect(sanitizeCustomerText('<script>alert(1)</script>', 'Khách hàng')).toBe('Khách hàng');
      expect(sanitizeCustomerText('<img src=x onerror=alert(1)>', 'Khách hàng')).toBe('Khách hàng');
    });

    it('should reject inputs containing HTML tags in validateSafeCustomerText', () => {
      expect(validateSafeCustomerText('Nguyễn Văn A')).toBe(true);
      expect(validateSafeCustomerText('<script>alert(1)</script>')).toBe(false);
      expect(validateSafeCustomerText('Trần Ánh <img src=x>')).toBe(false);
    });
  });

  describe('validateCollectionAmount', () => {
    it('should allow partial or full debt collection', () => {
      expect(validateCollectionAmount(500000, 1000000)).toBe(true);
      expect(validateCollectionAmount(1000000, 1000000)).toBe(true);
    });

    it('should reject over-collection exceeding current debt', () => {
      expect(validateCollectionAmount(1500000, 1000000)).toBe(false);
      expect(validateCollectionAmount(0, 1000000)).toBe(false);
    });
  });
});
