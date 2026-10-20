// src/pages/store/components/WalletLedgerTab.tsx
import { useState, type FC } from 'react';
import {
  Wallet,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import type { WalletTransaction, StoreInfo } from '../storeData';

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

  const filteredList = transactions.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  const totalTopup = transactions
    .filter((t) => t.type === 'TOPUP')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = transactions
    .filter((t) => t.type === 'PURCHASE_PLAN' || t.type === 'PURCHASE_ADDON')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
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
            border: '1px solid #EDF2F9',
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
                color: '#15803D',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(storeInfo.walletBalance)} đ
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenTopupModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#0066FF',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
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
            border: '1px solid #EDF2F9',
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
              backgroundColor: '#E8F9EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDownLeft size={22} color="#00C853" strokeWidth={2.2} />
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
            border: '1px solid #EDF2F9',
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUpRight size={22} color="#FF3B30" strokeWidth={2.2} />
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
      <div className="profile-card">
        <div className="profile-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={18} color="#0066FF" />
            <div className="profile-card-title">Sao kê lịch sử biến động số dư ví</div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} color="#94A3B8" />
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'TOPUP', label: 'Nạp tiền' },
              { key: 'PURCHASE_PLAN', label: 'Gói dịch vụ' },
              { key: 'PURCHASE_ADDON', label: 'Tiện ích' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterType(f.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: filterType === f.key ? '1px solid #0066FF' : '1px solid #CBD5E1',
                  backgroundColor: filterType === f.key ? '#E8F1FF' : '#FFFFFF',
                  color: filterType === f.key ? '#0066FF' : '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
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
              {filteredList.map((tx) => {
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
                          backgroundColor: tx.paymentMethod === 'VietQR' ? '#E8F1FF' : '#F1F5F9',
                          color: tx.paymentMethod === 'VietQR' ? '#0066FF' : '#334155',
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
                          backgroundColor: '#E8F9EE',
                          color: '#008738',
                        }}
                      >
                        Thành công
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
