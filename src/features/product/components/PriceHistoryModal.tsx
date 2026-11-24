import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Globe,
  Search,
  RotateCcw,
} from 'lucide-react';
import { productApi } from '../api/productApi';
import type { ProductPriceHistoryDto, ProductUnitResponse } from '../types';
import { TablePagination } from '../../../components/common';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  branchId?: string;
  branchName?: string;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  branchId,
  branchName,
}) => {
  const [historyList, setHistoryList] = useState<ProductPriceHistoryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [productUnitId, setProductUnitId] = useState('ALL');
  const [productUnits, setProductUnits] = useState<ProductUnitResponse[]>([]);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MASTER' | 'BRANCH'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!isOpen || !productId) return;
    productApi.getProductUnits(productId).then(setProductUnits);
  }, [isOpen, productId]);

  useEffect(() => {
    if (isOpen && productId) {
      if (fromDate && toDate && fromDate > toDate) {
        setLoading(false);
        setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
        setHistoryList([]);
        setTotalItems(0);
        return;
      }
      setLoading(true);
      setError(null);
      const timer = window.setTimeout(() => productApi
        .getPriceHistory(productId, branchId, {
          productUnitId: productUnitId === 'ALL' ? undefined : productUnitId,
          priceScope: scopeFilter === 'ALL' ? undefined : scopeFilter,
          searchTerm: searchTerm.trim() || undefined,
          fromDate: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
          toDate: toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined,
          page,
          pageSize,
        })
        .then((data) => {
          setHistoryList(data.items);
          setTotalItems(data.totalItems);
        })
        .catch((err) => {
          console.error('Failed to load price history:', err);
          setError('Không thể tải lịch sử giá bán.');
        })
        .finally(() => {
          setLoading(false);
        }), 250);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, productId, branchId, productUnitId, scopeFilter, searchTerm, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [productUnitId, scopeFilter, searchTerm, fromDate, toDate, productId, branchId]);

  if (!isOpen) return null;

  const filteredHistory = historyList;
  const hasActiveFilters = Boolean(
    productUnitId !== 'ALL' || scopeFilter !== 'ALL' || searchTerm.trim() || fromDate || toDate
  );

  const handleResetFilters = () => {
    setProductUnitId('ALL');
    setScopeFilter('ALL');
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setError(null);
    setPage(1);
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0 đ';
    return `${Number(val).toLocaleString('vi-VN')} đ`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const trimmed = dateStr.trim();
      const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
      const d = new Date(hasTz ? trimmed : `${trimmed}Z`);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 13,
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1100 }}
      onClick={onClose}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 880,
          width: '95%',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 24px 38px -8px rgba(15, 23, 42, 0.22), 0 10px 15px -6px rgba(15, 23, 42, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: '#f8fafc',
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <History size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  margin: 0,
                  color: '#0f172a',
                  lineHeight: 1.3,
                }}
              >
                Lịch sử biến động giá bán
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: 12.5,
                  color: '#64748b',
                }}
              >
                <span>
                  Sản phẩm: <strong style={{ color: '#1e293b' }}>{productName}</strong>
                </span>
                {branchName && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 9px',
                      borderRadius: 999,
                      backgroundColor: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      color: '#6d28d9',
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    <Building2 size={12} />
                    {branchName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 6,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 22px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1.3fr) repeat(4, minmax(125px, 1fr)) auto', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                aria-label="Tìm kiếm lịch sử giá"
                placeholder="Tìm người sửa, lý do..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', height: 36, border: '1px solid #cbd5e1', borderRadius: 7, padding: '0 10px 0 30px', fontSize: 12.5 }}
              />
            </div>
            <select
              aria-label="Đơn vị tính"
              value={productUnitId}
              onChange={(e) => setProductUnitId(e.target.value)}
              style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 7, padding: '0 9px', fontSize: 12.5 }}
            >
              <option value="ALL">Tất cả đơn vị tính</option>
              {productUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.unitName}</option>
              ))}
            </select>
            <select
              aria-label="Phạm vi giá"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'ALL' | 'MASTER' | 'BRANCH')}
              style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 7, padding: '0 9px', fontSize: 12.5 }}
            >
              <option value="ALL">Tất cả phạm vi</option>
              <option value="MASTER">MASTER (Toàn chuỗi)</option>
              <option value="BRANCH">BRANCH (Chi nhánh)</option>
            </select>
            <input type="date" aria-label="Từ ngày" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Từ ngày" style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 7, padding: '0 9px', fontSize: 12.5 }} />
            <input type="date" aria-label="Đến ngày" value={toDate} onChange={(e) => setToDate(e.target.value)} title="Đến ngày" style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 7, padding: '0 9px', fontSize: 12.5 }} />
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters && !error}
              title="Đặt lại bộ lọc"
              style={{
                height: 36,
                padding: '0 10px',
                borderRadius: 7,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: hasActiveFilters || error ? '#334155' : '#94a3b8',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: hasActiveFilters || error ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
              }}
            >
              <RotateCcw size={13} /> Đặt lại
            </button>
          </div>
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 16px',
                color: '#64748b',
                gap: 10,
              }}
            >
              <History size={32} color="#0f766e" />
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>Đang tải dữ liệu lịch sử giá...</p>
            </div>
          ) : error ? (
            <div
              style={{
                borderRadius: 10,
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                padding: '14px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          ) : historyList.length === 0 && !hasActiveFilters ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '44px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <History size={24} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Chưa có lịch sử thay đổi giá cho sản phẩm này.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Mọi thay đổi giá bán tại danh mục chung hoặc chi nhánh sẽ tự động được lưu vết tại đây.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 10, color: '#64748b', fontSize: 13 }}>
              Không tìm thấy lần thay đổi giá phù hợp với điều kiện tra cứu.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Thời gian</th>
                    <th style={thStyle}>Phạm vi</th>
                    <th style={thStyle}>Biến động giá</th>
                    <th style={thStyle}>Giá vốn / Cảnh báo</th>
                    <th style={thStyle}>Người thay đổi</th>
                    <th style={thStyle}>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => {
                    const diff = item.newPrice - item.oldPrice;
                    const diffPercent = item.oldPrice > 0 ? (diff / item.oldPrice) * 100 : 0;
                    const isIncrease = diff > 0;
                    const isDecrease = diff < 0;

                    return (
                      <tr key={item.id}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {formatDate(item.createdAt)}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          {item.priceScope === 'MASTER' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 999,
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontSize: 11.5,
                                fontWeight: 600,
                              }}
                            >
                              <Globe size={12} /> Toàn chuỗi
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 999,
                                backgroundColor: '#f5f3ff',
                                border: '1px solid #ddd6fe',
                                color: '#6d28d9',
                                fontSize: 11.5,
                                fontWeight: 600,
                              }}
                            >
                              <Building2 size={12} /> {item.branchName || 'Chi nhánh'}
                            </span>
                          )}
                          {item.productUnitName && (
                            <div style={{ marginTop: 5, fontSize: 11, color: '#64748b' }}>ĐVT: {item.productUnitName}</div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: 12 }}>
                              {formatCurrency(item.oldPrice)}
                            </span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatCurrency(item.newPrice)}
                            </span>
                            {isIncrease && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: '#059669',
                                  backgroundColor: '#ecfdf5',
                                  padding: '2px 6px',
                                  borderRadius: 5,
                                }}
                              >
                                <TrendingUp size={12} />
                                {item.oldPrice > 0 ? `+${diffPercent.toFixed(1)}%` : 'Giá mới'}
                              </span>
                            )}
                            {isDecrease && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: '#dc2626',
                                  backgroundColor: '#fef2f2',
                                  padding: '2px 6px',
                                  borderRadius: 5,
                                }}
                              >
                                <TrendingDown size={12} />
                                {diffPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {item.isBelowCost ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 7px',
                                  borderRadius: 5,
                                  backgroundColor: '#fef3c7',
                                  border: '1px solid #fcd34d',
                                  color: '#92400e',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  width: 'fit-content',
                                }}
                              >
                                <AlertTriangle size={12} color="#d97706" /> Dưới giá vốn
                              </span>
                              {item.costPriceSnapshot ? (
                                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                                  Vốn: {formatCurrency(item.costPriceSnapshot)}
                                </span>
                              ) : null}
                            </div>
                          ) : item.costPriceSnapshot ? (
                            <span style={{ fontSize: 12, color: '#475569' }}>
                              Vốn: {formatCurrency(item.costPriceSnapshot)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 12.5 }}>
                              {item.changedByUserName || 'Quản trị viên'}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: 12.5,
                            color: '#475569',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.reason}
                        >
                          {item.reason || 'Điều chỉnh giá bán'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!error && totalItems > 0 && (
          <TablePagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={totalItems}
            pageSizeOptions={[15, 24, 36, 48]}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            itemLabel="lần thay đổi"
            isLoading={loading}
          />
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '12px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12.5,
            color: '#64748b',
          }}
        >
          <span>
            Kết quả: <strong style={{ color: '#0f172a' }}>{historyList.length}</strong> / {totalItems} lần thay đổi
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
