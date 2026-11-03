import React, { useState } from 'react';
import {
  QrCode,
  Wallet,
  ShieldCheck,
  Clock,
  User,
  Store,
  Calendar,
  CheckCircle2,
  Receipt,
  Search,
} from 'lucide-react';
import { DebtCollectionModal } from '../../customer-crm/components/DebtCollectionModal';
import { CreateExpenseModal } from '../../service-expenses/components/CreateExpenseModal';
import { CashReconciliationModal } from '../../cashbook/components/CashReconciliationModal';
import { MOCK_CUSTOMERS } from '../../finance/data/mockFinanceData';
import { formatMoney } from '../../finance/utils/formatters';
import type { CustomerDto } from '../../customer-crm/types/customer.types';
import type { CreateExpenseRequest } from '../../service-expenses/types/expense.types';
import type { CashAccount } from '../../cashbook/types/cashbook.types';

export const CashierShiftDashboardPage: React.FC = () => {
  // Modal states
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isSelectCustomerOpen, setIsSelectCustomerOpen] = useState(false);
  const [isDebtSubmitting, setIsDebtSubmitting] = useState(false);

  // Selected customer for debt collection
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // Default register account for cashier shift (blind reconciliation)
  const defaultCashDrawerAccount: CashAccount = {
    id: 'ACC-01',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1',
    accountName: 'Két tiền mặt thu ngân (Quận 1)',
    accountType: 'CASH',
    currentBalance: 0, // Hidden from cashier in blind reconciliation mode
    initialBalance: 0,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: false,
  };

  // Local shift activity log (Cashier only sees what they processed in their shift)
  const [shiftActivities, setShiftActivities] = useState<
    Array<{
      id: string;
      time: string;
      type: 'COLLECTION' | 'EXPENSE' | 'RECONCILIATION';
      title: string;
      amount?: number;
      status: string;
    }>
  >([
    {
      id: 'ACT-01',
      time: '08:35',
      type: 'EXPENSE',
      title: 'Mua bóng đèn pha và dầu bôi trơn thợ mượn',
      amount: 150000,
      status: 'Đã chi tiền mặt',
    },
    {
      id: 'ACT-02',
      time: '09:15',
      type: 'COLLECTION',
      title: 'Khách Hoàng Văn Thắng trả nợ tiền sửa phanh',
      amount: 300000,
      status: 'Quét VietQR thành công',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handlers
  const handleOpenDebtCollection = () => {
    setIsSelectCustomerOpen(true);
  };

  const handleSelectCustomerToCollect = (customer: (typeof MOCK_CUSTOMERS)[0]) => {
    const dto: CustomerDto = {
      id: customer.id,
      tenantId: 'TENANT-01',
      fullName: customer.name,
      phoneNumber: customer.phone,
      currentDebtAR: customer.currentDebt,
      debtLimit: customer.creditLimit,
      loyaltyPoints: 0,
      membershipTier: 'Standard',
      totalSpending: 12000000,
      status: 'Active',
      createdAt: '2026-01-15',
    };
    setSelectedCustomer(dto);
    setIsSelectCustomerOpen(false);
    setIsDebtModalOpen(true);
  };

  const handleDebtConfirm = async (data: {
    customerId: string;
    amount: number;
    method: 'Cash' | 'VietQR';
    targetAccountId?: string;
    note?: string;
    excessAmount?: number;
    transactionRef?: string;
  }) => {
    setIsDebtSubmitting(true);
    try {
      const newAct = {
        id: `ACT-${Date.now().toString().slice(-4)}`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        type: 'COLLECTION' as const,
        title: `Thu nợ: ${selectedCustomer?.fullName || 'Khách hàng'} (${data.method})`,
        amount: data.amount,
        status: data.method === 'VietQR' ? 'Quét VietQR thành công' : 'Đã nhận tiền mặt',
      };
      setShiftActivities((prev) => [newAct, ...prev]);
      showToast(`Đã ghi nhận thu nợ ${formatMoney(data.amount)} thành công!`);
      setIsDebtModalOpen(false);
      setSelectedCustomer(null);
    } finally {
      setIsDebtSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (data: CreateExpenseRequest) => {
    const newAct = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'EXPENSE' as const,
      title: `Chi khẩn cấp: ${data.vendorName} (${data.category})`,
      amount: data.amount,
      status: 'Đã chi tiền ca',
    };
    setShiftActivities((prev) => [newAct, ...prev]);
    showToast(`Đã hạch toán chi tiền ${formatMoney(data.amount)} thành công!`);
  };

  const handleReconcileSubmit = async (data: {
    accountId: string;
    actualBalance: number;
    difference: number;
    reason: string;
    countedBy: string;
    denominations: Record<number, number>;
  }) => {
    const newAct = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'RECONCILIATION' as const,
      title: `Kiểm két cuối ca: Tổng đếm được ${formatMoney(data.actualBalance)}`,
      amount: data.actualBalance,
      status: 'Đã bàn giao ca',
    };
    setShiftActivities((prev) => [newAct, ...prev]);
    showToast(`Đã gửi kết quả đếm tiền ${formatMoney(data.actualBalance)} lên hệ thống!`);
    setIsReconcileModalOpen(false);
  };

  // Filter customers with debt for selection
  const customersWithDebt = MOCK_CUSTOMERS.filter((c) => c.currentDebt > 0).filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        padding: '24px 32px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'var(--brand-700, #115E59)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 28px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#DCFCE7',
                color: '#15803D',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
              Đang trong ca làm việc
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>•</span>
            <span style={{ color: '#64748B', fontSize: '0.84rem' }}>Ca sáng (08:00 - 16:00)</span>
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
            Xin chào, Em Nam! 👋
          </h1>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B' }}>
            Bàn làm việc thu ngân POS • Thao tác nhanh, chống thao tác sai
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: '0.84rem' }}>
            <User size={16} color="#0F766E" />
            <span><strong>Em Nam</strong> (Thu ngân)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: '0.84rem' }}>
            <Store size={16} color="#0F766E" />
            <span>Quận 1 - Trụ sở chính</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: '0.84rem' }}>
            <Calendar size={16} color="#0F766E" />
            <span>27/10/2026</span>
          </div>
        </div>
      </div>

      {/* 3 Huge Action Cards (360x240px equivalent) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Card 1: Thu nợ khách */}
        <div
          onClick={handleOpenDebtCollection}
          style={{
            minHeight: '240px',
            background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%)',
            border: '2px solid #86EFAC',
            borderRadius: '24px',
            padding: '28px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(22, 163, 74, 0.08)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(22, 163, 74, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(22, 163, 74, 0.08)';
          }}
        >
          <div>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <QrCode size={32} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#14532D', margin: '0 0 6px' }}>
              1. Thu nợ khách
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#166534', lineHeight: 1.4 }}>
              Tạo mã VietQR nhận tiền chuyển khoản hoặc thu tiền mặt, tự động tính tiền cọc nếu khách đưa dư.
            </p>
          </div>

          <button
            type="button"
            style={{
              background: '#15803D',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginTop: 18,
              boxShadow: '0 2px 8px rgba(21, 128, 61, 0.3)',
            }}
          >
            Bắt đầu thu nợ →
          </button>
        </div>

        {/* Card 2: Chi tiền khẩn cấp */}
        <div
          onClick={() => setIsExpenseModalOpen(true)}
          style={{
            minHeight: '240px',
            background: 'linear-gradient(135deg, #ffffff 0%, #FFFBEB 100%)',
            border: '2px solid #FDE68A',
            borderRadius: '24px',
            padding: '28px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(217, 119, 6, 0.08)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(217, 119, 6, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(217, 119, 6, 0.08)';
          }}
        >
          <div>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Wallet size={32} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#78350F', margin: '0 0 6px' }}>
              2. Chi tiền khẩn cấp
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#92400E', lineHeight: 1.4 }}>
              Chi tiền mặt mua phụ tùng gấp, xăng xe giao hàng, ăn trưa thợ hoặc chi phí đột xuất trong ca.
            </p>
          </div>

          <button
            type="button"
            style={{
              background: '#D97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginTop: 18,
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
            }}
          >
            Ghi phiếu chi →
          </button>
        </div>

        {/* Card 3: Kiểm két cuối ca */}
        <div
          onClick={() => setIsReconcileModalOpen(true)}
          style={{
            minHeight: '240px',
            background: 'linear-gradient(135deg, #ffffff 0%, #F0FDFA 100%)',
            border: '2px solid #99F6E4',
            borderRadius: '24px',
            padding: '28px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(17, 94, 89, 0.08)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(17, 94, 89, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(17, 94, 89, 0.08)';
          }}
        >
          <div>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                background: '#CCFBF1',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <ShieldCheck size={32} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#134E4A', margin: '0 0 6px' }}>
              3. Kiểm két cuối ca
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#115E59', lineHeight: 1.4 }}>
              Đếm tiền 9 mệnh giá polymer cuối ca (kiểm két mù, bảo mật tuyệt đối không thấy số dư sổ sách).
            </p>
          </div>

          <button
            type="button"
            style={{
              background: '#0F766E',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginTop: 18,
              boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
            }}
          >
            Đếm tiền bàn giao ca →
          </button>
        </div>
      </div>

      {/* Shift Activity Stream */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px 28px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={20} color="#0F766E" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              Phiếu thu/chi đã lập trong ca hôm nay ({shiftActivities.length})
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            🔒 Chế độ bảo mật thu ngân: Không hiển thị số dư tồn quỹ của chủ tiệm
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.78rem' }}>
                <th style={{ padding: '10px 14px' }}>Thời gian</th>
                <th style={{ padding: '10px 14px' }}>Loại giao dịch</th>
                <th style={{ padding: '10px 14px' }}>Nội dung chi tiết</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Số tiền</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {shiftActivities.map((act) => (
                <tr key={act.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: '0.86rem' }}>
                  <td style={{ padding: '12px 14px', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} />
                    <span>{act.time}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background:
                          act.type === 'COLLECTION' ? '#DCFCE7' : act.type === 'EXPENSE' ? '#FEF3C7' : '#CCFBF1',
                        color:
                          act.type === 'COLLECTION' ? '#15803D' : act.type === 'EXPENSE' ? '#B45309' : '#0F766E',
                      }}
                    >
                      {act.type === 'COLLECTION' ? 'Thu nợ' : act.type === 'EXPENSE' ? 'Chi tiền' : 'Kiểm két'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1E293B' }}>{act.title}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                    {act.amount ? formatMoney(act.amount) : '---'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                    {act.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Select Customer for Debt Collection */}
      {isSelectCustomerOpen && (
        <div className="expense-modal-backdrop" onClick={() => setIsSelectCustomerOpen(false)}>
          <div
            className="expense-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', padding: 24 }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Chọn khách hàng cần thu nợ
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748B' }}>
              Tìm kiếm khách theo tên hoặc số điện thoại đang còn nợ
            </p>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Nhập tên hoặc số điện thoại khách..."
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {customersWithDebt.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                  Không tìm thấy khách hàng nào có nợ phù hợp
                </div>
              ) : (
                customersWithDebt.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomerToCollect(c)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      marginBottom: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>SĐT: {c.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--danger-700, #B91C1C)', fontSize: '0.92rem' }}>
                        {formatMoney(c.currentDebt)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#0F766E' }}>Bấm để thu nợ →</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setIsSelectCustomerOpen(false)}
                className="btn-secondary-pill"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Collection Modal */}
      <DebtCollectionModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onConfirm={handleDebtConfirm}
        isSubmitting={isDebtSubmitting}
      />

      {/* Create Expense Modal */}
      <CreateExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleExpenseSubmit}
      />

      {/* Cash Reconciliation Modal (Blind Counting) */}
      <CashReconciliationModal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        account={defaultCashDrawerAccount}
        onSubmit={handleReconcileSubmit}
      />
    </div>
  );
};
export default CashierShiftDashboardPage;
