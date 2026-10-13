import { useState } from 'react';
import type { FC } from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import type { CashInOutTransaction } from '../types/pos.types';

interface Props {
  transactions: CashInOutTransaction[];
  onOpenAddModal: () => void;
  theoreticalCash: number;
}

export const ShiftCashInOutTable: FC<Props> = ({
  transactions,
  onOpenAddModal,
  theoreticalCash,
}) => {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = transactions.slice(startIndex, startIndex + pageSize);

  return (
    <div className="pos-shift-card">
      <div className="pos-shift-card-header flex-between">
        <h3 className="pos-shift-card-title">
          <ArrowLeftRight size={17} className="text-teal-700" />
          <span>Thu / Chi Tiền Mặt Nội Bộ Tại Quầy</span>
        </h3>
        <button
          type="button"
          className="pos-btn-secondary-pill"
          onClick={onOpenAddModal}
          title="Tạo phiếu thu/chi nội bộ"
        >
          <Plus size={14} />
          <span>Thêm Phiếu Thu/Chi</span>
        </button>
      </div>

      <div className="pos-shift-table-responsive">
        <table className="pos-shift-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '80px', whiteSpace: 'nowrap' }}>Mã phiếu</th>
              <th style={{ textAlign: 'center', width: '55px', whiteSpace: 'nowrap' }}>Giờ</th>
              <th style={{ textAlign: 'left', width: '100px', whiteSpace: 'nowrap' }}>Loại giao dịch</th>
              <th style={{ textAlign: 'left' }}>Lý do phát sinh</th>
              <th style={{ textAlign: 'right', width: '115px', whiteSpace: 'nowrap' }}>Số tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <span className="font-mono font-bold text-slate-800 text-xs whitespace-nowrap">{tx.code}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="font-mono text-slate-500 text-xs whitespace-nowrap">{tx.time}</span>
                </td>
                <td>
                  <span
                    className={`tx-type-tag ${
                      tx.type === 'in' ? 'tx-type-in' : 'tx-type-out'
                    }`}
                    style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '2px 8px' }}
                  >
                    {tx.typeLabel}
                  </span>
                </td>
                <td>
                  <span className="text-slate-700 text-xs">{tx.reason}</span>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span
                    className={`font-mono tabular-nums font-semibold text-xs whitespace-nowrap ${
                      tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'in' ? '+' : '-'} {tx.amount.toLocaleString('vi-VN')} đ
                  </span>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chưa có phiếu thu chi nội bộ nào trong ca này.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="total-summary-row highlight-subtle">
              <td colSpan={4}>
                <b>TIỀN MẶT LÝ THUYẾT TRONG KÉT (= Đầu ca + Bán hàng - Chi nộp):</b>
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span className="theoretical-cash-value font-mono tabular-nums text-sm whitespace-nowrap">
                  {theoreticalCash.toLocaleString('vi-VN')} đ
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Footer - Chỉ hiển thị khi có nhiều trang */}
      {totalCount > pageSize && (
        <div className="admin-pagination-footer" style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Đang hiển thị{' '}
            <b>
              {totalCount > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalCount)}
            </b>{' '}
            trong tổng số <b>{totalCount}</b> phiếu thu/chi
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
      )}
    </div>
  );
};
