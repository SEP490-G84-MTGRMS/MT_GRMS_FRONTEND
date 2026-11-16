import { useEffect, useState } from 'react';
import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';

interface PurchaseRow {
  id: string;
  code: string;
  amount: number;
  description: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}
const statusLabels: Record<string, string> = {
  SUCCESS: 'Thành công', COMPLETED: 'Hoàn tất', PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy',
};

export function TenantRecords({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PagedResult<PurchaseRow> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void httpClient.get<ApiResponse<PagedResult<PurchaseRow>>>(`/admin/tenants/${encodeURIComponent(tenantId)}/records`, {
      params: { page, pageSize: 10 }, signal: controller.signal,
    }).then(({ data }) => {
      if (!data.success || !data.data) throw new Error(data.message || 'Không thể tải dữ liệu.');
      if (!controller.signal.aborted) setResult(data.data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Không tải được lịch sử mua gói. Vui lòng thử lại.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, page, attempt]);

  return <section className="tenant-detail-card tenant-detail-branches">
    <div className="tenant-detail-section-heading"><h2>Lịch sử mua gói dịch vụ</h2></div>
    {loading ? <p className="tenant-records-state" role="status">Đang tải lịch sử mua gói...</p>
      : error ? <div className="tenant-records-state" role="alert"><p>{error}</p><button className="tenant-detail-button" onClick={() => setAttempt(attempt + 1)}>Thử lại</button></div>
      : <>
        <div className="tenant-detail-table-scroll"><table>
          <thead><tr><th>Mã giao dịch / Thời gian</th><th>Gói dịch vụ</th><th>Số tiền</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead>
          <tbody>{result?.items.length ? result.items.map(row => <tr key={row.id}>
            <td><strong className="tenant-detail-branch-code">{row.code}</strong><small className="tenant-records-secondary">{new Date(row.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></td>
            <td>{row.description || 'Mua gói dịch vụ'}</td>
            <td className="tenant-records-money">{row.amount.toLocaleString('vi-VN')} ₫</td>
            <td>{row.paymentMethod === 'WALLET' ? 'Ví gian hàng' : row.paymentMethod || '—'}</td>
            <td><span className={`tenant-detail-status ${row.status === 'SUCCESS' ? 'status-active' : ''}`}>{statusLabels[row.status] || row.status}</span></td>
          </tr>) : <tr><td colSpan={5} className="tenant-detail-empty">Chưa có lịch sử mua gói dịch vụ.</td></tr>}</tbody>
        </table></div>
        <footer className="tenant-records-pagination"><span>Tổng {result?.totalItems ?? 0} lần mua</span><div>
          <button className="tenant-detail-button" disabled={page <= 1} onClick={() => setPage(Math.max(1, (result?.page ?? page) - 1))}>Trước</button>
          <span>Trang {result?.page ?? page} / {Math.max(1, Math.ceil((result?.totalItems ?? 0) / 10))}</span>
          <button className="tenant-detail-button" disabled={!result || result.page * result.pageSize >= result.totalItems} onClick={() => setPage((result?.page ?? page) + 1)}>Sau</button>
        </div></footer>
      </>}
  </section>;
}
