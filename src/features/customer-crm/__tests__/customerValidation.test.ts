import { describe, it, expect } from 'vitest';

/**
 * Validates Vietnamese mobile phone numbers (10 digits starting with 03, 05, 07, 08, 09).
 * @param phone - Raw phone number string.
 * @returns True if valid Vietnamese phone format, false otherwise.
 */
export function validateVietnamesePhone(phone: string): boolean {
  const cleanPhone = phone.trim();
  const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validates customer debt limit input.
 * @param limit - Debt limit number.
 * @returns True if non-negative, false otherwise.
 */
export function validateDebtLimit(limit: number): boolean {
  return Number.isFinite(limit) && limit >= 0;
}

/**
 * Validates maximum collection amount against outstanding accounts receivable balance.
 * @param amount - Collection amount attempted.
 * @param currentDebt - Current outstanding debt.
 * @returns True if amount is within debt range, false if exceeds.
 */
export function validateCollectionAmount(amount: number, currentDebt: number): boolean {
  return amount > 0 && amount <= currentDebt;
}

describe('Customer CRM Validation Unit Tests', () => {
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

  describe('validateDebtLimit', () => {
    it('should allow valid positive debt limits and zero', () => {
      expect(validateDebtLimit(0)).toBe(true);
      expect(validateDebtLimit(5000000)).toBe(true);
    });

    it('should reject negative debt limits', () => {
      expect(validateDebtLimit(-1)).toBe(false);
      expect(validateDebtLimit(-5000000)).toBe(false);
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
