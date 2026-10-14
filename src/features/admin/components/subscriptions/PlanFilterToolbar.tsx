import type { FC } from 'react';
import type { PlanStatus } from '../../types/plan.types';
import { Search, Plus, Download } from 'lucide-react';

interface PlanFilterToolbarProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  statusFilter: 'all' | PlanStatus;
  onStatusFilterChange: (val: 'all' | PlanStatus) => void;
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
    <div
      className="admin-toolbar-card"
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        marginBottom: 16,
      }}
    >
      <div
        className="admin-search-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          width: '100%',
        }}
      >
        {/* Left Side: Search + Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 400 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 13,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="admin-search-input"
              style={{
                paddingLeft: 36,
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
              }}
              placeholder="Tìm theo mã gói (PLAN_...), tên gói dịch vụ..."
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
            />
          </div>

          {/* Dropdown Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | PlanStatus)}
            style={{
              height: 40,
              padding: '0 28px 0 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: 'var(--bg-soft-blue)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Đang mở bán (Active)</option>
            <option value="Inactive">Tạm ngừng bán (Inactive)</option>
          </select>
        </div>

        {/* Right Side: Action Buttons & Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Hiển thị <b style={{ color: 'var(--blue-primary)' }}>{visibleCount}</b> / {totalCount} gói
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onExportExcel}
            style={{ height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onOpenCreate}
            style={{ height: 40, padding: '0 16px', borderRadius: 8 }}
          >
            <Plus size={14} />
            <span>+ Tạo gói mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
