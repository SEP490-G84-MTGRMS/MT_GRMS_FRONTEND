import { useState, useMemo, type FC } from 'react';
import { Search, PlusCircle, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, RotateCcw, RotateCw } from 'lucide-react';
import type { PointLedgerItem, PointLedgerType } from '../../types/promotion.types';
import { TablePagination, SortableHeader, useTableSort } from '../../../../components/common';

interface LoyaltyLedgerTableProps {
  ledger: PointLedgerItem[];
  onOpenAdjustModal: () => void;
  onRefresh?: () => void;
}

export const LoyaltyLedgerTable: FC<LoyaltyLedgerTableProps> = ({
  ledger,
  onOpenAdjustModal,
  onRefresh,
}) => {
  const [draftTxFilter, setDraftTxFilter] = useState('');
  const [draftCustomerFilter, setDraftCustomerFilter] = useState('');
  const [draftPhoneFilter, setDraftPhoneFilter] = useState('');
  const [txFilter, setTxFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      if (txFilter.trim() && !item.transactionCode.toLowerCase().includes(txFilter.trim().toLowerCase())) {
        return false;
      }
      if (customerFilter.trim() && !item.customerName.toLowerCase().includes(customerFilter.trim().toLowerCase())) {
        return false;
      }
      if (phoneFilter.trim() && !item.customerPhone.includes(phoneFilter.trim())) {
        return false;
      }
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [ledger, txFilter, customerFilter, phoneFilter, typeFilter]);

  const { sort, handleSort, sortedItems } = useTableSort(filteredLedger, {
    transactionCode: (r) => r.transactionCode,
    customerName: (r) => r.customerName,
    customerPhone: (r) => r.customerPhone,
    type: (r) => r.type,
    pointsChanged: (r) => r.pointsChanged,
    balanceAfter: (r) => r.balanceAfter,
    orderCode: (r) => r.orderCode || '',
    createdAt: (r) => r.createdAt,
  });

  const paginatedLedger = useMemo(() => {
    return sortedItems.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedItems, currentPage, pageSize]);

  const isFiltered = Boolean(
    draftTxFilter.trim() ||
    draftCustomerFilter.trim() ||
    draftPhoneFilter.trim() ||
    txFilter.trim() ||
    customerFilter.trim() ||
    phoneFilter.trim() ||
    typeFilter !== 'ALL'
  );

  const handleApplySearch = () => {
    setTxFilter(draftTxFilter);
    setCustomerFilter(draftCustomerFilter);
    setPhoneFilter(draftPhoneFilter);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setDraftTxFilter('');
    setDraftCustomerFilter('');
    setDraftPhoneFilter('');
    setTxFilter('');
    setCustomerFilter('');
    setPhoneFilter('');
    setTypeFilter('ALL');
    setCurrentPage(1);
  };

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
    position: 'sticky',
    top: 0,
    zIndex: 10,
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
    <div className="so-list-table-card so-list-table-card--wrap promotion-card" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
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

      {/* Filter inside ledger tách trường chuẩn StoreProductFilter (DEF-UI-SC24-002) */}
      <div className="so-list-filter" style={{ border: 'none', borderBottom: '1px solid #e2e8f0', borderRadius: 0, padding: '10px 16px', backgroundColor: '#f8fafc' }}>
        <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 12px', flexWrap: 'wrap' }}>
          <div className="so-list-filter-field" style={{ flex: '0 1 160px', minWidth: 145 }}>
            <label className="so-list-filter-label">Mã GD:</label>
            <input
              type="text"
              value={draftTxFilter}
              onChange={(e) => setDraftTxFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
              placeholder="Nhập mã GD..."
              className="so-list-filter-input"
              style={{ width: '100%' }}
            />
          </div>

          <div className="so-list-filter-field" style={{ flex: '1 1 180px', minWidth: 165 }}>
            <label className="so-list-filter-label">Khách hàng:</label>
            <input
              type="text"
              value={draftCustomerFilter}
              onChange={(e) => setDraftCustomerFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
              placeholder="Nhập tên khách..."
              className="so-list-filter-input"
              style={{ width: '100%' }}
            />
          </div>

          <div className="so-list-filter-field" style={{ flex: '0 1 150px', minWidth: 135 }}>
            <label className="so-list-filter-label">SĐT:</label>
            <input
              type="text"
              value={draftPhoneFilter}
              onChange={(e) => setDraftPhoneFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
              placeholder="Số điện thoại..."
              className="so-list-filter-input"
              style={{ width: '100%' }}
            />
          </div>

          <div className="so-list-filter-field">
            <label className="so-list-filter-label">Loại:</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className={`so-list-filter-select ${typeFilter !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            >
              <option value="ALL">Tất cả loại GD</option>
              <option value="EARN_PURCHASE">Tích điểm mua hàng</option>
              <option value="REDEEM_PURCHASE">Tiêu điểm đơn hàng</option>
              <option value="MANUAL_ADJUST_ADD">Điều chỉnh (Cộng)</option>
              <option value="MANUAL_ADJUST_SUB">Điều chỉnh (Trừ)</option>
            </select>
          </div>

          <div className="so-list-filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button type="button" onClick={handleApplySearch} className="so-list-filter-search">
              <Search size={13} />
              <span>Tìm kiếm</span>
            </button>
            <button type="button" onClick={handleReset} disabled={!isFiltered} className="so-list-filter-reset">
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
            {onRefresh && (
              <button type="button" onClick={onRefresh} className="so-list-filter-reset" title="Làm mới sổ cái">
                <RotateCw size={13} />
                <span>Làm mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="table-responsive" style={{ width: '100%', flex: '1 1 auto', minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
        <table className="so-list-table promotion-table" style={{ minWidth: 1240, width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 130 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 165 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 105 }} />
            <col style={{ width: 210 }} />
            <col style={{ width: 125 }} />
            <col style={{ width: 145 }} />
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ ...thStyle, width: 130 }}><SortableHeader label="Mã GD" active={sort.key === 'transactionCode'} direction={sort.direction} onClick={() => handleSort('transactionCode')} /></th>
              <th style={{ ...thStyle, width: 160 }}><SortableHeader label="Tên khách hàng" active={sort.key === 'customerName'} direction={sort.direction} onClick={() => handleSort('customerName')} /></th>
              <th style={{ ...thStyle, width: 120 }}><SortableHeader label="Số điện thoại" active={sort.key === 'customerPhone'} direction={sort.direction} onClick={() => handleSort('customerPhone')} /></th>
              <th style={{ ...thStyle, width: 165 }}><SortableHeader label="Loại biến động" active={sort.key === 'type'} direction={sort.direction} onClick={() => handleSort('type')} /></th>
              <th style={{ ...thStyle, width: 100, textAlign: 'right' }}><SortableHeader label="Điểm (+/-)" align="right" active={sort.key === 'pointsChanged'} direction={sort.direction} onClick={() => handleSort('pointsChanged')} /></th>
              <th style={{ ...thStyle, width: 105, textAlign: 'right' }}><SortableHeader label="Số dư sau" align="right" active={sort.key === 'balanceAfter'} direction={sort.direction} onClick={() => handleSort('balanceAfter')} /></th>
              <th style={{ ...thStyle, width: 210 }}>Lý do</th>
              <th style={{ ...thStyle, width: 125 }}><SortableHeader label="Mã đơn" active={sort.key === 'orderCode'} direction={sort.direction} onClick={() => handleSort('orderCode')} /></th>
              <th style={{ ...thStyle, width: 145 }}><SortableHeader label="Thời gian" active={sort.key === 'createdAt'} direction={sort.direction} onClick={() => handleSort('createdAt')} /></th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
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
                    <span className="so-list-name">{row.customerName}</span>
                  </td>
                  <td className="so-list-td" style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#475569' }}>
                    {row.customerPhone || '—'}
                  </td>
                  <td className="so-list-td">{renderTypeBadge(row.type)}</td>
                  <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    <span
                      className={`ledger-points-val ${row.pointsChanged > 0 ? 'ledger-points-plus' : 'ledger-points-minus'
                        }`}
                    >
                      {row.pointsChanged > 0 ? `+${row.pointsChanged}` : row.pointsChanged}
                    </span>
                  </td>
                  <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>
                      {row.balanceAfter.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="so-list-td">
                    <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {row.reason || '—'}
                    </div>
                  </td>
                  <td className="so-list-td">
                    {row.orderCode ? (
                      <span style={{ color: '#0F766E', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>
                        {row.orderCode}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
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
