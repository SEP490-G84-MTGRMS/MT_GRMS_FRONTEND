import type { FC } from 'react';
import { Search, Download } from 'lucide-react';
import type { AuditActionType, AuditRiskLevel } from '../../types/audit.types';

interface AuditLogToolbarProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  actionType: AuditActionType;
  onActionTypeChange: (val: AuditActionType) => void;
  riskLevel: 'ALL' | AuditRiskLevel;
  onRiskLevelChange: (val: 'ALL' | AuditRiskLevel) => void;
  dateRange: 'all' | 'today' | '7d' | '30d';
  onDateRangeChange: (val: 'all' | 'today' | '7d' | '30d') => void;
  totalFiltered: number;
  totalAll: number;
  onExport: () => void;
}

export const AuditLogToolbar: FC<AuditLogToolbarProps> = ({
  keyword,
  onKeywordChange,
  actionType,
  onActionTypeChange,
  riskLevel,
  onRiskLevelChange,
  dateRange,
  onDateRangeChange,
  totalFiltered,
  totalAll,
  onExport,
}) => {
  return (
    <div className="plans-toolbar audit-toolbar" style={{ marginBottom: 16 }}>
      {/* Search Input */}
      <div className="plans-search" style={{ flex: '1 1 280px' }}>
        <Search size={16} strokeWidth={2} style={{ color: '#8493A5', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Tìm theo mã log, Admin, tên Tenant, IP..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>

      {/* Filter by Action Type */}
      <select
        value={actionType}
        onChange={(e) => onActionTypeChange(e.target.value as AuditActionType)}
        style={{ cursor: 'pointer' }}
      >
        <option value="ALL">-- Tất cả loại hành vi --</option>
        <option value="TENANT_LOCK">Khóa chuỗi gian hàng</option>
        <option value="TENANT_UNLOCK">Mở khóa gian hàng</option>
        <option value="PLAN_PRICE_CHANGE">Đổi giá gói cước</option>
        <option value="SUBSCRIPTION_EXTEND">Gia hạn hợp đồng / Ân hạn</option>
        <option value="ADMIN_LOGIN">Đăng nhập Admin</option>
        <option value="DB_BACKUP_MANUAL">Sao lưu CSDL thủ công</option>
        <option value="CRON_TRIGGER">Kích hoạt tác vụ ngầm</option>
        <option value="SYSTEM_CONFIG">Cấu hình hệ thống</option>
      </select>

      {/* Filter by Risk Level */}
      <select
        value={riskLevel}
        onChange={(e) => onRiskLevelChange(e.target.value as 'ALL' | AuditRiskLevel)}
        style={{ cursor: 'pointer' }}
      >
        <option value="ALL">-- Tất cả mức độ rủi ro --</option>
        <option value="INFO">Thông tin (Info)</option>
        <option value="WARNING">Cảnh báo (Warning)</option>
        <option value="DANGER">Nguy cơ / Nhạy cảm (Danger)</option>
      </select>

      {/* Filter by Date Range */}
      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as 'all' | 'today' | '7d' | '30d')}
        style={{ cursor: 'pointer' }}
      >
        <option value="all">Toàn bộ thời gian</option>
        <option value="today">Hôm nay</option>
        <option value="7d">7 ngày gần nhất</option>
        <option value="30d">30 ngày gần nhất</option>
      </select>

      {/* Actions */}
      <div className="plans-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            color: '#64748B',
            marginRight: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          Hiển thị: <strong>{totalFiltered}</strong> / {totalAll}
        </span>

        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={onExport}
          title="Xuất dữ liệu kiểm toán ra file Excel/CSV"
        >
          <Download size={15} strokeWidth={2} />
          <span>Xuất dữ liệu</span>
        </button>
      </div>
    </div>
  );
};
