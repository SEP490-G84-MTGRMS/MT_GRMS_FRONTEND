import React, { useState } from 'react';
import type { SubscriptionPlan } from '../../types/plan.types';
import { Layers, Database, ShieldCheck, Check, X, Store, Edit2 } from 'lucide-react';

interface PlanDetailModalProps {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onEditPlan?: (plan: SubscriptionPlan) => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  isOpen,
  onClose,
  onEditPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'tenants'>('specs');

  if (!isOpen || !plan) return null;

  const formatPrice = (v: number) => {
    return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
  };

  const featureLabels = [
    { key: 'fefoExpiryAlert', label: 'Quản lý date FEFO 3 mức màu', desc: 'Cảnh báo hạn cận date đỏ / cam / xanh' },
    { key: 'multiUnitConversion', label: 'Quy đổi Đa đơn vị tính', desc: 'Thùng / Lon / Lốc / Chai linh hoạt' },
    { key: 'vietQrDynamic', label: 'VietQR Động Khớp Tiền Tự Động', desc: 'Sinh mã QR theo số tiền hóa đơn POS' },
    { key: 'debtZaloBook', label: 'Sổ Ghi Nợ Zalo & Bán Ghi Nợ', desc: 'Gửi nhắc nợ tự động qua mạng Zalo' },
    { key: 'barcodeScanning', label: 'Quét Mã Vạch Barcode Siêu Tốc', desc: 'Tương thích đầu đọc USB và Camera POS' },
    { key: 'financialReporting', label: 'Báo Cáo Tài Chính & Sổ Quỹ', desc: 'Thu chi, dòng tiền, bảng cân đối kế toán' },
  ] as const;

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="admin-modal-box"
        style={{ maxWidth: 840, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: 'var(--blue-light)',
                color: 'var(--blue-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <div className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{plan.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                  }}
                >
                  {plan.code}
                </span>
                <span
                  className={
                    plan.status === 'Active'
                      ? 'admin-badge-success'
                      : 'admin-badge-secondary'
                  }
                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999 }}
                >
                  {plan.status === 'Active' ? 'Đang cung cấp' : 'Tạm dừng'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {plan.description || 'Không có mô tả chi tiết'}
              </div>
            </div>
          </div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            padding: '0 24px',
            borderBottom: '1px solid var(--border-light)',
            background: '#ffffff',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            style={{
              padding: '12px 4px',
              fontSize: 13.5,
              fontWeight: activeTab === 'specs' ? 700 : 500,
              color: activeTab === 'specs' ? 'var(--blue-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'specs' ? '2.5px solid var(--blue-primary)' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Định Ngạch & Tính Năng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            style={{
              padding: '12px 4px',
              fontSize: 13.5,
              fontWeight: activeTab === 'tenants' ? 700 : 500,
              color: activeTab === 'tenants' ? 'var(--blue-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'tenants' ? '2.5px solid var(--blue-primary)' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Khách Hàng Đang Dùng</span>
            <span
              style={{
                backgroundColor: 'var(--blue-light)',
                color: 'var(--blue-primary)',
                borderRadius: 9999,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {plan.activeTenantCount}
            </span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeTab === 'specs' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* GIÁ CƯỚC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div
                  style={{
                    padding: 14,
                    background: '#f8fafc',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá cước tháng</div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'var(--blue-primary)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 4,
                    }}
                  >
                    {formatPrice(plan.monthlyPrice)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/ tháng</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    background: '#f8fafc',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá cước theo năm</div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#0f766e',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 4,
                    }}
                  >
                    {formatPrice(plan.yearlyPrice)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/ năm</span>
                  </div>
                </div>
              </div>

              {/* QUOTAS */}
              <div
                style={{
                  padding: 16,
                  background: '#ffffff',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Database size={16} color="var(--blue-primary)" /> Định ngạch tài nguyên (Quotas)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Số chi nhánh</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 2 }}>
                      {plan.quotas.maxBranches === -1 ? 'Không giới hạn' : `${plan.quotas.maxBranches} chi nhánh`}
                    </div>
                  </div>

                  <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Số nhân viên</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 2 }}>
                      {plan.quotas.maxEmployees === -1 ? 'Không giới hạn' : `${plan.quotas.maxEmployees} người`}
                    </div>
                  </div>

                  <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Lưu trữ dữ liệu</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 2 }}>
                      {plan.quotas.maxStorageGb} GB
                    </div>
                  </div>

                  <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Sao lưu tự động</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                      {plan.quotas.backupFrequency === 'Hourly' ? 'Mỗi giờ' : plan.quotas.backupFrequency === 'Daily' ? 'Hàng ngày' : 'Hàng tuần'}
                    </div>
                  </div>
                </div>
              </div>

              {/* FEATURES */}
              <div
                style={{
                  padding: 16,
                  background: '#ffffff',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ShieldCheck size={16} color="var(--blue-primary)" /> Tính năng nghiệp vụ kích hoạt
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {featureLabels.map((item) => {
                    const isEnabled = plan.features[item.key];
                    return (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: `1px solid ${isEnabled ? '#bbf7d0' : '#e2e8f0'}`,
                          backgroundColor: isEnabled ? '#f0fdf4' : '#f8fafc',
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isEnabled ? '#16a34a' : '#cbd5e1',
                            color: '#ffffff',
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {isEnabled ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)',
                            }}
                          >
                            {item.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {(!plan.tenants || plan.tenants.length === 0) ? (
                <div
                  style={{
                    padding: 48,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <Store size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
                    Chưa có khách hàng nào đăng ký gói này
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>
                    Khi các chủ cửa hàng nâng cấp hoặc tạo mới hợp đồng sử dụng gói {plan.name}, danh sách sẽ xuất hiện tại đây.
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Cửa Hàng / Khách Hàng</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Subdomain</th>
                        <th style={{ textAlign: 'center', padding: '10px 14px' }}>Chi Nhánh</th>
                        <th style={{ textAlign: 'center', padding: '10px 14px' }}>Nhân Viên</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Ngày Hết Hạn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.tenants.map((t) => (
                        <tr key={t.id}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {t.name}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--blue-primary)' }}>
                              {t.subdomain}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            {t.activeBranches}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            {t.activeEmployees}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {t.expiryDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="admin-modal-footer"
          style={{
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Cập nhật lần cuối: <span style={{ fontFamily: 'var(--font-mono)' }}>{plan.updatedAt}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {onEditPlan && (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  onClose();
                  onEditPlan(plan);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Edit2 size={14} /> Chỉnh Sửa Gói Này
              </button>
            )}
            <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
