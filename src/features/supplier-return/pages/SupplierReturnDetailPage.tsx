import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Truck,
  Ban,
  Printer,
  Calendar,
  Building,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import type { SupplierReturnDetail } from '../types/supplierReturn.types';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { returnStatusBadge } from '../components/SupplierReturnTable';
import { RecordSupplierResponseModal } from '../components/RecordSupplierResponseModal';
import { CompleteHandoverModal } from '../components/CompleteHandoverModal';
import '../../purchase-order/purchase-order.css';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export const SupplierReturnDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [detail, setDetail] = useState<SupplierReturnDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await supplierReturnApi.getById(id);
      setDetail(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu trả hàng.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (searchParams.get('print') === 'true' && detail) {
      setTimeout(() => window.print(), 300);
    }
  }, [searchParams, detail]);

  const handleSubmitDraft = async () => {
    if (!detail) return;
    try {
      setIsSubmitting(true);
      const updated = await supplierReturnApi.submit(detail.id);
      setDetail(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi gửi yêu cầu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReturn = async () => {
    if (!detail || !cancelReason.trim()) return;
    try {
      setIsSubmitting(true);
      const updated = await supplierReturnApi.cancel(detail.id, { reason: cancelReason.trim() });
      setDetail(updated);
      setIsCancelModalOpen(false);
      setCancelReason('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi hủy phiếu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        Đang tải thông tin chi tiết phiếu trả hàng...
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        <h3>{errorMsg || 'Không tìm thấy phiếu trả hàng.'}</h3>
        <button
          type="button"
          className="po-btn po-btn-secondary"
          onClick={() => navigate('/store-owner/supplier-returns')}
          style={{ marginTop: 12 }}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const badge = returnStatusBadge(detail.status);

  // Stepper logic
  const steps = [
    { key: 'DRAFT', label: '1. Khởi tạo nháp' },
    { key: 'PENDING_SUPPLIER', label: '2. Chờ NCC duyệt' },
    { key: 'APPROVED', label: '3. NCC chấp thuận' },
    { key: 'COMPLETED', label: '4. Bàn giao hoàn tất' },
  ];

  const getStepIndex = (st: string) => {
    if (st === 'DRAFT') return 0;
    if (st === 'PENDING_SUPPLIER') return 1;
    if (st === 'APPROVED') return 2;
    if (st === 'COMPLETED') return 3;
    return -1;
  };

  const currentStepIdx = getStepIndex(detail.status);

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'auto',
        padding: '0 4px 24px',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate('/store-owner/supplier-returns')}
            style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {detail.code}
              </h1>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Phiếu nhập gốc: <strong>{detail.goodsReceiptCode}</strong> · Ngày lập: {new Date(detail.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 34, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => window.print()}
          >
            <Printer size={14} />
            <span>In biên bản A4</span>
          </button>

          {/* DRAFT -> Submit */}
          {detail.status === 'DRAFT' && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 16px', backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={isSubmitting}
              onClick={handleSubmitDraft}
            >
              <Send size={14} />
              <span>Gửi yêu cầu trả NCC</span>
            </button>
          )}

          {/* PENDING_SUPPLIER -> Record Response */}
          {detail.status === 'PENDING_SUPPLIER' && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 16px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsResponseModalOpen(true)}
            >
              <CheckCircle size={14} />
              <span>Ghi nhận phản hồi NCC</span>
            </button>
          )}

          {/* APPROVED -> Handover */}
          {detail.status === 'APPROVED' && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 16px', backgroundColor: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsHandoverModalOpen(true)}
            >
              <Truck size={14} />
              <span>Xác nhận bàn giao thực tế</span>
            </button>
          )}

          {/* CANCEL action (allowed when not completed or already cancelled) */}
          {detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' && (
            <button
              type="button"
              className="po-btn po-btn-secondary"
              style={{ height: 34, padding: '0 12px', color: '#dc2626' }}
              onClick={() => setIsCancelModalOpen(true)}
            >
              <Ban size={14} />
              <span>Hủy phiếu</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Progress Stepper */}
      {detail.status !== 'REJECTED' && detail.status !== 'CANCELLED' ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '14px 24px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {steps.map((st, idx) => {
            const isDone = currentStepIdx >= idx;
            const isCurrent = currentStepIdx === idx;

            return (
              <div key={st.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isDone ? '#0f766e' : '#e2e8f0',
                      color: isDone ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isDone ? '#0f766e' : '#64748b',
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: currentStepIdx > idx ? '#0f766e' : '#e2e8f0',
                      margin: '0 12px',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={20} />
          <div>
            <strong>
              {detail.status === 'REJECTED' ? 'Nhà cung cấp đã từ chối yêu cầu trả hàng.' : 'Phiếu trả hàng đã bị hủy.'}
            </strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Lý do: {detail.cancellationReason || detail.supplierResponseNote || 'Không có mô tả chi tiết.'}
            </div>
          </div>
        </div>
      )}

      {/* Info Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            <Building size={14} />
            <span>Đối tác &amp; Chi nhánh</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            {detail.supplierName}
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            Chi nhánh: <strong>{detail.branchName}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
            Phiếu nhập gốc: <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{detail.goodsReceiptCode}</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            <FileCheck size={14} />
            <span>Lý do &amp; Ghi chú</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#b45309' }}>
            {detail.reason}
          </div>
          {detail.reasonNotes && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Ghi chú: {detail.reasonNotes}
            </div>
          )}
          {detail.supplierResponseNote && (
            <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, fontWeight: 600 }}>
              NCC phản hồi: {detail.supplierResponseNote}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            <Calendar size={14} />
            <span>Tiến độ &amp; Bàn giao</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
            Gửi yêu cầu: {detail.submittedAt ? new Date(detail.submittedAt).toLocaleString('vi-VN') : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
            NCC phản hồi: {detail.respondedAt ? new Date(detail.respondedAt).toLocaleString('vi-VN') : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
            Bàn giao xong: {detail.handedOverAt ? new Date(detail.handedOverAt).toLocaleString('vi-VN') : '—'}
          </div>
          {detail.handedOverBy && (
            <div style={{ fontSize: 12, color: '#0f766e', marginTop: 2, fontWeight: 700 }}>
              Thực hiện bởi: {detail.handedOverBy}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Danh sách mặt hàng trả NCC ({detail.lines.length} sản phẩm)
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <div>Tổng SL yêu cầu: <strong style={{ color: '#0f766e' }}>{fmt(detail.totalRequestedQty)}</strong></div>
            <div>Tổng SL duyệt: <strong style={{ color: '#16a34a' }}>{fmt(detail.totalApprovedQty)}</strong></div>
            <div>Tổng SL đã giao: <strong style={{ color: '#0284c7' }}>{fmt(detail.totalHandedOverQty)}</strong></div>
            <div>Tổng giá trị: <strong style={{ color: '#b45309', fontSize: 14 }}>{fmt(detail.totalEstimatedAmount)} đ</strong></div>
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã SKU / Sản phẩm</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lô / Hạn sử dụng</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>SL yêu cầu</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d' }}>SL NCC duyệt</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>SL từ chối</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>SL đã bàn giao</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn giá vốn</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line, idx) => (
                <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{line.productName}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0f766e' }}>{line.sku}</div>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {line.batchCode ? (
                      <div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{line.batchCode}</span>
                        {line.expiryDate && (
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            HSD: {new Date(line.expiryDate).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{line.unit}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                    {fmt(line.requestedQty)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: line.approvedQty > 0 ? '#15803d' : '#94a3b8' }}>
                    {detail.status === 'DRAFT' || detail.status === 'PENDING_SUPPLIER' ? '—' : fmt(line.approvedQty)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: line.rejectedQty > 0 ? '#dc2626' : '#94a3b8' }}>
                    {detail.status === 'DRAFT' || detail.status === 'PENDING_SUPPLIER' ? '—' : fmt(line.rejectedQty)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: line.handedOverQty > 0 ? '#0284c7' : '#94a3b8' }}>
                    {detail.status === 'COMPLETED' ? fmt(line.handedOverQty) : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                    {fmt(line.unitCost)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {fmt(line.lineTotal)}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>
                    {line.notes || line.rejectionReason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Modal */}
      {isResponseModalOpen && (
        <RecordSupplierResponseModal
          isOpen={isResponseModalOpen}
          onClose={() => setIsResponseModalOpen(false)}
          returnDetail={detail}
          onSubmit={async (payload) => {
            const updated = await supplierReturnApi.recordResponse(detail.id, payload);
            setDetail(updated);
          }}
        />
      )}

      {/* Handover Modal */}
      {isHandoverModalOpen && (
        <CompleteHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          returnDetail={detail}
          onSubmit={async (payload) => {
            const updated = await supplierReturnApi.completeHandover(detail.id, payload);
            setDetail(updated);
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
              Xác nhận hủy phiếu trả hàng
            </h3>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
              Khi hủy phiếu, các mặt hàng đang trong trạng thái cách ly <code>PENDING_RETURN</code> sẽ được giải phóng trở lại tồn kho khả dụng.
            </p>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Lý do hủy phiếu: <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Hai bên thống nhất không trả hàng nữa mà giảm giá trực tiếp..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="po-btn po-btn-secondary"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isSubmitting}
              >
                Đóng
              </button>
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{ backgroundColor: '#dc2626' }}
                disabled={isSubmitting || !cancelReason.trim()}
                onClick={handleCancelReturn}
              >
                {isSubmitting ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierReturnDetailPage;
