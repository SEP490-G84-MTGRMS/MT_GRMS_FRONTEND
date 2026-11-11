import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Globe,
} from 'lucide-react';
import { productApi } from '../api/productApi';
import type { ProductPriceHistoryDto } from '../types';

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

  useEffect(() => {
    if (isOpen && productId) {
      setLoading(true);
      setError(null);
      productApi
        .getPriceHistory(productId, branchId)
        .then((data) => {
          setHistoryList(data);
        })
        .catch((err) => {
          console.error('Failed to load price history:', err);
          setError('Không thể tải lịch sử giá bán.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, productId, branchId]);

  if (!isOpen) return null;

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0 đ';
    return `${Number(val).toLocaleString('vi-VN')} đ`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
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
          ) : historyList.length === 0 ? (
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
                    <th style={thStyle}>Người đổi &amp; Duyệt</th>
                    <th style={thStyle}>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item) => {
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
                                +{diffPercent.toFixed(1)}%
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
                            {item.managerApprovedBy && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  color: '#047857',
                                }}
                              >
                                <ShieldCheck size={12} color="#059669" />
                                Duyệt: {item.managerApprovedBy}
                              </span>
                            )}
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
            Tổng số lần điều chỉnh: <strong style={{ color: '#0f172a' }}>{historyList.length}</strong>
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
