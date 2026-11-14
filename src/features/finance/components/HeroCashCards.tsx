import React from 'react';
import { TrendingUp, DollarSign, Lock, Building2, Truck, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import type { CashAccount } from '../../cashbook/types/cashbook.types';

export interface CashMetrics {
  cashAtRegisters: number;
  safeDeposit: number;
  bankBalances: number;
  cashInTransit: number;
  totalAssets: number;
  pctCash: number;
  pctSafe: number;
  pctBank: number;
  pctTransit: number;
}

interface HeroCashCardsProps {
  isLoading: boolean;
  metrics: CashMetrics;
  accounts?: CashAccount[];
  onNavigateCashbook?: () => void;
  onNavigateCashControl?: () => void;
}

/**
 * Hero Cash Overview section with Individual Account Balance Cards
 * and a prominent Cash-in-Transit warning card synced from POS shifts.
 */
export const HeroCashCards: React.FC<HeroCashCardsProps> = ({
  isLoading,
  metrics,
  accounts = [],
  onNavigateCashbook,
  onNavigateCashControl,
}) => {
  // Aggregate accounts by category for clear presentation
  const registerAccounts = accounts.filter((a) => a.accountType === 'CASH' && !a.isSafeDeposit);
  const safeAccounts = accounts.filter((a) => a.accountType === 'CASH' && a.isSafeDeposit);
  const bankAccounts = accounts.filter((a) => a.accountType === 'BANK');

  const registerBranchLabel = registerAccounts.length > 0
    ? registerAccounts.map((a) => a.branchName || 'Quầy thu ngân').join(', ')
    : 'Các quầy thu ngân POS';

  const bankNameLabel = bankAccounts.length > 0
    ? bankAccounts.map((a) => a.accountName).join(' • ')
    : 'Vietcombank / MBBank VietQR';

  const transitHasFunds = metrics.cashInTransit > 0;

  return (
    <section aria-labelledby="hero-title" className="finance-hero-section">
      {/* Top Banner: Total Liquid Assets available today */}
      <div className="finance-hero-summary-card">
        <div className="finance-hero-header">
          <div>
            <span id="hero-title" className="finance-hero-title-text">
              Tiền hiện có hôm nay (có thể tiêu ngay)
            </span>
            <div className="finance-hero-amount">
              {isLoading ? (
                <span className="finance-loading-text">Đang tải số dư...</span>
              ) : (
                formatMoney(metrics.totalAssets)
              )}
            </div>
          </div>

          <div className="finance-hero-badge">
            <TrendingUp size={16} />
            <span>Dữ liệu thực từ sổ quỹ &amp; tài khoản ngân hàng</span>
          </div>
        </div>
      </div>

      {/* Hero Cash Cards Strip (Individual Accounts Grid) */}
      <div className="finance-accounts-grid">
        {/* 1. Cash at POS Registers */}
        <div
          className="finance-account-card cursor-pointer"
          onClick={onNavigateCashbook}
          title="Xem chi tiết sổ quỹ quầy"
        >
          <div className="finance-acc-header">
            <span className="finance-acc-label">Két quầy thu ngân</span>
            <div className="finance-acc-icon teal">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="finance-acc-value">
            {isLoading ? '...' : formatMoney(metrics.cashAtRegisters)}
          </div>
          <div className="finance-acc-sub">
            {registerBranchLabel}
          </div>
          <div className="finance-acc-footer">
            <span className="finance-acc-tag teal">Sẵn sàng thối tiền</span>
          </div>
        </div>

        {/* 2. Safe Deposit (Owner Vault) */}
        <div
          className="finance-account-card cursor-pointer"
          onClick={onNavigateCashbook}
          title="Xem chi tiết két sắt chủ shop"
        >
          <div className="finance-acc-header">
            <span className="finance-acc-label">Két sắt chủ shop</span>
            <div className="finance-acc-icon cyan">
              <Lock size={18} />
            </div>
          </div>
          <div className="finance-acc-value">
            {isLoading ? '...' : formatMoney(metrics.safeDeposit)}
          </div>
          <div className="finance-acc-sub">
            {safeAccounts.length > 0 ? (safeAccounts[0].branchName || 'Toàn hệ thống') : 'Két an toàn tại cửa hàng'}
          </div>
          <div className="finance-acc-footer">
            <span className="finance-acc-tag cyan">Dự trữ &amp; chi lớn</span>
          </div>
        </div>

        {/* 3. Bank Account / VietQR */}
        <div
          className="finance-account-card cursor-pointer"
          onClick={onNavigateCashbook}
          title="Xem chi tiết tài khoản ngân hàng"
        >
          <div className="finance-acc-header">
            <span className="finance-acc-label">Tài khoản ngân hàng VietQR</span>
            <div className="finance-acc-icon slate">
              <Building2 size={18} />
            </div>
          </div>
          <div className="finance-acc-value">
            {isLoading ? '...' : formatMoney(metrics.bankBalances)}
          </div>
          <div className="finance-acc-sub" title={bankNameLabel}>
            {bankNameLabel}
          </div>
          <div className="finance-acc-footer">
            <span className="finance-acc-tag slate">Chuyển khoản tức thì</span>
          </div>
        </div>

        {/* 4. Cash-in-Transit (Unconfirmed Drops Alert Card) */}
        <div
          className={`finance-account-card transit-card ${transitHasFunds ? 'warning' : 'neutral'} cursor-pointer`}
          onClick={onNavigateCashControl}
          title="Xem Ca & Két chờ chủ xác nhận tiền"
        >
          <div className="finance-acc-header">
            <span className="finance-acc-label font-bold">
              Tiền đang chuyển về két sắt (Cash-in-transit)
            </span>
            <div className={`finance-acc-icon ${transitHasFunds ? 'orange' : 'green'}`}>
              <Truck size={18} />
            </div>
          </div>
          <div className={`finance-acc-value ${transitHasFunds ? 'text-orange-600' : 'text-slate-700'}`} id="fin-cash-in-transit">
            {isLoading ? '...' : formatMoney(metrics.cashInTransit)}
          </div>
          <div className="finance-acc-trend">
            {transitHasFunds ? (
              <span className="trend-warn flex items-center gap-1">
                <AlertTriangle size={13} className="shrink-0" />
                Đồng bộ từ Ca &amp; Két POS — chờ chủ xác nhận nhận tiền
              </span>
            ) : (
              <span className="trend-ok flex items-center gap-1">
                <CheckCircle size={13} className="shrink-0" />
                Đã nhận đủ về két sắt cửa hàng (0 đ đang chuyển)
              </span>
            )}
          </div>
          <div className="finance-acc-sub mt-auto pt-2 border-t border-dashed border-slate-200">
            {`Tổng quỹ sẵn có: ${formatMoney(metrics.totalAssets)}`}
          </div>
        </div>
      </div>
    </section>
  );
};
