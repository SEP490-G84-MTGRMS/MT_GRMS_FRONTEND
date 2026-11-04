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
  const [pageSize, setPageSize] = useState(10);

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

  return (
    <div className="promotion-card">
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

      {/* Filter inside ledger */}
      <div className="ledger-filter-row">
        <div className="ledger-search-box">
          <Search size={15} className="ledger-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo KH, SĐT, mã GD..."
            className="ledger-search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="ledger-search-clear"
              title="Xóa tìm kiếm"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="ledger-type-select"
        >
          <option value="ALL">Tất cả loại giao dịch</option>
          <option value="EARN_PURCHASE">Tích điểm mua hàng</option>
          <option value="REDEEM_PURCHASE">Tiêu điểm đơn hàng</option>
          <option value="MANUAL_ADJUST_ADD">Điều chỉnh thủ công (Cộng)</option>
          <option value="MANUAL_ADJUST_SUB">Điều chỉnh thủ công (Trừ)</option>
          <option value="EXPIRED">Điểm hết hạn</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="promotion-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Mã GD</th>
              <th style={{ width: 170 }}>Khách hàng</th>
              <th style={{ width: 160 }}>Loại biến động</th>
              <th style={{ width: 100, textAlign: 'right' }}>Điểm (+/-)</th>
              <th style={{ width: 100, textAlign: 'right' }}>Số dư sau</th>
              <th>Lý do & Ghi chú</th>
              <th style={{ width: 140 }}>Thời gian</th>
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
                <tr key={row.id}>
                  <td>
                    <span className="ledger-code-text">{row.transactionCode}</span>
                  </td>
                  <td>
                    <div className="ledger-customer-cell">
                      <div className="ledger-customer-name">{row.customerName}</div>
                      <div className="ledger-customer-phone">{row.customerPhone}</div>
                    </div>
                  </td>
                  <td>{renderTypeBadge(row.type)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span
                      className={`ledger-points-val ${
                        row.pointsChanged > 0 ? 'ledger-points-plus' : 'ledger-points-minus'
                      }`}
                    >
                      {row.pointsChanged > 0 ? `+${row.pointsChanged}` : row.pointsChanged}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>
                      {row.balanceAfter.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4, maxWidth: 240 }}>
                      {row.reason}
                    </div>
                    {row.orderCode && (
                      <span style={{ color: '#0F766E', fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 600 }}>
                        [{row.orderCode}]
                      </span>
                    )}
                  </td>
                  <td>
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

      {/* Shared Enterprise Pagination */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredLedger.length}
        pageSizeOptions={[5, 10, 20]}
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
