import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockSubscriptionPlans } from '../../features/admin/data/mockPlanData';
import type { SubscriptionPlan } from '../../features/admin/types/plan.types';
import {
  PlanPricingCard,
  PlanQuotasCard,
  PlanFeaturesCard,
  PlanTenantsCard,
  PlanBusinessStatsCard,
  PlanChangelogCard,
  PlanInternalNotesCard,
  UpdatePlanModal,
  DeletePlanModal,
} from '../../features/admin/components/subscriptions';
import {
  ArrowLeft,
  Edit2,
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const SubscriptionPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>(mockSubscriptionPlans);

  // Current plan
  const currentPlan = plans.find((p) => p.id === id || p.code === id) || plans[2] || plans[0];

  // Modals
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleUpdatePlan = (updatedPlan: SubscriptionPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
    showToast(`Đã cập nhật cấu hình gói dịch vụ "${updatedPlan.name}" thành công!`);
  };

  const handleToggleStatus = () => {
    const nextStatus = currentPlan.status === 'Active' ? 'Inactive' : 'Active';
    const updated = {
      ...currentPlan,
      status: nextStatus as SubscriptionPlan['status'],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    handleUpdatePlan(updated);
    showToast(`Đã chuyển trạng thái gói sang: ${nextStatus === 'Active' ? 'Đang mở bán' : 'Tạm ngừng bán'}`);
  };

  const handleDeletePlan = (planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    showToast(`Đã xóa vĩnh viễn gói dịch vụ ${currentPlan.name} khỏi hệ thống!`);
    setTimeout(() => {
      navigate('/admin/subscriptions');
    }, 1200);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#065f46' : toast.type === 'warning' ? '#92400e' : '#1e3a8a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* BACK BUTTON & TOP BREADCRUMB */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/admin/subscriptions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--blue-primary)',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            padding: '4px 0',
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Danh sách Gói dịch vụ</span>
        </Link>
      </div>

      {/* HEADER TOOLBAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--text-main)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Hồ sơ Chi tiết: {currentPlan.name}
            </h1>
            <span
              className={currentPlan.status === 'Active' ? 'admin-badge-success' : 'admin-badge-secondary'}
              style={{ fontSize: 12, padding: '3px 10px', borderRadius: 9999, fontWeight: 700 }}
            >
              {currentPlan.status === 'Active' ? 'Active - Đang mở bán' : 'Inactive - Tạm ngừng bán'}
            </span>
            {currentPlan.code === 'PLAN_ADVANCED' && (
              <span
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                }}
              >
                Gói Mặc Định
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>Mã gói: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-primary)' }}>{currentPlan.code}</code></span>
            <span>&bull;</span>
            <span>Chu kỳ: Hàng tháng / Hàng năm</span>
            <span>&bull;</span>
            <span>Khởi tạo: <span style={{ fontFamily: 'var(--font-mono)' }}>{currentPlan.createdAt}</span></span>
            <span>&bull;</span>
            <span>Quản trị bởi: SaaS Master Admin</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setIsUpdateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Edit2 size={14} />
            <span>Chỉnh sửa gói</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleToggleStatus}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Power size={14} />
            <span>{currentPlan.status === 'Active' ? 'Ngừng bán' : 'Mở bán lại'}</span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => setIsDeleteOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            }}
          >
            <Trash2 size={14} />
            <span>Xóa gói cước</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN LAYOUT: 68% CỘT CHÍNH / 32% CỘT PHỤ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 68%) minmax(0, 32%)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* CỘT CHÍNH TRÁI */}
        <div>
          <PlanPricingCard plan={currentPlan} />
          <PlanQuotasCard plan={currentPlan} />
          <PlanFeaturesCard plan={currentPlan} />
          <PlanTenantsCard plan={currentPlan} />
        </div>

        {/* CỘT PHỤ PHẢI */}
        <div>
          <PlanBusinessStatsCard plan={currentPlan} />
          <PlanChangelogCard plan={currentPlan} />
          <PlanInternalNotesCard
            onSaveNote={() => showToast('Đã lưu ghi chú quản trị nội bộ thành công!')}
          />
        </div>
      </div>

      {/* MODALS */}
      <UpdatePlanModal
        plan={currentPlan}
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        onSave={handleUpdatePlan}
      />

      <DeletePlanModal
        plan={currentPlan}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirmDelete={handleDeletePlan}
        onSwitchToInactive={handleToggleStatus}
      />
    </div>
  );
};
