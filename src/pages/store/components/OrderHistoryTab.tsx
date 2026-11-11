// src/pages/store/components/OrderHistoryTab.tsx
import { useState, useEffect, type FC } from 'react';
import { History, Download, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { storeApi, type SubscriptionOrderHistoryItem } from '../api/storeApi';
import { TablePagination } from '../../../components/common/TablePagination/TablePagination';

export const OrderHistoryTab: FC = () => {
  const [orders, setOrders] = useState<SubscriptionOrderHistoryItem[]>([]);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
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

  const pagedOrders = orders.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="so-list-table-card">
        <div className="so-list-table-body supplier-table-scroll-container">
          <table className="so-list-table" style={{ minWidth: 860 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th className="so-list-th" style={{ width: 52, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>#</th>
                <th className="so-list-th" style={{ width: 170, position: 'sticky', top: 0, zIndex: 10 }}>Mã hợp đồng</th>
                <th className="so-list-th" style={{ position: 'sticky', top: 0, zIndex: 10 }}>Gói dịch vụ</th>
                <th className="so-list-th" style={{ width: 200, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Thời gian hiệu lực</th>
                <th className="so-list-th" style={{ width: 140, textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Giá trị (VNĐ)</th>
                <th className="so-list-th" style={{ width: 130, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Phương thức</th>
                <th className="so-list-th" style={{ width: 135, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th className="so-list-th" style={{ width: 100, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Chứng từ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đang tải lịch sử giao dịch từ hệ thống...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                    <FileText size={36} color="#CBD5E1" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Chưa có lịch sử giao dịch gói cước nào</p>
                  </td>
                </tr>
              ) : (
                pagedOrders.map((ord, index) => {
                  const rowNum = (pageIndex - 1) * pageSize + index + 1;
                  const isActive = ord.status === 'Đang hiệu lực';
                  return (
                    <tr key={ord.code} className="so-list-row">
                      <td className="so-list-td" style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {rowNum}
                      </td>
                      <td className="so-list-td" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F766E' }}>
                        {ord.code}
                      </td>
                      <td className="so-list-td" style={{ fontWeight: 600, color: '#1E293B' }}>
                        {ord.planName}
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'center', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                        {ord.startDate} → {ord.endDate}
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                        {ord.totalAmount > 0
                          ? `${new Intl.NumberFormat('vi-VN').format(ord.totalAmount)} đ`
                          : '0 đ (Miễn phí)'}
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'center', color: '#475569', fontSize: 12.5 }}>
                        {ord.paymentMethod}
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
                            backgroundColor: isActive ? '#f0fdf4' : '#f8fafc',
                            color: isActive ? '#15803d' : '#64748b',
                            border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="so-list-td so-list-td--actions" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pageIndex}
          pageSize={pageSize}
          totalItems={orders.length}
          pageSizeOptions={[10, 15, 20, 50]}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(1);
          }}
          itemLabel="hợp đồng"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
