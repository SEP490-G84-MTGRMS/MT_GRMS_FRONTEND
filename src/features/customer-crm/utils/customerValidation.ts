/**
 * Customer CRM Validation & XSS/SQLi Sanitization Utilities
 */

const SCRIPT_BLOCK_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]*>?/gm;
const SQLI_TEST_PATTERN_REGEX = /'?\s*(?:OR|AND)\s+\d+\s*=\s*\d+\s*(?:--)?/gi;

/**
 * Sanitizes customer display text (fullName, address, companyName) by stripping
 * raw HTML/script blocks, tags, and automated security audit SQLi test strings.
 * @param text - Raw string from API or user input.
 * @param fallback - Default string if sanitized result is empty.
 * @returns Clean, safe text string for UI rendering.
 */
export function sanitizeCustomerText(text?: string | null, fallback = ''): string {
  if (!text) return fallback;
  const cleaned = text
    .replace(SCRIPT_BLOCK_REGEX, '')
    .replace(HTML_TAG_REGEX, '')
    .replace(SQLI_TEST_PATTERN_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

/**
 * Ensures customer debt limit is always a non-negative finite number.
 * @param limit - Raw debtLimit value.
 * @returns Non-negative debt limit (>= 0).
 */
export function normalizeDebtLimit(limit?: number | null): number {
  const num = Number(limit);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

/**
 * Checks whether a customer text field contains forbidden HTML tags or angle brackets.
 * @param text - Input string to validate.
 * @returns True if safe (no HTML tags), false if contains HTML/script tags.
 */
export function validateSafeCustomerText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/<[^>]*>?/m.test(trimmed) || trimmed.includes('<') || trimmed.includes('>')) {
    return false;
  }
  return true;
}

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
 * @returns True if non-negative finite number, false otherwise.
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
