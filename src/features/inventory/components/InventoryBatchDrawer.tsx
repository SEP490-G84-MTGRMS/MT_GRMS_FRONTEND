import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, ShieldCheck, Clock, RotateCcw, Tag } from 'lucide-react';
import type { InventoryItem } from '../types/inventory.types';
import { MOCK_BATCH_ITEMS } from '../../batch/lib/mockBatchData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export const InventoryBatchDrawer: FC<Props> = ({ isOpen, onClose, item }) => {
  const navigate = useNavigate();

  if (!isOpen || !item) return null;

  // Filter batches matching this SKU and branch
  const batches = MOCK_BATCH_ITEMS.filter(
    (b) => b.sku === item.sku && (!item.branchId || b.branchId === item.branchId)
  );

  const getRiskBadge = (daysLeft: number) => {
    if (daysLeft <= 0) {
      return { label: 'Đã hết hạn', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: AlertTriangle };
    }
    if (daysLeft <= 7) {
      return { label: `Khẩn cấp (${daysLeft} ngày)`, bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', icon: AlertTriangle };
    }
    if (daysLeft <= 14) {
      return { label: `Cận date (${daysLeft} ngày)`, bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: Clock };
    }
    if (daysLeft <= 30) {
      return { label: `Cảnh báo (${daysLeft} ngày)`, bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: Clock };
    }
    return { label: `An toàn (${daysLeft} ngày)`, bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: ShieldCheck };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#ffffff',
          height: '100%',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Chi tiết các lô hàng FEFO &amp; Hạn sử dụng
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
              {item.productName}
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              SKU: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.sku}</span> · Chi nhánh: <strong>{item.branchName}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Stock Summary */}
        <div
          style={{
            padding: '12px 20px',
            background: '#f0fdfa',
            borderBottom: '1px solid #ccfbf1',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            fontSize: 12,
          }}
        >
          <div>
            <div style={{ color: '#0f766e', fontSize: 11 }}>Tồn vật lý:</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{fmt(item.onHand)} {item.unit}</div>
          </div>
          <div>
            <div style={{ color: '#0f766e', fontSize: 11 }}>Đã giữ/Chờ trả:</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#c2410c' }}>{fmt(item.committed)}</div>
          </div>
          <div>
            <div style={{ color: '#0f766e', fontSize: 11 }}>Khả dụng bán:</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>{fmt(item.available)}</div>
          </div>
          <div>
            <div style={{ color: '#0f766e', fontSize: 11 }}>Đang nhập (PO):</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb' }}>{fmt(item.onOrder)}</div>
          </div>
        </div>

        {/* Batch List Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
            Danh sách {batches.length} lô hàng (Ưu tiên xuất theo FEFO - Hạn gần xuất trước):
          </div>

          {batches.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #cbd5e1',
              }}
            >
              Không tìm thấy thông tin lô hàng chi tiết cho sản phẩm này tại chi nhánh.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {batches.map((batch) => {
                const badge = getRiskBadge(batch.daysLeft);
                const IconComponent = badge.icon;

                return (
                  <div
                    key={batch.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 14,
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#0f766e',
                            background: '#f0fdfa',
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #ccfbf1',
                          }}
                        >
                          {batch.batchCode}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          NCC: <strong>{batch.supplierName || 'NCC Đối tác'}</strong>
                        </span>
                      </div>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        <IconComponent size={12} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, marginBottom: 10 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Ngày sản xuất:</span>
                        <div style={{ fontWeight: 600 }}>
                          {batch.mfgDate || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Hạn sử dụng:</span>
                        <div style={{ fontWeight: 700, color: batch.daysLeft <= 14 ? '#dc2626' : '#0f172a' }}>
                          {batch.expiryDate || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Tồn lô:</span>
                        <div style={{ fontWeight: 700, color: '#0f766e' }}>
                          {fmt(batch.qtyCurrent)} {batch.unit}
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons per batch */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                      {batch.daysLeft <= 30 && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate('/store-owner/supplier-returns/create');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 26,
                            padding: '0 8px',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            color: '#c2410c',
                            cursor: 'pointer',
                          }}
                        >
                          <RotateCcw size={11} />
                          <span>Trả NCC</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/store-owner/batches?sku=${item.sku}`);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 26,
                          padding: '0 8px',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        <Tag size={11} />
                        <span>Xử lý lô</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => {
              onClose();
              navigate(`/store-owner/batches?sku=${item.sku}`);
            }}
            style={{ height: 32, fontSize: 12 }}
          >
            Mở toàn bộ quản lý Lô &amp; HSD
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={onClose}
            style={{ height: 32, padding: '0 16px', backgroundColor: '#0f766e', fontSize: 12 }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
