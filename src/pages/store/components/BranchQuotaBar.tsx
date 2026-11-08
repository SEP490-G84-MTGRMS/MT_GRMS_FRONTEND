// src/pages/store/components/BranchQuotaBar.tsx
import type { FC } from 'react';
import { Building2, Plus, Sparkles } from 'lucide-react';
import type { BranchQuotaResponse } from '../api/branchManagementApi';

interface BranchQuotaBarProps {
  quota: BranchQuotaResponse | null;
  isLoading: boolean;
  onOpenCreateModal: () => void;
  onOpenUpgradeModal: () => void;
  onGoToSubscriptions: () => void;
}

export const BranchQuotaBar: FC<BranchQuotaBarProps> = ({
  quota,
  isLoading,
  onOpenCreateModal,
  onOpenUpgradeModal,
  onGoToSubscriptions,
}) => {
  if (isLoading || !quota) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '20px 24px',
          border: '1px solid #EDF2F9',
          marginBottom: 24,
          opacity: 0.6,
        }}
      >
        <div style={{ width: 200, height: 20, background: '#E2E8F0', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ width: '100%', height: 10, background: '#F1F5F9', borderRadius: 5 }} />
      </div>
    );
  }

  const { usedBranches, maxBranches, canAddMore, currentPlanName } = quota;
  const percentage = Math.min(100, Math.round((usedBranches / maxBranches) * 100));
  const isNearLimit = percentage >= 80;

  const handleAddClick = () => {
    if (canAddMore) {
      onOpenCreateModal();
    } else {
      onOpenUpgradeModal();
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '22px 26px',
        border: '1px solid #EDF2F9',
        boxShadow: '0 4px 16px rgba(0, 30, 90, 0.04)',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: canAddMore ? '#EBF5FF' : '#FFF7ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: canAddMore ? '#0066FF' : '#EA580C',
            }}
          >
            <Building2 size={24} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Hạn mức chi nhánh chuỗi cửa hàng
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: '#F1F5F9',
                  color: '#475569',
                }}
              >
                {currentPlanName}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {canAddMore ? (
                <span>
                  Đã sử dụng <strong>{usedBranches}</strong> / <strong>{maxBranches}</strong> chi nhánh (còn trống{' '}
                  <strong style={{ color: '#0066FF' }}>{maxBranches - usedBranches}</strong> slot)
                </span>
              ) : (
                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                  {usedBranches > maxBranches
                    ? `Đã sử dụng ${usedBranches}/${maxBranches} chi nhánh (Vượt quá hạn mức ${usedBranches - maxBranches} chi nhánh)`
                    : `Đã đạt giới hạn tối đa ${maxBranches}/${maxBranches} chi nhánh của gói hiện tại`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!canAddMore && (
            <button
              type="button"
              onClick={onGoToSubscriptions}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #0066FF',
                background: '#F8FAFC',
                color: '#0066FF',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={16} />
              <span>Nâng cấp gói</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 20px',
              borderRadius: 'var(--radius-pill)',
              background: canAddMore ? 'var(--blue-primary)' : '#EA580C',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: canAddMore
                ? '0 4px 14px rgba(0, 102, 255, 0.28)'
                : '0 4px 14px rgba(234, 88, 12, 0.28)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>Thêm chi nhánh mới</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          background: '#F1F5F9',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            borderRadius: 4,
            background: isNearLimit
              ? 'linear-gradient(90deg, #F59E0B, #DC2626)'
              : 'linear-gradient(90deg, #0066FF, #00C853)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
};

