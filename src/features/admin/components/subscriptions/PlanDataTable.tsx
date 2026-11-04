import { useState } from 'react';
import type { FC } from 'react';
import type { SubscriptionPlan } from '../../types/plan.types';
import { TablePagination } from '../../../../components/common/TablePagination';
import { Eye, Edit3, Power } from 'lucide-react';

interface PlanDataTableProps {
  plans: SubscriptionPlan[];
  onDetail: (plan: SubscriptionPlan) => void;
  onEdit: (plan: SubscriptionPlan) => void;
  onToggleStatus: (plan: SubscriptionPlan) => void;
}

export const PlanDataTable: FC<PlanDataTableProps> = ({
  plans,
  onDetail,
  onEdit,
  onToggleStatus,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleSelectAll = () => {
    if (selectedIds.length === plans.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(plans.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Pagination slice
  const startIndex = (currentPage - 1) * pageSize;
  const displayedPlans = plans.slice(startIndex, startIndex + pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  return (
    <div className="admin-table-card" style={{ borderRadius: 10, border: '1px solid var(--border-light)' }}>
      <table className="admin-data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 34, textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={plans.length > 0 && selectedIds.length === plans.length}
                onChange={toggleSelectAll}
                aria-label="Chọn tất cả gói"
              />
            </th>
            <th style={{ width: 140 }}>Mã Gói</th>
            <th>Tên Gói Dịch Vụ</th>
            <th style={{ textAlign: 'right', width: 140 }}>Đơn Giá / Tháng</th>
            <th style={{ textAlign: 'right', width: 150 }}>Đơn Giá / Năm</th>
            <th style={{ textAlign: 'center', width: 150 }}>Định Ngạch Quota</th>
            <th style={{ textAlign: 'center', width: 110 }}>Tenant Thuê</th>
            <th style={{ textAlign: 'center', width: 120 }}>Trạng Thái</th>
            <th style={{ textAlign: 'right', width: 200 }}>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {plans.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                🔍 Không tìm thấy gói cước nào phù hợp với bộ lọc tìm kiếm
              </td>
            </tr>
          ) : (
            displayedPlans.map((p) => {
              const isEnterprise = p.quotas.maxBranches === -1;
              return (
                <tr key={p.id}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelectOne(p.id)}
                      aria-label={`Chọn gói ${p.name}`}
                    />
                  </td>
                  <td>
                    <span
                      onClick={() => onDetail(p)}
                      title="Bấm để xem hồ sơ chi tiết gói cước"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--blue-primary)',
                        backgroundColor: 'var(--bg-soft-blue)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        display: 'inline-block',
                        cursor: 'pointer',
                      }}
                    >
                      {p.code}
                    </span>
                  </td>
                  <td>
                    <div
                      onClick={() => onDetail(p)}
                      title="Bấm để xem hồ sơ chi tiết gói cước"
                      style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13.5, cursor: 'pointer' }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={p.description}
                    >
                      {p.description}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                    {formatCurrency(p.monthlyPrice)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                      {formatCurrency(p.yearlyPrice)}
                    </div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                      Tiết kiệm ~17%
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {isEnterprise ? 'Vô hạn chi nhánh' : `${p.quotas.maxBranches} chi nhánh`}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {isEnterprise ? 'Không giới hạn NV' : `Tối đa ${p.quotas.maxEmployees} nhân sự`}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: 6,
                        color: '#334155',
                      }}
                    >
                      {p.activeTenantCount}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.status === 'Active' ? (
                      <span className="admin-badge admin-badge-active" style={{ fontSize: 11 }}>
                        Đang mở bán
                      </span>
                    ) : (
                      <span className="admin-badge admin-badge-locked" style={{ fontSize: 11 }}>
                        Tạm ngừng bán
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="admin-table-btn"
                        onClick={() => onToggleStatus(p)}
                        title={p.status === 'Active' ? 'Tạm ngừng mở bán gói này' : 'Mở bán lại gói này'}
                        style={{
                          color: p.status === 'Active' ? '#d97706' : '#059669',
                          borderColor: p.status === 'Active' ? '#fde68a' : '#a7f3d0',
                        }}
                      >
                        <Power size={12} />
                        <span>{p.status === 'Active' ? 'Ngừng bán' : 'Mở bán'}</span>
                      </button>

                      <button
                        type="button"
                        className="admin-table-btn"
                        onClick={() => onEdit(p)}
                        title="Chỉnh sửa thông tin gói cước"
                      >
                        <Edit3 size={12} />
                        <span>Sửa</span>
                      </button>

                      <button
                        type="button"
                        className="admin-table-btn admin-table-btn-primary"
                        onClick={() => onDetail(p)}
                        title="Xem hồ sơ kỹ thuật & danh sách tenant"
                      >
                        <Eye size={12} />
                        <span>Chi tiết</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={plans.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
};
