import type { FC } from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';

interface StocktakeFormFooterProps {
  notes: string;
  isSaving?: boolean;
  disabled?: boolean;
  onNotesChange: (val: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export const StocktakeFormFooter: FC<StocktakeFormFooterProps> = ({
  notes,
  isSaving = false,
  disabled = false,
  onNotesChange,
  onCancel,
  onSaveDraft,
  onSubmit,
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
            disabled={disabled || isSaving}
            placeholder="Ghi chú kiểm kê, khu vực đếm, bất thường..."
            rows={3}
            style={{
              width: '100%',
              minHeight: 72,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#0f172a',
              backgroundColor: disabled ? '#f8fafc' : '#ffffff',
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
          <span>Hủy bỏ</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            disabled={isSaving || disabled}
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
              cursor: isSaving || disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Save size={14} />
            <span>Lưu nháp</span>
          </button>

          <button
            type="button"
            disabled={isSaving || disabled}
            onClick={onSubmit}
            style={{
              height: 36,
              padding: '0 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isSaving || disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.3)',
            }}
          >
            <Send size={14} />
            <span>GỬI DUYỆT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
