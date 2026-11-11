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
    <div className="so-list-table-card">
      <div className="so-list-table-body supplier-table-scroll-container">
        <table className="so-list-table" style={{ minWidth: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th className="so-list-th" style={{ width: 44, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <input
                  type="checkbox"
                  checked={plans.length > 0 && selectedIds.length === plans.length}
                  onChange={toggleSelectAll}
                  aria-label="Chọn tất cả gói"
                  style={{ accentColor: '#0F766E', cursor: 'pointer', margin: 0 }}
                />
              </th>
              <th className="so-list-th" style={{ width: 95, position: 'sticky', top: 0, zIndex: 10 }}>Mã Gói</th>
              <th className="so-list-th" style={{ position: 'sticky', top: 0, zIndex: 10 }}>Tên Gói Dịch Vụ</th>
              <th className="so-list-th" style={{ textAlign: 'right', width: 120, position: 'sticky', top: 0, zIndex: 10 }}>Giá / Tháng</th>
              <th className="so-list-th" style={{ textAlign: 'right', width: 125, position: 'sticky', top: 0, zIndex: 10 }}>Giá / Năm</th>
              <th className="so-list-th" style={{ textAlign: 'center', width: 130, position: 'sticky', top: 0, zIndex: 10 }}>Định Ngạch</th>
              <th className="so-list-th" style={{ textAlign: 'center', width: 85, position: 'sticky', top: 0, zIndex: 10 }}>Đang Thuê</th>
              <th className="so-list-th" style={{ textAlign: 'center', width: 135, position: 'sticky', top: 0, zIndex: 10 }}>Trạng Thái</th>
              <th className="so-list-th" style={{ textAlign: 'center', width: 118, position: 'sticky', top: 0, zIndex: 10 }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  Không tìm thấy gói cước nào phù hợp với bộ lọc tìm kiếm
                </td>
              </tr>
            ) : (
              displayedPlans.map((p) => {
                const isEnterprise = p.quotas.maxBranches === -1;
                const isActive = p.status === 'Active';
                return (
                  <tr key={p.id} className="so-list-row" onClick={() => onDetail(p)} style={{ cursor: 'pointer' }}>
                    <td className="so-list-td" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelectOne(p.id)}
                        aria-label={`Chọn gói ${p.name}`}
                        style={{ accentColor: '#0F766E', cursor: 'pointer', margin: 0 }}
                      />
                    </td>
                    <td className="so-list-td">
                      <span
                        onClick={() => onDetail(p)}
                        title="Bấm để xem hồ sơ chi tiết gói cước"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: 'var(--blue-primary, #0f766e)',
                          cursor: 'pointer',
                        }}
                      >
                        {p.code}
                      </span>
                    </td>
                    <td className="so-list-td">
                      <div
                        onClick={() => onDetail(p)}
                        title="Bấm để xem hồ sơ chi tiết gói cước"
                        style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13, cursor: 'pointer' }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
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
                    <td className="so-list-td" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                      {formatCurrency(p.monthlyPrice)}
                    </td>
                    <td className="so-list-td" style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                        {formatCurrency(p.yearlyPrice)}
                      </div>
                      <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                        Tiết kiệm ~17%
                      </div>
                    </td>
                    <td className="so-list-td" style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {isEnterprise ? 'Vô hạn chi nhánh' : `${p.quotas.maxBranches} chi nhánh`}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {isEnterprise ? 'Không giới hạn NV' : `Tối đa ${p.quotas.maxEmployees} nhân sự`}
                      </div>
                    </td>
                    <td className="so-list-td" style={{ textAlign: 'center' }}>
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
                    <td className="so-list-td so-list-td--status" style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '3px 10px',
                          borderRadius: 9999,
                          fontSize: 11.5,
                          fontWeight: 600,
                          backgroundColor: isActive ? '#f0fdf4' : '#f8fafc',
                          color: isActive ? '#15803d' : '#64748b',
                          border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isActive ? 'Đang mở bán' : 'Tạm ngừng bán'}
                      </span>
                    </td>
                    <td className="so-list-td so-list-td--actions" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onDetail(p)}
                          title="Xem hồ sơ kỹ thuật & danh sách tenant"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          title="Chỉnh sửa thông tin gói cước"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f766e',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleStatus(p)}
                          title={isActive ? 'Tạm ngừng mở bán gói này' : 'Mở bán lại gói này'}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: isActive ? '#d97706' : '#059669',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={plans.length}
        pageSizeOptions={[10, 15, 20, 50]}
        itemLabel="gói dịch vụ"
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
};
