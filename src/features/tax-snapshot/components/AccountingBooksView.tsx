import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import {
  AccountingBookType,
  HouseholdTaxGroup,
  TaxPeriodType,
  type HouseholdTaxSummaryDto,
} from '../types/taxSnapshot';
import { mockBookEntries } from '../api/mockTaxData';
import { formatMoney } from '../../finance/utils/formatters';

interface Props {
  summary?: HouseholdTaxSummaryDto;
  year: number;
  periodType?: TaxPeriodType;
  periodNumber: number;
}

export const AccountingBooksView: FC<Props> = ({ summary, year, periodType, periodNumber }) => {
  // Determine primary revenue book according to server HouseholdGroup
  const revenueBookType =
    summary?.householdGroup === HouseholdTaxGroup.Group1_Under1B
      ? AccountingBookType.S1a_RevenueGroup1
      : AccountingBookType.S2a_RevenueGroup2;

  const [activeBookTab, setActiveBookTab] = useState<AccountingBookType>(revenueBookType);
  const [filterPeriodType, setFilterPeriodType] = useState<'quarter' | 'month'>(
    periodType === TaxPeriodType.Month ? 'month' : 'quarter'
  );
  const [filterNumber, setFilterNumber] = useState<number>(periodNumber);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  const revenueBookLabel =
    summary?.householdGroup === HouseholdTaxGroup.Group1_Under1B
      ? 'S1a - Doanh thu HKD Nhóm 1'
      : 'S2a - Doanh thu HKD Nhóm 2';

  const bookTabs = [
    { type: revenueBookType, label: revenueBookLabel, desc: 'Sổ chi tiết doanh thu bán hàng hóa, dịch vụ' },
    { type: AccountingBookType.S2c_RevenueAndExpense, label: 'S2c - Sổ Chi Phí', desc: 'Sổ chi phí sản xuất, kinh doanh' },
    { type: AccountingBookType.S2d_MaterialsAndGoods, label: 'S2d - Vật Tư & Hàng Hóa', desc: 'Sổ theo dõi vật tư, công cụ, hàng hóa tồn kho' },
    { type: AccountingBookType.S2e_CashAndBank, label: 'S2e - Tiền Mặt & Ngân Hàng', desc: 'Sổ quỹ tiền mặt và tiền gửi ngân hàng' },
    { type: AccountingBookType.S3a_TaxObligation, label: 'S3a - Nghĩa Vụ Thuế', desc: 'Sổ theo dõi nghĩa vụ nộp thuế với NSNN' },
  ];

  // Mock materials/goods inventory entries for S2d
  const mockMaterialEntries = useMemo(() => [
    { code: 'VT-01', name: 'Gạo ST25 Ông Cua (Túi 5kg)', unit: 'Túi', openingQty: 40, inQty: 100, outQty: 85, closingQty: 55, unitPrice: 190000 },
    { code: 'VT-02', name: 'Dầu ăn Simply 1L', unit: 'Chai', openingQty: 60, inQty: 120, outQty: 130, closingQty: 50, unitPrice: 58000 },
    { code: 'VT-03', name: 'Nước mắm Nam Ngư Đệ Nhị 900ml', unit: 'Chai', openingQty: 35, inQty: 80, outQty: 75, closingQty: 40, unitPrice: 32000 },
    { code: 'VT-04', name: 'Đường cát trắng Biên Hòa 1kg', unit: 'Gói', openingQty: 50, inQty: 150, outQty: 140, closingQty: 60, unitPrice: 26000 },
    { code: 'VT-05', name: 'Bia Heineken Sleek (Thùng 24 lon)', unit: 'Thùng', openingQty: 25, inQty: 60, outQty: 55, closingQty: 30, unitPrice: 425000 },
  ], []);

  // Filter vouchers by selected book and period
  const currentVouchers = useMemo(() => {
    let list = mockBookEntries.filter((v) => v.bookType === activeBookTab);

    // If month 10 is selected, adapt entries to month 10 single source of truth
    if (filterPeriodType === 'month' && filterNumber === 10) {
      if (activeBookTab === AccountingBookType.S2a_RevenueGroup2) {
        list = [
          {
            voucherNumber: 'HD-202610-01',
            voucherDate: '2026-10-27T17:00:00Z',
            description: 'Doanh thu thuần bán lẻ tháng 10/2026 (1.968 đơn hàng - Khớp 100% P&L)',
            amount: 560_860_000,
            category: 'Bán lẻ hàng tiêu dùng',
            bookType: AccountingBookType.S2a_RevenueGroup2,
            bookCode: 'S2a-HKD',
            beneficiaryName: 'Khách hàng cửa hàng',
            invoiceNumber: 'BK-THANG-10',
          },
        ];
      } else if (activeBookTab === AccountingBookType.S2c_RevenueAndExpense) {
        list = [
          {
            voucherNumber: 'PC-202610-01',
            voucherDate: '2026-10-05T09:00:00Z',
            description: 'Chi lương tháng 10 cho nhân viên bán hàng quầy thu ngân',
            amount: 42_000_000,
            category: 'Chi phí nhân công',
            bookType: AccountingBookType.S2c_RevenueAndExpense,
            bookCode: 'S2c-HKD',
            beneficiaryName: 'Nhân viên cửa hàng',
            invoiceNumber: 'BL-LUONG-10',
          },
          {
            voucherNumber: 'PC-202610-02',
            voucherDate: '2026-10-08T10:00:00Z',
            description: 'Tiền thuê mặt bằng kinh doanh tiệm tạp hóa tháng 10/2026',
            amount: 18_000_000,
            category: 'Chi phí thuê mặt bằng',
            bookType: AccountingBookType.S2c_RevenueAndExpense,
            bookCode: 'S2c-HKD',
            beneficiaryName: 'Chủ nhà mặt bằng',
            invoiceNumber: 'HD-MB-10',
          },
          {
            voucherNumber: 'PC-202610-03',
            voucherDate: '2026-10-15T16:00:00Z',
            description: 'Chi phí điện nước và cước internet FPT phục vụ máy POS',
            amount: 13_195_300,
            category: 'Điện nước & Viễn thông',
            bookType: AccountingBookType.S2c_RevenueAndExpense,
            bookCode: 'S2c-HKD',
            beneficiaryName: 'EVN & FPT Telecom',
            invoiceNumber: 'HD-FPT-88912',
          },
          {
            voucherNumber: 'PC-202610-04',
            voucherDate: '2026-10-20T14:30:00Z',
            description: 'Trích khấu hao tài sản cố định (Tủ đông, kệ hàng, camera)',
            amount: 5_804_700,
            category: 'Khấu hao TSCĐ',
            bookType: AccountingBookType.S2c_RevenueAndExpense,
            bookCode: 'S2c-HKD',
            beneficiaryName: 'Nội bộ cửa hàng',
            invoiceNumber: 'KH-TSCD-10',
          },
        ];
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((v) => v.description.toLowerCase().includes(q) || v.voucherNumber.toLowerCase().includes(q));
    }
    return list;
  }, [activeBookTab, filterPeriodType, filterNumber, searchTerm]);

  const totalAmount = useMemo(() => {
    return currentVouchers.reduce((sum, v) => sum + v.amount, 0);
  }, [currentVouchers]);

  const totalPages = Math.max(1, Math.ceil(currentVouchers.length / pageSize));
  const paginatedVouchers = currentVouchers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportNotice = (type: 'excel' | 'print') => {
    alert(
      type === 'excel'
        ? 'Chức năng xuất theo mẫu Bộ Tài chính sẽ do Backend sinh khi kết nối máy chủ.'
        : 'Chức năng in sổ kế toán điện tử sẽ do Backend sinh theo định dạng PDF chuẩn.'
    );
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* Stage C Demo Banner */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: '0.84rem', color: '#92400E' }}>
          Khung xem chỉ đọc: Sổ kế toán hộ kinh doanh. Chức năng xuất file theo mẫu quy định của cơ quan thuế sẽ do máy chủ sinh khi kết nối.
        </span>
      </div>

      {/* 5 Book Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 18,
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: 12,
        }}
      >
        {bookTabs.map((tab) => {
          const isActive = activeBookTab === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => {
                setActiveBookTab(tab.type);
                setCurrentPage(1);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: isActive ? '1px solid #0F766E' : '1px solid #E2E8F0',
                background: isActive ? '#F0FDFA' : '#ffffff',
                color: isActive ? '#0F766E' : '#475569',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <BookOpen size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* S2e REDIRECT TO CASHBOOK (Tiền của tôi) */}
      {activeBookTab === AccountingBookType.S2e_CashAndBank ? (
        <div
          style={{
            padding: '32px 24px',
            borderRadius: 14,
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            textAlign: 'center',
            maxWidth: 680,
            margin: '20px auto',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#F0FDFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#0F766E',
            }}
          >
            <Wallet size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Sổ Quỹ Tiền Mặt & Tiền Gửi Ngân Hàng (S2e-HKD)
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
            Phân hệ <strong>Tiền của tôi</strong> đã quản lý và đối soát tập trung toàn bộ các quỹ tiền mặt tại quầy, két sắt và tài khoản ngân hàng. Sổ quỹ được ghi nhận tự động từ các giao dịch bán hàng và chi phí.
          </p>

          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: 4,
              padding: '12px 24px',
              borderRadius: 10,
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Tổng số dư quỹ đã đối soát (Sổ quỹ):</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F766E' }}>
              {formatMoney(359_300_000)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
              (Gồm 5 quỹ: 348.950.000đ + Tiền đang chuyển: 10.350.000đ)
            </span>
          </div>

          <div>
            <a
              href="/store-owner/cashbook"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 8,
                background: '#0F766E',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.86rem',
                textDecoration: 'none',
              }}
            >
              <span>Mở Sổ quỹ Tiền của tôi</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Control Bar: Filter, Search & Export */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {/* Period Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                <Calendar size={14} style={{ color: '#0F766E' }} />
                <select
                  value={filterPeriodType}
                  onChange={(e) => setFilterPeriodType(e.target.value as any)}
                  style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}
                >
                  <option value="quarter">Theo Quý</option>
                  <option value="month">Theo Tháng</option>
                </select>

                <select
                  value={filterNumber}
                  onChange={(e) => setFilterNumber(Number(e.target.value))}
                  style={{ border: 'none', background: '#F1F5F9', padding: '2px 6px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', color: '#0F766E', outline: 'none' }}
                >
                  {filterPeriodType === 'quarter' ? (
                    <>
                      <option value={1}>Quý 1</option>
                      <option value={2}>Quý 2</option>
                      <option value={3}>Quý 3</option>
                      <option value={4}>Quý 4</option>
                    </>
                  ) : (
                    Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))
                  )}
                </select>

                <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Năm {year}</span>
              </div>

              {/* Search box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                <Search size={14} style={{ color: '#94A3B8' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm số chứng từ, nội dung..."
                  style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none', width: 180 }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleExportNotice('excel')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FileSpreadsheet size={15} style={{ color: '#059669' }} />
                <span>Xuất Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportNotice('print')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} style={{ color: '#0284C7' }} />
                <span>In sổ mẫu</span>
              </button>
            </div>
          </div>

          {/* S2d Material Table vs Standard Voucher Table */}
          {activeBookTab === AccountingBookType.S2d_MaterialsAndGoods ? (
            /* SPECIAL S2d TABLE: Vật tư, Hàng hóa có số lượng, đơn vị, tồn đầu/cuối */
            <div className="tax-table-card">
              {/* Technical disclaimer badge for S2d Inventory DTO */}
              <div
                style={{
                  padding: '8px 14px',
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  fontSize: '0.78rem',
                  color: '#64748B',
                }}
              >
                <span>Bảng mô phỏng sổ kho S2d theo dõi số lượng tồn đầu/cuối và đơn giá bình quân. Cần Backend cung cấp DTO riêng cho sổ vật tư hàng hóa.</span>
              </div>

              <div className="tax-table-wrapper">
                <table className="tax-data-table">
                  <thead>
                    <tr>
                      <th>MÃ HÀNG</th>
                      <th>TÊN VẬT TƯ / HÀNG HÓA</th>
                      <th>ĐVT</th>
                      <th style={{ textAlign: 'right' }}>TỒN ĐẦU KỲ</th>
                      <th style={{ textAlign: 'right' }}>NHẬP TRONG KỲ</th>
                      <th style={{ textAlign: 'right' }}>XUẤT TRONG KỲ</th>
                      <th style={{ textAlign: 'right' }}>TỒN CUỐI KỲ</th>
                      <th style={{ textAlign: 'right' }}>ĐƠN GIÁ BÌNH QUÂN</th>
                      <th style={{ textAlign: 'right' }}>THÀNH TIỀN TỒN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockMaterialEntries.map((row) => (
                      <tr key={row.code}>
                        <td style={{ fontWeight: 700, color: '#0F766E' }}>{row.code}</td>
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.name}</td>
                        <td style={{ color: '#64748B' }}>{row.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.openingQty}</td>
                        <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>+{row.inQty}</td>
                        <td style={{ textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>−{row.outQty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>{row.closingQty}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(row.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                          {formatMoney(row.closingQty * row.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '14px 16px', color: '#0F172A' }}>
                        TỔNG CỘNG GIÁ TRỊ TỒN KHO CUỐI KỲ ({mockMaterialEntries.length} mặt hàng):
                      </td>
                      <td colSpan={5} />
                      <td style={{ textAlign: 'right', padding: '14px 16px', color: '#0F766E', fontSize: '1rem', fontWeight: 900 }}>
                        {formatMoney(
                          mockMaterialEntries.reduce((sum, r) => sum + r.closingQty * r.unitPrice, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* STANDARD ACCOUNTING VOUCHERS TABLE */
            <div className="tax-table-card">
              <div className="tax-table-wrapper">
                <table className="tax-data-table">
                  <thead>
                    <tr>
                      <th>SỐ CHỨNG TỪ</th>
                      <th>NGÀY GHI SỔ</th>
                      <th>DIỄN GIẢI CHI TIẾT</th>
                      <th>ĐỐI TÁC / NGƯỜI NHẬN</th>
                      <th>SỐ HÓA ĐƠN GTGT</th>
                      <th>PHÂN LOẠI</th>
                      <th style={{ textAlign: 'right' }}>SỐ TIỀN (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVouchers.length > 0 ? (
                      paginatedVouchers.map((entry) => (
                        <tr key={entry.voucherNumber}>
                          <td style={{ fontWeight: 700, color: '#0F766E' }}>{entry.voucherNumber}</td>
                          <td style={{ color: '#64748B', fontSize: '0.78rem' }}>
                            {new Date(entry.voucherDate).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</td>
                          <td style={{ color: '#475569' }}>{entry.beneficiaryName || '—'}</td>
                          <td>
                            <span style={{ fontSize: '0.76rem', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#475569' }}>
                              {entry.invoiceNumber || 'Không có'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: 6, background: '#F0FDFA', color: '#0F766E', fontWeight: 600 }}>
                              {entry.category}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                            {formatMoney(entry.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: '#94A3B8' }}>
                          Chưa có phát sinh chứng từ nào trong kỳ được chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={6} style={{ padding: '14px 16px', color: '#0F172A' }}>
                        TỔNG CỘNG PHÁT SINH TRONG KỲ ({currentVouchers.length} chứng từ):
                      </td>
                      <td style={{ textAlign: 'right', padding: '14px 16px', color: '#0F766E', fontSize: '1.05rem', fontWeight: 900 }}>
                        {formatMoney(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Simple Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Hiển thị trang {currentPage} / {totalPages}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
