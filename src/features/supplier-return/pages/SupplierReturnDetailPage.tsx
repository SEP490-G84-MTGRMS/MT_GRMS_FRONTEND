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
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import type {
  ExchangePurchaseOrderSummary,
  SupplierReturnDetail,
} from '../types/supplierReturn.types';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { returnStatusBadge } from '../components/SupplierReturnTable';
import { RecordSupplierResponseModal } from '../components/RecordSupplierResponseModal';
import { CompleteHandoverModal } from '../components/CompleteHandoverModal';
import { downloadSupplierReturnPdf } from '../lib/supplierReturnPdf';
import '../../purchase-order/purchase-order.css';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const isExchangeResolution = (resolutionType?: string | null) =>
  !!resolutionType && resolutionType.toUpperCase().includes('EXCHANGE');

export const SupplierReturnDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [detail, setDetail] = useState<SupplierReturnDetail | null>(null);
  const [relatedPos, setRelatedPos] = useState<ExchangePurchaseOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await supplierReturnApi.getById(id);
      setDetail(data);
      if (isExchangeResolution(data.resolutionType)) {
        try {
          const pos = await supplierReturnApi.getRelatedPurchaseOrders(id);
          setRelatedPos(pos);
        } catch {
          setRelatedPos([]);
        }
      } else {
        setRelatedPos([]);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu trả hàng.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleDownloadPdf = async () => {
    if (!detail) return;
    try {
      setIsPrinting(true);
      setErrorMsg('');
      await downloadSupplierReturnPdf(detail);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tạo được file PDF biên bản.');
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('print') !== 'true' || !detail) return;
    let cancelled = false;
    void (async () => {
      try {
        setIsPrinting(true);
        await downloadSupplierReturnPdf(detail);
        if (!cancelled) {
          navigate(`/store-owner/supplier-returns/${detail.id}`, { replace: true });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Không tạo được file PDF biên bản.');
        }
      } finally {
        if (!cancelled) setIsPrinting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, detail, navigate]);

  const handleSubmitDraft = async () => {
    if (!detail) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const updated = await supplierReturnApi.submit(detail.id);
      setDetail(updated);
      if (isExchangeResolution(updated.resolutionType)) {
        const pos = await supplierReturnApi.getRelatedPurchaseOrders(updated.id);
        setRelatedPos(pos);
        const code = pos[0]?.code;
        if (code) {
          navigate(`/store-owner/purchase-orders/list?code=${encodeURIComponent(code)}`, {
            state: {
              toastMessage: `Đã xác nhận, gửi email NCC và tạo PO đổi hàng ${code}.`,
            },
          });
          return;
        }
      }
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

  const handlePayCostShare = async () => {
    if (!detail) return;
    const payable = Number(detail.storePayableAmount || 0);
    const paid = Number(detail.storePaidAmount || 0);
    const remain = Math.max(0, payable - paid);
    if (remain <= 0) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const updated = await supplierReturnApi.recordCostSharePayment(detail.id, {
        amount: remain,
        note: 'Thanh toán phần cửa hàng theo chính sách đổi hàng',
      });
      setDetail(updated);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(e.response?.data?.message || e.message || 'Lỗi khi ghi nhận thanh toán.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateExchangePo = async () => {
    if (!detail) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const created = await supplierReturnApi.createExchangePurchaseOrders(detail.id);
      const pos =
        created.length > 0
          ? created
          : await supplierReturnApi.getRelatedPurchaseOrders(detail.id);
      setRelatedPos(pos);
      const first = pos[0];
      const code = first?.code || '';
      // Sau khi tạo PO đổi hàng → sang màn danh sách PO (không ở lại phiếu trả).
      navigate(
        code
          ? `/store-owner/purchase-orders/list?code=${encodeURIComponent(code)}`
          : '/store-owner/purchase-orders/list',
        {
          state: {
            toastMessage: code
              ? `Đã tạo PO đổi hàng ${code} từ phiếu ${detail.code}.`
              : `Đã tạo PO đổi hàng từ phiếu ${detail.code}.`,
          },
        }
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(e.response?.data?.message || e.message || 'Lỗi khi tạo PO đổi hàng.');
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

  const isExchange = isExchangeResolution(detail.resolutionType);

  // Stepper: không còn bước chờ NCC duyệt — chỉ email thông báo.
  const steps = isExchange
    ? [
        { key: 'DRAFT', label: '1. Nháp' },
        { key: 'APPROVED', label: '2. Xác nhận + email NCC' },
        { key: 'EXCHANGE_FLOW', label: '3. PO / nhập hàng đổi' },
        { key: 'COMPLETED', label: '4. Bàn giao hoàn tất' },
      ]
    : [
        { key: 'DRAFT', label: '1. Nháp' },
        { key: 'APPROVED', label: '2. Xác nhận + email NCC' },
        { key: 'HANDOVER', label: '3. Bàn giao hàng trả' },
        { key: 'COMPLETED', label: '4. Hoàn tất' },
      ];

  const getStepIndex = (st: string) => {
    if (st === 'DRAFT') return 0;
    if (st === 'PENDING_SUPPLIER') return 1; // legacy
    if (st === 'APPROVED' || st === 'PARTIALLY_HANDED_OVER') {
      if (isExchange) {
        const rs = (detail.replacementStatus || '').toUpperCase();
        if (rs === 'WAITING_RECEIPT' || rs === 'PARTIALLY_RECEIVED' || relatedPos.length > 0) {
          return 2;
        }
        return 1;
      }
      return st === 'PARTIALLY_HANDED_OVER' ? 2 : 1;
    }
    if (st === 'COMPLETED') return 3;
    return -1;
  };

  const currentStepIdx = getStepIndex(detail.status);

  const canCreateExchangePo =
    isExchange &&
    detail.status === 'APPROVED' &&
    (detail.replacementStatus === 'WAITING_PURCHASE_ORDER' ||
      detail.replacementStatus === 'WAITING_HANDOVER' ||
      (detail.settlementStatus === 'PAID' &&
        detail.replacementStatus !== 'WAITING_RECEIPT' &&
        detail.replacementStatus !== 'PARTIALLY_RECEIVED' &&
        detail.replacementStatus !== 'COMPLETED') ||
      (detail.settlementStatus === 'NOT_REQUIRED' &&
        detail.replacementStatus !== 'WAITING_RECEIPT' &&
        detail.replacementStatus !== 'COMPLETED'));

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
              Phiếu nhập gốc: <strong>{detail.goodsReceiptCode}</strong>
              {detail.stocktakeCode && (
                <>
                  {' · '}Phiếu kiểm kê gốc:{' '}
                  <button
                    type="button"
                    onClick={() =>
                      detail.stocktakeId &&
                      navigate(`/store-owner/stocktakes/${detail.stocktakeId}`)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#0f766e',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {detail.stocktakeCode}
                  </button>
                </>
              )}
              {' · '}Ngày lập: {new Date(detail.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{
              height: 34,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              ...(isPrinting ? { opacity: 0.6, cursor: 'wait' } : undefined),
            }}
            disabled={isPrinting || isSubmitting}
            onClick={() => void handleDownloadPdf()}
          >
            <Printer size={14} />
            <span>{isPrinting ? 'Đang tạo PDF…' : 'Tải PDF biên bản A4'}</span>
          </button>

          {/* DRAFT -> xác nhận theo policy + email NCC */}
          {detail.status === 'DRAFT' && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 16px', backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={isSubmitting}
              onClick={handleSubmitDraft}
            >
              <Send size={14} />
              <span>Xác nhận &amp; gửi email NCC</span>
            </button>
          )}

          {/* Legacy: phiếu cũ còn PENDING_SUPPLIER */}
          {detail.status === 'PENDING_SUPPLIER' && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 16px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsResponseModalOpen(true)}
            >
              <CheckCircle size={14} />
              <span>Ghi nhận phản hồi NCC (phiếu cũ)</span>
            </button>
          )}

          {/* Non-EXCHANGE: bàn giao trừ tồn ngay */}
          {!isExchange &&
            (detail.status === 'APPROVED' || detail.status === 'PARTIALLY_HANDED_OVER') && (
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{ height: 34, padding: '0 16px', backgroundColor: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setIsHandoverModalOpen(true)}
              >
                <Truck size={14} />
                <span>
                  {detail.status === 'PARTIALLY_HANDED_OVER'
                    ? 'Bàn giao tiếp phần còn lại'
                    : 'Xác nhận bàn giao thực tế'}
                </span>
              </button>
            )}

          {isExchange &&
            Number(detail.storePayableAmount || 0) > Number(detail.storePaidAmount || 0) &&
            detail.settlementStatus !== 'PAID' &&
            detail.settlementStatus !== 'NOT_REQUIRED' && (
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{ height: 34, padding: '0 14px', backgroundColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={isSubmitting}
                onClick={handlePayCostShare}
              >
                <CreditCard size={14} />
                <span>
                  Thanh toán phần CH ({fmt(Number(detail.storePayableAmount || 0) - Number(detail.storePaidAmount || 0))}đ)
                </span>
              </button>
            )}

          {canCreateExchangePo && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 14px', backgroundColor: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={isSubmitting}
              onClick={handleGenerateExchangePo}
            >
              <RefreshCw size={14} />
              <span>Tạo PO đổi hàng</span>
            </button>
          )}

          {isExchange &&
            (detail.replacementStatus === 'WAITING_RECEIPT' ||
              detail.replacementStatus === 'PARTIALLY_RECEIVED') &&
            relatedPos[0] && (
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{ height: 34, padding: '0 14px', backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() =>
                  navigate(
                    `/store-owner/goods-receipts/create?po=${encodeURIComponent(relatedPos[0].id)}&poCode=${encodeURIComponent(relatedPos[0].code)}`
                  )
                }
              >
                <Truck size={14} />
                <span>Nhập hàng đổi (GRN)</span>
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

      {errorMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Banner thông báo nếu là Phiếu trả hàng loại Từ chối nhận hàng ngay lúc GRN */}
      {detail.reason === 'Từ chối nhận hàng' && (
        <div
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Truck size={20} color="#ea580c" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              Phiếu trả hàng — Loại: Từ chối nhận hàng (Bàn giao tài xế chở về ngay lúc nhận GRN)
            </div>
            <div style={{ fontSize: 12, marginTop: 2, color: '#7c2d12' }}>
              Chứng từ độc lập ghi nhận các sản phẩm bị từ chối trực tiếp khi kiểm nhận Phiếu nhập kho{' '}
              <strong>{detail.goodsReceiptCode}</strong>. Hàng đã được bàn giao cho tài xế chở về ngay, không nhập vào tồn kho cửa hàng và dùng để đối soát công nợ với Nhà cung cấp.
            </div>
          </div>
        </div>
      )}

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

        {/* Luôn hiện — kể cả 0đ */}
        <div
          style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: '#7c3aed',
              textTransform: 'uppercase',
            }}
          >
            <CreditCard size={14} />
            <span>Số tiền cần bù cho NCC</span>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 22,
              fontWeight: 800,
              color: '#6b21a8',
              fontFamily: 'monospace',
            }}
          >
            {fmt(Number(detail.storePayableAmount ?? 0))}đ
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {Number(detail.storePayableAmount ?? 0) <= 0
              ? 'Theo chính sách: cửa hàng không phải bù (0đ).'
              : `Đã trả ${fmt(Number(detail.storePaidAmount ?? 0))}đ · còn lại ${fmt(Math.max(0, Number(detail.storePayableAmount ?? 0) - Number(detail.storePaidAmount ?? 0)))}đ`}
          </div>
          {detail.resolutionType && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Hình thức: {detail.resolutionType}
              {isExchangeResolution(detail.resolutionType)
                ? ' · tính theo chia sẻ chi phí đổi hàng'
                : ' · không áp dụng chia sẻ đổi hàng → 0đ'}
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
            <div>Tổng SL đã giao: <strong style={{ color: '#0284c7' }}>{fmt(detail.totalHandedOverQty)}</strong></div>
            <div>Tổng giá trị: <strong style={{ color: '#b45309', fontSize: 14 }}>{fmt(detail.totalEstimatedAmount)} đ</strong></div>
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}>STT</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã SKU / Sản phẩm</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lô / Hạn sử dụng</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>SL yêu cầu</th>
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
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: line.handedOverQty > 0 ? '#0284c7' : '#94a3b8' }}>
                    {fmt(line.handedOverQty || 0)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                    {fmt(line.unitCost)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {fmt(line.lineTotal)}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>
                    {line.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Khối chữ ký xác nhận chứng từ (In biên bản ký nhận với tài xế & đối soát NCC) */}
        <div
          style={{
            borderTop: '1px dashed #cbd5e1',
            padding: '18px 24px 24px',
            backgroundColor: '#fafafa',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            textAlign: 'center',
            fontSize: 12.5,
            color: '#334155',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>ĐẠI DIỆN CỬA HÀNG / THỦ KHO</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: 56 }} />
            <div style={{ fontWeight: 600, color: '#0f766e' }}>{detail.handedOverBy || '................................'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>TÀI XẾ GIAO HÀNG (NHẬN HÀNG TRẢ VỀ)</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              (Xác nhận đã nhận đủ hàng từ chối chở về)
            </div>
            <div style={{ height: 56 }} />
            <div style={{ fontWeight: 600, color: '#475569' }}>................................</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>ĐẠI DIỆN NHÀ CUNG CẤP</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>(Xác nhận đối soát công nợ)</div>
            <div style={{ height: 56 }} />
            <div style={{ fontWeight: 600, color: '#475569' }}>{detail.supplierName}</div>
          </div>
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
