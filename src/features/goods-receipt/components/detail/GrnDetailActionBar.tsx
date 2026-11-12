import type { FC } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  List,
} from 'lucide-react';
import type { GrnStatus } from '../../types/grn.types';

interface GrnDetailActionBarProps {
  status: GrnStatus;
  isConfirmationMode?: boolean;
  isSubmitting?: boolean;
  onBackToEdit: () => void;
  onBackToList: () => void;
  onConfirmGrn: () => void;
  onPrintGrn: () => void;
  onPrintLabels: () => void;
}

export const GrnDetailActionBar: FC<GrnDetailActionBarProps> = ({
  status,
  isConfirmationMode = false,
  isSubmitting = false,
  onBackToEdit,
  onBackToList,
  onConfirmGrn,
  onPrintGrn: _onPrintGrn,
  onPrintLabels: _onPrintLabels,
}) => {
  const isDraftOrConfirming = isConfirmationMode || status === 'DRAFT';

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTop: '2px solid #cbd5e1',
        padding: '12px 24px',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        zIndex: 50,
      }}
    >
      {/* Left side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBackToList}
          className="po-btn po-btn-outline"
          style={{ height: 38, padding: '0 14px', fontSize: 13, gap: 6 }}
        >
          <List size={16} />
          <span>Danh sách phiếu nhập (GRN List)</span>
        </button>

        {isDraftOrConfirming && (
          <button
            type="button"
            onClick={onBackToEdit}
            className="po-btn po-btn-outline"
            style={{
              height: 38,
              padding: '0 14px',
              fontSize: 13,
              gap: 6,
              color: '#dc2626',
              borderColor: '#fca5a5',
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại sửa kiểm đếm</span>
          </button>
        )}
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* H5: ẩn PRINT stub */}

        {/* Post Button for Confirmation / Draft */}
        {isDraftOrConfirming && (
          <button
            type="button"
            onClick={onConfirmGrn}
            disabled={isSubmitting}
            className="po-btn po-btn-primary"
            style={{
              height: 38,
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 800,
              gap: 8,
              backgroundColor: '#0f766e',
              borderColor: '#0f766e',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.3)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <CheckCircle2 size={18} />
            <span>{isSubmitting ? 'ĐANG XỬ LÝ NHẬP KHO...' : 'HOÀN TẤT & DUYỆT NHẬP KHO'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
