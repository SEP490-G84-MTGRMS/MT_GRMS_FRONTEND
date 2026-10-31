import type { FC } from 'react';
import { Grid } from 'lucide-react';

interface OrderMatrixHeaderProps {
  status: string;
  onBack: () => void;
  onSave?: () => void;
  onGoToCutoffHub?: () => void;
  onOpenSplitModal?: () => void;
  title?: string;
  readOnly?: boolean;
  isSaving?: boolean;
  isStoreOwner?: boolean;
  onSwitchScreen?: () => void;
  switchScreenLabel?: string;
}

export const OrderMatrixHeader: FC<OrderMatrixHeaderProps> = ({
  status,
  onBack,
  onSave,
  onGoToCutoffHub,
  onOpenSplitModal,
  title,
  readOnly = false,
  isSaving = false,
  isStoreOwner = true,
  onSwitchScreen,
  switchScreenLabel,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-main)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Grid size={22} style={{ color: 'var(--blue-primary)' }} />
          {title || (readOnly ? 'Chi Tiết Đơn Đặt Hàng' : isStoreOwner ? 'Tạo Đơn Mua Hàng' : 'Đặt Hàng Theo Ma Trận')}
        </h1>

        {/* Nút chuyển đổi nhanh giữa màn Store Owner và Employee để test không cần login */}
        {onSwitchScreen && switchScreenLabel && (
          <button
            type="button"
            onClick={onSwitchScreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 20,
              border: isStoreOwner ? '1.5px solid #3b82f6' : '1.5px solid #f59e0b',
              backgroundColor: isStoreOwner ? '#eff6ff' : '#fffbeb',
              color: isStoreOwner ? '#1d4ed8' : '#b45309',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.15s ease',
            }}
            title={
              isStoreOwner
                ? 'Bấm để chuyển sang màn hình Nhân viên nhập số lượng đề xuất'
                : 'Bấm để chuyển sang màn hình Chủ cửa hàng xem và điều chỉnh'
            }
          >
            <span>{switchScreenLabel}</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!readOnly && isStoreOwner && onOpenSplitModal && (
          <button
            type="button"
            onClick={onOpenSplitModal}
            className="po-btn"
            style={{
              height: 32,
              padding: '0 16px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 6,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
            title="Chốt đơn & Tách PO theo từng [Chi nhánh + Nhà cung cấp + Ngày giao hàng]"
          >
            <span>Chốt Đơn &amp; Tách PO</span>
          </button>
        )}

        {isStoreOwner && onGoToCutoffHub && (
          <button
            type="button"
            onClick={onGoToCutoffHub}
            className="po-btn"
            style={{
              height: 32,
              padding: '0 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Mở Trung tâm Chốt Đơn & Tách PO theo Nhà Cung Cấp"
          >
            <span>Chốt đơn (Cutoff Hub)</span>
          </button>
        )}

        {!readOnly && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="po-btn po-btn-primary"
            style={{
              height: 32,
              padding: '0 16px',
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? 'wait' : 'pointer',
            }}
            title={isStoreOwner ? 'Lưu bản thảo ma trận đặt hàng' : 'Lưu số lượng đề xuất của nhân viên'}
          >
            <span>{isSaving ? 'Đang lưu...' : isStoreOwner ? 'Lưu Bản Thảo' : 'Lưu Đề Xuất'}</span>
          </button>
        )}

        {readOnly && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
            }}
          >
            Chế độ: <b>Chỉ xem (Chi tiết)</b>
          </span>
        )}

        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: status === 'APPROVED' ? 'var(--green-light)' : 'var(--bg-soft-blue)',
            color: status === 'APPROVED' ? 'var(--green-money)' : 'var(--blue-primary)',
            border: `1px solid ${status === 'APPROVED' ? 'var(--green-border)' : 'var(--blue-border)'}`,
          }}
        >
          Trạng thái: <b>{status}</b>
        </span>

        <button
          type="button"
          onClick={onBack}
          className="po-btn po-btn-secondary"
          style={{ height: 32, padding: '0 14px' }}
          title="Quay lại danh sách PO"
        >
          <span>Quay lại</span>
        </button>
      </div>
    </div>
  );
};
