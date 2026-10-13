import { useState } from 'react';
import type { FC } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  QrCode,
  Edit2,
  ShieldAlert,
} from 'lucide-react';
import type { CustomerDto } from '../types/customer.types';

interface CustomerDrawerDetailProps {
  customer: CustomerDto | null;
  onClose: () => void;
  onOpenEdit: (customer: CustomerDto) => void;
  onOpenCollect: (customer: CustomerDto) => void;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const CustomerDrawerDetail: FC<CustomerDrawerDetailProps> = ({
  customer,
  onClose,
  onOpenEdit,
  onOpenCollect,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'invoices' | 'payments'>('info');

  if (!customer) return null;

  const debtPercent =
    customer.debtLimit > 0
      ? Math.min(100, Math.round((customer.currentDebtAR / customer.debtLimit) * 100))
      : 0;
  const isOverLimit = customer.currentDebtAR > customer.debtLimit && customer.debtLimit > 0;
  const hasDebt = customer.currentDebtAR > 0;

  return (
    <div className="customer-drawer-backdrop" onClick={onClose}>
      <div className="customer-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customer-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="customer-drawer-avatar">
              {customer.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #111827)' }}>
                  {customer.fullName}
                </h3>
                <span className={`tier-badge tier-badge-${customer.membershipTier.toLowerCase()}`}>
                  {customer.membershipTier}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
                {customer.phoneNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="action-icon-btn"
            title="Đóng drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Widget Cards */}
        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #F1F5F9', background: '#FAFCFC' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {/* Công nợ */}
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid #e5edf8' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Công nợ hiện tại</span>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: isOverLimit ? '#DC2626' : hasDebt ? '#D97706' : '#059669',
                }}
              >
                {formatCurrency(customer.currentDebtAR)}
              </p>
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>Hạn mức: {formatCurrency(customer.debtLimit)}</span>
                  <span style={{ fontWeight: isOverLimit ? 700 : 500, color: isOverLimit ? '#DC2626' : 'inherit' }}>
                    {debtPercent}%
                  </span>
                </div>
                <div className="debt-progress-bar">
                  <div
                    className={`debt-progress-fill ${
                      isOverLimit
                        ? 'debt-fill-danger'
                        : debtPercent > 80
                        ? 'debt-fill-warning'
                        : 'debt-fill-safe'
                    }`}
                    style={{ width: `${debtPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Điểm tích lũy & Chi tiêu */}
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid #e5edf8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Điểm thưởng Loyalty</span>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--blue-primary, #0F766E)',
                  }}
                >
                  {customer.loyaltyPoints.toLocaleString('vi-VN')} điểm
                </p>
              </div>
              <div style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                <span>Tổng chi:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main, #111827)' }}>
                  {formatCurrency(customer.totalSpending)}
                </span>
              </div>
            </div>
          </div>

          {/* Over-limit Warning Banner */}
          {isOverLimit && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#DC2626',
                marginBottom: '10px',
              }}
            >
              <ShieldAlert className="w-4 h-4" style={{ flexShrink: 0 }} />
              <span>
                Cảnh báo: Khách hàng đã vượt hạn mức nợ cho phép ({formatCurrency(customer.debtLimit)}). Vui lòng thu hồi nợ trước khi xuất bán thêm.
              </span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="customer-drawer-tabs" style={{ background: 'transparent', padding: 0 }}>
            <button
              onClick={() => setActiveTab('info')}
              className={`customer-drawer-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            >
              Thông tin liên hệ
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`customer-drawer-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            >
              Lịch sử mua hàng ({customer.invoices?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`customer-drawer-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            >
              Lịch sử thu nợ ({customer.payments?.length || 0})
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="customer-drawer-body">
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone className="w-4 h-4" style={{ color: '#94a3b8' }} />
                <span style={{ color: '#64748b', width: '110px' }}>Số điện thoại:</span>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#334155' }}>
                  {customer.phoneNumber}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail className="w-4 h-4" style={{ color: '#94a3b8' }} />
                <span style={{ color: '#64748b', width: '110px' }}>Email:</span>
                <span style={{ color: '#334155' }}>{customer.email || 'Chưa cập nhật'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin className="w-4 h-4" style={{ color: '#94a3b8', marginTop: '2px' }} />
                <span style={{ color: '#64748b', width: '110px' }}>Địa chỉ:</span>
                <span style={{ flex: 1, color: '#334155' }}>{customer.address || 'Chưa cập nhật'}</span>
              </div>
              {customer.taxCode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  <span style={{ color: '#64748b', width: '110px' }}>Mã số thuế:</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{customer.taxCode}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar className="w-4 h-4" style={{ color: '#94a3b8' }} />
                <span style={{ color: '#64748b', width: '110px' }}>Ngày tạo hồ sơ:</span>
                <span style={{ color: '#334155' }}>{new Date(customer.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customer.invoices && customer.invoices.length > 0 ? (
                customer.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #111827)' }}>{inv.id}</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{inv.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main, #111827)' }}>
                        {formatCurrency(inv.amount)}
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: inv.status === 'Paid' ? '#ECFDF5' : '#FEF3C7',
                          color: inv.status === 'Paid' ? '#059669' : '#B45309',
                        }}
                      >
                        {inv.status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '0.84rem' }}>
                  Chưa có đơn hàng nào
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customer.payments && customer.payments.length > 0 ? (
                customer.payments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #111827)' }}>{p.id}</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{p.date}</span>
                        <span>•</span>
                        <span>{p.staffName || 'Thu ngân'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: '#059669' }}>
                        +{formatCurrency(p.amount)}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--blue-primary, #0F766E)', fontWeight: 600 }}>
                        {p.method}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '0.84rem' }}>
                  Chưa có giao dịch thu nợ nào
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="customer-drawer-footer">
          <button
            onClick={() => onOpenEdit(customer)}
            className="btn-secondary-pill"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Edit2 className="w-4 h-4" />
            <span>Chỉnh sửa hồ sơ</span>
          </button>

          {hasDebt && (
            <button
              onClick={() => onOpenCollect(customer)}
              className="btn-primary-pill"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <QrCode className="w-4 h-4" />
              <span>Thu nợ & VietQR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};