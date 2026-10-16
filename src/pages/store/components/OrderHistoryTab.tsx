// src/pages/store/components/OrderHistoryTab.tsx
import type { FC } from 'react';
import { History, FileText, Download } from 'lucide-react';

interface OrderHistoryTabProps {
  isServiceConfirmation?: boolean;
}

export const OrderHistoryTab: FC<OrderHistoryTabProps> = ({
  isServiceConfirmation = false,
}) => {
  const mockOrders = [
    {
      code: 'SUB-20261016-001',
      planName: 'Gói Chuyên Nghiệp (12 tháng + 1 tháng tặng)',
      startDate: '16/10/2026',
      endDate: '16/11/2027',
      totalAmount: 4356000,
      paymentMethod: 'Ví MT-GRMS',
      status: 'Đang hiệu lực',
    },
    {
      code: 'SUB-20260415-092',
      planName: 'Gói Dùng Thử 14 Ngày',
      startDate: '02/10/2026',
      endDate: '16/10/2026',
      totalAmount: 0,
      paymentMethod: 'Miễn phí',
      status: 'Hết hạn',
    },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="profile-card">
        <div className="profile-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isServiceConfirmation ? (
              <FileText size={20} color="#0066FF" />
            ) : (
              <History size={20} color="#0066FF" />
            )}
            <div className="profile-card-title">
              {isServiceConfirmation
                ? 'Bản xác nhận hợp đồng & biên bản bàn giao dịch vụ SaaS'
                : 'Lịch sử mua hàng & gia hạn gói dịch vụ'}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã hợp đồng</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Gói dịch vụ</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thời gian hiệu lực</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Giá trị (VNĐ)</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Chứng từ</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((ord) => (
                <tr key={ord.code} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                    {ord.code}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1E293B' }}>
                    {ord.planName}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#64748B' }}>
                    {ord.startDate} → {ord.endDate}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                    {ord.totalAmount > 0
                      ? `${new Intl.NumberFormat('vi-VN').format(ord.totalAmount)} đ`
                      : '0 đ (Thử nghiệm)'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        backgroundColor: ord.status === 'Đang hiệu lực' ? '#E8F9EE' : '#F1F5F9',
                        color: ord.status === 'Đang hiệu lực' ? '#008738' : '#64748B',
                      }}
                    >
                      {ord.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0066FF',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Tải hóa đơn VAT & Bản xác nhận PDF"
                      onClick={() => alert(`Đang xuất file PDF cho hợp đồng ${ord.code}...`)}
                    >
                      <Download size={13} />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
