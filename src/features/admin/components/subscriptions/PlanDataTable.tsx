import { useState } from 'react';
import { Eye, Power, Layers } from 'lucide-react';
import type { SubscriptionPlan } from '../../types/plan.types';
import { TablePagination } from '../../../../components/common/TablePagination';

interface PlanDataTableProps {
  plans: SubscriptionPlan[];
  onDetail: (plan: SubscriptionPlan) => void;
  onToggleStatus: (plan: SubscriptionPlan) => void;
}

const price = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const quota = (value: number) => value === -1 ? 'Không giới hạn' : value.toLocaleString('vi-VN');

export const PlanDataTable = ({ plans, onDetail, onToggleStatus }: PlanDataTableProps) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(plans.length / pageSize)));
  const displayed = plans.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="plans-table-card">
      <div className="plans-table-summary">Đang hiển thị <strong>{displayed.length} / {plans.length}</strong> gói dịch vụ</div>
      <div className="plans-table-scroll">
        <table className="plans-table">
          <thead><tr><th>Gói dịch vụ</th><th>Biểu phí</th><th>Hạn mức tài nguyên</th><th>Đang sử dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {displayed.map((plan) => (
              <tr key={plan.id}>
                <td><div className="plans-name"><span className="plans-name-icon"><Layers size={17} /></span><div><button className="plans-name-link" onClick={() => onDetail(plan)}>{plan.name}</button><small>{plan.code}</small></div></div></td>
                <td><strong className="plans-money">{price(plan.monthlyPrice)}</strong><small>/ tháng</small><span className="plans-yearly">{price(plan.yearlyPrice)} / năm</span></td>
                <td><span>{quota(plan.quotas.maxBranches)} chi nhánh · {quota(plan.quotas.maxEmployees)} nhân sự</span><small>{plan.quotas.maxStorageGb} GB lưu trữ</small></td>
                <td><span className="plans-count">{plan.activeTenantCount} cửa hàng</span></td>
                <td><span className={`plans-status ${plan.status === 'Active' ? 'is-active' : ''}`}>{plan.status === 'Active' ? 'Đang mở bán' : 'Tạm ngừng'}</span></td>
                <td><div className="plans-row-actions">
                  <button onClick={() => onDetail(plan)} title="Xem chi tiết" aria-label={`Xem gói ${plan.name}`}><Eye size={15} /></button>
                  <button onClick={() => onToggleStatus(plan)} title={plan.status === 'Active' ? 'Ngừng bán' : 'Mở bán'} aria-label={`${plan.status === 'Active' ? 'Ngừng bán' : 'Mở bán'} gói ${plan.name}`}><Power size={15} /></button>
                </div></td>
              </tr>
            ))}
            {!displayed.length && <tr><td colSpan={6} className="plans-empty">Không tìm thấy gói dịch vụ phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
      <TablePagination currentPage={currentPage} pageSize={pageSize} totalItems={plans.length} pageSizeOptions={[10, 20, 50]} itemLabel="gói dịch vụ" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </div>
  );
};
