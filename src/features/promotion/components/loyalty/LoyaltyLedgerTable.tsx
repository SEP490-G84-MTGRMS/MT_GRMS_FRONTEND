import { useState, useMemo, type FC } from 'react';
import { Search, PlusCircle, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, X } from 'lucide-react';
import type { PointLedgerItem, PointLedgerType } from '../../types/promotion.types';
import { TablePagination } from '../../../../components/common';

interface LoyaltyLedgerTableProps {
  ledger: PointLedgerItem[];
  onOpenAdjustModal: () => void;
}

export const LoyaltyLedgerTable: FC<LoyaltyLedgerTableProps> = ({
  ledger,
  onOpenAdjustModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.customerName.toLowerCase().includes(q);
        const matchPhone = item.customerPhone.includes(q);
        const matchTx = item.transactionCode.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTx) return false;
      }
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [ledger, searchTerm, typeFilter]);

  const paginatedLedger = useMemo(() => {
    return filteredLedger.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredLedger, currentPage, pageSize]);

  const renderTypeBadge = (type: PointLedgerType) => {
    switch (type) {
      case 'EARN_PURCHASE':
        return (
          <span className="ledger-badge ledger-badge-earn">
            <ArrowUpRight size={13} />
            <span>Tích điểm mua hàng</span>
          </span>
        );
      case 'REDEEM_PURCHASE':
        return (
          <span className="ledger-badge ledger-badge-redeem">
            <ArrowDownLeft size={13} />
            <span>Tiêu điểm đơn hàng</span>
          </span>
        );
      case 'MANUAL_ADJUST_ADD':
      case 'MANUAL_ADJUST_SUB':
        return (
          <span className="ledger-badge ledger-badge-adjust">
            <SlidersHorizontal size={13} />
            <span>Điều chỉnh thủ công</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="ledger-badge ledger-badge-expired">
            <span>Điểm hết hạn</span>
          </span>
        );
    }
  };

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
    <div className="so-list-table-card so-list-table-card--wrap promotion-card">
      <div className="promotion-card-header">
        <h3 className="promotion-card-title">
          <span>Sổ cái lịch sử biến động điểm</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
            ({ledger.length} giao dịch)
          </span>
        </h3>

        <button onClick={onOpenAdjustModal} className="btn-secondary-pill" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
          <PlusCircle size={14} color="#0F766E" />
          <span>Điều chỉnh điểm thủ công</span>
        </button>
      </div>

      {/* Filter inside ledger chuẩn StoreProductFilter */}
      <div className="so-list-filter" style={{ border: 'none', borderBottom: '1px solid #e2e8f0', borderRadius: 0, padding: '10px 16px', backgroundColor: '#f8fafc' }}>
        <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 16px' }}>
          <div className="so-list-filter-field" style={{ flex: '1 1 260px', minWidth: 220 }}>
            <label className="so-list-filter-label">Tìm kiếm:</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo KH, SĐT, mã GD..."
                className="so-list-filter-input"
                style={{ width: '100%', paddingLeft: 30, paddingRight: searchTerm ? 28 : 10 }}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                  title="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="so-list-filter-field">
            <label className="so-list-filter-label">Loại biến động:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`so-list-filter-select ${typeFilter !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            >
              <option value="ALL">Tất cả loại giao dịch</option>
              <option value="EARN_PURCHASE">Tích điểm mua hàng</option>
              <option value="REDEEM_PURCHASE">Tiêu điểm đơn hàng</option>
              <option value="MANUAL_ADJUST_ADD">Điều chỉnh thủ công (Cộng)</option>
              <option value="MANUAL_ADJUST_SUB">Điều chỉnh thủ công (Trừ)</option>
              <option value="EXPIRED">Điểm hết hạn</option>
            </select>
          </div>

          {(searchTerm || typeFilter !== 'ALL') && (
            <div className="so-list-filter-actions" style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('ALL');
                }}
                className="so-list-filter-reset"
                title="Đặt lại bộ lọc"
              >
                <span>Đặt lại</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
        <table className="so-list-table promotion-table" style={{ minWidth: 1060, width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 135 }}>Mã GD</th>
              <th style={{ ...thStyle, width: 180 }}>Khách hàng</th>
              <th style={{ ...thStyle, width: 165 }}>Loại biến động</th>
              <th style={{ ...thStyle, width: 105, textAlign: 'right' }}>Điểm (+/-)</th>
              <th style={{ ...thStyle, width: 105, textAlign: 'right' }}>Số dư sau</th>
              <th style={{ ...thStyle, width: 220 }}>Lý do &amp; Ghi chú</th>
              <th style={{ ...thStyle, width: 150 }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                  Chưa có giao dịch biến động điểm nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedLedger.map((row) => (
                <tr
                  key={row.id}
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
                    <span className="so-list-code">{row.transactionCode}</span>
                  </td>
                  <td className="so-list-td">
                    <div className="ledger-customer-cell">
                      <div className="ledger-customer-name so-list-name">{row.customerName}</div>
                      <div className="ledger-customer-phone">{row.customerPhone}</div>
                    </div>
                  </td>
                  <td className="so-list-td">{renderTypeBadge(row.type)}</td>
                  <td className="so-list-td" style={{ textAlign: 'right' }}>
                    <span
                      className={`ledger-points-val ${
                        row.pointsChanged > 0 ? 'ledger-points-plus' : 'ledger-points-minus'
                      }`}
                    >
                      {row.pointsChanged > 0 ? `+${row.pointsChanged}` : row.pointsChanged}
                    </span>
                  </td>
                  <td className="so-list-td" style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>
                      {row.balanceAfter.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="so-list-td">
                    <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4, maxWidth: 260, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {row.reason}
                    </div>
                    {row.orderCode && (
                      <span style={{ color: '#0F766E', fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 600 }}>
                        [{row.orderCode}]
                      </span>
                    )}
                  </td>
                  <td className="so-list-td">
                    <div className="ledger-time-cell">
                      <div>{row.createdAt}</div>
                      <div className="ledger-time-creator">{row.createdBy}</div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang chuẩn theo StoreProductTable ── */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredLedger.length}
        pageSizeOptions={[15, 24, 36, 48]}
        itemLabel="giao dịch"
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
};
