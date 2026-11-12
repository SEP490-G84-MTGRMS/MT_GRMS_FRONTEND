import { useEffect } from 'react';
import type { FC } from 'react';
import { X, ChevronUp, ChevronDown, Send, Store, PackageOpen, Loader2 } from 'lucide-react';
import type { DispatchSupplierDetail } from '../../types/po.types';

interface SupplierDispatchDrawerProps {
  detail: DispatchSupplierDetail | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onPrevSupplier: () => void;
  onNextSupplier: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex?: number;
  totalSuppliersCount?: number;
  onDispatch: () => void;
}

export const SupplierDispatchDrawer: FC<SupplierDispatchDrawerProps> = ({
  detail,
  isOpen,
  isLoading = false,
  onClose,
  onPrevSupplier,
  onNextSupplier,
  hasPrev,
  hasNext,
  currentIndex,
  totalSuppliersCount,
  onDispatch,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalAmount =
    detail?.branches.reduce(
      (sum, b) => sum + b.items.reduce((s, it) => s + it.qty * it.price, 0),
      0
    ) ?? 0;
  const totalSku = detail?.branches.reduce((sum, b) => sum + b.items.length, 0) ?? 0;
  const canDispatch = detail?.status !== 'dispatched' && totalSku > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 760,
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 51,
        }}
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                {detail?.code || '—'}
              </span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {detail?.name || 'Chi tiết nhà cung cấp'}
              </h2>
              {isLoading && <Loader2 size={14} className="animate-spin" color="#0d9488" />}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
              {detail?.countdownDisplay || '—'} · {detail?.branches.length || 0} cửa hàng có dữ liệu
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {currentIndex !== undefined && totalSuppliersCount !== undefined && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {currentIndex + 1}/{totalSuppliersCount}
              </span>
            )}
            <button type="button" className="po-btn po-btn-secondary" style={{ height: 30, padding: '0 8px' }} disabled={!hasPrev} onClick={onPrevSupplier}>
              <ChevronUp size={14} />
            </button>
            <button type="button" className="po-btn po-btn-secondary" style={{ height: 30, padding: '0 8px' }} disabled={!hasNext} onClick={onNextSupplier}>
              <ChevronDown size={14} />
            </button>
            <button type="button" className="po-btn po-btn-secondary" style={{ height: 30, padding: '0 8px' }} onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f8fafc' }}>
          {isLoading && !detail ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Đang tải chi tiết…</div>
          ) : !detail || detail.branches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              <PackageOpen size={36} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600 }}>Chưa có sản phẩm nào có số lượng đặt cho NCC này</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Nhập số lượng trên ma trận đặt hàng theo từng cửa hàng trước khi chốt.</div>
            </div>
          ) : (
            detail.branches.map((branch) => {
              const branchAmount = branch.items.reduce((s, it) => s + it.qty * it.price, 0);
              return (
                <div
                  key={branch.branchId}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    marginBottom: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      background: '#f0fdfa',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0f766e' }}>
                      <Store size={15} />
                      <span>
                        {branch.branchCode} — {branch.branchName}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      {branch.items.length} dòng · {branchAmount.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Sản phẩm</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Ngày giao</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>SL</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branch.items.map((it) => (
                        <tr key={it.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                              {it.sku} · {it.unit}
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            <div>{it.deliveryDate}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{it.cutoffSchedule}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                            {it.qty}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                            {(it.qty * it.price).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontSize: 12.5, color: '#475569' }}>
            <b>{totalSku}</b> dòng · <b style={{ color: '#059669' }}>{totalAmount.toLocaleString('vi-VN')} đ</b>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="po-btn po-btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="po-btn po-btn-primary"
              disabled={!canDispatch}
              onClick={onDispatch}
              title="Chọn phạm vi NEAREST/WEEK rồi chốt cho mọi cửa hàng có SL"
            >
              <Send size={14} />
              <span>Chốt đơn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
