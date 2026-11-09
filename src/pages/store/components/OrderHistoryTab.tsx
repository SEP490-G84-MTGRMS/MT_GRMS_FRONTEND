// src/pages/store/components/OrderHistoryTab.tsx
import { useState, useEffect, type FC } from 'react';
import { History, Download, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { storeApi, type SubscriptionOrderHistoryItem } from '../api/storeApi';

export const OrderHistoryTab: FC = () => {
  const [orders, setOrders] = useState<SubscriptionOrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await storeApi.getSubscriptionHistory();
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setErrorMessage(res.message || 'Không thể tải lịch sử mua hàng.');
      }
    } catch (err) {
      console.error('Failed to fetch subscription history:', err);
      setErrorMessage('Không thể kết nối đến máy chủ để lấy lịch sử mua gói cước.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="profile-card">
        <div className="profile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={20} color="var(--blue-primary)" />
            <div className="profile-card-title">
              Lịch sử mua hàng & gia hạn gói dịch vụ
            </div>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Tải lại lịch sử"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              margin: '16px 20px',
              padding: '12px 16px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã hợp đồng</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Gói dịch vụ</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thời gian hiệu lực</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Giá trị (VNĐ)</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Phương thức</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Chứng từ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đang tải lịch sử giao dịch từ hệ thống...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                    <FileText size={36} color="#CBD5E1" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Chưa có lịch sử giao dịch gói cước nào</p>
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
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
                        : '0 đ (Miễn phí)'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#475569', fontSize: 12.5 }}>
                      {ord.paymentMethod}
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
                          color: 'var(--blue-primary)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Tải hóa đơn VAT & Biên nhận PDF"
                        onClick={() => alert(`Đang xuất file biên nhận điện tử cho hợp đồng ${ord.code}...`)}
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
