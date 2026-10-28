/**
 * Unified Formatting Utilities for MT-GRMS Finance Subsystem
 * Follows MT-GRMS_Finance_Redesign_Spec_for_AI.md rules:
 * - Single currency representation: `1.250.000đ` (no VND / VNĐ in output)
 * - Negative amounts use U+2212 minus sign `−`
 * - Date representation: `dd/mm/yyyy`
 */

/**
 * Formats a numeric amount to Vietnamese Dong with suffix 'đ'.
 * Example: 1250000 -> "1.250.000đ", -50000 -> "−50.000đ"
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0đ';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  // Format with dot thousand separator
  const formattedAbs = absAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (isNegative) {
    // U+2212 Minus sign
    return `−${formattedAbs}đ`;
  }
  return `${formattedAbs}đ`;
}

/**
 * Formats a numeric amount to compact Vietnamese representation.
 * Example: 14250000 -> "14,25 triệu", 1417500000 -> "1,42 tỷ"
 */
export function formatCompactMoney(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = '';
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(2).replace('.', ',');
    formatted = `${val.replace(/,00$/, '')} tỷ`;
  } else if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace('.', ',');
    formatted = `${val.replace(/,00$/, '')} triệu`;
  } else if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace('.', ',');
    formatted = `${val.replace(/,0$/, '')} nghìn`;
  } else {
    formatted = `${abs}đ`;
  }

  return isNegative ? `−${formatted}` : formatted;
}

/**
 * Formats a Date object or ISO string to `dd/mm/yyyy`.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converts a number to Vietnamese words.
 * Used under MoneyInput as a Poka-yoke error prevention mechanism.
 */
export function numberToWordsVietnamese(num: number): string {
  if (num === 0) return 'Không đồng';
  if (!num || isNaN(num)) return '';

  const isNegative = num < 0;
  let abs = Math.abs(Math.round(num));

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = [
    'không',
    'một',
    'hai',
    'ba',
    'bốn',
    'năm',
    'sáu',
    'bảy',
    'tám',
    'chín',
  ];

  function readGroupOfThree(n: number, isHighest: boolean): string {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let res = '';

    if (hundreds > 0 || !isHighest) {
      res += `${digits[hundreds]} trăm `;
    }

    if (tens > 1) {
      res += `${digits[tens]} mươi `;
      if (ones === 1) res += 'mốt ';
      else if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += `${digits[ones]} `;
    } else if (tens === 1) {
      res += 'mười ';
      if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += `${digits[ones]} `;
    } else if (tens === 0 && ones > 0) {
      if (hundreds > 0 || !isHighest) res += 'lẻ ';
      res += `${digits[ones]} `;
    }

    return res.trim();
  }

  let words = '';
  let groupIdx = 0;

  while (abs > 0) {
    const threeDigits = abs % 1000;
    if (threeDigits > 0) {
      const isHighest = Math.floor(abs / 1000) === 0;
      const groupText = readGroupOfThree(threeDigits, isHighest);
      words = `${groupText} ${units[groupIdx]} ${words}`.trim();
    }
    abs = Math.floor(abs / 1000);
    groupIdx++;
  }

  words = words.charAt(0).toUpperCase() + words.slice(1);
  return `${isNegative ? 'Âm ' : ''}${words.trim()} đồng`;
}
