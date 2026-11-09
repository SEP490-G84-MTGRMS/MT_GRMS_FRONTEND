/**
 * Bộ sinh UUIDv7 chuẩn RFC 9562:
 * - 48-bit Unix timestamp mili-giây ở đầu giúp sắp xếp tuần tự theo thời gian (Time-ordered).
 * - 74-bit entropy ngẫu nhiên bảo đảm tính độc nhất và bảo mật.
 * - Triệt tiêu phân mảnh chỉ mục (B-Tree/B+Tree) trong cơ sở dữ liệu.
 */
export function generateUuidV7(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const timestamp = BigInt(Date.now());

  // Ghi 48-bit timestamp vào 6 bytes đầu (Big-Endian)
  bytes[0] = Number((timestamp >> 40n) & 0xffn);
  bytes[1] = Number((timestamp >> 32n) & 0xffn);
  bytes[2] = Number((timestamp >> 24n) & 0xffn);
  bytes[3] = Number((timestamp >> 16n) & 0xffn);
  bytes[4] = Number((timestamp >> 8n) & 0xffn);
  bytes[5] = Number(timestamp & 0xffn);

  // Version 7 (0b0111) vào 4 bits cao của byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Variant RFC 4122 / RFC 9562 (0b10) vào 2 bits cao của byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * Alias tương thích ngược
 */
export const generateUUID = generateUuidV7;

