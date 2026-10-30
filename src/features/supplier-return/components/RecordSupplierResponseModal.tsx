import { useState } from 'react';
import type { FC } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { SupplierReturnDetail, RecordSupplierResponsePayload } from '../types/supplierReturn.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  returnDetail: SupplierReturnDetail;
  onSubmit: (payload: RecordSupplierResponsePayload) => Promise<void>;
}

export const RecordSupplierResponseModal: FC<Props> = ({
  isOpen,
  onClose,
  returnDetail,
  onSubmit,
}) => {
  const [resultType, setResultType] = useState<RecordSupplierResponsePayload['resultType']>('APPROVED_FULL');
  const [note, setNote] = useState('');
  const [lineApproved, setLineApproved] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    returnDetail.lines.forEach((l) => {
      init[l.id] = l.requestedQty;
    });
    return init;
  });
  const [lineReasons, setLineReasons] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTypeChange = (type: RecordSupplierResponsePayload['resultType']) => {
    setResultType(type);
    const updated: Record<string, number> = {};
    returnDetail.lines.forEach((l) => {
      if (type === 'APPROVED_FULL') {
        updated[l.id] = l.requestedQty;
      } else if (type === 'REJECTED') {
        updated[l.id] = 0;
      } else {
        updated[l.id] = lineApproved[l.id] ?? l.requestedQty;
      }
    });
    setLineApproved(updated);
  };

  const handleSave = async () => {
    setErrorMsg('');
    // Validation
    if (resultType === 'APPROVED_PARTIAL') {
      for (const line of returnDetail.lines) {
        const val = lineApproved[line.id] ?? 0;
        if (val < 0 || val > line.requestedQty) {
          setErrorMsg(`Số lượng duyệt cho sản phẩm '${line.productName}' phải từ 0 đến ${line.requestedQty}.`);
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      const payload: RecordSupplierResponsePayload = {
        resultType,
        supplierResponseNote: note.trim() || undefined,
        lines: returnDetail.lines.map((l) => ({
          lineId: l.id,
          approvedQty: resultType === 'REJECTED' ? 0 : (lineApproved[l.id] ?? l.requestedQty),
          rejectionReason: lineReasons[l.id] || undefined,
        })),
      };
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu phản hồi.');
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
          maxWidth: 720,
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
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Ghi nhận phản hồi từ Nhà cung cấp
            </h3>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Phiếu trả: <strong style={{ color: '#0f766e' }}>{returnDetail.code}</strong> — {returnDetail.supplierName}
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

          {/* Decision Radio Boxes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
              Kết quả phản hồi của NCC:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div
                onClick={() => handleTypeChange('APPROVED_FULL')}
                style={{
                  border: resultType === 'APPROVED_FULL' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: resultType === 'APPROVED_FULL' ? '#f0fdf4' : '#ffffff',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <CheckCircle size={20} color="#16a34a" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Đồng ý toàn bộ</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Chấp nhận trả đủ 100%</div>
              </div>

              <div
                onClick={() => handleTypeChange('APPROVED_PARTIAL')}
                style={{
                  border: resultType === 'APPROVED_PARTIAL' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  background: resultType === 'APPROVED_PARTIAL' ? '#fffbeb' : '#ffffff',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <AlertTriangle size={20} color="#f59e0b" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>Đồng ý một phần</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Chỉ nhận một số lượng</div>
              </div>

              <div
                onClick={() => handleTypeChange('REJECTED')}
                style={{
                  border: resultType === 'REJECTED' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: resultType === 'REJECTED' ? '#fef2f2' : '#ffffff',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <XCircle size={20} color="#dc2626" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Từ chối toàn bộ</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Không chấp thuận trả</div>
              </div>
            </div>
          </div>

          {/* Lines Table for Approval */}
          {resultType !== 'REJECTED' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                Chi tiết số lượng chấp thuận theo từng dòng:
              </label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Sản phẩm / Lô</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>SL yêu cầu</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>SL duyệt</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>SL từ chối</th>
                      {resultType === 'APPROVED_PARTIAL' && (
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Lý do từ chối</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {returnDetail.lines.map((line) => {
                      const approved = lineApproved[line.id] ?? line.requestedQty;
                      const rejected = Math.max(0, line.requestedQty - approved);

                      return (
                        <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600 }}>{line.productName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              SKU: {line.sku} {line.batchCode ? `· Lô: ${line.batchCode}` : ''}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                            {line.requestedQty} {line.unit}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {resultType === 'APPROVED_FULL' ? (
                              <span style={{ fontWeight: 700, color: '#16a34a' }}>{line.requestedQty}</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={line.requestedQty}
                                value={approved}
                                onChange={(e) => {
                                  const val = Math.min(line.requestedQty, Math.max(0, Number(e.target.value)));
                                  setLineApproved((prev) => ({ ...prev, [line.id]: val }));
                                }}
                                style={{
                                  width: 70,
                                  height: 30,
                                  textAlign: 'right',
                                  padding: '0 6px',
                                  borderRadius: 4,
                                  border: '1px solid #cbd5e1',
                                  fontWeight: 700,
                                  color: '#16a34a',
                                }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: rejected > 0 ? '#dc2626' : '#94a3b8' }}>
                            {rejected}
                          </td>
                          {resultType === 'APPROVED_PARTIAL' && (
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="text"
                                placeholder="Lý do NCC từ chối phần này..."
                                value={lineReasons[line.id] || ''}
                                onChange={(e) => setLineReasons((prev) => ({ ...prev, [line.id]: e.target.value }))}
                                style={{
                                  width: '100%',
                                  height: 30,
                                  padding: '0 8px',
                                  borderRadius: 4,
                                  border: '1px solid #cbd5e1',
                                  fontSize: 12,
                                }}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Response Note */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
              Ghi chú phản hồi của NCC (hoặc số biên bản trao đổi):
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đại diện NCC Nguyễn Văn B đã xác nhận chấp thuận qua Zalo/Email, hẹn lấy hàng ngày mai..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
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
            style={{
              height: 34,
              padding: '0 18px',
              backgroundColor: resultType === 'REJECTED' ? '#dc2626' : '#0f766e',
            }}
          >
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận phản hồi'}
          </button>
        </div>
      </div>
    </div>
  );
};
