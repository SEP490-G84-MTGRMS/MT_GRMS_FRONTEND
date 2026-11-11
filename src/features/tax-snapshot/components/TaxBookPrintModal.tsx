import type { FC } from 'react';
import { Printer, X } from 'lucide-react';
import {
  AccountingBookType,
  type HouseholdTaxSummaryDto,
  type AccountingBookEntryDto,
} from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';

export interface BookTabMetadata {
  type: AccountingBookType;
  code: string;
  name: string;
  templateCode: string;
  label: string;
  desc: string;
  badge?: string;
}

interface FundMetrics {
  openingCash: number;
  openingBank: number;
  openingBalance: number;
  closingBalance: number;
  cashIn: number;
  cashOut: number;
  cashClosing: number;
  bankIn: number;
  bankOut: number;
  bankClosing: number;
  totalIn: number;
  totalOut: number;
}

interface TaxBookPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBookTab: AccountingBookType;
  onSelectBookTab: (type: AccountingBookType) => void;
  bookTabs: BookTabMetadata[];
  activeTabMetadata: BookTabMetadata;
  entries: AccountingBookEntryDto[];
  fundMetrics: FundMetrics;
  totalAmount: number;
  summary?: HouseholdTaxSummaryDto;
  periodDisplayName: string;
  year: number;
  onPrint: () => void;
}

export const TaxBookPrintModal: FC<TaxBookPrintModalProps> = ({
  isOpen,
  onClose,
  activeBookTab,
  onSelectBookTab,
  bookTabs,
  activeTabMetadata,
  entries,
  fundMetrics,
  totalAmount,
  summary,
  periodDisplayName,
  year,
  onPrint,
}) => {
  if (!isOpen) return null;

  const cashEntries = entries.filter(
    (e) =>
      !e.isSummaryRow &&
      (e.sectionGroup?.includes('Khối I') ||
        e.sectionGroup?.includes('I.') ||
        (!e.category?.toLowerCase().includes('ngân hàng') &&
          !e.category?.toLowerCase().includes('bank') &&
          !e.beneficiaryName?.toLowerCase().includes('bank') &&
          !e.sectionGroup?.includes('Khối II')))
  );

  const bankEntries = entries.filter(
    (e) =>
      !e.isSummaryRow &&
      (e.sectionGroup?.includes('Khối II') ||
        e.sectionGroup?.includes('II.') ||
        e.category?.toLowerCase().includes('ngân hàng') ||
        e.category?.toLowerCase().includes('bank') ||
        e.beneficiaryName?.toLowerCase().includes('bank') ||
        e.beneficiaryName?.toLowerCase().includes('vietcombank'))
  );

  return (
    <div className="tax-modal-backdrop no-print-backdrop">
      <div
        className="tax-modal-card"
        style={{
          maxWidth: 960,
          width: '95vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#F8FAFC',
        }}
      >
        {/* Modal Header (Hidden on print) */}
        <div className="tax-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#F0FDFA',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Bản xem trước in A4 — {activeTabMetadata.code} ({activeTabMetadata.templateCode})
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Định dạng A4 tiêu chuẩn • Ban hành kèm Thông tư 152/2025/TT-BTC
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onPrint}
              className="btn-primary-pill"
              style={{ fontSize: '0.82rem', padding: '6px 14px', background: '#0F766E' }}
            >
              <Printer size={15} />
              <span>In / Xuất PDF A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="tax-drawer-close-btn"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Book Selector Pills (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '10px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginRight: 4, whiteSpace: 'nowrap' }}>
            Chọn sổ kế toán:
          </span>
          {bookTabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => onSelectBookTab(tab.type)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: activeBookTab === tab.type ? '#0F766E' : '#CBD5E1',
                background: activeBookTab === tab.type ? '#0F766E' : '#F8FAFC',
                color: activeBookTab === tab.type ? '#ffffff' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.code}
            </button>
          ))}
        </div>

        {/* Scrollable A4 Sheet Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            className="a4-print-sheet"
            style={{
              width: '100%',
              maxWidth: 860,
              background: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              borderRadius: 4,
              padding: '32px 36px',
              boxSizing: 'border-box',
            }}
          >
            {/* A4 National Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ width: '48%', fontSize: '8.5pt', lineHeight: 1.45 }}>
                <div><strong>HỘ KINH DOANH:</strong> {summary?.branchName || 'Tạp Hóa Tuấn Minh'}</div>
                <div><strong>Mã số thuế:</strong> 8301928374-001</div>
                <div><strong>Địa chỉ:</strong> TP. Hồ Chí Minh</div>
                <div><strong>Kỳ hạch toán:</strong> {periodDisplayName}</div>
              </div>
              <div style={{ width: '50%', textAlign: 'center', fontSize: '8.5pt', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 800 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style={{ fontWeight: 700 }}>Độc lập - Tự do - Hạnh phúc</div>
                <div>----------o0o----------</div>
                <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: 4 }}>
                  {activeTabMetadata.templateCode}
                  <br />
                  (Ban hành theo Thông tư số 152/2025/TT-BTC của Bộ Tài chính)
                </div>
              </div>
            </div>

            {/* Book Title */}
            <div style={{ textAlign: 'center', margin: '14px 0 16px 0' }}>
              <h2 style={{ fontSize: '12pt', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '0.02em', color: '#0F172A' }}>
                {activeTabMetadata.name}
              </h2>
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#475569', marginTop: 4 }}>
                Kỳ kế toán: {periodDisplayName} • Đơn vị tính: Đồng Việt Nam (VND)
              </div>
            </div>

            {/* Book Specific A4 Table */}
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              {/* S1a: Sổ doanh thu Nhóm 1 */}
              {activeBookTab === AccountingBookType.S1a_RevenueGroup1 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 110 }}>NGÀY GHI SỔ</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px' }}>DIỄN GIẢI CHI TIẾT</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 180, textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px' }}>{entry.description}</td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>TỔNG CỘNG DOANH THU:</td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#0F766E' }}>
                        {formatMoney(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* S2a: Sổ doanh thu Nhóm 2 */}
              {activeBookTab === AccountingBookType.S2a_RevenueGroup2 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 100 }}>SỐ CHỨNG TỪ</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 100 }}>NGÀY GHI SỔ</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px' }}>DIỄN GIẢI CHI TIẾT</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 160, textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                          {entry.voucherNumber || '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px' }}>{entry.description}</td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={3} style={{ border: '1px solid #334155', padding: '6px 8px' }}>TỔNG CỘNG DOANH THU:</td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#0F766E' }}>
                        {formatMoney(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* S2b: Sổ doanh thu Kê khai */}
              {activeBookTab === AccountingBookType.S2b_RevenueDeclaration && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 100 }}>SỐ CHỨNG TỪ</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 100 }}>NGÀY THÁNG</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px' }}>DIỄN GIẢI NỘI DUNG</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 160, textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 120 }}>GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                          {entry.voucherNumber || '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px' }}>{entry.description}</td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(entry.amount)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px' }}>{entry.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={3} style={{ border: '1px solid #334155', padding: '6px 8px' }}>TỔNG CỘNG DOANH THU:</td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#0F766E' }}>
                        {formatMoney(totalAmount)}
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px' }}></td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* S2c: Sổ chi phí sản xuất, kinh doanh */}
              {activeBookTab === AccountingBookType.S2c_RevenueAndExpense && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 95 }}>SỐ HIỆU</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 90 }}>NGÀY</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px' }}>DIỄN GIẢI NỘI DUNG</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 130 }}>NHÓM CHI PHÍ</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 140, textAlign: 'right' }}>SỐ TIỀN (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                          {entry.voucherNumber || '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'center' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px' }}>{entry.description}</td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px' }}>{entry.category || 'Chi phí kinh doanh'}</td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={4} style={{ border: '1px solid #334155', padding: '6px 8px' }}>TỔNG CHI PHÍ HỢP LÝ PHÁT SINH:</td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#B91C1C' }}>
                        {formatMoney(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* S2d: Sổ vật liệu, dụng cụ, sản phẩm, hàng hóa */}
              {activeBookTab === AccountingBookType.S2d_MaterialsAndGoods && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th rowSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px', width: 75 }}>SỐ HIỆU</th>
                      <th rowSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px', width: 75 }}>NGÀY</th>
                      <th rowSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px' }}>TÊN HÀNG HÓA / VẬT TƯ</th>
                      <th rowSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px', width: 45 }}>ĐVT</th>
                      <th colSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px' }}>NHẬP KHO</th>
                      <th colSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px' }}>XUẤT KHO</th>
                      <th colSpan={2} style={{ border: '1px solid #334155', padding: '4px 6px' }}>TỒN KHO</th>
                    </tr>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ border: '1px solid #334155', padding: '3px 5px', width: 45, textAlign: 'right' }}>SL</th>
                      <th style={{ border: '1px solid #334155', padding: '3px 5px', width: 85, textAlign: 'right' }}>THÀNH TIỀN</th>
                      <th style={{ border: '1px solid #334155', padding: '3px 5px', width: 45, textAlign: 'right' }}>SL</th>
                      <th style={{ border: '1px solid #334155', padding: '3px 5px', width: 85, textAlign: 'right' }}>THÀNH TIỀN</th>
                      <th style={{ border: '1px solid #334155', padding: '3px 5px', width: 45, textAlign: 'right' }}>SL</th>
                      <th style={{ border: '1px solid #334155', padding: '3px 5px', width: 85, textAlign: 'right' }}>THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                          {entry.voucherNumber || '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px' }}>{entry.description}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center' }}>{entry.unit || 'Cái'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right' }}>{entry.inQuantity || '—'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right' }}>{entry.inAmount ? formatMoney(entry.inAmount) : '—'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right' }}>{entry.outQuantity || '—'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right' }}>{entry.outAmount ? formatMoney(entry.outAmount) : '—'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{entry.balanceQuantity || '—'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{entry.balanceAmount ? formatMoney(entry.balanceAmount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* S2e: Sổ tiền mặt và tiền gửi ngân hàng (100% PRESERVED FUNDMETRICS) */}
              {activeBookTab === AccountingBookType.S2e_CashAndBank && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Balance Opening Summary Box */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #334155',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '8pt',
                      fontWeight: 700,
                    }}
                  >
                    <span>SỐ DƯ ĐẦU KỲ: {formatMoney(fundMetrics.openingBalance)}</span>
                    <span>(Quỹ tiền mặt: {formatMoney(fundMetrics.openingCash)} | Tiền gửi NH: {formatMoney(fundMetrics.openingBank)})</span>
                  </div>

                  {/* Khối I: Quỹ Tiền Mặt */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9' }}>
                        <th colSpan={5} style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>
                          KHỐI I: QUỸ TIỀN MẶT (TẠI QUẦY &amp; KÉT SẮT) — Dư đầu kỳ: {formatMoney(fundMetrics.openingCash)}
                        </th>
                      </tr>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 90 }}>SỐ CHỨNG TỪ</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 85 }}>NGÀY</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px' }}>DIỄN GIẢI NGHIỆP VỤ</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 120, textAlign: 'right' }}>SỐ THU (VNĐ)</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 120, textAlign: 'right' }}>SỐ CHI (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashEntries.map((e, idx) => {
                        const inAmt = e.inAmount != null && e.inAmount > 0 ? e.inAmount : 0;
                        const outAmt = e.outAmount != null && e.outAmount > 0 ? e.outAmount : (inAmt === 0 ? e.amount : 0);
                        return (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                              {e.voucherNumber || '—'}
                            </td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center' }}>
                              {e.voucherDate ? new Date(e.voucherDate).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px' }}>{e.description}</td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              {inAmt > 0 ? formatMoney(inAmt) : '—'}
                            </td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right', color: '#DC2626', fontWeight: 600 }}>
                              {outAmt > 0 ? formatMoney(outAmt) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                        <td colSpan={3} style={{ border: '1px solid #334155', padding: '5px 8px' }}>
                          CỘNG PHÁT SINH KHỐI I — TỒN QUỸ TIỀN MẶT CUỐI KỲ: {formatMoney(fundMetrics.cashClosing)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', color: '#059669' }}>
                          {formatMoney(fundMetrics.cashIn)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', color: '#DC2626' }}>
                          {formatMoney(fundMetrics.cashOut)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Khối II: Tiền Gửi Ngân Hàng */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9' }}>
                        <th colSpan={5} style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>
                          KHỐI II: TIỀN GỬI NGÂN HÀNG (TÀI KHOẢN THANH TOÁN) — Dư đầu kỳ: {formatMoney(fundMetrics.openingBank)}
                        </th>
                      </tr>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 90 }}>SỐ CHỨNG TỪ</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 85 }}>NGÀY</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px' }}>DIỄN GIẢI NGHIỆP VỤ</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 120, textAlign: 'right' }}>TIỀN VÀO (VNĐ)</th>
                        <th style={{ border: '1px solid #334155', padding: '4px 6px', width: 120, textAlign: 'right' }}>TIỀN RA (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankEntries.map((e, idx) => {
                        const inAmt = e.inAmount != null && e.inAmount > 0 ? e.inAmount : 0;
                        const outAmt = e.outAmount != null && e.outAmount > 0 ? e.outAmount : (inAmt === 0 ? e.amount : 0);
                        return (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                              {e.voucherNumber || '—'}
                            </td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'center' }}>
                              {e.voucherDate ? new Date(e.voucherDate).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px' }}>{e.description}</td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right', color: '#0F766E', fontWeight: 600 }}>
                              {inAmt > 0 ? formatMoney(inAmt) : '—'}
                            </td>
                            <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right', color: '#DC2626', fontWeight: 600 }}>
                              {outAmt > 0 ? formatMoney(outAmt) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                        <td colSpan={3} style={{ border: '1px solid #334155', padding: '5px 8px' }}>
                          CỘNG PHÁT SINH KHỐI II — SỐ DƯ NGÂN HÀNG CUỐI KỲ: {formatMoney(fundMetrics.bankClosing)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', color: '#0F766E' }}>
                          {formatMoney(fundMetrics.bankIn)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', color: '#DC2626' }}>
                          {formatMoney(fundMetrics.bankOut)}
                        </td>
                      </tr>
                      <tr style={{ background: '#E2E8F0', fontWeight: 900 }}>
                        <td colSpan={3} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                          TỔNG LƯU CHUYỂN TOÀN SỔ (KHỐI I + KHỐI II) — TỒN QUỸ + NGÂN HÀNG: {formatMoney(fundMetrics.closingBalance)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#059669' }}>
                          {formatMoney(fundMetrics.totalIn)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#DC2626' }}>
                          {formatMoney(fundMetrics.totalOut)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* S3a: Sổ theo dõi tình hình nghĩa vụ thuế */}
              {activeBookTab === AccountingBookType.S3a_TaxObligation && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px' }}>LOẠI NGHĨA VỤ THUẾ / PHÍ</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 160, textAlign: 'right' }}>SỐ PHẢI NỘP (VNĐ)</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 160, textAlign: 'right' }}>SỐ ĐÃ NỘP (VNĐ)</th>
                      <th style={{ border: '1px solid #334155', padding: '6px 8px', width: 160, textAlign: 'right' }}>CÒN PHẢI NỘP (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', fontWeight: 600 }}>{entry.description}</td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(entry.amount)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', color: '#059669' }}>
                          {formatMoney(entry.outAmount || 0)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '5px 8px', textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>
                          {formatMoney(Math.max(0, entry.amount - (entry.outAmount || 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px' }}>TỔNG CỘNG NGHĨA VỤ THUẾ:</td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', color: '#EA580C' }}>
                        {formatMoney(totalAmount)}
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px' }}></td>
                      <td style={{ border: '1px solid #334155', padding: '6px 8px' }}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Signature Block */}
            <div style={{ pageBreakInside: 'avoid', marginTop: 28 }}>
              <div style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '8.5pt', marginBottom: 16 }}>
                Ngày ..... tháng ..... năm {year}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  textAlign: 'center',
                  fontSize: '8.5pt',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>NGƯỜI LẬP BIỂU</div>
                  <div style={{ fontStyle: 'italic', fontSize: '7.5pt', color: '#555555' }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: 60 }}></div>
                  <div style={{ fontWeight: 600 }}>Nguyễn Thị Thu Ngân</div>
                </div>

                <div>
                  <div style={{ fontWeight: 800 }}>KẾ TOÁN TRƯỞNG</div>
                  <div style={{ fontStyle: 'italic', fontSize: '7.5pt', color: '#555555' }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: 60 }}></div>
                  <div style={{ fontWeight: 600 }}>Trần Văn Kế Toán</div>
                </div>

                <div>
                  <div style={{ fontWeight: 800 }}>NGƯỜI ĐẠI DIỆN HỘ KINH DOANH</div>
                  <div style={{ fontStyle: 'italic', fontSize: '7.5pt', color: '#555555' }}>(Ký, đóng dấu nếu có)</div>
                  <div style={{ height: 60 }}></div>
                  <div style={{ fontWeight: 700 }}>{summary?.branchName || 'Đại diện HKD'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            background: '#ffffff',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-pill"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="btn-primary-pill"
            style={{ background: '#0F766E' }}
          >
            <Printer size={15} />
            <span>🖨️ In / Xuất PDF A4</span>
          </button>
        </div>
      </div>
    </div>
  );
};
