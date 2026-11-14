import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Users, ChevronRight } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

export interface ActionInboxProps {
  unconfirmedDropsCount: number;
  pendingApprovalsCount: number;
  cashInTransit: number;
  overduePayablesCount: number;
  overduePayablesAmount: number;
  overLimitCustomersCount: number;
  onNavigateCashControl: () => void;
  onNavigateExpenses: () => void;
  onNavigateCustomers: () => void;
}

/**
 * Action Inbox component: Urgently alerts the store owner to unconfirmed POS cash drops,
 * pending counter disbursements, overdue operating expenses, and customers exceeding credit limits.
 */
export const ActionInbox: React.FC<ActionInboxProps> = ({
  unconfirmedDropsCount,
  pendingApprovalsCount,
  cashInTransit,
  overduePayablesCount,
  overduePayablesAmount,
  overLimitCustomersCount,
  onNavigateCashControl,
  onNavigateExpenses,
  onNavigateCustomers,
}) => {
  const pendingPosTasksCount = unconfirmedDropsCount + pendingApprovalsCount;
  const totalTasks =
    (pendingPosTasksCount > 0 ? 1 : 0) +
    (overduePayablesCount > 0 ? 1 : 0) +
    (overLimitCustomersCount > 0 ? 1 : 0);

  // If there are zero urgent tasks, display a compact reassuring green banner
  if (totalTasks === 0) {
    return (
      <section aria-label="Việc cần làm trong ngày" className="finance-todo-empty-strip">
        <div className="finance-todo-empty-left">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>
            Việc cần làm trong ngày: Tuyệt vời! Không có khoản nợ quá hạn hoặc khoản chi nào cần xử lý khẩn cấp hôm nay.
          </span>
        </div>
        <span className="finance-todo-empty-badge">0 việc khẩn</span>
      </section>
    );
  }

  return (
    <section aria-labelledby="tasks-title" className="finance-action-inbox-wrapper">
      <div className="card finance-action-inbox-card">
        <div className="card-header finance-action-inbox-header">
          <div className="finance-action-inbox-title-group">
            <span className="finance-action-inbox-icon">📥</span>
            <h2 id="tasks-title" className="finance-action-inbox-heading">
              Cần bạn duyệt & xử lý ngay (Hộp duyệt việc)
            </h2>
            <span className="badge badge-orange">{totalTasks} đầu việc khẩn</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNavigateCashControl}
            title="Mở tab chờ duyệt của Ca & Két"
          >
            <span>Mở Ca & Két duyệt ngay</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="card-body action-inbox-list">
          {/* 1. Pending POS Cash Drops & Drawer Disbursements */}
          {pendingPosTasksCount > 0 && (
            <div className="action-inbox-item warning">
              <div className="action-inbox-icon-box warning">
                <Clock size={18} />
              </div>
              <div className="action-inbox-content">
                <div className="action-inbox-title">
                  Yêu cầu Ca & Két POS chờ duyệt ({pendingPosTasksCount} phiếu)
                </div>
                <div className="action-inbox-meta">
                  {unconfirmedDropsCount} phiếu rút két ({formatMoney(cashInTransit)}) •{' '}
                  {pendingApprovalsCount} khoản chi quầy vượt mức cần chủ tiệm phê duyệt
                </div>
              </div>
              <div className="action-inbox-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateCashControl}
                >
                  Xử lý Ca & Két →
                </button>
              </div>
            </div>
          )}

          {/* 2. Overdue or Due Operating Expenses */}
          {overduePayablesCount > 0 && (
            <div className="action-inbox-item urgent">
              <div className="action-inbox-icon-box urgent">
                <AlertCircle size={18} />
              </div>
              <div className="action-inbox-content">
                <div className="action-inbox-title">
                  {overduePayablesCount} khoản phải trả đã quá hạn ({formatMoney(overduePayablesAmount)})
                </div>
                <div className="action-inbox-meta">
                  Các khoản chi phí dịch vụ quá hạn thanh toán cần được giải ngân
                </div>
              </div>
              <div className="action-inbox-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={onNavigateExpenses}
                >
                  Xem chi tiết →
                </button>
              </div>
            </div>
          )}

          {/* 3. Customers Exceeding Credit Limit */}
          {overLimitCustomersCount > 0 && (
            <div className="action-inbox-item warning">
              <div className="action-inbox-icon-box warning">
                <Users size={18} />
              </div>
              <div className="action-inbox-content">
                <div className="action-inbox-title">
                  {overLimitCustomersCount} khách hàng vượt hạn mức nợ
                </div>
                <div className="action-inbox-meta">
                  Cần thu hồi công nợ trước khi tiếp tục cho phép ghi nợ đơn mới
                </div>
              </div>
              <div className="action-inbox-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={onNavigateCustomers}
                >
                  Thu nợ ngay →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
