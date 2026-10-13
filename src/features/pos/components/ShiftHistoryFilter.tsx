import type { FC } from 'react';
import type { ShiftHistoryFilterState } from '../types/pos.types';

interface Props {
  filter: ShiftHistoryFilterState;
  onFilterChange: (updater: Partial<ShiftHistoryFilterState>) => void;
}

export const ShiftHistoryFilter: FC<Props> = ({ filter, onFilterChange }) => {
  return (
    <div className="pos-history-filter-bar">
      <div className="filter-group-time">
        <span className="filter-label">Mốc thời gian:</span>
        <div className="time-preset-buttons">
          <button
            type="button"
            className={`preset-btn ${filter.timePreset === 'today' ? 'active' : ''}`}
            onClick={() => onFilterChange({ timePreset: 'today' })}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className={`preset-btn ${filter.timePreset === 'yesterday' ? 'active' : ''}`}
            onClick={() => onFilterChange({ timePreset: 'yesterday' })}
          >
            Hôm qua
          </button>
          <button
            type="button"
            className={`preset-btn ${filter.timePreset === 'last_7_days' ? 'active' : ''}`}
            onClick={() => onFilterChange({ timePreset: 'last_7_days' })}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            className={`preset-btn ${filter.timePreset === 'this_month' ? 'active' : ''}`}
            onClick={() => onFilterChange({ timePreset: 'this_month' })}
          >
            Tháng này
          </button>
        </div>
        <input
          type="date"
          value={filter.customDate}
          onChange={(e) =>
            onFilterChange({ timePreset: 'custom', customDate: e.target.value })
          }
          className="filter-date-input"
        />
      </div>

      <div className="filter-group-selects">
        <select
          value={filter.cashierName}
          onChange={(e) => onFilterChange({ cashierName: e.target.value })}
          className="filter-select"
        >
          <option value="all">Tất cả thu ngân</option>
          <option value="Nguyễn Bá Sơn">Nguyễn Bá Sơn (NV004)</option>
          <option value="Trần Thị Hoa">Trần Thị Hoa (NV002)</option>
          <option value="Lê Hoàng Nam">Lê Hoàng Nam (NV003)</option>
        </select>

        <select
          value={filter.branchName}
          onChange={(e) => onFilterChange({ branchName: e.target.value })}
          className="filter-select"
        >
          <option value="all">Tất cả chi nhánh</option>
          <option value="Chi nhánh trung tâm">Chi nhánh trung tâm</option>
          <option value="Chi nhánh Hà Đông">Chi nhánh Hà Đông</option>
        </select>
      </div>
    </div>
  );
};
