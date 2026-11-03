// src/pages/store/components/BranchUpgradeModal.tsx
import type { FC } from 'react';
import { X, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import type { BranchQuotaResponse } from '../api/branchManagementApi';

interface BranchUpgradeModalProps {
  quota: BranchQuotaResponse | null;
  onClose: () => void;
  onGoToUpgrade: () => void;
}

export const BranchUpgradeModal: FC<BranchUpgradeModalProps> = ({
  quota,
  onClose,
  onGoToUpgrade,
}) => {
  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500, textAlign: 'center', padding: '32px 28px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -12, marginRight: -8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: '#FFF7ED',
            color: '#EA580C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 24px rgba(234, 88, 12, 0.16)',
          }}
        >
          <Building2 size={34} strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
          Đã đạt hạn mức chi nhánh
        </h3>

        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 20px 0' }}>
          Gói cước hiện tại <strong>{quota?.currentPlanName || 'Cơ bản'}</strong> chỉ hỗ trợ tối đa{' '}
          <strong style={{ color: '#0F172A' }}>{quota?.maxBranches ?? 1} chi nhánh</strong>. Chuỗi cửa hàng của bạn đã sử dụng đủ{' '}
          {quota?.usedBranches ?? 1} slot.
        </p>

        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
            <CheckCircle2 size={16} color="#00C853" />
            <span>Mở rộng không giới hạn chi nhánh và kho hàng</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
            <CheckCircle2 size={16} color="#00C853" />
            <span>Đồng bộ tồn kho liên chi nhánh và điều chuyển tức thì</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
            <CheckCircle2 size={16} color="#00C853" />
            <span>Báo cáo doanh thu & P&L tổng hợp chuỗi theo thời gian thực</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Để sau
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToUpgrade();
            }}
            style={{
              flex: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 20px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--blue-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 102, 255, 0.3)',
            }}
          >
            <Sparkles size={16} />
            <span>Nâng cấp gói ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

