import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Lock,
  Unlock,
  Calendar,
  Building2,
  Users,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  Sparkles,
  Server,
  FileSpreadsheet,
} from 'lucide-react';
import { mockTenants, mockTenantQuota, mockFeatureFlags } from '../../features/admin/data/mockAdminData';
import {
  AdminToast,
  type ToastState,
  ExtendGraceModal,
  ApplyLockModal,
} from '../../features/admin/components';
import type { Tenant, LockType } from '../../features/admin/types/admin.types';
import { tenantApi, mapBackendTenantDetailToFrontend } from '../../features/admin/api';

export const TenantDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Load tenant list and active tenant
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [realTenant, setRealTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!id) return;
    tenantApi.getById(id).then(res => {
      if (res.success && res.data) setRealTenant(mapBackendTenantDetailToFrontend(res.data));
    }).catch(() => {});
  }, [id]);
  const currentTenant = useMemo(() => {
    return (
      realTenant || tenants.find((t) => t.id === id || t.subdomain === id) ||
      tenants[0]
    );
  }, [tenants, id]);

  const [activeTab, setActiveTab] = useState<'resources' | 'features' | 'info' | 'audit'>('resources');
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);

  // Modals state
  const [isGraceOpen, setIsGraceOpen] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleCopySubdomain = () => {
    if (!currentTenant) return;
    navigator.clipboard.writeText(`${currentTenant.subdomain}.mtgrms.vn`);
    setCopiedSubdomain(true);
    showToast(`Đã sao chép liên kết tên miền: ${currentTenant.subdomain}.mtgrms.vn`);
    setTimeout(() => setCopiedSubdomain(false), 2000);
  };

  const handleUnlock = async () => {
    if (currentTenant) { try { await tenantApi.unlock(currentTenant.id); } catch {} }
    if (realTenant) setRealTenant((prev) => (prev ? { ...prev, status: "active", lockType: undefined } : null));
    if (!currentTenant) return;
    setTenants((prev) =>
      prev.map((t) =>
        t.id === currentTenant.id
          ? { ...t, status: 'active', lockType: undefined }
          : t
      )
    );
    showToast(`Đã dỡ bỏ lệnh khóa và phục hồi dịch vụ cho chuỗi ${currentTenant.name}.`, 'success');
  };

  const handleApplyLockSubmit = async (tenant: Tenant, lockType: LockType) => {
    try { await tenantApi.lock(tenant.id, { lockType: lockType.toUpperCase() as "SOFT" | "HARD", reason: "Khóa từ trang chi tiết" }); } catch {}
    if (realTenant) setRealTenant((prev) => (prev ? { ...prev, status: "locked", lockType } : null));
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenant.id ? { ...t, status: 'locked', lockType } : t
      )
    );
    showToast(
      `Đã áp dụng lệnh khóa (${lockType === 'hard' ? 'Hard-Lock' : 'Soft-Lock'}) cho ${tenant.name}.`,
      'warning'
    );
  };

  const handleExtendGraceSubmit = async (tenant: Tenant, days: number) => {
    try { await tenantApi.extendGrace(tenant.id, { additionalDays: days, reason: "Gia hạn từ trang chi tiết" }); } catch {}
    if (realTenant) setRealTenant((prev) => (prev ? { ...prev, status: "grace", graceDaysRemaining: (prev.graceDaysRemaining || 0) + days } : null));
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenant.id
          ? {
              ...t,
              status: 'active',
              graceDaysRemaining: (t.graceDaysRemaining || 0) + days,
              expiryDate: `Đã gia hạn +${days}d`,
            }
          : t
      )
    );
    showToast(`Đã gia hạn thành công ${days} ngày cho chuỗi ${tenant.name}.`, 'success');
  };

  if (!currentTenant) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy khách hàng thuê yêu cầu.</p>
        <Link to="/admin/tenants" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: 12 }}>
          Quay lại danh sách Tenant
        </Link>
      </div>
    );
  }

  // Helper status badge
  const renderStatusBadge = () => {
    switch (currentTenant.status) {
      case 'active':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: '#E8F9EE',
              color: '#00C853',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid #BBF7D0',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#00C853' }} />
            Hoạt động
          </span>
        );
      case 'expiring':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: '#FFF8EB',
              color: '#FF9500',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid #FFE8CC',
            }}
          >
            <AlertTriangle size={13} />
            Sắp hết hạn
          </span>
        );
      case 'grace':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: '#FFF0F0',
              color: '#FF3B30',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid #FFD6D6',
            }}
          >
            <Clock size={13} />
            Đang ân hạn ({currentTenant.graceDaysRemaining ? 7 - currentTenant.graceDaysRemaining : 3}/7d)
          </span>
        );
      case 'locked':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: '#FFF0F0',
              color: '#FF3B30',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid #FFD6D6',
            }}
          >
            <Lock size={13} />
            Bị Khóa {currentTenant.lockType === 'hard' ? '(Hard-Lock)' : '(Soft-Lock)'}
          </span>
        );
      case 'pending':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid #E2E8F0',
            }}
          >
            Chờ kích hoạt
          </span>
        );
    }
  };

  const getPlanName = () => {
    switch (currentTenant.plan) {
      case 'enterprise':
        return 'Gói Doanh Nghiệp (Enterprise)';
      case 'advanced':
        return 'Gói Nâng Cao (Advanced)';
      case 'basic':
      default:
        return 'Gói Cơ Bản (Standard)';
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Top Breadcrumb & Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin/tenants')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill, 9999px)',
            background: '#ffffff',
            border: '1px solid var(--border-light, #EDF2F9)',
            color: 'var(--text-main, #0F172A)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--blue-primary, #0066FF)';
            e.currentTarget.style.color = 'var(--blue-primary, #0066FF)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light, #EDF2F9)';
            e.currentTarget.style.color = 'var(--text-main, #0F172A)';
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách Khách hàng</span>
        </button>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentTenant.status === 'locked' ? (
            <button
              type="button"
              onClick={handleUnlock}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                background: '#E8F9EE',
                border: '1px solid #BBF7D0',
                color: '#00C853',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Unlock size={14} />
              <span>Mở khóa dịch vụ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLockOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                background: '#FFF0F0',
                border: '1px solid #FFD6D6',
                color: '#FF3B30',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Lock size={14} />
              <span>Khóa dịch vụ</span>
            </button>
          )}

          {(currentTenant.status === 'grace' || currentTenant.status === 'expiring') && (
            <button
              type="button"
              onClick={() => setIsGraceOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                background: '#FFF8EB',
                border: '1px solid #FFE8CC',
                color: '#FF9500',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Calendar size={14} />
              <span>Gia hạn ân hạn (+7d)</span>
            </button>
          )}

          <Link
            to="/store-owner/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--blue-primary, #0066FF)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0, 102, 255, 0.28)',
            }}
          >
            <ExternalLink size={14} />
            <span>Vào Quản lý Tiệm này</span>
          </Link>

          <button
            type="button"
            onClick={() => showToast('Đang kết xuất hồ sơ Tenant ra định dạng PDF/Excel...')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-pill)',
              background: '#ffffff',
              border: '1px solid var(--border-light, #EDF2F9)',
              color: 'var(--text-muted, #64748B)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Kết xuất hồ sơ"
          >
            <FileSpreadsheet size={15} />
          </button>
        </div>
      </div>

      {/* Main Tenant Profile Banner Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '24px 28px',
          border: '1px solid var(--border-light, #EDF2F9)',
          boxShadow: '0 4px 18px rgba(0, 20, 60, 0.04)',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* Store Icon Avatar */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: 'linear-gradient(135deg, var(--blue-primary, #0066FF), #003D99)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 6px 14px rgba(0, 102, 255, 0.25)',
              }}
            >
              {currentTenant.name.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--text-main, #0F172A)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {currentTenant.name}
                </h1>
                {renderStatusBadge()}
              </div>

              {/* Subdomain & Tax details */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginTop: 6,
                  fontSize: 13,
                  color: 'var(--text-muted, #64748B)',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-soft-blue, #F7FAFF)',
                    border: '1px solid var(--border-light, #EDF2F9)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    color: 'var(--blue-primary, #0066FF)',
                  }}
                >
                  <span>{currentTenant.subdomain}.mtgrms.vn</span>
                  <button
                    type="button"
                    onClick={handleCopySubdomain}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--blue-primary, #0066FF)',
                    }}
                    title="Sao chép tên miền"
                  >
                    {copiedSubdomain ? <Check size={13} color="#00C853" /> : <Copy size={13} />}
                  </button>
                </div>

                <span>•</span>
                <span>MST: <b style={{ fontFamily: 'var(--font-mono)' }}>{currentTenant.taxCode}</b></span>
                <span>•</span>
                <span>Khu vực: <b>{currentTenant.city}</b></span>
                <span>•</span>
                <span>Hạn hợp đồng: <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{currentTenant.expiryDate}</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Highlight Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Gói dịch vụ */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '20px',
            border: '1px solid var(--border-light, #EDF2F9)',
            boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>GÓI DỊCH VỤ SAAS</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-soft-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary)',
              }}
            >
              <Sparkles size={16} />
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
            {getPlanName()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--blue-primary)', fontWeight: 600 }}>
            Thanh toán theo chu kỳ năm (12T)
          </div>
        </div>

        {/* Card 2: Điểm bán / Chi nhánh */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '20px',
            border: '1px solid var(--border-light, #EDF2F9)',
            boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>ĐIỂM BÁN / CHI NHÁNH</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-soft-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary)',
              }}
            >
              <Building2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {currentTenant.branchCount} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>/ {currentTenant.maxBranches === 'unlimited' ? '∞' : currentTenant.maxBranches} điểm</span>
          </div>
          <div style={{ fontSize: 12, color: '#00C853', fontWeight: 600, marginTop: 4 }}>
            Đang hoạt động đồng bộ
          </div>
        </div>

        {/* Card 3: Nhân sự / Thu ngân */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '20px',
            border: '1px solid var(--border-light, #EDF2F9)',
            boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>TÀI KHOẢN NHÂN SỰ</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-soft-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary)',
              }}
            >
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {currentTenant.staffCount} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>/ {currentTenant.maxStaff === 'unlimited' ? '∞' : currentTenant.maxStaff} người</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
            Bao gồm Quản trị & Thu ngân POS
          </div>
        </div>

        {/* Card 4: Hạ tầng Database */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '20px',
            border: '1px solid var(--border-light, #EDF2F9)',
            boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>CƠ SỞ DỮ LIỆU CÔ LẬP</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-soft-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00C853',
              }}
            >
              <Database size={16} />
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {currentTenant.subdomain}_db
          </div>
          <div style={{ fontSize: 12, color: '#00C853', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00C853' }} />
            Database-per-tenant cô lập 100%
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-light, #EDF2F9)',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: activeTab === 'resources' ? 800 : 600,
            color: activeTab === 'resources' ? 'var(--blue-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'resources' ? '3px solid var(--blue-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Định ngạch & Quota Tài nguyên
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: activeTab === 'features' ? 800 : 600,
            color: activeTab === 'features' ? 'var(--blue-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'features' ? '3px solid var(--blue-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          6 Tính năng Cốt lõi (Feature Flags)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: activeTab === 'info' ? 800 : 600,
            color: activeTab === 'info' ? 'var(--blue-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'info' ? '3px solid var(--blue-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Thông tin Pháp lý & Kỹ thuật
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: activeTab === 'audit' ? 800 : 600,
            color: activeTab === 'audit' ? 'var(--blue-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'audit' ? '3px solid var(--blue-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Nhật ký Hoạt động (Audit Trail)
        </button>
      </div>

      {/* Tab 1: Định ngạch & Quota Tài nguyên */}
      {activeTab === 'resources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '24px 28px',
              border: '1px solid var(--border-light, #EDF2F9)',
              boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
              Tiêu thụ Tài nguyên Đám mây & Quota Hạn mức
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
              Kiểm soát tự động mức tiêu hao tài nguyên phần cứng, dung lượng lưu trữ và số lượng bản ghi của tenant.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {mockTenantQuota.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 16,
                    background: 'var(--bg-soft-blue, #F7FAFF)',
                    border: '1px solid var(--border-light, #EDF2F9)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                      {q.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: '#ffffff',
                        border: '1px solid var(--border-light)',
                        color: q.color,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {q.percentage}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Đã sử dụng</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      <b style={{ color: 'var(--text-main)' }}>{q.used.toLocaleString()}</b> / {q.total.toLocaleString()} {q.unit}
                    </span>
                  </div>

                  {/* Progress bar track */}
                  <div
                    style={{
                      height: 8,
                      width: '100%',
                      background: '#E2E8F0',
                      borderRadius: 9999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${q.percentage}%`,
                        backgroundColor: q.color,
                        borderRadius: 9999,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 6 Tính năng Cốt lõi (Feature Flags) */}
      {activeTab === 'features' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            padding: '24px 28px',
            border: '1px solid var(--border-light, #EDF2F9)',
            boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
            Trạng thái 6 Tính năng Nghiệp vụ Cốt lõi
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
            Các module nghiệp vụ bán lẻ tạp hóa chuyên sâu được kích hoạt theo thỏa thuận gói dịch vụ SaaS.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {mockFeatureFlags.map((f, idx) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'var(--bg-soft-blue, #F7FAFF)',
                  border: '1px solid var(--border-light, #EDF2F9)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--blue-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    0{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Mã tính năng: <code>{f.id}</code>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: '#E8F9EE',
                    color: '#00C853',
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <CheckCircle2 size={12} />
                  ĐANG BẬT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Thông tin Pháp lý & Kỹ thuật */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
          {/* Legal & Contact Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '24px 28px',
              border: '1px solid var(--border-light, #EDF2F9)',
              boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Building2 size={20} color="var(--blue-primary)" />
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                Thông tin Pháp lý & Liên hệ
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tên Chuỗi / Cửa Hàng</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{currentTenant.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mã số thuế (MST)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{currentTenant.taxCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Đại diện pháp luật / Chủ sở hữu</span>
                <span style={{ fontWeight: 700 }}>{currentTenant.ownerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email liên hệ chính</span>
                <span style={{ fontWeight: 600, color: 'var(--blue-primary)' }}>{currentTenant.ownerEmail}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hotline khẩn cấp</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{currentTenant.ownerPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tỉnh / Thành phố hoạt động</span>
                <span style={{ fontWeight: 600 }}>{currentTenant.city}</span>
              </div>
            </div>
          </div>

          {/* Infrastructure & Security Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '24px 28px',
              border: '1px solid var(--border-light, #EDF2F9)',
              boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Server size={20} color="#00C853" />
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                Hạ tầng Kỹ thuật & Bảo mật
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Kiến trúc Multi-tenant</span>
                <span style={{ fontWeight: 700, color: '#00C853' }}>Database-per-tenant cô lập</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tên Cơ sở Dữ liệu</span>
                <code style={{ background: 'var(--bg-soft-blue)', padding: '2px 8px', borderRadius: 4 }}>
                  {currentTenant.subdomain}_db
                </code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lưu trữ Sao lưu S3</span>
                <code style={{ background: 'var(--bg-soft-blue)', padding: '2px 8px', borderRadius: 4 }}>
                  s3://mtgrms-backup/{currentTenant.subdomain}/
                </code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tiêu chuẩn mã hóa dữ liệu</span>
                <span style={{ fontWeight: 600 }}>AES-256 (At-rest & In-transit)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cụm máy chủ / Node</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>VN-HAN-NODE-01</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cam kết Uptime SLA</span>
                <span style={{ fontWeight: 700, color: '#00C853' }}>99.98% / năm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Nhật ký Hoạt động (Audit Trail) */}
      {activeTab === 'audit' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            padding: '24px 28px',
            border: '1px solid var(--border-light, #EDF2F9)',
            boxShadow: '0 2px 10px rgba(0, 20, 60, 0.03)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
            Nhật ký Hoạt động Quản trị (Audit Trail)
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
            Lịch sử toàn bộ các thao tác thay đổi gói, gia hạn hợp đồng và lệnh khóa hệ thống đối với tenant này.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#E8F9EE',
                  color: '#00C853',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                  Hệ thống kiểm tra trạng thái tự động: Dịch vụ đang hoạt động ổn định
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Bởi Hệ thống Quản trị SaaS Cron-Job • Hôm nay lúc 04:00 AM
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--blue-light)',
                  color: 'var(--blue-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Database size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                  Sao lưu cơ sở dữ liệu hàng ngày tự động hoàn thành
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Đã lưu trữ snapshot tại <code>s3://mtgrms-backup/{currentTenant.subdomain}/</code> • Hôm nay lúc 03:00 AM
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--bg-soft-blue)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <ShieldCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                  Cấp phát tài nguyên và kích hoạt hợp đồng dịch vụ ban đầu
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Bởi Super Admin (Master Admin) • Khởi tạo thành công
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for actions */}
      <ExtendGraceModal
        tenant={currentTenant}
        isOpen={isGraceOpen}
        onClose={() => setIsGraceOpen(false)}
        onSubmit={handleExtendGraceSubmit}
      />

      <ApplyLockModal
        tenant={currentTenant}
        isOpen={isLockOpen}
        onClose={() => setIsLockOpen(false)}
        onSubmit={handleApplyLockSubmit}
      />
    </div>
  );
};

export default TenantDetailPage;
