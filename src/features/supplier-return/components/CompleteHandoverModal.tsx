import { useState } from 'react';
import type { FC } from 'react';
import { X, Truck, AlertTriangle } from 'lucide-react';
import type { SupplierReturnDetail, CompleteHandoverPayload } from '../types/supplierReturn.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  returnDetail: SupplierReturnDetail;
  onSubmit: (payload: CompleteHandoverPayload) => Promise<void>;
}

export const CompleteHandoverModal: FC<Props> = ({
  isOpen,
  onClose,
  returnDetail,
  onSubmit,
}) => {
  const [handedBy, setHandedBy] = useState('Nguyễn Văn Kho (Thủ kho)');
  const [notes, setNotes] = useState('');
  const [lineHanded, setLineHanded] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    returnDetail.lines.forEach((l) => {
      init[l.id] = l.approvedQty > 0 ? l.approvedQty : l.requestedQty;
    });
    return init;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    setErrorMsg('');
    if (!handedBy.trim()) {
      setErrorMsg('Vui lòng nhập tên nhân viên/người thực hiện bàn giao hàng.');
      return;
    }

    for (const line of returnDetail.lines) {
      const val = lineHanded[line.id] ?? 0;
      const maxAllowed = line.approvedQty > 0 ? line.approvedQty : line.requestedQty;
      if (val < 0 || val > maxAllowed) {
        setErrorMsg(`Số lượng bàn giao của '${line.productName}' không được vượt quá số lượng duyệt (${maxAllowed}).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload: CompleteHandoverPayload = {
        handedOverBy: handedBy.trim(),
        notes: notes.trim() || undefined,
        lines: returnDetail.lines.map((l) => ({
          lineId: l.id,
          handedOverQty: lineHanded[l.id] ?? (l.approvedQty > 0 ? l.approvedQty : l.requestedQty),
        })),
      };
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xác nhận bàn giao.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f0fdf4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#14532d' }}>
                Xác nhận bàn giao hàng thực tế cho NCC
              </h3>
              <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                Phiếu: <strong>{returnDetail.code}</strong> · Chi nhánh: {returnDetail.branchName}
              </div>
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
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Attention Banner */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fefce8',
              border: '1px solid #fef08a',
              marginBottom: 16,
              fontSize: 12.5,
              color: '#854d0e',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Lưu ý quan trọng (Phương án B):</strong> Khi bấm xác nhận bàn giao, hệ thống sẽ chính thức trừ số lượng tồn kho vật lý tại chi nhánh và ghi nhận giao dịch xuất trả <code>SUPPLIER_RETURN</code>.
            </div>
          </div>

          {/* Table of items to hand over */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
              Số lượng thực tế bàn giao lên xe NCC:
            </label>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Sản phẩm / Lô</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>SL NCC duyệt</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>SL thực bàn giao</th>
                  </tr>
                </thead>
                <tbody>
                  {returnDetail.lines.map((line) => {
                    const maxAllowed = line.approvedQty > 0 ? line.approvedQty : line.requestedQty;
                    const val = lineHanded[line.id] ?? maxAllowed;

                    return (
                      <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600 }}>{line.productName}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            SKU: {line.sku} {line.batchCode ? `· Lô: ${line.batchCode}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                          {maxAllowed} {line.unit}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            max={maxAllowed}
                            value={val}
                            onChange={(e) => {
                              const inputVal = Math.min(maxAllowed, Math.max(0, Number(e.target.value)));
                              setLineHanded((prev) => ({ ...prev, [line.id]: inputVal }));
                            }}
                            style={{
                              width: 80,
                              height: 30,
                              textAlign: 'right',
                              padding: '0 8px',
                              borderRadius: 4,
                              border: '1px solid #0d9488',
                              fontWeight: 700,
                              color: '#0f766e',
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Người thực hiện bàn giao: <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={handedBy}
                onChange={(e) => setHandedBy(e.target.value)}
                placeholder="Tên nhân viên phụ trách bàn giao..."
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Ghi chú thêm (Biển số xe, tên tài xế NCC...):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Xe tải 29H-12345, tài xế anh Minh đã ký nhận đủ hàng..."
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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
            style={{ height: 34, padding: '0 16px' }}
          >
            Đóng
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={handleSave}
            disabled={isSubmitting}
            style={{ height: 34, padding: '0 18px', backgroundColor: '#0f766e' }}
          >
            {isSubmitting ? 'Đang hoàn tất...' : 'Hoàn tất bàn giao & Trừ kho'}
          </button>
        </div>
      </div>
    </div>
  );
};
