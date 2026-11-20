import type { FC } from "react";
import type { PlanStatus } from "../../types/plan.types";
import { Search, Plus, Download } from "lucide-react";

interface PlanFilterToolbarProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  statusFilter: "all" | PlanStatus;
  onStatusFilterChange: (val: "all" | PlanStatus) => void;
  onOpenCreate: () => void;
  onExportExcel: () => void;
  visibleCount: number;
  totalCount: number;
}

export const PlanFilterToolbar: FC<PlanFilterToolbarProps> = ({
  keyword,
  onKeywordChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreate,
  onExportExcel,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="plans-toolbar" aria-label={`Bộ lọc gói dịch vụ, ${visibleCount} trên ${totalCount} gói`}>
      <div className="plans-search"><Search size={16} /><input aria-label="Tìm gói dịch vụ" value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="Tìm theo tên hoặc mã gói..." /></div>
      <select aria-label="Trạng thái mở bán" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as "all" | PlanStatus)}>
        <option value="all">Tất cả trạng thái</option><option value="Active">Đang mở bán</option><option value="Inactive">Tạm ngừng bán</option>
      </select>
      <div className="plans-toolbar-actions">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onExportExcel}><Download size={15} />Xuất Excel</button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={onOpenCreate}><Plus size={15} />Tạo gói mới</button>
      </div>
    </div>
  );
};
