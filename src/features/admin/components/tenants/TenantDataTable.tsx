import { useState } from 'react';
import type { FC, CSSProperties } from 'react';
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
            Doanh Nghiệp
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
            Nâng Cao
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
            Cơ Bản
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
            Ân hạn ({tenant.graceDaysRemaining ? 7 - tenant.graceDaysRemaining : 3}/7d)
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
    <div className="so-list-table-card">
      <div className="so-list-table-body supplier-table-scroll-container">
        <table className="so-list-table" style={{ minWidth: 960 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th className="so-list-th" style={{ width: 44, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <input
                  type="checkbox"
                  checked={tenants.length > 0 && selectedIds.length === tenants.length}
                  onChange={toggleSelectAll}
                  style={{ accentColor: '#0F766E', cursor: 'pointer', margin: 0 }}
                />
              </th>
              <th className="so-list-th" style={{ width: 155, position: 'sticky', top: 0, zIndex: 10 }}>Mã Subdomain</th>
              <th className="so-list-th" style={{ position: 'sticky', top: 0, zIndex: 10 }}>Tên Chuỗi / Cửa Hàng</th>
              <th className="so-list-th" style={{ position: 'sticky', top: 0, zIndex: 10 }}>Chủ Sở Hữu & Liên Hệ</th>
              <th className="so-list-th" style={{ width: 110, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Gói Cước</th>
              <th className="so-list-th" style={{ width: 85, textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Chi Nhánh</th>
              <th className="so-list-th" style={{ width: 85, textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Nhân Sự</th>
              <th className="so-list-th" style={{ width: 115, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Hạn Hợp Đồng</th>
              <th className="so-list-th" style={{ width: 135, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Trạng Thái</th>
              <th className="so-list-th" style={{ width: 165, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
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
                  <td className="so-list-td" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggleSelectOne(t.id)}
                      style={{ accentColor: '#0F766E', cursor: 'pointer', margin: 0 }}
                    />
                  </td>
                  <td className="so-list-td" title={t.subdomain}>
                    <span
                      className="admin-subdomain-tag"
                      style={
                        t.status === 'locked'
                          ? { color: '#dc2626' }
                          : {}
                      }
                    >
                      {t.subdomain}
                    </span>
                  </td>
                  <td className="so-list-td" title={t.name}>
                    <div style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      MST: {t.taxCode || '—'} {t.city ? `• ${t.city}` : ''}
                    </div>
                  </td>
                  <td className="so-list-td" title={`${t.ownerName} - ${t.ownerEmail} - ${t.ownerPhone}`}>
                    <div style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.ownerName}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.ownerEmail} &bull; {t.ownerPhone}
                    </div>
                  </td>
                  <td className="so-list-td" style={{ textAlign: 'center' }}>{getPlanBadge(t.plan)}</td>
                  <td className="so-list-td" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    <b>{t.branchCount}</b> / {t.maxBranches === 'unlimited' ? '∞' : t.maxBranches}
                  </td>
                  <td className="so-list-td" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    <b>{t.staffCount}</b> / {t.maxStaff === 'unlimited' ? '∞' : t.maxStaff}
                  </td>
                  <td className="so-list-td" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    <span
                      style={{
                        color:
                          t.status === 'grace'
                            ? 'var(--red-accent)'
                            : t.status === 'expiring'
                            ? 'var(--orange-accent)'
                            : '#334155',
                        fontWeight: t.status === 'grace' || t.status === 'expiring' ? 700 : 500,
                      }}
                    >
                      {t.expiryDate || '—'}
                    </span>
                  </td>
                  <td className="so-list-td so-list-td--status" style={{ textAlign: 'center' }}>{getStatusBadge(t)}</td>
                  <td className="so-list-td so-list-td--actions" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
