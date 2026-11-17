import React from 'react';
import type { FinanceOverviewResponse } from '../types/financeOverview.types';
import { formatMoney } from '../utils/formatters';

interface Props {
  data?: FinanceOverviewResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectBranch: (branchId: string) => void;
}

const statusLabel = {
  HEALTHY: 'Ổn định',
  ATTENTION: 'Cần theo dõi',
  HISTORICAL_CASH_ONLY: 'Chỉ có dữ liệu tiền',
};

export const BranchCashHealthPanel: React.FC<Props> = ({
  data,
  isLoading,
  isFetching,
  onSelectBranch,
}) => {
  if (isLoading || !data) {
    return <section className="finance-cash-health-card finance-panel-loading">Đang tải sức khỏe tiền mặt…</section>;
  }

  const { totals, attention } = data;
  return (
    <>
      <section className="finance-cash-health-card" aria-labelledby="branch-health-title" aria-busy={isFetching}>
        <div className="finance-section-heading">
          <div>
            <h2 id="branch-health-title">Sức khỏe tiền mặt theo chi nhánh</h2>
            <p>
              Số dư tại {new Date(data.positionAsOfUtc).toLocaleDateString('vi-VN')} · Dòng tiền trong kỳ đã chọn
            </p>
          </div>
          {isFetching && <span className="finance-fetching-label">Đang cập nhật…</span>}
        </div>
        <div className="finance-table-scroll" tabIndex={0}>
          <table className="finance-branch-health-table">
            <thead><tr><th>Chi nhánh</th><th>Tiền cuối kỳ</th><th>Tiền vào</th><th>Tiền ra</th><th>Dòng tiền ròng</th><th>Đang chuyển</th><th>Chờ thanh toán</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {data.branches.map((branch) => (
                <tr key={branch.branchId} onClick={() => onSelectBranch(branch.branchId)}>
                  <td>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectBranch(branch.branchId);
                      }}
                    >
                      {branch.branchName}<small>{branch.branchCode}</small>
                    </button>
                  </td>
                  <td>{formatMoney(branch.closingBalance)}</td>
                  <td className="positive">+{formatMoney(branch.cashIn)}</td>
                  <td className="negative">−{formatMoney(branch.cashOut)}</td>
                  <td>{formatMoney(branch.netCashFlow)}</td>
                  <td>{attention.isCurrentSnapshot ? formatMoney(branch.cashInTransit) : 'Không có lịch sử'}</td>
                  <td>{attention.isCurrentSnapshot ? formatMoney(branch.pendingPayableAmount) : 'Không có lịch sử'}</td>
                  <td><span className={`finance-health-status ${branch.status.toLowerCase()}`}>{statusLabel[branch.status]}</span></td>
                </tr>
              ))}
              {data.scope.branchId === null && (
                <tr className="total-row"><td>Toàn bộ chi nhánh</td><td>{formatMoney(totals.closingBalance)}</td><td className="positive">+{formatMoney(totals.cashIn)}</td><td className="negative">−{formatMoney(totals.cashOut)}</td><td>{formatMoney(totals.netCashFlow)}</td><td>{attention.isCurrentSnapshot ? formatMoney(attention.cashInTransit) : '—'}</td><td>{attention.isCurrentSnapshot ? formatMoney(attention.pendingPayableAmount) : '—'}</td><td>—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-summary-unified-card" aria-label="Tổng quan số dư và dòng tiền">
        <div className="finance-position-grid">
          <article className="finance-position-main">
            <span>Tiền có thể sử dụng tại cuối kỳ</span>
            <strong>{formatMoney(totals.availableCash)}</strong>
            <div className="finance-balance-allocation">
              <span>Quầy <b>{formatMoney(totals.cashAtRegisters)}</b></span>
              <span>Két sắt <b>{formatMoney(totals.safeDeposit)}</b></span>
              <span>Ngân hàng <b>{formatMoney(totals.bankBalance)}</b></span>
            </div>
            {totals.unallocatedBankBalance > 0 && data.scope.branchId === null && <p>Ngân hàng dùng chung chưa phân bổ chi nhánh: {formatMoney(totals.unallocatedBankBalance)}</p>}
          </article>
          <article className="finance-flow-card"><span>Số dư đầu kỳ</span><strong>{formatMoney(totals.openingBalance)}</strong></article>
          <article className="finance-flow-card positive"><span>Tiền vào</span><strong>+{formatMoney(totals.cashIn)}</strong></article>
          <article className="finance-flow-card negative"><span>Tiền ra</span><strong>−{formatMoney(totals.cashOut)}</strong></article>
          <article className="finance-flow-card"><span>Dòng tiền ròng</span><strong>{formatMoney(totals.netCashFlow)}</strong>{totals.internalTransferNet !== 0 && <small>Chuyển nội bộ ròng: {formatMoney(totals.internalTransferNet)}</small>}</article>
        </div>
      </section>
    </>
  );
};
