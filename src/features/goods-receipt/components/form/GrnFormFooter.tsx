import type { FC } from 'react';
import { ArrowLeft, Save, Printer, CheckCircle2 } from 'lucide-react';

interface GrnFormFooterProps {
  notes: string;
  readOnly?: boolean;
  isSaving?: boolean;
  hidePrint?: boolean;
  onNotesChange: (val: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onCompleteAndPrint: () => void;
  onComplete: () => void;
}

export const GrnFormFooter: FC<GrnFormFooterProps> = ({
  notes,
  readOnly = false,
  isSaving = false,
  hidePrint = false,
  onNotesChange,
  onCancel,
  onSaveDraft,
  onCompleteAndPrint,
  onComplete,
}) => {
  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
      }}
    >
      <div style={{ padding: '12px 16px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '100%',
            maxWidth: 720,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Ghi chú</span>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={readOnly}
            placeholder="Tình trạng giao hàng, lệch số lượng..."
            rows={3}
            style={{
              width: '100%',
              minHeight: 72,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#0f172a',
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.4,
            }}
          />
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          boxShadow: '0 -2px 8px rgba(15, 23, 42, 0.04)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={14} />
          <span>{readOnly ? 'Quay lại danh sách' : 'Hủy bỏ'}</span>
        </button>

        {!readOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSaveDraft}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 6,
                border: '1px solid #fde68a',
                backgroundColor: '#fffdf5',
                color: '#b45309',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Lưu lại tiến độ kiểm đếm hiện tại để tiếp tục sau"
            >
              <Save size={14} />
              <span>Lưu nháp</span>
            </button>

            {!hidePrint && (
              <button
                type="button"
                disabled={isSaving}
                onClick={onCompleteAndPrint}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1px solid #0d9488',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Printer size={14} />
                <span>Nhập kho & In tem</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={onComplete}
              style={{
                height: 36,
                padding: '0 18px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'var(--blue-primary, #0f766e)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(15, 118, 110, 0.3)',
              }}
              title="Xác nhận nhập kho chính thức, tăng tồn kho và chốt công nợ"
            >
              <CheckCircle2 size={15} />
              <span>HOÀN TẤT NHẬP KHO</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
