import type { FC } from 'react';
import { Search, RotateCcw, Filter, Calendar, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BranchOption, DispatchScope } from '../../types/po.types';

export type DispatchTabType = 'all' | 'critical' | 'today' | 'later' | 'completed';

interface DispatchFilterBarProps {
  activeTab: DispatchTabType;
  onTabChange: (tab: DispatchTabType) => void;
  counts: Record<DispatchTabType, number>;
  keyword: string;
  onKeywordChange: (kw: string) => void;
  branches: BranchOption[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onResetFilters: () => void;

  scope: DispatchScope;
  onScopeChange: (scope: DispatchScope) => void;
  weekStartDate?: string;
  onWeekChange?: (dateStr: string) => void;
}

function formatWeekLabel(weekMondayStr?: string): string {
  if (!weekMondayStr) return 'Tuần hiện tại';
  const mon = new Date(weekMondayStr);
  if (Number.isNaN(mon.getTime())) return weekMondayStr;
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dMon = `${pad(mon.getDate())}/${pad(mon.getMonth() + 1)}`;
  const dSun = `${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`;
  return `Tuần: ${dMon} - ${dSun}`;
}

function shiftWeek(currentMondayStr?: string, deltaWeeks = 0): string {
  const d = currentMondayStr ? new Date(currentMondayStr) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + deltaWeeks * 7);
  // normalize to Monday
  const day = d.getDay();
  const diff = (7 + (day - 1)) % 7;
  d.setDate(d.getDate() - diff);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DispatchFilterBar: FC<DispatchFilterBarProps> = ({
  activeTab,
  onTabChange,
  counts,
  keyword,
  onKeywordChange,
  branches,
  selectedBranchId,
  onSelectBranch,
  onResetFilters,
  scope,
  onScopeChange,
  weekStartDate,
  onWeekChange,
}) => {
  const hasFilters = Boolean(keyword) || activeTab !== 'all';

  return (
    <div className="so-list-filter" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Scope Switcher Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: '#f8fafc',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginRight: 4 }}>
            Phạm vi chốt:
          </span>
          <button
            type="button"
            className={`po-btn ${scope === 'NEAREST' ? 'po-btn-primary' : 'po-btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              gap: 6,
              borderRadius: 6,
            }}
            onClick={() => onScopeChange('NEAREST')}
            title="Chỉ chốt ngày giao gần nhất có số lượng đặt hàng (>0)"
          >
            <Zap size={14} />
            <span>Ngày giao gần nhất (NEAREST)</span>
          </button>
          <button
            type="button"
            className={`po-btn ${scope === 'WEEK' ? 'po-btn-primary' : 'po-btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              gap: 6,
              borderRadius: 6,
            }}
            onClick={() => onScopeChange('WEEK')}
            title="Chốt tất cả các ngày giao trong tuần từ Thứ Hai đến Chủ Nhật"
          >
            <Calendar size={14} />
            <span>Cả tuần T2–CN (WEEK)</span>
          </button>
        </div>

        {/* Week navigation when scope === 'WEEK' */}
        {scope === 'WEEK' && onWeekChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="po-btn po-btn-secondary"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() => onWeekChange(shiftWeek(weekStartDate, -1))}
              title="Tuần trước"
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0f766e',
                background: '#f0fdfa',
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #99f6e4',
              }}
            >
              {formatWeekLabel(weekStartDate)}
            </span>
            <button
              type="button"
              className="po-btn po-btn-secondary"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() => onWeekChange(shiftWeek(undefined, 0))}
              title="Về tuần hiện tại"
            >
              Tuần này
            </button>
            <button
              type="button"
              className="po-btn po-btn-secondary"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() => onWeekChange(shiftWeek(weekStartDate, 1))}
              title="Tuần kế tiếp"
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Filter Row */}
      <div className="so-list-filter-row">
        <div className="so-list-filter-field" style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="so-list-filter-input"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Tìm theo tên NCC, nhóm hàng..."
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label">
            <Filter size={13} color="#64748b" style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Trạng thái:
          </label>
          <select
            className="so-list-filter-select"
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as DispatchTabType)}
            style={
              activeTab !== 'all'
                ? { borderColor: '#0d9488', color: '#0f766e', background: '#f0fdfa' }
                : undefined
            }
            title="Lọc theo mức độ ưu tiên hoặc trạng thái PO"
          >
            <option value="all">Tất cả ({counts.all})</option>
            <option value="critical">Cần chốt gấp ({counts.critical})</option>
            <option value="today">Hôm nay ({counts.today})</option>
            <option value="later">Đợt tới ({counts.later})</option>
            <option value="completed">Đã gửi PO ({counts.completed})</option>
          </select>
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label">Chi nhánh:</label>
          <select
            className="so-list-filter-select"
            value={selectedBranchId}
            onChange={(e) => onSelectBranch(e.target.value)}
            title="Lọc theo Chi nhánh"
          >
            {branches.length === 0 && <option value="">— Chưa có chi nhánh —</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="so-list-filter-row so-list-filter-row--footer">
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Đang áp dụng bộ lọc</span>
          <button type="button" className="po-btn po-btn-secondary" onClick={onResetFilters} title="Đặt lại bộ lọc">
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      )}
    </div>
  );
};
