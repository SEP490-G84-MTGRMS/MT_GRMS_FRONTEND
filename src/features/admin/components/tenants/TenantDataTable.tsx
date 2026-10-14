import { useState } from 'react';
import type { FC } from 'react';
import type { Tenant } from '../../types/admin.types';
import { TablePagination } from '../../../../components/common';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const displayedTenants = tenants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === tenants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tenants.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getPlanBadge = (plan: Tenant['plan']) => {
    switch (plan) {
      case 'enterprise':
        return <span className="admin-table-neutral-tag">Doanh Nghiệp</span>;
      case 'advanced':
        return <span className="admin-table-neutral-tag">Nâng Cao</span>;
      case 'basic':
      default:
        return <span className="admin-table-neutral-tag">Cơ Bản</span>;
    }
  };

  const getStatusBadge = (tenant: Tenant) => {
    switch (tenant.status) {
      case 'active':
        return <span className="admin-badge admin-badge-active">Hoạt động</span>;
      case 'expiring':
        return <span className="admin-badge admin-badge-warning">Sắp hết hạn</span>;
      case 'grace':
        return (
          <span className="admin-badge admin-badge-warning">
            Ân hạn ({tenant.graceDaysRemaining ? 7 - tenant.graceDaysRemaining : 3}/7d)
          </span>
        );
      case 'locked':
        return (
          <span className="admin-badge admin-badge-danger">
            Bị Khóa {tenant.lockType === 'hard' ? '(Hard-Lock)' : '(Soft-Lock)'}
          </span>
        );
      case 'pending':
        return (
          <span className="admin-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
            Chờ kích hoạt
          </span>
        );
    }
  };

  return (
    <div className="admin-table-card">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th style={{ width: 30, textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={tenants.length > 0 && selectedIds.length === tenants.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Mã Subdomain</th>
            <th>Tên Chuỗi / Cửa Hàng</th>
            <th>Chủ Sở Hữu & Liên Hệ</th>
            <th>Gói Cước</th>
            <th style={{ textAlign: 'right' }}>Chi Nhánh</th>
            <th style={{ textAlign: 'right' }}>Nhân Sự</th>
            <th>Hạn Hợp Đồng</th>
            <th>Trạng Thái</th>
            <th style={{ textAlign: 'right' }}>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {tenants.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                🔍 Không tìm thấy khách hàng thuê nào phù hợp với điều kiện tìm kiếm
              </td>
            </tr>
          ) : (
            displayedTenants.map((t) => (
              <tr key={t.id}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleSelectOne(t.id)}
                  />
                </td>
                <td>
                  <span
                    className="admin-subdomain-tag"
                    style={
                      t.status === 'locked'
                        ? { background: 'var(--red-light)', color: 'var(--red-accent)' }
                        : {}
                    }
                  >
                    {t.subdomain}
                  </span>
                </td>
                <td>
                  <b>{t.name}</b>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    MST: {t.taxCode} &bull; {t.city}
                  </div>
                </td>
                <td>
                  {t.ownerName}
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {t.ownerEmail} &bull; {t.ownerPhone}
                  </div>
                </td>
                <td>{getPlanBadge(t.plan)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  <b>{t.branchCount}</b> / {t.maxBranches === 'unlimited' ? '∞' : t.maxBranches}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  <b>{t.staffCount}</b> / {t.maxStaff === 'unlimited' ? '∞' : t.maxStaff}
                </td>
                <td>
                  <span
                    style={{
                      color:
                        t.status === 'grace'
                          ? 'var(--red-accent)'
                          : t.status === 'expiring'
                          ? 'var(--orange-accent)'
                          : 'inherit',
                      fontWeight: t.status === 'grace' || t.status === 'expiring' ? 700 : 'normal',
                    }}
                  >
                    {t.expiryDate}
                  </span>
                </td>
                <td>{getStatusBadge(t)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    {t.status === 'locked' ? (
                      <button
                        type="button"
                        className="admin-table-btn"
                        onClick={() => onUnlock(t)}
                      >
                        Mở khóa
                      </button>
                    ) : t.status === 'grace' ? (
                      <>
                        <button
                          type="button"
                          className="admin-table-btn"
                          onClick={() => onExtendGrace(t)}
                        >
                          Thêm ngày
                        </button>
                        <button
                          type="button"
                          className="admin-table-btn"
                          onClick={() => onLock(t)}
                        >
                          Khóa mềm
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="admin-table-btn"
                        onClick={() => onLock(t)}
                      >
                        Khóa
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-table-btn admin-table-btn-primary"
                      onClick={() => onDetail(t)}
                    >
                      Chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Shared Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={tenants.length}
        itemLabel="khách hàng tenant"
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};
