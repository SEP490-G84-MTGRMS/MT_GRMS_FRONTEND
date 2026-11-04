import type { FC } from 'react';
import { X, Send, CheckCircle2, Zap, Calendar } from 'lucide-react';
import type { DispatchScope, SplitMatrixBatchResult, SupplierDispatchGroup } from '../../types/po.types';

interface DispatchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  supplier: SupplierDispatchGroup | null;
  scope: DispatchScope;
  onScopeChange: (scope: DispatchScope) => void;
  weekStartDate: string;
  onWeekChange: (value: string) => void;
  previewData?: SplitMatrixBatchResult | null;
  batchResult?: SplitMatrixBatchResult | null;
  note?: string;
  onNoteChange?: (note: string) => void;
}

function getMondayOfThisWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 + (day - 1)) % 7;
  d.setDate(d.getDate() - diff);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DispatchConfirmModal: FC<DispatchConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  supplier,
  scope,
  onScopeChange,
  weekStartDate,
  onWeekChange,
  previewData = null,
  batchResult = null,
  note = '',
  onNoteChange,
}) => {
  if (!isOpen || !supplier) return null;

  const statusColor = (status: string) => {
    if (status === 'SUCCESS') return '#15803d';
    if (status === 'FAILED') return '#b91c1c';
    if (status === 'ALREADY_FINALIZED') return '#0369a1';
    return '#64748b';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {batchResult ? 'Kết quả chốt đơn' : 'Xác nhận chốt đơn NCC'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              {supplier.code} — {supplier.name}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {!batchResult && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Phạm vi chốt đơn</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => onScopeChange('NEAREST')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 36,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: scope === 'NEAREST' ? '1px solid #0d9488' : '1px solid #cbd5e1',
                      background: scope === 'NEAREST' ? '#f0fdfa' : '#fff',
                      color: scope === 'NEAREST' ? '#0f766e' : '#334155',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    <Zap size={14} /> Ngày giao gần nhất
                  </button>
                  <button
                    type="button"
                    onClick={() => onScopeChange('WEEK')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 36,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: scope === 'WEEK' ? '1px solid #0369a1' : '1px solid #cbd5e1',
                      background: scope === 'WEEK' ? '#f0f9ff' : '#fff',
                      color: scope === 'WEEK' ? '#0369a1' : '#334155',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    <Calendar size={14} /> Cả tuần (T2–CN)
                  </button>
                </div>
                {scope === 'WEEK' && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: '#64748b' }}>Tuần bắt đầu (Thứ Hai):</label>
                    <input
                      type="date"
                      value={weekStartDate || getMondayOfThisWeek()}
                      onChange={(e) => onWeekChange(e.target.value)}
                      style={{ height: 32, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 14,
                  fontSize: 12.5,
                  color: '#475569',
                  lineHeight: 1.55,
                }}
              >
                Hệ thống sẽ tổng hợp toàn bộ sản phẩm trong phạm vi giao hàng của NCC này và chốt với
                <b> mọi cửa hàng đang liên kết</b> có số lượng nhập. Mỗi PO vẫn theo công thức
                <b> 1 cửa hàng × 1 NCC × 1 ngày giao</b>.
              </div>

              {previewData && (
                <div style={{ marginBottom: 14, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>Số group: <b>{previewData.totalGroups}</b></div>
                    <div>Dự kiến thành công: <b>{previewData.successCount}</b></div>
                    <div>Bỏ qua: <b>{previewData.skippedCount}</b></div>
                    <div>Đã chốt trước: <b>{previewData.alreadyFinalizedCount}</b></div>
                  </div>
                </div>
              )}

              {onNoteChange && (
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>Ghi chú (tuỳ chọn)</label>
                  <textarea
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      padding: 10,
                      fontSize: 13,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Ghi chú gửi kèm PO…"
                  />
                </div>
              )}
            </>
          )}

          {batchResult && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span style={{ fontWeight: 700 }}>
                  Thành công {batchResult.successCount}/{batchResult.totalGroups} group
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {batchResult.results.map((r, idx) => (
                  <div
                    key={`${r.branchId}-${r.supplierId}-${r.deliveryDate}-${idx}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 12px',
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {r.branchName || r.branchId || 'Cửa hàng'} · {String(r.deliveryDate).slice(0, 10)}
                        </div>
                        <div style={{ color: '#64748b', marginTop: 2 }}>
                          {r.purchaseOrderCode || r.errorMessage || r.errorCode || '—'}
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: statusColor(r.status) }}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {batchResult ? 'Đóng' : 'Hủy'}
          </button>
          {!batchResult && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.75 : 1 }}
            >
              <Send size={14} />
              <span>
                {isSubmitting
                  ? 'Đang chốt…'
                  : scope === 'WEEK'
                  ? 'Chốt đơn cả tuần'
                  : 'Chốt ngày giao gần nhất'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
