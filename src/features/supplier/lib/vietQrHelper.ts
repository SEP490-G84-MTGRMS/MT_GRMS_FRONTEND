/**
 * VietQR Helper Utility for Supplier Module
 * Chuẩn tạo mã QR VietQR Napas 24/7 chuyển khoản liên ngân hàng
 */

export interface BankInfo {
  code: string;       // Short code (VCB, MB, TCB...)
  bin: string;        // Napas BIN (970436, 970422...)
  name: string;       // Full name
  shortName: string;  // Display name
}

export const VIETNAM_BANKS: BankInfo[] = [
  { code: 'VCB', bin: '970436', name: 'Ngân hàng Ngoại thương Việt Nam', shortName: 'Vietcombank' },
  { code: 'MB', bin: '970422', name: 'Ngân hàng Quân đội', shortName: 'MB Bank' },
  { code: 'TCB', bin: '970407', name: 'Ngân hàng Kỹ thương Việt Nam', shortName: 'Techcombank' },
  { code: 'ICB', bin: '970415', name: 'Ngân hàng Công thương Việt Nam', shortName: 'VietinBank' },
  { code: 'BIDV', bin: '970418', name: 'Ngân hàng Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
  { code: 'ACB', bin: '970416', name: 'Ngân hàng Á Châu', shortName: 'ACB' },
  { code: 'VPB', bin: '970432', name: 'Ngân hàng Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { code: 'TPB', bin: '970423', name: 'Ngân hàng Tiên Phong', shortName: 'TPBank' },
  { code: 'STB', bin: '970403', name: 'Ngân hàng Sài Gòn Thương Tín', shortName: 'Sacombank' },
  { code: 'VBA', bin: '970405', name: 'Ngân hàng Nông nghiệp và PT Nông thôn', shortName: 'Agribank' },
  { code: 'HDB', bin: '970437', name: 'Ngân hàng Phát triển TP.HCM', shortName: 'HDBank' },
  { code: 'VIB', bin: '970441', name: 'Ngân hàng Quốc tế', shortName: 'VIB' },
  { code: 'SHB', bin: '970443', name: 'Ngân hàng Sài Gòn - Hà Nội', shortName: 'SHB' },
  { code: 'MSB', bin: '970426', name: 'Ngân hàng Hàng Hải', shortName: 'MSB' },
  { code: 'OCB', bin: '970448', name: 'Ngân hàng Phương Đông', shortName: 'OCB' },
  { code: 'SEAB', bin: '970440', name: 'Ngân hàng Đông Nam Á', shortName: 'SeABank' },
  { code: 'LPB', bin: '970449', name: 'Ngân hàng Bưu điện Liên Việt', shortName: 'LPBank' },
  { code: 'ABB', bin: '970425', name: 'Ngân hàng An Bình', shortName: 'ABBank' },
  { code: 'NAB', bin: '970428', name: 'Ngân hàng Nam Á', shortName: 'Nam A Bank' },
];

/**
 * Tìm mã ngân hàng (code hoặc bin) dựa trên tên ngân hàng người dùng nhập/chọn
 */
export function resolveBankCodeOrBin(bankNameInput?: string): string {
  if (!bankNameInput) return 'VCB'; // Default fallback Vietcombank
  const input = bankNameInput.trim().toLowerCase();

  const found = VIETNAM_BANKS.find(
    (b) =>
      b.code.toLowerCase() === input ||
      b.bin === input ||
      b.shortName.toLowerCase() === input ||
      b.name.toLowerCase() === input ||
      input.includes(b.shortName.toLowerCase()) ||
      input.includes(b.code.toLowerCase())
  );

  return found ? found.code : 'VCB';
}

export interface VietQrOptions {
  bankName?: string;
  accountNo: string;
  accountHolder?: string;
  amount?: number;
  description?: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

/**
 * Tạo URL mã QR VietQR chuẩn từ thông tin tài khoản ngân hàng
 */
export function getVietQrUrl({
  bankName,
  accountNo,
  accountHolder,
  amount,
  description,
  template = 'compact2',
}: VietQrOptions): string {
  const bankIdentifier = resolveBankCodeOrBin(bankName);
  const cleanAccountNo = accountNo.replace(/[^0-9a-zA-Z]/g, '');

  let url = `https://img.vietqr.io/image/${bankIdentifier}-${cleanAccountNo}-${template}.png`;

  const queryParams: string[] = [];
  if (accountHolder) {
    queryParams.push(`accountName=${encodeURIComponent(accountHolder.trim().toUpperCase())}`);
  }
  if (amount && amount > 0) {
    queryParams.push(`amount=${Math.round(amount)}`);
  }
  if (description) {
    queryParams.push(`addInfo=${encodeURIComponent(description.trim())}`);
  }

  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  return url;
}
