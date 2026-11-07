// src/pages/store/components/WalletLedgerTab.tsx
import { useState, useEffect, type FC } from 'react';
import {
  Wallet,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  RefreshCw,
} from 'lucide-react';
import type { WalletTransaction, StoreInfo } from '../storeData';
import { walletApi } from '../api/walletApi';

interface WalletLedgerTabProps {
  storeInfo: StoreInfo;
  transactions: WalletTransaction[];
  onOpenTopupModal: () => void;
}

export const WalletLedgerTab: FC<WalletLedgerTabProps> = ({
  storeInfo,
  transactions,
  onOpenTopupModal,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [liveTransactions, setLiveTransactions] = useState<WalletTransaction[]>(transactions);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [balanceStats, setBalanceStats] = useState<{
    walletBalance: number;
    totalTopup: number;
    totalSpent: number;
  }>({
    walletBalance: storeInfo.walletBalance,
    totalTopup: 0,
    totalSpent: 0,
  });

  // Load real transactions and balance from API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        walletApi.getTransactions(),
        walletApi.getBalance(),
      ]);

      if (txRes.success && txRes.data && txRes.data.length > 0) {
        setLiveTransactions(
          txRes.data.map((t) => ({
            id: t.id,
            transactionCode: t.transactionCode,
            type: t.type as WalletTransaction['type'],
            amount: t.amount,
            balanceBefore: t.balanceBefore,
            balanceAfter: t.balanceAfter,
            description: t.description,
            paymentMethod: t.paymentMethod as WalletTransaction['paymentMethod'],
            status: (t.status === 'SUCCESS' ? 'Success' : t.status) as WalletTransaction['status'],
            createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : 'Vừa xong',
          }))
        );
      } else {
        setLiveTransactions(transactions);
      }

      if (balRes.success && balRes.data) {
        setBalanceStats({
          walletBalance: balRes.data.walletBalance,
          totalTopup: balRes.data.totalTopup,
          totalSpent: balRes.data.totalSpent,
        });
      }
    } catch {
      // Fallback local data
      setLiveTransactions(transactions);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeInfo.walletBalance]);

  const filteredList = liveTransactions.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  const totalTopup = balanceStats.totalTopup || liveTransactions
    .filter((t) => t.type === 'TOPUP')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = balanceStats.totalSpent || liveTransactions
    .filter((t) => t.type === 'PURCHASE_PLAN' || t.type === 'PURCHASE_ADDON')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentWalletBalance = balanceStats.walletBalance || storeInfo.walletBalance;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'var(--font-sans)' }}>
      {/* 3 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
        }}
      >
        {/* Card 1: Số dư ví khả dụng */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #EDF2F9',
            borderRadius: 20,
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(0, 30, 90, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              Số dư ví khả dụng
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--blue-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(currentWalletBalance)} đ
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenTopupModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--blue-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.22)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--blue-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--blue-primary)';
            }}
          >
            <PlusCircle size={15} />
            <span>Nạp tiền</span>
          </button>
        </div>

        {/* Card 2: Tổng tiền đã nạp */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #EDF2F9',
            borderRadius: 20,
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(0, 30, 90, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDownLeft size={22} color="#15803D" strokeWidth={2.2} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              Tổng tiền nạp vào ví
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 800,
                color: '#0F172A',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(totalTopup)} đ
            </span>
          </div>
        </div>

        {/* Card 3: Tổng chi tiêu gói dịch vụ */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #EDF2F9',
            borderRadius: 20,
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(0, 30, 90, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#FFF0F0',
              border: '1.5px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUpRight size={22} color="#DC2626" strokeWidth={2.2} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              Tổng chi mua gói dịch vụ
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 800,
                color: '#0F172A',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(totalSpent)} đ
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Table Card */}
      <div className="profile-card" style={{ border: '1.5px solid #EDF2F9', borderRadius: 20 }}>
        <div className="profile-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={19} color="var(--blue-primary)" />
            <div className="profile-card-title" style={{ fontSize: 16, fontWeight: 800 }}>
              Sao kê lịch sử biến động số dư ví
            </div>
            {isLoading && <RefreshCw size={14} className="animate-spin text-teal-600" />}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} color="#94A3B8" />
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'TOPUP', label: 'Nạp tiền' },
              { key: 'PURCHASE_PLAN', label: 'Gói dịch vụ' },
              { key: 'PURCHASE_ADDON', label: 'Tiện ích' },
            ].map((f) => {
              const isSelected = filterType === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-pill)',
                    border: isSelected ? '1.5px solid var(--blue-primary)' : '1px solid #CBD5E1',
                    backgroundColor: isSelected ? 'var(--blue-light)' : '#FFFFFF',
                    color: isSelected ? 'var(--blue-primary)' : '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px' }}>Mã giao dịch</th>
                <th style={{ padding: '12px 16px' }}>Thời gian</th>
                <th style={{ padding: '12px 16px' }}>Nội dung mô tả</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Số tiền biến động</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Số dư sau GD</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Phương thức</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8' }}>
                    Chưa có giao dịch ví nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => {
                  const isPositive = tx.type === 'TOPUP' || tx.type === 'REFUND';
                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                        {tx.transactionCode}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {tx.createdAt}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#1E293B' }}>
                        {tx.description}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          color: isPositive ? '#15803D' : '#DC2626',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {isPositive ? '+' : '-'}
                        {new Intl.NumberFormat('vi-VN').format(tx.amount)} đ
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: '#475569',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {new Intl.NumberFormat('vi-VN').format(tx.balanceAfter)} đ
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: 11.5,
                            fontWeight: 700,
                            backgroundColor: tx.paymentMethod === 'VietQR' ? 'var(--blue-light)' : '#F1F5F9',
                            color: tx.paymentMethod === 'VietQR' ? 'var(--blue-primary)' : '#334155',
                          }}
                        >
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: 11.5,
                            fontWeight: 700,
                            backgroundColor: '#F0FDF4',
                            color: '#15803D',
                          }}
                        >
                          Thành công
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
