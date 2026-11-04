import * as XLSX from 'xlsx';
import type { SupplierSummary } from '../types/supplier.types';
import dayjs from 'dayjs';

/**
 * Xuất danh sách Nhà cung cấp ra tệp Excel (.xlsx) chuẩn doanh nghiệp
 * Đảm bảo:
 * - Mã NCC, SĐT, MST, STK được bảo lưu hoàn toàn dưới dạng text (không bị chuyển sang scientific notation hay mất số 0).
 * - Trạng thái hiển thị rõ ràng (Hoạt động / Tạm ngưng).
 * - Tự động tính toán độ rộng các cột (Auto Column Widths).
 */
export const exportSuppliersToExcel = (
  suppliers: SupplierSummary[],
  options?: { storeName?: string; exportedBy?: string }
) => {
  const storeName = options?.storeName || 'HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS';
  const exportTime = dayjs().format('DD/MM/YYYY HH:mm:ss');
  const exportedBy = options?.exportedBy || 'Quản lý cửa hàng (Store Owner)';

  const categoryLabels: Record<string, string> = {
    FRESH: 'Nông sản tươi',
    AMBIENT: 'Đồ khô / Tạp hóa',
    FROZEN: 'Hàng đông lạnh',
    UTILITIES: 'Điện nước',
    RENT: 'Thuê mặt bằng',
    LOGISTICS: 'Vận chuyển',
  };

  // 1. Tạo mảng dòng AOA (Array of Arrays)
  const aoa: (string | number)[][] = [
    // Dòng 1: Tiêu đề thương hiệu hệ thống / cửa hàng
    [storeName.toUpperCase()],
    // Dòng 2: Tiêu đề báo cáo
    ['BÁO CÁO DANH SÁCH NHÀ CUNG CẤP'],
    // Dòng 3: Thông tin metadata xuất báo cáo
    [`Thời gian xuất: ${exportTime}   |   Người lập: ${exportedBy}   |   Tổng số: ${suppliers.length} đối tác`],
    // Dòng 4: Dòng trống phân cách
    [],
    // Dòng 5: Tiêu đề các cột dữ liệu
    [
      'STT',
      'Mã NCC',
      'Tên nhà cung cấp',
      'Phân loại',
      'Ngành hàng',
      'Mã số thuế',
      'Người liên hệ',
      'Số điện thoại',
      'Email',
      'Hạn nợ (ngày)',
      'Hạn mức nợ (VNĐ)',
      'Ngân hàng',
      'Số tài khoản',
      'Địa chỉ',
      'Trạng thái',
    ],
  ];

  // 2. Nạp dữ liệu các dòng NCC
  suppliers.forEach((s, idx) => {
    const typeLabel =
      s.supplierType === 'Goods' ? 'Hàng hóa' : s.supplierType === 'Service' ? 'Dịch vụ' : 'Cả hai';
    const categoryLabel = categoryLabels[s.category] || s.category || 'Nông sản tươi';
    const statusLabel = s.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng';

    aoa.push([
      idx + 1,
      s.code ? String(s.code) : '',
      s.name ? String(s.name) : '',
      typeLabel,
      categoryLabel,
      s.taxCode ? String(s.taxCode) : '',
      s.contactPerson ? String(s.contactPerson) : '',
      s.phone ? String(s.phone) : '',
      s.email ? String(s.email) : '',
      s.paymentTermDays ?? 0,
      s.creditLimit ? Number(s.creditLimit).toLocaleString('vi-VN') : '0',
      s.bankName ? String(s.bankName) : '',
      s.bankAccount ? String(s.bankAccount) : '',
      s.address ? String(s.address) : '',
      statusLabel,
    ]);
  });

  // 3. Dòng tổng kết cuối bảng
  aoa.push([]);
  aoa.push([
    '',
    'TỔNG CỘNG',
    `${suppliers.length} nhà cung cấp`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  // 4. Khởi tạo Sheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 5. Cưỡng chế các cột text (Mã NCC: c=1, MST: c=5, SĐT: c=7, STK: c=12) có kiểu cell 's' (string)
  const textColIndices = [1, 5, 7, 12];
  for (let r = 5; r <= 4 + suppliers.length; r++) {
    for (const c of textColIndices) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellAddress];
      if (cell) {
        cell.t = 's';
        cell.v = String(cell.v ?? '');
        cell.z = '@'; // Explicit text format
      }
    }
  }

  // 6. Tự động tính toán độ rộng các cột (Auto Column Widths)
  const minWidths = [
    6,  // STT
    16, // Mã NCC
    32, // Tên NCC
    14, // Phân loại
    18, // Ngành hàng
    16, // MST
    22, // Người liên hệ
    16, // SĐT
    26, // Email
    16, // Hạn nợ
    20, // Hạn mức
    20, // Ngân hàng
    18, // Số TK
    35, // Địa chỉ
    16, // Trạng thái
  ];

  const colWidths: { wch: number }[] = [];
  for (let c = 0; c < minWidths.length; c++) {
    let maxLen = minWidths[c];
    for (let r = 4; r < aoa.length; r++) {
      const val = aoa[r]?.[c];
      if (val !== undefined && val !== null) {
        const strLen = String(val).length;
        if (strLen > maxLen) {
          maxLen = strLen;
        }
      }
    }
    colWidths.push({ wch: Math.min(maxLen + 4, 60) });
  }
  ws['!cols'] = colWidths;

  // 7. Gộp ô cho Header báo cáo (15 cột -> c: 0 đến 14)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
  ];

  // 8. Gắn vào Workbook và kích hoạt tải về trình duyệt
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_NCC');

  const fileName = `Danh_Sach_Nha_Cung_Cap_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
