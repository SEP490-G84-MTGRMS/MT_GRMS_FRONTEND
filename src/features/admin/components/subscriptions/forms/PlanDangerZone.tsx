import React, { useState } from 'react';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { DeletePlanModal } from '../DeletePlanModal';

interface PlanDangerZoneProps {
  plan: SubscriptionPlan;
  onDeleted: () => void;
}

export const PlanDangerZone: React.FC<PlanDangerZoneProps> = ({
  plan,
  onDeleted,
}) => {
  const [showModal, setShowModal] = useState(false);
  const isProtected = plan.activeTenantCount > 0;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #fee2e2',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>
            Vùng Nguy Hiểm: Xóa Gói Dịch Vụ
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c' }}>
            Quy định nghiệp vụ GB-02: Bảo vệ hợp đồng và chu kỳ thuê bao của khách hàng
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: '#fff5f5',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px 20px',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>
            {isProtected ? (
              <span>⚠️ Gói dịch vụ này đang bị khóa xóa vì có {plan.activeTenantCount} cửa hàng đang sử dụng</span>
            ) : (
              <span>Gói dịch vụ này hiện có 0 khách hàng sử dụng, đủ điều kiện xóa</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: 1.4 }}>
            {isProtected
              ? 'Hệ thống bảo vệ quyền lợi người thuê (Grandfathering Protection). Bạn chỉ có thể chuyển trạng thái sang "Tạm ngưng mở bán" để ngừng tiếp nhận khách mới thay vì xóa gói.'
              : 'Xóa vĩnh viễn gói dịch vụ này khỏi danh mục. Hành động này không thể hoàn tác sau khi xác nhận.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 600,
            background: isProtected ? '#f1f5f9' : '#dc2626',
            color: isProtected ? '#94a3b8' : '#ffffff',
            border: isProtected ? '1px solid #cbd5e1' : 'none',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {isProtected ? '🔒 Không Thể Xóa (GB-02)' : '🗑️ Yêu Cầu Xóa Gói'}
        </button>
      </div>

      {showModal && (
        <DeletePlanModal
          plan={plan}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirmDelete={(_planId) => {
            setShowModal(false);
            onDeleted();
          }}
          onSwitchToInactive={(_planId) => {
            setShowModal(false);
            onDeleted();
          }}
        />
      )}
    </div>
  );
};
