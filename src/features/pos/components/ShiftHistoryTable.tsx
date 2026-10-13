import { useState } from 'react';
import type { FC } from 'react';
import { History, CheckCircle2, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import type { ShiftHistoryItem } from '../types/pos.types';

interface Props {
  shifts: ShiftHistoryItem[];
  onOpenZReport: (shiftCode: string) => void;
}

export const ShiftHistoryTable: FC<Props> = ({ shifts, onOpenZReport }) => {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = shifts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = shifts.slice(startIndex, startIndex + pageSize);

  return (
    <div className="pos-shift-card">
      <div className="pos-shift-card-header">
        <h3 className="pos-shift-card-title">
          <History size={17} className="text-teal-700" />
          <span>Lịch Sử Chi Tiết Các Phiên Ca Bán Hàng &amp; Bàn Giao Quầy</span>
        </h3>
      </div>

      <div className="pos-shift-table-responsive">
        <table className="pos-shift-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '130px' }}>Mã ca</th>
              <th style={{ textAlign: 'left', width: '150px' }}>Chi nhánh</th>
              <th style={{ textAlign: 'left' }}>Thời gian bắt đầu - Kết thúc</th>
              <th style={{ textAlign: 'left', width: '140px' }}>Thu ngân</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Tiền đầu ca</th>
              <th style={{ textAlign: 'right', width: '130px' }}>Doanh thu bán</th>
              <th style={{ textAlign: 'right', width: '130px' }}>Tiền thực đếm</th>
              <th style={{ textAlign: 'center', width: '155px', whiteSpace: 'nowrap' }}>Chênh lệch</th>
              <th style={{ textAlign: 'center', width: '120px', whiteSpace: 'nowrap' }}>Báo cáo</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((s) => (
              <tr key={s.shiftCode}>
                <td>
                  <span className="font-mono font-bold text-slate-800">{s.shiftCode}</span>
                </td>
                <td>
                  <span className="text-slate-700">{s.branchName}</span>
                </td>
                <td>
                  <span className="font-mono text-xs text-slate-600">{s.timeRange}</span>
                </td>
                <td>
                  <span className="font-medium text-slate-800">{s.cashierName}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums text-slate-600">
                    {s.initialFloat.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums font-semibold text-teal-700">
                    {s.totalRevenue.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    {s.actualCashCounted.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="z-report-btn-tag"
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
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không tìm thấy phiên ca nào khớp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="admin-pagination-footer" style={{ marginTop: '14px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Đang hiển thị{' '}
          <b>
            {totalCount > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalCount)}
          </b>{' '}
          trong tổng số <b>{totalCount}</b> phiên ca
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-soft-blue)',
                fontFamily: 'inherit',
                fontSize: 12.5,
                color: 'var(--text-main)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`admin-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
