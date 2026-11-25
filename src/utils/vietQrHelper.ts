export function normalizeVietQrContent(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D').replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 50);
}

export function buildVietQrUrl(input: {
  bankCode?: string;
  accountNumber?: string;
  accountHolderName?: string;
  amount: number;
  description: string;
}): string | null {
  const bankCode = input.bankCode?.trim();
  const accountNumber = input.accountNumber?.trim();
  const holder = input.accountHolderName?.trim();
  if (!bankCode || !/^[a-zA-Z0-9]+$/.test(bankCode) ||
      !accountNumber || !/^[a-zA-Z0-9]{1,19}$/.test(accountNumber) || !holder ||
      !Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 9_999_999_999_999) return null;

  const params = new URLSearchParams({
    amount: String(input.amount),
    addInfo: normalizeVietQrContent(input.description),
    accountName: holder,
  });
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.svg?${params}`;
}
