/** Check the decimal representation sent in the JSON request. */
export function fitsDecimal(value: number, scale: number): boolean {
  if (!Number.isFinite(value) || value < 0 || value >= 10 ** (18 - scale)) return false;
  const [digits, exponent = '0'] = String(value).split('e');
  return (digits.split('.')[1]?.length ?? 0) - Number(exponent) <= scale;
}

export function validHotline(value: string): boolean {
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[0-9 .()-]+$/.test(value) && digits >= 8 && digits <= 15;
}
