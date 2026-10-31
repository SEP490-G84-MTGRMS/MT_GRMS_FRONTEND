import * as XLSX from 'xlsx';
import type { SupplierSummary } from '../types/supplier.types';
import dayjs from 'dayjs';

/**
 * Xuất danh sách Nhà cung cấp ra tệp Excel (.xlsx) chuẩn doanh nghiệp (REQ-EXPORT-01)
 * Bao gồm Header báo cáo trang trọng, metadata thời gian & người lập,
 * và tự động tính toán độ rộng các cột (Auto Column Widths).
 */
export const exportSuppliersToExcel = (
  suppliers: SupplierSummary[],
  options?: { storeName?: string; exportedBy?: string }
) => {
  const storeName = options?.storeName || 'HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS';
  const exportTime = dayjs().format('DD/MM/YYYY HH:mm:ss');
  const exportedBy = options?.exportedBy || 'Quản lý cửa hàng (Store Owner)';

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
    const statusLabel = s.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng';

    aoa.push([
      idx + 1,
      s.code || '',
      s.name || '',
      typeLabel,
      s.taxCode || '',
      s.contactPerson || '',
      s.phone || '',
      s.email || '',
      s.paymentTermDays ?? 0,
      s.creditLimit ? Number(s.creditLimit).toLocaleString('vi-VN') : '0',
      s.bankName || '',
      s.bankAccount || '',
      s.address || '',
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
  ]);

  // 4. Khởi tạo Sheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 5. Tự động tính toán độ rộng các cột (Auto Column Widths)
  const minWidths = [
    6,  // STT
    16, // Mã NCC
    32, // Tên NCC
    14, // Phân loại
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

  // 6. Gộp ô cho Header báo cáo
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },
  ];

  // 7. Gắn vào Workbook và kích hoạt tải về trình duyệt
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_NCC');

  const fileName = `Danh_Sach_Nha_Cung_Cap_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
