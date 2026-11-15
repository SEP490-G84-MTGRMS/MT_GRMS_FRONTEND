import { useState } from 'react';
import type { FC, CSSProperties } from 'react';
import type { Tenant } from '../../types/admin.types';
import { TablePagination } from '../../../../components/common';
import { Building2, CalendarPlus, Eye, LockKeyhole, UnlockKeyhole } from 'lucide-react';

interface TenantDataTableProps {
  tenants: Tenant[];
  onDetail: (tenant: Tenant) => void;
  onLock: (tenant: Tenant) => void;
  onUnlock: (tenant: Tenant) => void;
  onExtendGrace: (tenant: Tenant) => void;
}

export const TenantDataTable: FC<TenantDataTableProps> = ({
  tenants,
  onDetail,
  onLock,
  onUnlock,
  onExtendGrace,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const displayedTenants = tenants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getPlanBadge = (plan: Tenant['plan'], planName?: string) => {
    switch (plan) {
      case 'enterprise':
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f766e',
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {planName || 'Doanh Nghiệp'}
          </span>
        );
      case 'advanced':
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f766e',
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {planName || 'Nâng Cao'}
          </span>
        );
      case 'basic':
      default:
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {planName || 'Cơ Bản'}
          </span>
        );
    }
  };

  const getStatusBadge = (tenant: Tenant) => {
    const baseStyle: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11.5,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 9999,
      whiteSpace: 'nowrap',
    };

    switch (tenant.status) {
      case 'active':
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
            }}
          >
            Hoạt động
          </span>
        );
      case 'expiring':
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            Sắp hết hạn
          </span>
        );
      case 'grace':
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            Ân hạn
          </span>
        );
      case 'locked':
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            Bị Khóa {tenant.lockType === 'hard' ? '(Hard)' : '(Soft)'}
          </span>
        );
      case 'pending':
        return (
          <span
            style={{
              ...baseStyle,
              backgroundColor: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0',
            }}
          >
            Chờ kích hoạt
          </span>
        );
    }
  };

  return (
    <div className="so-list-table-card admin-tenant-list-card">
      <div className="admin-tenant-list-summary">
        Đang hiển thị <strong>{displayedTenants.length} / {tenants.length}</strong> khách hàng thuê
      </div>
      <div className="so-list-table-body supplier-table-scroll-container">
        <table className="so-list-table admin-tenant-table">
          <thead>
            <tr>
              <th className="so-list-th admin-tenant-col-store">Cửa hàng</th>
              <th className="so-list-th admin-tenant-col-owner">Chủ sở hữu & liên hệ</th>
              <th className="so-list-th admin-tenant-col-plan">Gói dịch vụ</th>
              <th className="so-list-th admin-tenant-col-scale">Quy mô</th>
              <th className="so-list-th admin-tenant-col-expiry">Hạn hợp đồng</th>
              <th className="so-list-th admin-tenant-col-status">Trạng thái</th>
              <th className="so-list-th admin-tenant-col-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-tenant-empty">
                  Không tìm thấy khách hàng thuê nào phù hợp với điều kiện tìm kiếm
                </td>
              </tr>
            ) : (
              displayedTenants.map((t) => (
                <tr
                  key={t.id}
                  className="so-list-row"
                  onClick={() => onDetail(t)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="so-list-td" title={`${t.name} · ${t.subdomain}`}>
                    <div className="admin-tenant-store-cell">
                      <span className="admin-tenant-store-icon"><Building2 size={15} /></span>
                      <div className="admin-tenant-cell-copy">
                        <strong>{t.name}</strong>
                        <span className={t.status === 'locked' ? 'is-locked' : ''}>{t.subdomain}</span>
                      </div>
                    </div>
                  </td>
                  <td className="so-list-td" title={`${t.ownerName} - ${t.ownerEmail} - ${t.ownerPhone}`}>
                    <div className="admin-tenant-cell-copy">
                      <strong>{t.ownerName}</strong>
                      <span>{t.ownerEmail} · {t.ownerPhone}</span>
                    </div>
                  </td>
                  <td className="so-list-td" title={t.planName}>{getPlanBadge(t.plan, t.planName)}</td>
                  <td className="so-list-td">
                    <div className="admin-tenant-scale">
                      <span><b>{t.branchCount}</b>/{t.maxBranches === 'unlimited' ? '∞' : t.maxBranches} chi nhánh</span>
                      <span><b>{t.staffCount}</b>/{t.maxStaff === 'unlimited' ? '∞' : t.maxStaff} nhân sự</span>
                    </div>
                  </td>
                  <td className="so-list-td">
                    <span className={`admin-tenant-expiry ${t.status === 'grace' || t.status === 'expiring' ? 'is-urgent' : ''}`}>
                      {t.expiryDate || '—'}
                    </span>
                  </td>
                  <td className="so-list-td so-list-td--status">{getStatusBadge(t)}</td>
                  <td className="so-list-td so-list-td--actions" onClick={(e) => e.stopPropagation()}>
                    <div className="admin-tenant-actions">
                      {t.status === 'locked' ? (
                        <button
                          type="button"
                          className="admin-tenant-icon-btn"
                          onClick={() => onUnlock(t)}
                          title="Mở khóa cửa hàng"
                          aria-label={`Mở khóa ${t.name}`}
                        >
                          <UnlockKeyhole size={15} />
                        </button>
                      ) : t.status === 'grace' ? (
                        <>
                          <button
                            type="button"
                            className="admin-tenant-icon-btn"
                            onClick={() => onExtendGrace(t)}
                            title="Thêm ngày ân hạn"
                            aria-label={`Thêm ngày ân hạn cho ${t.name}`}
                          >
                            <CalendarPlus size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-tenant-icon-btn admin-tenant-icon-btn-danger"
                            onClick={() => onLock(t)}
                            title="Khóa mềm cửa hàng"
                            aria-label={`Khóa mềm ${t.name}`}
                          >
                            <LockKeyhole size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin-tenant-icon-btn admin-tenant-icon-btn-danger"
                          onClick={() => onLock(t)}
                          title="Khóa cửa hàng"
                          aria-label={`Khóa ${t.name}`}
                        >
                          <LockKeyhole size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-tenant-icon-btn admin-tenant-icon-btn-primary"
                        onClick={() => onDetail(t)}
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết ${t.name}`}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Shared Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={tenants.length}
        pageSizeOptions={[10, 15, 20, 50]}
        itemLabel="khách hàng tenant"
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
};
