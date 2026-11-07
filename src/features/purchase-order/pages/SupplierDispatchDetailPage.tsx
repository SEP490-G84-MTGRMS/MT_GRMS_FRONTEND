import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Send,
  Store,
  Truck,
} from 'lucide-react';
import type {
  DispatchScope,
  DispatchSupplierDetail,
  EmailSendMode,
  SplitMatrixBatchResult,
  SupplierDispatchGroup,
} from '../types/po.types';
import { DispatchConfirmModal } from '../components/dispatch/DispatchConfirmModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { dispatchHubApi } from '../api/dispatchHubApi';
import '../purchase-order.css';

function getMondayOfThisWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 + (day - 1)) % 7;
  d.setDate(d.getDate() - diff);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateVi(iso: string): string {
  if (!iso || iso.length < 10) return iso || '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export const SupplierDispatchDetailPage: FC = () => {
  const { supplierId = '' } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<DispatchSupplierDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    scope: DispatchScope;
    weekStartDate: string;
    previewData: SplitMatrixBatchResult | null;
    batchResult: SplitMatrixBatchResult | null;
    note: string;
    emailSendMode: EmailSendMode;
    scheduledSendAt: string;
    ccEmails: string[];
  }>({
    isOpen: false,
    scope: 'NEAREST',
    weekStartDate: getMondayOfThisWeek(),
    previewData: null,
    batchResult: null,
    note: '',
    emailSendMode: 'SEND_NOW',
    scheduledSendAt: '',
    ccEmails: [],
  });

  const loadDetail = useCallback(async () => {
    if (!supplierId) return;
    setIsLoading(true);
    try {
      const d = await dispatchHubApi.getSupplierDetail(supplierId);
      setDetail(d);
    } catch (err: any) {
      setDetail(null);
      showToast(err.message || 'Không tải được chi tiết NCC.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const supplierAsGroup: SupplierDispatchGroup | null = useMemo(() => {
    if (!detail) return null;
    return {
      id: detail.supplierId,
      code: detail.code,
      name: detail.name,
      categoryTags: [],
      cutoffTimeStr: detail.cutoffTimeStr,
      countdownDisplay: detail.countdownDisplay,
      remainingMinutes: detail.remainingMinutes,
      urgency: detail.urgency,
      expectedDelivery: '',
      minOrderValue: 0,
      items: [],
      note: '',
      status: detail.status === 'dispatched' ? 'dispatched' : 'draft',
      linkedBranchCount: detail.branches.length,
      branchesWithQty: detail.branches.length,
      skuCount: detail.branches.reduce((n, b) => n + b.items.length, 0),
      totalAmount: detail.branches.reduce(
        (sum, b) => sum + b.items.reduce((s, it) => s + it.qty * it.price, 0),
        0
      ),
    };
  }, [detail]);

  const lineCount = useMemo(
    () => (detail?.branches ?? []).reduce((n, b) => n + b.items.length, 0),
    [detail]
  );

  const openConfirm = async (scope: DispatchScope = 'NEAREST') => {
    if (!supplierAsGroup) return;
    setModalState({
      isOpen: true,
      scope,
      weekStartDate: getMondayOfThisWeek(),
      previewData: null,
      batchResult: null,
      note: '',
      emailSendMode: 'SEND_NOW',
      scheduledSendAt: '',
      ccEmails: [],
    });
    try {
      const preview = await dispatchHubApi.previewSupplierSplit(supplierAsGroup.id, scope);
      setModalState((prev) => (prev.isOpen ? { ...prev, previewData: preview } : prev));
    } catch {
      // optional
    }
  };

  const handleScopeChange = async (scope: DispatchScope) => {
    if (!supplierAsGroup) return;
    setModalState((prev) => ({ ...prev, scope, previewData: null, batchResult: null }));
    try {
      const preview = await dispatchHubApi.previewSupplierSplit(
        supplierAsGroup.id,
        scope,
        scope === 'WEEK' ? modalState.weekStartDate : undefined
      );
      setModalState((prev) => ({ ...prev, previewData: preview }));
    } catch {
      // ignore
    }
  };

  const handleConfirmDispatch = async () => {
    if (!supplierAsGroup) return;
    setIsDispatching(true);
    try {
      const result = await dispatchHubApi.dispatchSupplierByScope(
        supplierAsGroup.id,
        modalState.scope,
        modalState.scope === 'WEEK' ? modalState.weekStartDate : undefined,
        modalState.note.trim() || undefined,
        {
          emailSendMode: modalState.emailSendMode,
          scheduledSendAt:
            modalState.emailSendMode === 'SCHEDULED_SEND' ? modalState.scheduledSendAt : undefined,
          ccEmails: modalState.ccEmails,
        }
      );
      setModalState((prev) => ({ ...prev, batchResult: result }));
      if (result.successCount > 0) {
        showToast(`Đã chốt thành công ${result.successCount}/${result.totalGroups} group PO.`, 'success');
      } else {
        showToast('Không có PO nào được tạo thành công.', 'warning');
      }
      await loadDetail();
    } catch (err: any) {
      showToast(err.message || 'Không thể chốt đơn mua hàng.', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  const canDispatch = detail?.status !== 'dispatched' && lineCount > 0;

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
        overflow: 'hidden',
      }}
    >
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Truck size={22} color="var(--blue-primary, #0f766e)" />
            <span>Chi tiết chốt đơn NCC</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
          {detail && (
            <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>{detail.code}</span>
              {' · '}
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{detail.name}</span>
              {detail.countdownDisplay ? ` · ${detail.countdownDisplay}` : ''}
            </div>
          )}
        </div>

        <div className="so-list-header-actions">
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate('/store-owner/purchase-orders/dispatch-hub')}
          >
            <ArrowLeft size={14} />
            <span>Quay lại hub</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            disabled={!canDispatch || isLoading}
            onClick={() => void openConfirm('NEAREST')}
          >
            <Send size={14} />
            <span>Chốt đơn</span>
          </button>
        </div>
      </div>

      <div
        className="so-list-table-card"
        style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}
      >
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Đang tải chi tiết…</div>
        ) : !detail || detail.branches.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có chi nhánh nào có số lượng đặt với NCC này</div>
            <div style={{ fontSize: 12.5, marginBottom: 12 }}>
              Nhập số lượng trên ma trận theo từng cửa hàng trước khi chốt.
            </div>
            <Link to="/store-owner/purchase-orders/create-matrix" className="po-btn po-btn-secondary">
              Mở ma trận đặt hàng
            </Link>
          </div>
        ) : (
          detail.branches.map((branch) => {
            const branchAmount = branch.items.reduce((s, it) => s + it.qty * it.price, 0);
            const dates = Array.from(new Set(branch.items.map((it) => it.deliveryDate))).sort();
            return (
              <section key={branch.branchId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f0fdfa',
                    borderBottom: '1px solid #ccfbf1',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Store size={16} color="#0f766e" />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f766e' }}>
                        {branch.branchCode} — {branch.branchName}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {branch.items.length} dòng · {dates.length} ngày giao ·{' '}
                        {dates.map(formatDateVi).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                    {branchAmount.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px', fontWeight: 700 }}>Mã SP</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Sản phẩm</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Đơn vị</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Ngày giao</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Cutoff</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>SL</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branch.items.map((it) => (
                      <tr key={it.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td
                          style={{
                            padding: '10px 16px',
                            fontFamily: 'monospace',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {it.sku}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {it.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {it.unit}
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {formatDateVi(it.deliveryDate)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12.5 }}>
                          {it.cutoffSchedule}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                          {it.qty}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                          {it.price.toLocaleString('vi-VN')}
                        </td>
                        <td
                          style={{
                            padding: '10px 16px',
                            textAlign: 'right',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: '#059669',
                          }}
                        >
                          {(it.qty * it.price).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })
        )}
      </div>

      <DispatchConfirmModal
        isOpen={modalState.isOpen}
        supplier={supplierAsGroup}
        supplierEmail={detail?.email}
        scope={modalState.scope}
        onScopeChange={(s) => {
          void handleScopeChange(s);
        }}
        weekStartDate={modalState.weekStartDate}
        onWeekChange={(w) => {
          setModalState((prev) => ({ ...prev, weekStartDate: w }));
          if (modalState.scope === 'WEEK' && supplierAsGroup) {
            void dispatchHubApi
              .previewSupplierSplit(supplierAsGroup.id, 'WEEK', w)
              .then((preview) => setModalState((prev) => ({ ...prev, previewData: preview })))
              .catch(() => undefined);
          }
        }}
        previewData={modalState.previewData}
        batchResult={modalState.batchResult}
        note={modalState.note}
        onNoteChange={(n) => setModalState((prev) => ({ ...prev, note: n }))}
        emailSendMode={modalState.emailSendMode}
        onEmailSendModeChange={(m) => setModalState((prev) => ({ ...prev, emailSendMode: m }))}
        scheduledSendAt={modalState.scheduledSendAt}
        onScheduledSendAtChange={(v) => setModalState((prev) => ({ ...prev, scheduledSendAt: v }))}
        ccEmails={modalState.ccEmails}
        onCcEmailsChange={(emails) => setModalState((prev) => ({ ...prev, ccEmails: emails }))}
        isSubmitting={isDispatching}
        onClose={() =>
          setModalState({
            isOpen: false,
            scope: 'NEAREST',
            weekStartDate: getMondayOfThisWeek(),
            previewData: null,
            batchResult: null,
            note: '',
            emailSendMode: 'SEND_NOW',
            scheduledSendAt: '',
            ccEmails: [],
          })
        }
        onConfirm={() => {
          void handleConfirmDispatch();
        }}
      />
    </div>
  );
};

export default SupplierDispatchDetailPage;
