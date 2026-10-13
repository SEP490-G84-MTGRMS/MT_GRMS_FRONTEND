import type { FC } from 'react';
import { ArrowLeft, Grid, Save } from 'lucide-react';

interface OrderMatrixHeaderProps {
  status: string;
  onBack: () => void;
  onSave?: () => void;
}

export const OrderMatrixHeader: FC<OrderMatrixHeaderProps> = ({ status, onBack, onSave }) => {
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
      <div>
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
          Tạo Đơn Mua Hàng
        </h1>

      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 16px' }}
            title="Lưu bản thảo ma trận đặt hàng"
          >
            <Save size={14} />
            <span>Lưu</span>
          </button>
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
          style={{ height: 32 }}
          title="Quay lại danh sách PO"
        >
          <ArrowLeft size={14} />
          <span>Quay lại</span>
        </button>
      </div>
    </div>
  );
};
