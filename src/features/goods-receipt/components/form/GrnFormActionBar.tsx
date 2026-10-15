import type { FC } from 'react';
import { ArrowLeft, Save, Printer, CheckCircle2 } from 'lucide-react';

interface GrnFormActionBarProps {
  readOnly?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onCompleteAndPrint: () => void;
  onComplete: () => void;
}

export const GrnFormActionBar: FC<GrnFormActionBarProps> = ({
  readOnly = false,
  isSaving = false,
  onCancel,
  onSaveDraft,
  onCompleteAndPrint,
  onComplete,
}) => {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '12px 24px',
        boxShadow: '0 -3px 12px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        borderRadius: 8,
      }}
    >
      {/* Left: Nút Quay lại / Hủy */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 34,
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
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={14} />
          <span>{readOnly ? 'Quay lại danh sách' : 'Hủy bỏ'}</span>
        </button>
      </div>

      {/* Right: Các nút hành động chính */}
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 1. Lưu nháp */}
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveDraft}
            style={{
              height: 34,
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
              transition: 'all 0.15s ease',
            }}
            title="Lưu lại tiến độ kiểm đếm hiện tại để tiếp tục sau"
          >
            <Save size={14} />
            <span>Lưu nháp (Draft)</span>
          </button>

          {/* 2. Nhập kho & In tem */}
          <button
            type="button"
            disabled={isSaving}
            onClick={onCompleteAndPrint}
            style={{
              height: 34,
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
              transition: 'all 0.15s ease',
            }}
            title="Xác nhận hoàn tất phiếu và mở dialog in tem mã vạch"
          >
            <Printer size={14} />
            <span>Nhập kho & In tem</span>
          </button>

          {/* 3. HOÀN TẤT NHẬP KHO */}
          <button
            type="button"
            disabled={isSaving}
            onClick={onComplete}
            style={{
              height: 34,
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
              transition: 'all 0.15s ease',
            }}
            title="Xác nhận nhập kho chính thức, tăng tồn kho và chốt công nợ"
          >
            <CheckCircle2 size={15} />
            <span>HOÀN TẤT NHẬP KHO</span>
          </button>
        </div>
      )}
    </div>
  );
};
