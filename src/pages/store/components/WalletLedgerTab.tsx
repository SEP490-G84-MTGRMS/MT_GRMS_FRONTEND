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
import { TablePagination } from '../../../components/common/TablePagination/TablePagination';

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
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
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
  const pagedList = filteredList.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16, fontFamily: 'var(--font-sans)' }}>
      {/* 3 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          flexShrink: 0,
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

      {/* Ledger Header + Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
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
                onClick={() => {
                  setFilterType(f.key);
                  setPageIndex(1);
                }}
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

      {/* Ledger Table Card */}
      <div className="so-list-table-card">
        <div className="so-list-table-body supplier-table-scroll-container">
          <table className="so-list-table" style={{ minWidth: 880 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th className="so-list-th" style={{ width: 52, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>#</th>
                <th className="so-list-th" style={{ width: 170, position: 'sticky', top: 0, zIndex: 10 }}>Mã giao dịch</th>
                <th className="so-list-th" style={{ width: 160, position: 'sticky', top: 0, zIndex: 10 }}>Thời gian</th>
                <th className="so-list-th" style={{ position: 'sticky', top: 0, zIndex: 10 }}>Nội dung mô tả</th>
                <th className="so-list-th" style={{ width: 150, textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Số tiền biến động</th>
                <th className="so-list-th" style={{ width: 150, textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Số dư sau GD</th>
                <th className="so-list-th" style={{ width: 120, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Phương thức</th>
                <th className="so-list-th" style={{ width: 130, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8' }}>
                    Chưa có giao dịch ví nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                pagedList.map((tx, index) => {
                  const isPositive = tx.type === 'TOPUP' || tx.type === 'REFUND';
                  const rowNum = (pageIndex - 1) * pageSize + index + 1;
                  return (
                    <tr key={tx.id} className="so-list-row">
                      <td className="so-list-td" style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {rowNum}
                      </td>
                      <td className="so-list-td" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F766E' }}>
                        {tx.transactionCode}
                      </td>
                      <td className="so-list-td" style={{ color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                        {tx.createdAt}
                      </td>
                      <td className="so-list-td" style={{ color: '#1E293B' }}>
                        {tx.description}
                      </td>
                      <td
                        className="so-list-td"
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isPositive ? '#15803D' : '#DC2626',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {isPositive ? '+' : '-'}
                        {new Intl.NumberFormat('vi-VN').format(tx.amount)} đ
                      </td>
                      <td
                        className="so-list-td"
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: '#475569',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {new Intl.NumberFormat('vi-VN').format(tx.balanceAfter)} đ
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 9999,
                            fontSize: 11.5,
                            fontWeight: 600,
                            backgroundColor: tx.paymentMethod === 'VietQR' ? '#f0fdfa' : '#f8fafc',
                            color: tx.paymentMethod === 'VietQR' ? '#0f766e' : '#334155',
                            border: tx.paymentMethod === 'VietQR' ? '1px solid #ccfbf1' : '1px solid #e2e8f0',
                          }}
                        >
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: 11.5,
                            fontWeight: 600,
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
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

        <TablePagination
          currentPage={pageIndex}
          pageSize={pageSize}
          totalItems={filteredList.length}
          pageSizeOptions={[10, 15, 20, 50]}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(1);
          }}
          itemLabel="giao dịch"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
