import React from 'react';
import { Link } from 'react-router-dom';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { Users, ExternalLink, Store } from 'lucide-react';

interface PlanTenantsCardProps {
  plan: SubscriptionPlan;
}

export const PlanTenantsCard: React.FC<PlanTenantsCardProps> = ({ plan }) => {
  const tenants = plan.tenants || [];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
        padding: '22px 24px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          <Users size={18} color="var(--blue-primary)" />
          <span>4. Danh sách Khách hàng đang sử dụng Gói này ({plan.activeTenantCount} Khách hàng)</span>
        </div>
        <Link
          to="/admin/tenants"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--blue-primary)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>Xem tất cả Tenants</span>
          <ExternalLink size={13} />
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div
          style={{
            padding: 36,
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
            color: 'var(--text-muted)',
          }}
        >
          <Store size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
            Chưa có khách hàng nào đăng ký gói này
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>
            Khi các chuỗi tạp hóa nâng cấp hoặc tạo mới hợp đồng sử dụng gói {plan.name}, danh sách sẽ xuất hiện tại đây.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 14px' }}>Mã Subdomain</th>
                <th style={{ textAlign: 'left', padding: '10px 14px' }}>Tên Doanh Nghiệp / Chuỗi</th>
                <th style={{ textAlign: 'center', padding: '10px 14px' }}>Chi Nhánh</th>
                <th style={{ textAlign: 'center', padding: '10px 14px' }}>Nhân Sự</th>
                <th style={{ textAlign: 'left', padding: '10px 14px' }}>Hạn Hợp Đồng</th>
                <th style={{ textAlign: 'center', padding: '10px 14px' }}>Trạng Thái</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', width: 80 }}>Hồ Sơ</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--blue-primary)', fontSize: 12.5 }}>
                      {t.subdomain}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {t.name}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {t.activeBranches} / {plan.quotas.maxBranches === -1 ? '~' : plan.quotas.maxBranches}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {t.activeEmployees} / {plan.quotas.maxEmployees === -1 ? '~' : plan.quotas.maxEmployees}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-main)' }}>
                    {t.expiryDate}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      Active
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                    <Link
                      to="/admin/tenants"
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: 11.5, height: 'auto', textDecoration: 'none' }}
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
            Hiển thị {tenants.length} / {plan.activeTenantCount} khách hàng đang sử dụng gói này.
          </div>
        </div>
      )}
    </div>
  );
};
