import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Edit3,
  Printer,
  Truck,
  Building2,
  Calendar,
  UserCheck,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierReturnApi } from '../../supplier-return/api/supplierReturnApi';
import type { EligibleGrnLookup } from '../../supplier-return/types/supplierReturn.types';
import { supplierApi } from '../../supplier/api/supplierApi';
import { stocktakeApi } from '../api/stocktakeApi';
import { stocktakeStatusBadge } from './StocktakeListPage';
import {
  SCOPE_TYPE_LABELS,
  DEFECTIVE_REASON_OPTIONS,
  type StockDispositionAction,
  type StocktakeDetail,
} from '../types/stocktake.types';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const reasonLabel = (code?: string | null) =>
  DEFECTIVE_REASON_OPTIONS.find((o) => o.value === code)?.label || code || '—';

interface SupplierPolicyHint {
  allowReturn: boolean;
  allowDamagedReturn: boolean;
  allowExpiredReturn: boolean;
  allowedResolutions: string[];
  defaultResolutionType: string;
  maxReturnDaysAfterReceipt: number | null;
  notes?: string | null;
}

const RESOLUTION_OPTIONS: {
  value: 'DEDUCT_INVOICE' | 'REFUND' | 'REPLACE_GOODS' | 'SUPPLIER_CREDIT';
  policyValue: string;
  label: string;
}[] = [
  { value: 'DEDUCT_INVOICE', policyValue: 'REDUCE_PAYABLE', label: 'Cấn trừ công nợ / Hóa đơn' },
  { value: 'REPLACE_GOODS', policyValue: 'EXCHANGE', label: 'Đổi hàng bù từ NCC' },
  { value: 'REFUND', policyValue: 'REFUND', label: 'Hoàn tiền mặt / Chuyển khoản' },
  { value: 'SUPPLIER_CREDIT', policyValue: 'SUPPLIER_CREDIT', label: 'Ghi nhận Credit Note' },
];

const mapPolicyResolutionToUi = (
  policyValue: string
): 'DEDUCT_INVOICE' | 'REFUND' | 'REPLACE_GOODS' | 'SUPPLIER_CREDIT' => {
  const raw = policyValue.toUpperCase();
  if (raw === 'EXCHANGE' || raw === 'REPLACE_GOODS') return 'REPLACE_GOODS';
  if (raw === 'REFUND') return 'REFUND';
  if (raw === 'SUPPLIER_CREDIT' || raw === 'OTHER') return 'SUPPLIER_CREDIT';
  return 'DEDUCT_INVOICE';
};

const isWithinReturnWindow = (
  receivedDate: string | null | undefined,
  maxDays: number | null | undefined
): boolean => {
  if (maxDays == null || maxDays < 0 || !receivedDate) return true;
  const received = new Date(receivedDate);
  if (Number.isNaN(received.getTime())) return true;
  const diffDays = Math.floor((Date.now() - received.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays <= maxDays;
};

type LineDispositionState = {
  damagedAction: StockDispositionAction;
  expiredAction: StockDispositionAction;
};

export const StocktakeDetailPage: FC<{ defaultRole?: 'store_owner' | 'employee' }> = ({
  defaultRole = 'store_owner',
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useAuthStore((s) => s.user?.role);
  const isStoreOwner =
    defaultRole === 'store_owner' &&
    (userRole === 'STORE_OWNER' || userRole === 'ADMIN' || !userRole);
  const basePath = defaultRole === 'employee' ? '/employee/stocktakes' : '/store-owner/stocktakes';

  const [detail, setDetail] = useState<StocktakeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'error') => {
      if (type === 'error') setErrorMsg(message);
      setToast({ id: Date.now().toString(), message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  useEffect(() => {
    const state = location.state as { toastMessage?: string } | null;
    if (state?.toastMessage) {
      showToast(state.toastMessage, 'success');
    }
  }, [location.state, showToast]);

  // Review modal state
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'NEEDS_RECOUNT' | null>(
    null
  );
  const [reviewNote, setReviewNote] = useState('');
  const [confirmSurplusFound, setConfirmSurplusFound] = useState(false);
  const [supplierPolicies, setSupplierPolicies] = useState<Record<string, SupplierPolicyHint>>({});
  const [lineDispositions, setLineDispositions] = useState<Record<string, LineDispositionState>>(
    {}
  );

  // Create Return modal state
  const [isCreateReturnOpen, setIsCreateReturnOpen] = useState(false);
  const [eligibleGrns, setEligibleGrns] = useState<EligibleGrnLookup[]>([]);
  const [selectedGrnId, setSelectedGrnId] = useState<string>('');
  const [resolutionType, setResolutionType] = useState<
    'DEDUCT_INVOICE' | 'REFUND' | 'REPLACE_GOODS' | 'SUPPLIER_CREDIT'
  >('DEDUCT_INVOICE');
  const [returnNote, setReturnNote] = useState('');
  const [submitReturnImmediately, setSubmitReturnImmediately] = useState(true);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await stocktakeApi.getById(id);
      setDetail(data);
      const initialQtys: Record<string, number> = {};
      const dispositions: Record<string, LineDispositionState> = {};
      let firstGrnId = '';
      data.lines.forEach((l) => {
        if (l.returnableQty > 0) {
          initialQtys[l.id] = l.returnableQty;
          if (!firstGrnId && l.goodsReceiptId) firstGrnId = l.goodsReceiptId;
        }
        dispositions[l.id] = {
          damagedAction:
            l.damagedAction === 'RETURN_SUPPLIER' ? 'RETURN_SUPPLIER' : 'WRITE_OFF',
          expiredAction:
            l.expiredAction === 'RETURN_SUPPLIER' ? 'RETURN_SUPPLIER' : 'WRITE_OFF',
        };
      });
      setReturnQtys(initialQtys);
      setLineDispositions(dispositions);
      if (firstGrnId) setSelectedGrnId(firstGrnId);

      supplierReturnApi
        .getEligibleGrns(data.branchId)
        .then((grns) => {
          setEligibleGrns(grns);
          if (!firstGrnId && grns.length > 0) {
            setSelectedGrnId(grns[0].id);
          }
        })
        .catch(() => {});

      const supplierIds = [
        ...new Set(data.lines.map((l) => l.supplierId).filter((x): x is string => Boolean(x))),
      ];
      if (supplierIds.length > 0) {
        const policyEntries = await Promise.all(
          supplierIds.map(async (supplierId) => {
            try {
              const policy = await supplierApi.getReturnPolicy(supplierId);
              const types = (policy?.allowedReturnTypes || []).map((t) => t.toUpperCase());
              const allowReturn = !!policy?.allowReturn && !!policy?.isActive;
              return [
                supplierId,
                {
                  allowReturn,
                  allowDamagedReturn: allowReturn && types.includes('QUALITY_DEFECT'),
                  allowExpiredReturn: allowReturn && types.includes('EXPIRED'),
                  allowedResolutions: (policy?.allowedResolutionTypes || []).map((t) =>
                    t.toUpperCase()
                  ),
                  defaultResolutionType: (
                    policy?.defaultResolutionType || 'REDUCE_PAYABLE'
                  ).toUpperCase(),
                  maxReturnDaysAfterReceipt: policy?.maxReturnDaysAfterReceipt ?? null,
                  notes: policy?.notes || null,
                } satisfies SupplierPolicyHint,
              ] as const;
            } catch {
              return [
                supplierId,
                {
                  allowReturn: false,
                  allowDamagedReturn: false,
                  allowExpiredReturn: false,
                  allowedResolutions: [],
                  defaultResolutionType: 'REDUCE_PAYABLE',
                  maxReturnDaysAfterReceipt: null,
                  notes: null,
                } satisfies SupplierPolicyHint,
              ] as const;
            }
          })
        );
        setSupplierPolicies(Object.fromEntries(policyEntries));
      } else {
        setSupplierPolicies({});
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e.response?.data?.message || e.message || 'Không thể tải chi tiết phiếu kiểm kê.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSubmitStocktake = async () => {
    if (!detail) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const updated = await stocktakeApi.submit(detail.id);
      setDetail(updated);
      showToast('Đã gửi phiếu kiểm kê lên Store Owner phê duyệt!', 'success');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e.response?.data?.message || e.message || 'Không thể gửi phiếu kiểm kê.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReview = async () => {
    if (!detail || !reviewAction) return;
    if (
      (reviewAction === 'REJECT' || reviewAction === 'NEEDS_RECOUNT') &&
      !reviewNote.trim()
    ) {
      showToast('Vui lòng nhập lý do khi từ chối hoặc yêu cầu kiểm kê lại.', 'error');
      return;
    }
    const hasSurplus = (detail.totalVarianceQty ?? 0) > 0 || detail.lines.some((l) => l.varianceQty > 0);
    if (reviewAction === 'APPROVE' && hasSurplus && !confirmSurplusFound) {
      showToast('Phiếu có hàng thừa — hãy tick xác minh nguồn thừa trước khi duyệt cộng tồn.', 'error');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const updated = await stocktakeApi.review(detail.id, {
        action: reviewAction,
        note: reviewNote.trim() || null,
        confirmSurplusFound: reviewAction === 'APPROVE' ? confirmSurplusFound : false,
        lineActions:
          reviewAction === 'APPROVE'
            ? detail.lines.map((l) => ({
                stocktakeLineId: l.id,
                damagedAction:
                  l.damagedQty > 0
                    ? lineDispositions[l.id]?.damagedAction || 'WRITE_OFF'
                    : null,
                expiredAction:
                  l.expiredQty > 0
                    ? lineDispositions[l.id]?.expiredAction || 'WRITE_OFF'
                    : null,
              }))
            : undefined,
      });
      setDetail(updated);
      setReviewAction(null);
      setReviewNote('');
      setConfirmSurplusFound(false);
      const returnableAfter = updated.lines.reduce((s, l) => s + (l.returnableQty || 0), 0);
      showToast(
        reviewAction === 'APPROVE'
          ? returnableAfter > 0
            ? `Đã duyệt kiểm kê. Có ${fmt(returnableAfter)} ĐVT đủ điều kiện đổi/trả NCC — tạo yêu cầu trả khi sẵn sàng.`
            : 'Đã duyệt kiểm kê và cập nhật tồn kho (xuất hủy hư hỏng/hết hạn đã chọn).'
          : 'Đã cập nhật kết quả duyệt phiếu kiểm kê thành công!',
        'success'
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e.response?.data?.message || e.message || 'Lỗi khi duyệt phiếu kiểm kê.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReturn = async () => {
    if (!detail) return;
    const selectedLines = Object.entries(returnQtys)
      .filter(([, qty]) => qty > 0)
      .map(([stocktakeLineId, requestedQty]) => {
        const stLine = detail.lines.find((l) => l.id === stocktakeLineId);
        return {
          stocktakeLineId,
          goodsReceiptId: stLine?.goodsReceiptId || selectedGrnId || null,
          goodsReceiptLineId: stLine?.goodsReceiptLineId || null,
          requestedQty,
          note: null,
        };
      });

    if (selectedLines.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 dòng hàng lỗi có số lượng > 0 để tạo phiếu trả NCC.', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const createdIds = await stocktakeApi.createReturnFromStocktake(detail.id, {
        goodsReceiptId: selectedGrnId || selectedLines[0]?.goodsReceiptId || null,
        resolutionType,
        note: returnNote.trim() || null,
        submitImmediately: submitReturnImmediately,
        lines: selectedLines,
      });
      setIsCreateReturnOpen(false);
      if (createdIds.length === 1) {
        showToast('Đã tạo phiếu trả hàng nhà cung cấp từ phiếu kiểm kê thành công!', 'success');
        navigate(`/store-owner/supplier-returns/${createdIds[0]}`);
      } else {
        showToast(
          `Đã tạo ${createdIds.length} phiếu trả NCC (tách theo GRN/NCC) từ phiếu kiểm kê.`,
          'success'
        );
        await loadDetail();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(
        e.response?.data?.message ||
          e.message ||
          'Không thể tạo phiếu trả hàng NCC từ phiếu kiểm kê.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        Đang tải chi tiết phiếu kiểm kê hàng hóa...
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        <h3>{errorMsg || 'Không tìm thấy phiếu kiểm kê.'}</h3>
        <button
          type="button"
          className="po-btn po-btn-secondary"
          onClick={() => navigate(basePath)}
          style={{ marginTop: 12 }}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const badge = stocktakeStatusBadge(detail.status);
  const returnableLines = detail.lines.filter((l) => l.returnableQty > 0);
  const returnSupplierIds = [
    ...new Set(returnableLines.map((l) => l.supplierId).filter((x): x is string => Boolean(x))),
  ];
  const filteredEligibleGrns = eligibleGrns.filter((g) => {
    if (returnSupplierIds.length === 0) return true;
    if (!returnSupplierIds.includes(g.supplierId)) return false;
    // Nếu mọi dòng returnable đều có maxDays, lọc GRN quá hạn theo policy nghiêm nhất của các NCC liên quan
    const policy = supplierPolicies[g.supplierId];
    return isWithinReturnWindow(g.receivedDate, policy?.maxReturnDaysAfterReceipt);
  });
  const activeReturnPolicies = returnSupplierIds
    .map((id) => supplierPolicies[id])
    .filter((p): p is SupplierPolicyHint => !!p);
  const allowedResolutionSet = (() => {
    if (activeReturnPolicies.length === 0) {
      return new Set(RESOLUTION_OPTIONS.map((o) => o.policyValue));
    }
    // Giao các hình thức được phép của mọi NCC trong phiếu (chỉ hiện option chung)
    return activeReturnPolicies.reduce<Set<string>>((acc, p, idx) => {
      const set = new Set((p.allowedResolutions || []).map((x) => x.toUpperCase()));
      if (idx === 0) return set;
      return new Set([...acc].filter((x) => set.has(x)));
    }, new Set());
  })();
  const filteredResolutionOptions = RESOLUTION_OPTIONS.filter((o) =>
    allowedResolutionSet.has(o.policyValue)
  );
  const openCreateReturnModal = () => {
    const preferred =
      activeReturnPolicies[0]?.defaultResolutionType ||
      filteredResolutionOptions[0]?.policyValue ||
      'REDUCE_PAYABLE';
    setResolutionType(mapPolicyResolutionToUi(preferred));
    const preferredGrn =
      returnableLines.find((l) => l.goodsReceiptId)?.goodsReceiptId ||
      filteredEligibleGrns[0]?.id ||
      '';
    if (preferredGrn) setSelectedGrnId(preferredGrn);
    setIsCreateReturnOpen(true);
  };
  const canEdit = detail.status === 'DRAFT' || detail.status === 'NEEDS_RECOUNT';

  const steps = [
    { key: 'DRAFT', label: '1. Nhập số liệu kiểm đếm' },
    { key: 'PENDING_APPROVAL', label: '2. Gửi duyệt & Cách ly tạm' },
    { key: 'APPROVED', label: '3. Store Owner phê duyệt & Chốt tồn' },
    { key: 'RETURN', label: '4. Lập phiếu trả hàng NCC (nếu có lỗi NCC)' },
  ];

  const currentStepIdx =
    detail.status === 'DRAFT' || detail.status === 'NEEDS_RECOUNT'
      ? 0
      : detail.status === 'PENDING_APPROVAL'
      ? 1
      : detail.status === 'APPROVED' && detail.linkedSupplierReturns.length > 0
      ? 3
      : detail.status === 'APPROVED'
      ? 2
      : -1;

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
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate(basePath)}
            style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {detail.code}
              </h1>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Chi nhánh: <b>{detail.branchName}</b> · Phạm vi:{' '}
              <b>{SCOPE_TYPE_LABELS[detail.scopeType] || detail.scopeType}</b> · Ngày tạo:{' '}
              {new Date(detail.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => window.print()}
          >
            <Printer size={14} />
            <span>In biên bản kiểm kê</span>
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                className="po-btn po-btn-secondary"
                onClick={() => navigate(`${basePath}/${detail.id}/edit`)}
              >
                <Edit3 size={14} />
                <span>Chỉnh sửa số liệu</span>
              </button>
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{ backgroundColor: '#0f766e' }}
                disabled={isSubmitting}
                onClick={() => void handleSubmitStocktake()}
              >
                <Send size={14} />
                <span>Gửi Store Owner duyệt</span>
              </button>
            </>
          )}

          {isStoreOwner && detail.status === 'PENDING_APPROVAL' && (
            <>
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{ backgroundColor: '#15803d' }}
                onClick={() => {
                  setReviewAction('APPROVE');
                  setReviewNote('');
                  setConfirmSurplusFound(false);
                }}
              >
                <CheckCircle2 size={14} />
                <span>Duyệt kiểm kê</span>
              </button>
              <button
                type="button"
                className="po-btn po-btn-secondary"
                style={{ color: '#a16207', borderColor: '#fde047', backgroundColor: '#fefce8' }}
                onClick={() => {
                  setReviewAction('NEEDS_RECOUNT');
                  setReviewNote('');
                }}
              >
                <RotateCcw size={14} />
                <span>Yêu cầu kiểm kê lại</span>
              </button>
              <button
                type="button"
                className="po-btn po-btn-secondary"
                style={{ color: '#dc2626', borderColor: '#fecaca' }}
                onClick={() => {
                  setReviewAction('REJECT');
                  setReviewNote('');
                }}
              >
                <XCircle size={14} />
                <span>Từ chối</span>
              </button>
            </>
          )}

          {isStoreOwner && detail.status === 'APPROVED' && returnableLines.length > 0 && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              style={{ backgroundColor: '#ea580c' }}
              onClick={openCreateReturnModal}
            >
              <Truck size={14} />
              <span>
                + Tạo Yêu Cầu Trả NCC ({returnableLines.length} dòng đủ điều kiện)
              </span>
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
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stepper */}
      {detail.status !== 'REJECTED' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {steps.map((st, idx) => {
            const isDone = currentStepIdx >= idx;
            return (
              <div key={st.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: isDone ? '#0f766e' : '#e2e8f0',
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
                      fontSize: 12.5,
                      fontWeight: currentStepIdx === idx ? 700 : 500,
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
                      backgroundColor: currentStepIdx > idx ? '#0f766e' : '#e2e8f0',
                      margin: '0 10px',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Khu vực 1: Thông tin phiếu kiểm kê & Các phiếu trả NCC đã tạo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            <Building2 size={14} />
            <span>Thông tin Chi nhánh &amp; Phạm vi</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
            {detail.branchName}
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            Phạm vi: <b>{SCOPE_TYPE_LABELS[detail.scopeType] || detail.scopeType}</b>
            {detail.scopeReference ? ` (${detail.scopeReference})` : ''}
          </div>
          {detail.note && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Ghi chú: {detail.note}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            <UserCheck size={14} />
            <span>Nhân sự thực hiện &amp; Phê duyệt</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: '#334155' }}>
            Người kiểm kê: <b>{detail.createdByName || 'Nhân viên'}</b>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
            Thời gian gửi duyệt:{' '}
            {detail.submittedAt ? new Date(detail.submittedAt).toLocaleString('vi-VN') : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#15803d', marginTop: 3, fontWeight: 600 }}>
            Người phê duyệt: {detail.approvedByName || '—'}{' '}
            {detail.approvedAt ? `(${new Date(detail.approvedAt).toLocaleString('vi-VN')})` : ''}
          </div>
          {detail.rejectionReason && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4, fontWeight: 600 }}>
              Phản hồi duyệt: {detail.rejectionReason}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            <Calendar size={14} />
            <span>Phiếu trả hàng NCC liên kết ({detail.linkedSupplierReturns.length})</span>
          </div>
          {detail.linkedSupplierReturns.length === 0 ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              {returnableLines.length > 0
                ? `Có ${returnableLines.length} dòng đủ điều kiện tạo phiếu trả NCC (đã chọn đổi/trả).`
                : 'Không có phiếu trả hàng NCC nào liên kết.'}
            </div>
          ) : (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {detail.linkedSupplierReturns.map((sr) => (
                <div
                  key={sr.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: 6,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(`/store-owner/supplier-returns/${sr.id}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#0f766e',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{sr.code}</span>
                      <ExternalLink size={11} />
                    </button>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{sr.supplierName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {fmt(sr.totalRequestedQty)} SP · {fmt(sr.totalEstimatedAmount)} đ
                    </div>
                    <div style={{ fontSize: 10.5, color: '#0284c7', fontWeight: 600 }}>
                      {sr.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Khu vực 2 & 3: Bảng kết quả kiểm kê & Đề xuất hướng xử lý theo từng dòng */}
      <div
        style={{
          backgroundColor: '#ffffff',
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
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Kết quả kiểm kê theo dòng ({detail.lines.length} dòng lô hàng)
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12.5 }}>
            <span>
              Dòng bất thường: <b style={{ color: '#d97706' }}>{detail.abnormalLineCount}</b>
            </span>
            <span>
              Tổng SL lỗi NCC: <b style={{ color: '#dc2626' }}>{fmt(detail.totalDefectiveQty)}</b>
            </span>
            <span>
              Tổng Hỏng/Hết hạn:{' '}
              <b style={{ color: '#b45309' }}>{fmt(detail.totalDamagedAndExpiredQty)}</b>
            </span>
            <span>
              Tổng Chênh lệch:{' '}
              <b style={{ color: detail.totalVarianceQty < 0 ? '#dc2626' : '#0f172a' }}>
                {detail.totalVarianceQty > 0
                  ? `+${fmt(detail.totalVarianceQty)}`
                  : fmt(detail.totalVarianceQty)}
              </b>
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 38 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Sản phẩm / SKU</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lô / HSD / Kệ</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>GRN gốc / NCC</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tồn hệ thống</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#b45309' }}>
                  Số lượng hư hỏng
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#be123c' }}>
                  Số lượng hết hạn
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thực đếm</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Chênh lệch</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 100 }}>
                  Ảnh minh chứng
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: 200 }}>
                  Hướng xử lý sau kiểm kê
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line, idx) => {
                const disp = lineDispositions[line.id] || {
                  damagedAction: 'WRITE_OFF' as StockDispositionAction,
                  expiredAction: 'WRITE_OFF' as StockDispositionAction,
                };
                const policy = line.supplierId ? supplierPolicies[line.supplierId] : undefined;
                const canEditDisposition =
                  isStoreOwner && detail.status === 'PENDING_APPROVAL';
                const grnReceivedDate =
                  eligibleGrns.find((g) => g.id === line.goodsReceiptId)?.receivedDate ?? null;
                const withinReturnWindow = isWithinReturnWindow(
                  grnReceivedDate,
                  policy?.maxReturnDaysAfterReceipt
                );
                const damagedReturnAllowed =
                  !!policy?.allowDamagedReturn && withinReturnWindow && !!line.supplierId;
                const expiredReturnAllowed =
                  !!policy?.allowExpiredReturn && withinReturnWindow && !!line.supplierId;
                const noSupplierHint = !line.supplierId
                  ? 'Lô chưa xác định NCC — không thể đổi/trả'
                  : !withinReturnWindow
                    ? `Đã quá ${policy?.maxReturnDaysAfterReceipt} ngày sau nhận hàng`
                    : null;
                const selectStyle = (border: string, bg: string, color: string) => ({
                  height: 28,
                  maxWidth: 200,
                  borderRadius: 5,
                  border: `1px solid ${border}`,
                  background: bg,
                  fontWeight: 600,
                  fontSize: 11.5,
                  color,
                  padding: '0 6px',
                });

                return (
                  <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{line.productName}</div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0f766e' }}>
                        {line.sku} · {line.unit}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {line.batchCode || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        HSD:{' '}
                        {line.expiryDate
                          ? new Date(line.expiryDate).toLocaleDateString('vi-VN')
                          : '—'}{' '}
                        · Kệ: {line.shelfLocation || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                        {line.goodsReceiptNo || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {line.supplierName || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {fmt(line.systemQty)}
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: line.damagedQty > 0 ? '#b45309' : '#94a3b8',
                      }}
                    >
                      {fmt(line.damagedQty)}
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: line.expiredQty > 0 ? '#be123c' : '#94a3b8',
                      }}
                    >
                      {fmt(line.expiredQty)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                      {fmt(line.actualQty)}
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color:
                          line.varianceQty < 0
                            ? '#dc2626'
                            : line.varianceQty > 0
                            ? '#2563eb'
                            : '#15803d',
                      }}
                    >
                      {line.varianceQty > 0
                        ? `+${fmt(line.varianceQty)}`
                        : fmt(line.varianceQty)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {line.evidenceUrl ? (
                        <a
                          href={line.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Xem ảnh minh chứng"
                          style={{
                            display: 'inline-block',
                            width: 44,
                            height: 44,
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: '1px solid #cbd5e1',
                            verticalAlign: 'middle',
                          }}
                        >
                          <img
                            src={line.evidenceUrl}
                            alt="Minh chứng kiểm kê"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {line.damagedQty > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                              Hư hỏng
                            </span>
                            {canEditDisposition ? (
                              <select
                                value={disp.damagedAction}
                                title={
                                  noSupplierHint ||
                                  (policy?.allowReturn
                                    ? `NCC cho trả hư hỏng: ${damagedReturnAllowed ? 'Có' : 'Không'}`
                                    : 'NCC không cho trả hàng')
                                }
                                onChange={(e) => {
                                  const next = e.target.value as StockDispositionAction;
                                  if (next === 'RETURN_SUPPLIER' && !damagedReturnAllowed) {
                                    showToast(
                                      noSupplierHint ||
                                        'Chính sách NCC không cho trả hàng hư hỏng (QUALITY_DEFECT).',
                                      'warning'
                                    );
                                    return;
                                  }
                                  setLineDispositions((prev) => ({
                                    ...prev,
                                    [line.id]: { ...disp, damagedAction: next },
                                  }));
                                }}
                                style={selectStyle('#fcd34d', '#fffbeb', '#92400e')}
                              >
                                <option value="WRITE_OFF">Xuất hủy trừ tồn</option>
                                <option value="RETURN_SUPPLIER" disabled={!damagedReturnAllowed}>
                                  {damagedReturnAllowed
                                    ? 'Đổi/trả NCC'
                                    : noSupplierHint
                                      ? 'Đổi/trả NCC (thiếu NCC/hết hạn trả)'
                                      : 'Đổi/trả NCC (không cho)'}
                                </option>
                              </select>
                            ) : (
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>
                                {disp.damagedAction === 'RETURN_SUPPLIER'
                                  ? 'Đổi/trả NCC'
                                  : 'Xuất hủy trừ tồn'}
                              </span>
                            )}
                          </div>
                        )}

                        {line.expiredQty > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#be123c' }}>
                              Hết hạn
                            </span>
                            {canEditDisposition ? (
                              <select
                                value={disp.expiredAction}
                                title={
                                  noSupplierHint ||
                                  (policy?.allowReturn
                                    ? `NCC cho trả hết hạn (EXPIRED): ${expiredReturnAllowed ? 'Có' : 'Không'}`
                                    : 'NCC không cho trả hàng')
                                }
                                onChange={(e) => {
                                  const next = e.target.value as StockDispositionAction;
                                  if (next === 'RETURN_SUPPLIER' && !expiredReturnAllowed) {
                                    showToast(
                                      noSupplierHint ||
                                        'Chính sách NCC không cho trả hàng hết hạn (EXPIRED).',
                                      'warning'
                                    );
                                    return;
                                  }
                                  setLineDispositions((prev) => ({
                                    ...prev,
                                    [line.id]: { ...disp, expiredAction: next },
                                  }));
                                }}
                                style={selectStyle('#fecdd3', '#fff1f2', '#9f1239')}
                              >
                                <option value="WRITE_OFF">Xuất hủy trừ tồn</option>
                                <option value="RETURN_SUPPLIER" disabled={!expiredReturnAllowed}>
                                  {expiredReturnAllowed
                                    ? 'Đổi/trả NCC'
                                    : noSupplierHint
                                      ? 'Đổi/trả NCC (thiếu NCC/hết hạn trả)'
                                      : 'Đổi/trả NCC (không cho)'}
                                </option>
                              </select>
                            ) : (
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9f1239' }}>
                                {disp.expiredAction === 'RETURN_SUPPLIER'
                                  ? 'Đổi/trả NCC'
                                  : 'Xuất hủy trừ tồn'}
                              </span>
                            )}
                          </div>
                        )}

                        {line.varianceQty !== 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            Lệch tồn:{' '}
                            {line.varianceQty > 0 ? `+${fmt(line.varianceQty)}` : fmt(line.varianceQty)}{' '}
                            {line.unit}
                          </span>
                        )}

                        {line.damagedQty === 0 && line.expiredQty === 0 && line.varianceQty === 0 && (
                          <span style={{ color: '#94a3b8', fontSize: 11.5 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Duyệt / Từ chối / Kiểm kê lại */}
      {reviewAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 560,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {reviewAction === 'APPROVE'
                ? 'Xác nhận phê duyệt Phiếu kiểm kê'
                : reviewAction === 'NEEDS_RECOUNT'
                ? 'Yêu cầu nhân viên kiểm kê lại'
                : 'Từ chối Phiếu kiểm kê'}
            </h3>
            <p style={{ fontSize: 12.5, color: '#475569', marginTop: 8 }}>
              {reviewAction === 'APPROVE'
                ? 'Khi phê duyệt: trừ tồn các dòng xuất hủy (hư hỏng/hết hạn đã chọn WRITE_OFF); giữ tồn các dòng đổi/trả NCC để tạo phiếu trả sau; điều chỉnh thiếu/thừa theo từng lô. Không FEFO / không phân bổ sang lô khác.'
                : 'Từ chối hoặc yêu cầu kiểm kê lại: không đổi tồn kho. Nhân viên sửa số liệu và gửi lại.'}
            </p>
            {reviewAction === 'APPROVE' && detail && (
              <div
                style={{
                  marginTop: 12,
                  maxHeight: 180,
                  overflow: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    background: '#f8fafc',
                    fontWeight: 700,
                    color: '#334155',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  Chênh lệch theo từng lô
                </div>
                {detail.lines.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '6px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      background: l.varianceQty !== 0 ? '#fffbeb' : '#fff',
                    }}
                  >
                    <span style={{ color: '#0f172a' }}>
                      <b style={{ fontFamily: 'monospace' }}>{l.sku}</b>
                      {' · '}
                      <span style={{ fontFamily: 'monospace', color: '#0f766e' }}>
                        {l.batchCode || '—'}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        {' '}
                        (HT {fmt(l.systemQty)} → TT {fmt(l.actualQty)})
                      </span>
                    </span>
                    <b
                      style={{
                        fontFamily: 'monospace',
                        color:
                          l.varianceQty < 0
                            ? '#dc2626'
                            : l.varianceQty > 0
                              ? '#2563eb'
                              : '#15803d',
                      }}
                    >
                      {l.varianceQty > 0 ? `+${fmt(l.varianceQty)}` : fmt(l.varianceQty)}
                    </b>
                  </div>
                ))}
              </div>
            )}
            {reviewAction === 'APPROVE' &&
              detail &&
              ((detail.totalVarianceQty ?? 0) > 0 || detail.lines.some((l) => l.varianceQty > 0)) && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    fontSize: 12.5,
                    color: '#1e3a8a',
                    cursor: 'pointer',
                    lineHeight: 1.45,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmSurplusFound}
                    onChange={(e) => setConfirmSurplusFound(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    <b>Xác minh nguồn hàng thừa</b> (tổng +
                    {fmt(
                      detail.lines.reduce((s, l) => s + Math.max(0, l.varianceQty), 0)
                    )}
                    ). Tôi xác nhận đã kiểm tra nguồn → cho phép cộng tồn đúng lô khi duyệt.
                  </span>
                </label>
              )}
            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                Ghi chú / Lý do {reviewAction !== 'APPROVE' && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Nhập ghi chú phê duyệt hoặc lý do yêu cầu kiểm đếm lại..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="po-btn po-btn-secondary"
                onClick={() => {
                  setReviewAction(null);
                  setConfirmSurplusFound(false);
                }}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="po-btn po-btn-primary"
                style={{
                  backgroundColor:
                    reviewAction === 'APPROVE'
                      ? '#15803d'
                      : reviewAction === 'NEEDS_RECOUNT'
                      ? '#ca8a04'
                      : '#dc2626',
                }}
                disabled={isSubmitting}
                onClick={() => void handleConfirmReview()}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Phiếu Trả Hàng NCC Từ Phiếu Kiểm Kê */}
      {isCreateReturnOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 22,
              width: '100%',
              maxWidth: 760,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Tạo Yêu Cầu Trả Hàng NCC Từ Phiếu Kiểm Kê ({detail.code})
            </h3>
            <p style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
              Hệ thống tự động kiểm tra đồng thời 2 giới hạn: Trần số lượng nhận từ GRN gốc và Tồn khả dụng của lô tại chi nhánh.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 4,
                  }}
                >
                  Phiếu nhập kho gốc (GRN COMPLETED) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={selectedGrnId}
                  onChange={(e) => setSelectedGrnId(e.target.value)}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                  }}
                >
                  <option value="">-- Tự động lấy từ GRN gốc của lô hoặc chọn GRN cùng NCC --</option>
                  {filteredEligibleGrns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {g.supplierName} (Ngày nhận:{' '}
                      {new Date(g.receivedDate).toLocaleDateString('vi-VN')})
                    </option>
                  ))}
                </select>
                {filteredEligibleGrns.length === 0 && (
                  <div style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>
                    Không có GRN phù hợp NCC / còn trong hạn trả. Kiểm tra chính sách hoặc GRN gốc của
                    lô.
                  </div>
                )}
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 4,
                  }}
                >
                  Phương thức xử lý công nợ đề nghị với NCC
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) =>
                    setResolutionType(
                      e.target.value as
                        | 'DEDUCT_INVOICE'
                        | 'REFUND'
                        | 'REPLACE_GOODS'
                        | 'SUPPLIER_CREDIT'
                    )
                  }
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                  }}
                >
                  {(filteredResolutionOptions.length > 0
                    ? filteredResolutionOptions
                    : RESOLUTION_OPTIONS
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 4,
                  }}
                >
                  Ghi chú gửi NCC
                </label>
                <input
                  type="text"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Ghi chú bổ sung cho phiếu trả hàng..."
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#334155',
                      fontWeight: 700,
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '8px 10px' }}>Sản phẩm / Lô</th>
                    <th style={{ padding: '8px 10px' }}>NCC / GRN gốc</th>
                    <th style={{ padding: '8px 10px' }}>Lý do phát hiện</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tối đa từ KK</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 120 }}>
                      SL đề nghị trả
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {returnableLines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700 }}>{line.productName}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0f766e' }}>
                          {line.sku} · Lô: {line.batchCode || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                          {line.supplierName || 'NCC của GRN'}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#2563eb' }}>
                          {line.goodsReceiptNo || 'Tự động khớp GRN gần nhất'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: '#991b1b' }}>
                        {line.defectiveQty > 0
                          ? reasonLabel(line.defectiveReasonCode)
                          : 'Hàng cận hạn trả NCC'}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {line.returnableQty} {line.unit}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          max={line.returnableQty}
                          value={returnQtys[line.id] ?? line.returnableQty}
                          onChange={(e) => {
                            const v = Math.min(
                              line.returnableQty,
                              Math.max(0, Number(e.target.value) || 0)
                            );
                            setReturnQtys((prev) => ({ ...prev, [line.id]: v }));
                          }}
                          style={{
                            width: 85,
                            height: 30,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border: '1px solid #0f766e',
                            fontWeight: 700,
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#0f766e',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={submitReturnImmediately}
                  onChange={(e) => setSubmitReturnImmediately(e.target.checked)}
                  style={{ accentColor: '#0f766e' }}
                />
                <span>
                  Gửi yêu cầu trả NCC ngay (Chuyển từ Cách ly sang Giữ chỗ trả NCC — PENDING_SUPPLIER)
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="po-btn po-btn-secondary"
                  onClick={() => setIsCreateReturnOpen(false)}
                  disabled={isSubmitting}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="po-btn po-btn-primary"
                  style={{ backgroundColor: '#ea580c' }}
                  disabled={isSubmitting}
                  onClick={() => void handleCreateReturn()}
                >
                  <Truck size={14} />
                  <span>{isSubmitting ? 'Đang tạo...' : 'Xác nhận Tạo Phiếu Trả NCC'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StocktakeDetailPage;

