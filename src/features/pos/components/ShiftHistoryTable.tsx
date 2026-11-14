import { useState } from 'react';
import type { FC } from 'react';
import { History, CheckCircle2, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { TablePagination } from '../../../components/common';
import type { ShiftHistoryItem } from '../types/pos.types';

interface Props {
  shifts: ShiftHistoryItem[];
  onOpenZReport: (shiftCode: string) => void;
}

export const ShiftHistoryTable: FC<Props> = ({ shifts, onOpenZReport }) => {
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = shifts.length;
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = shifts.slice(startIndex, startIndex + pageSize);

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div className="so-list-table-card so-list-table-card--wrap">
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} className="text-teal-700" />
          <span>Lịch Sử Chi Tiết Các Phiên Ca Bán Hàng &amp; Bàn Giao Quầy</span>
        </h3>
      </div>

      <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
        <table className="so-list-table" style={{ minWidth: 1100, width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '130px' }}>Mã ca</th>
              <th style={{ ...thStyle, textAlign: 'left', width: '150px' }}>Chi nhánh</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Thời gian bắt đầu - Kết thúc</th>
              <th style={{ ...thStyle, textAlign: 'left', width: '140px' }}>Thu ngân</th>
              <th style={{ ...thStyle, textAlign: 'right', width: '120px' }}>Tiền đầu ca</th>
              <th style={{ ...thStyle, textAlign: 'right', width: '130px' }}>Doanh thu bán</th>
              <th style={{ ...thStyle, textAlign: 'right', width: '130px' }}>Tiền thực đếm</th>
              <th style={{ ...thStyle, textAlign: 'center', width: '155px', whiteSpace: 'nowrap' }}>Chênh lệch</th>
              <th style={{ ...thStyle, textAlign: 'center', width: '120px', whiteSpace: 'nowrap' }}>Báo cáo</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((s) => (
              <tr
                key={s.shiftCode}
                className="so-list-row"
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <td className="so-list-td">
                  <span className="so-list-code font-mono font-bold">{s.shiftCode}</span>
                </td>
                <td className="so-list-td">
                  <span className="text-slate-700">{s.branchName}</span>
                </td>
                <td className="so-list-td">
                  <span className="font-mono text-xs text-slate-600">{s.timeRange}</span>
                </td>
                <td className="so-list-td">
                  <span className="font-medium text-slate-800 so-list-name">{s.cashierName}</span>
                </td>
                <td className="so-list-td" style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums text-slate-600">
                    {s.initialFloat.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td className="so-list-td" style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums font-semibold text-teal-700">
                    {s.totalRevenue.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td className="so-list-td" style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    {s.actualCashCounted.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td className="so-list-td" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {s.reconciliationDiff === 0 ? (
                    <span className="diff-badge match font-mono">
                      <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                      <span>Khớp 100% (0 đ)</span>
                    </span>
                  ) : s.reconciliationDiff > 0 ? (
                    <span className="diff-badge surplus font-mono">
                      <TrendingUp size={13} style={{ flexShrink: 0 }} />
                      <span>+{s.reconciliationDiff.toLocaleString('vi-VN')} đ</span>
                    </span>
                  ) : (
                    <span className="diff-badge deficit font-mono">
                      <TrendingDown size={13} style={{ flexShrink: 0 }} />
                      <span>{s.reconciliationDiff.toLocaleString('vi-VN')} đ</span>
                    </span>
                  )}
                </td>
                <td className="so-list-td so-list-td--actions" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="so-list-action-btn"
                    onClick={() => onOpenZReport(s.shiftCode)}
                    title="Xem & in Z-Report"
                  >
                    <FileText size={13} style={{ flexShrink: 0 }} />
                    <span>Z-Report</span>
                  </button>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#64748b', padding: '36px 16px' }}>
                  Không tìm thấy phiên ca nào khớp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang chuẩn theo StoreProductTable ── */}
      {totalCount > 0 && (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalCount}
          itemLabel="phiên ca"
          pageSizeOptions={[15, 24, 36, 48]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
};
