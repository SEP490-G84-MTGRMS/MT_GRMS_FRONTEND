import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MOCK_FUNDS,
  MOCK_CASH_TRANSIT,
  MOCK_PAYABLES,
  MOCK_CUSTOMERS,
  MOCK_PNL_MONTH,
} from '../data/mockFinanceData';
import { formatMoney, formatCompactMoney } from '../utils/formatters';
import { calculateDaysOverdue } from '../services/financeClock';
import { calculateHouseholdTax } from '../config/taxConfig';
import { useQuery } from '@tanstack/react-query';
import { taxSnapshotApi } from '../../tax-snapshot/api/taxSnapshotApi';
import { TaxPeriodType, TaxCalculationMethod } from '../../tax-snapshot/types/taxSnapshot';
import { TrendingUp, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import '../finance.css';

export const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [cashTransitConfirmed, setCashTransitConfirmed] = useState(false);
  const [showConfirmTransitModal, setShowConfirmTransitModal] = useState(false);

  // Calculations
  const totalFunds = MOCK_FUNDS.reduce((sum, f) => sum + f.balance, 0);
  const cashInTransit = cashTransitConfirmed
    ? 0
    : MOCK_CASH_TRANSIT.filter((t) => t.status === 'PENDING').reduce(
        (sum, t) => sum + t.amount,
        0
      );
  const totalAssets = totalFunds + cashInTransit;

  // Fund Breakdown
  const cashAtRegisters = MOCK_FUNDS.filter(
    (f) => f.id === 'cash_q1' || f.id === 'cash_q7'
  ).reduce((sum, f) => sum + f.balance, 0);

  const safeDeposit = MOCK_FUNDS.find((f) => f.id === 'safe')?.balance || 0;
  const bankBalances = MOCK_FUNDS.filter((f) => f.group === 'bank').reduce(
    (sum, f) => sum + f.balance,
    0
  );

  // Tasks to do
  const overduePayables = MOCK_PAYABLES.filter(
    (p) => !p.isPaid && calculateDaysOverdue(p.dueDate) > 0
  );
  const overduePayablesAmount = overduePayables.reduce((sum, p) => sum + p.amount, 0);

  const overLimitCustomers = MOCK_CUSTOMERS.filter(
    (c) => c.currentDebt > c.creditLimit
  );

  const totalCustomerDebt = MOCK_CUSTOMERS.reduce(
    (sum, c) => sum + c.currentDebt,
    0
  );

  // Tax summary with YTD periodType = Year
  const taxSummaryQuery = useQuery({
    queryKey: ['tax-summary-overview', 2026],
    queryFn: () =>
      taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Year,
        periodNumber: 2026,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
      }),
  });

  const taxDueYear =
    taxSummaryQuery.data?.taxDueYtd ??
    taxSummaryQuery.data?.totalTaxAmount ??
    calculateHouseholdTax(1_417_500_000).totalTaxAmount;

  // Percentages for allocation bar
  const pctCash = Math.round((cashAtRegisters / totalAssets) * 100);
  const pctSafe = Math.round((safeDeposit / totalAssets) * 100);
  const pctBank = Math.round((bankBalances / totalAssets) * 100);
  const pctTransit = Math.round((cashInTransit / totalAssets) * 100);

  return (
    <div className="finance-overview-container">
      {/* Main Content Container */}
      <main className="finance-overview-main">
        {/* Header & Page Title */}
        <div className="finance-overview-header">
          <div className="finance-overview-title">
            <h1>Tổng quan Tài chính</h1>
            <p>Dòng tiền, công nợ và các khoản cần xử lý trong ngày (27/10/2026)</p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => navigate('/store-owner/cashbook')}
              className="btn-primary-teal"
              id="btn-quick-receipt-payment"
            >
              <span>+ Thu / Chi tiền</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Tiền hiện có hôm nay */}
        <section aria-labelledby="hero-title" className="finance-hero-card">
          <div className="finance-hero-header">
            <div>
              <span id="hero-title" className="finance-hero-title-text">
                Tiền hiện có hôm nay (có thể tiêu ngay)
              </span>
              <div className="finance-hero-amount">
                {formatMoney(totalAssets)}
              </div>
            </div>

            <div className="finance-hero-badge">
              <TrendingUp size={16} />
              <span>Tăng 14,25 triệu so với đầu tháng</span>
            </div>
          </div>

          {/* Asset Allocation Progress Bar */}
          <div>
            <div
              className="finance-allocation-track"
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                style={{ width: `${pctCash}%`, background: '#115E59' }}
                title={`Tiền mặt quầy: ${formatMoney(cashAtRegisters)}`}
              />
              <div
                style={{ width: `${pctSafe}%`, background: '#2DD4BF' }}
                title={`Két sắt chủ shop: ${formatMoney(safeDeposit)}`}
              />
              <div
                style={{ width: `${pctBank}%`, background: '#94A3B8' }}
                title={`Ngân hàng: ${formatMoney(bankBalances)}`}
              />
              {cashInTransit > 0 && (
                <div
                  style={{ width: `${pctTransit}%`, background: '#B45309' }}
                  title={`Đang chuyển về két sắt: ${formatMoney(cashInTransit)}`}
                />
              )}
            </div>

            {/* Asset Legend */}
            <div className="finance-legend-grid">
              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#115E59' }} />
                <span className="finance-legend-label">Tiền quầy:</span>
                <span className="finance-legend-val">
                  {formatCompactMoney(cashAtRegisters)}
                </span>
              </div>

              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#2DD4BF' }} />
                <span className="finance-legend-label">Két sắt:</span>
                <span className="finance-legend-val">
                  {formatCompactMoney(safeDeposit)}
                </span>
              </div>

              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#94A3B8' }} />
                <span className="finance-legend-label">Ngân hàng:</span>
                <span className="finance-legend-val">
                  {formatCompactMoney(bankBalances)}
                </span>
              </div>

              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#B45309' }} />
                <span className="finance-legend-label">Đang chuyển:</span>
                <span className="finance-legend-val">
                  {cashInTransit > 0 ? formatCompactMoney(cashInTransit) : '0đ'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tasks Section: Việc cần làm */}
        <section aria-labelledby="tasks-title" className="finance-todo-section">
          <div className="finance-todo-header">
            <h2 id="tasks-title">Việc cần làm trong ngày</h2>
            <span className="finance-todo-count-badge">
              {(cashInTransit > 0 ? 1 : 0) +
                (overduePayables.length > 0 ? 1 : 0) +
                (overLimitCustomers.length > 0 ? 1 : 0)}{' '}
              việc
            </span>
          </div>

          <div className="finance-todo-list">
            {/* Urgent Task 1: Overdue Payables */}
            {overduePayables.length > 0 && (
              <div className="finance-todo-item danger">
                <div className="finance-todo-left">
                  <div className="finance-todo-icon danger">!</div>
                  <div>
                    <h3 className="finance-todo-title danger">
                      {overduePayables.length} khoản phải trả đã quá hạn ({formatMoney(overduePayablesAmount)})
                    </h3>
                    <p className="finance-todo-sub danger">
                      Gồm tiền mặt bằng Bình Thạnh (18tr) và tiền điện EVN Q1 (3.85tr)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/store-owner/expenses')}
                  className="finance-todo-btn danger"
                >
                  Xem chi tiết
                </button>
              </div>
            )}

            {/* Urgent Task 2: Customers Over Credit Limit */}
            {overLimitCustomers.length > 0 && (
              <div className="finance-todo-item warning">
                <div className="finance-todo-left">
                  <div className="finance-todo-icon warning">!</div>
                  <div>
                    <h3 className="finance-todo-title warning">
                      {overLimitCustomers.length} khách vượt hạn mức nợ
                    </h3>
                    <p className="finance-todo-sub warning">
                      Cửa hàng Phúc An (nợ 32tr/30tr) và Phạm Minh Tuấn (nợ 6.2tr/5tr)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/store-owner/customers')}
                  className="finance-todo-btn warning"
                >
                  Thu nợ ngay
                </button>
              </div>
            )}

            {/* Task 3: Cash Transit Pending Confirmation */}
            {cashInTransit > 0 && (
              <div className="finance-todo-item info">
                <div className="finance-todo-left">
                  <div className="finance-todo-icon info">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="finance-todo-title info">
                      10,35 triệu đang chuyển về két sắt
                    </h3>
                    <p className="finance-todo-sub info">
                      Thu ngân Trần Thị Lan nộp từ Két quầy Q1 lúc 08:15
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmTransitModal(true)}
                  className="finance-todo-btn info"
                >
                  Đã nhận đủ
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 4 Summary Cards Grid */}
        <section aria-label="Tóm tắt 4 trụ cột tài chính" className="finance-summary-grid">
          {/* Card 1: Khách nợ */}
          <div
            onClick={() => navigate('/store-owner/customers')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Khách đang nợ mình</span>
              <div className="finance-summary-val">
                {formatMoney(totalCustomerDebt)}
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#B45309', fontWeight: 600 }}>5 khách đang nợ</span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Xem sổ nợ <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 2: Phải trả */}
          <div
            onClick={() => navigate('/store-owner/expenses')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Phải trả dịch vụ</span>
              <div className="finance-summary-val">
                {formatMoney(overduePayablesAmount)}
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#DC2626', fontWeight: 700 }}>3 khoản quá hạn</span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Xem chi tiết <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 3: Lãi tháng này */}
          <div
            onClick={() => navigate('/store-owner/reports/pnl')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Lãi tháng này</span>
              <div className="finance-summary-val" style={{ color: '#15803D' }}>
                {formatMoney(MOCK_PNL_MONTH.netProfit)}
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#475569', fontWeight: 600 }}>100đ bán, lãi 15đ</span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Báo cáo Lãi lỗ <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 4: Thuế năm nay */}
          <div
            onClick={() => navigate('/store-owner/tax-snapshots')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Thuế năm nay (Lũy kế 2026)</span>
              <div className="finance-summary-val" style={{ color: '#B45309' }}>
                {formatMoney(taxDueYear)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                Tính đến hết Quý 3/2026
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#B45309', fontWeight: 600 }}>Vượt trần 417,5tr</span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Kê khai thuế <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </section>

        {/* Confirmation Modal for Cash Transit */}
        {showConfirmTransitModal && (
          <div className="finance-modal-backdrop" onClick={() => setShowConfirmTransitModal(false)}>
            <div className="finance-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: '#CCFBF1',
                    color: '#0F766E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Xác nhận nhận tiền về két sắt
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Chuyển từ Két quầy Q1 về két sắt an toàn của chủ tiệm
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: '0 0 20px' }}>
                Bạn xác nhận đã nhận đủ số tiền{' '}
                <strong style={{ color: '#0F766E' }}>{formatMoney(10350000)}</strong> từ thu ngân Trần Thị Lan vào két sắt an toàn?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmTransitModal(false)}
                  className="btn-secondary-pill"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCashTransitConfirmed(true);
                    setShowConfirmTransitModal(false);
                  }}
                  className="btn-primary-pill"
                  style={{ background: 'var(--brand-700, #115E59)' }}
                >
                  Xác nhận đã cất vào két
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default FinanceOverviewPage;
