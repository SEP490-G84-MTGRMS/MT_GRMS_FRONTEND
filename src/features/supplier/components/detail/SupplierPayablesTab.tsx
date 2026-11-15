import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type {
  SupplierSummary,
  APLedgerEntry,
  APDocType,
} from '../../types/supplier.types';
import { supplierApi } from '../../api/supplierApi';
import { useAuthStore } from '../../../../stores/useAuthStore';
import {
  RecordSupplierPaymentModal,
  type RecordSupplierPaymentForm,
  type InvoicePaymentTarget,
} from './RecordSupplierPaymentModal';

interface Props {
  supplier: SupplierSummary;
  onDebtUpdated?: (currentDebt: number) => void;
  onToast?: (type: 'success' | 'error', message: string) => void;
}

const DOC_TYPE_LABEL: Record<APDocType, string> = {
  PurchaseInvoice: 'Nhập kho',
  ServiceInvoice: 'Dịch vụ',
  PaymentVoucher: 'Thanh toán',
  ReturnAdjustment: 'Hoàn trả',
};

const PAGE_SIZE = 20;
const SETTLEMENT_PAGE_SIZE = 200;

function docNoLink(docNo: string): string | null {
  if (/^GRN-/i.test(docNo)) {
    return `/store-owner/goods-receipts?keyword=${encodeURIComponent(docNo)}`;
  }
  if (/^RTV-|^SR-/i.test(docNo)) {
    return `/store-owner/supplier-returns?keyword=${encodeURIComponent(docNo)}`;
  }
  if (/^PO-/i.test(docNo)) {
    return `/store-owner/purchase-orders/list?code=${encodeURIComponent(docNo)}`;
  }
  return null;
}

function isInvoice(entry: APLedgerEntry): boolean {
  return (
    entry.direction === 1 &&
    (entry.docType === 'PurchaseInvoice' || entry.docType === 'ServiceInvoice')
  );
}

/** Số đã cấn trừ / thanh toán gắn một mã hóa đơn. */
function buildSettledByInvoice(all: APLedgerEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  const add = (key: string, amount: number) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + amount);
  };

  for (const e of all) {
    if (e.direction !== -1) continue;
    if (e.docType === 'PaymentVoucher') {
      const key = (e.referenceNo || '').trim();
      if (key) add(key, e.amount);
      continue;
    }
    if (e.docType === 'ReturnAdjustment') {
      // Điều chỉnh cùng DocNo hóa đơn (VD: hủy AP GRN đổi hàng)
      add(e.docNo, e.amount);
    }
  }
  return map;
}

export const SupplierPayablesTab: FC<Props> = ({ supplier, onDebtUpdated, onToast }) => {
  const user = useAuthStore((s) => s.user);
  const [ledgers, setLedgers] = useState<APLedgerEntry[]>([]);
  const [settlementRows, setSettlementRows] = useState<APLedgerEntry[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [docType, setDocType] = useState<APDocType | ''>('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [appliedDocType, setAppliedDocType] = useState<APDocType | ''>('');
  const [paymentTarget, setPaymentTarget] = useState<InvoicePaymentTarget | null>(null);
  const [currentDebt, setCurrentDebt] = useState(supplier.currentDebt);

  useEffect(() => {
    setCurrentDebt(supplier.currentDebt);
  }, [supplier.currentDebt, supplier.id]);

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  const loadSettlement = useCallback(async () => {
    try {
      const result = await supplierApi.getAPLedger(supplier.id, {
        pageIndex: 1,
        pageSize: SETTLEMENT_PAGE_SIZE,
      });
      setSettlementRows(result.items);
    } catch {
      // không chặn tab nếu chỉ lỗi map thanh toán
    }
  }, [supplier.id]);

  const loadLedger = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await supplierApi.getAPLedger(supplier.id, {
          pageIndex: page,
          pageSize: PAGE_SIZE,
          fromDate: appliedFrom || undefined,
          toDate: appliedTo || undefined,
          docType: appliedDocType || undefined,
        });
        setLedgers(result.items);
        setTotalItems(result.totalItems);
        setPageIndex(result.page || page);
      } catch (err: any) {
        setLedgers([]);
        setTotalItems(0);
        setError(err?.message || 'Không tải được sổ cái công nợ.');
      } finally {
        setIsLoading(false);
      }
    },
    [supplier.id, appliedFrom, appliedTo, appliedDocType]
  );

  useEffect(() => {
    void loadLedger(1);
    void loadSettlement();
  }, [loadLedger, loadSettlement]);

  const settledByInvoice = useMemo(
    () => buildSettledByInvoice(settlementRows),
    [settlementRows]
  );

  const remainingOf = (entry: APLedgerEntry): number => {
    if (!isInvoice(entry)) return 0;
    const settled = settledByInvoice.get(entry.docNo) || 0;
    return Math.max(0, Math.round((entry.amount - settled) * 100) / 100);
  };

  const handleRefresh = async () => {
    try {
      const summary = await supplierApi.getApSummary(supplier.id);
      setCurrentDebt(summary.currentDebt);
      onDebtUpdated?.(summary.currentDebt);
    } catch {
      // giữ debt hiện tại
    }
    await Promise.all([loadLedger(pageIndex), loadSettlement()]);
  };

  const handleApplyFilter = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setAppliedDocType(docType);
    setPageIndex(1);
  };

  const openPayInvoice = (entry: APLedgerEntry) => {
    const remaining = remainingOf(entry);
    if (remaining <= 0 || currentDebt <= 0) return;
    setPaymentTarget({
      docNo: entry.docNo,
      invoiceAmount: entry.amount,
      remainingAmount: remaining,
      description: entry.description,
    });
  };

  const handlePayment = async (form: RecordSupplierPaymentForm) => {
    const created = await supplierApi.recordAPTransaction(supplier.id, {
      docType: 'PaymentVoucher',
      direction: -1,
      amount: form.amount,
      description: form.description,
      transactionDate: form.transactionDate,
      paymentMethod: form.paymentMethod,
      referenceNo: form.referenceNo || form.invoiceDocNo || undefined,
      idempotencyKey: form.idempotencyKey,
      createdByName: user?.fullName || user?.email || 'Chủ cửa hàng',
    });

    const nextDebt = Math.max(0, currentDebt - form.amount);
    setCurrentDebt(nextDebt);
    onDebtUpdated?.(nextDebt);
    setPaymentTarget(null);
    onToast?.(
      'success',
      `Đã thanh toán ${fmt(form.amount)} cho ${form.referenceNo || form.invoiceDocNo || 'NCC'} — ${created.docNo}.`
    );
    await Promise.all([loadLedger(1), loadSettlement()]);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="supplier-detail-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2
              className="supplier-detail-card-title"
              style={{ margin: 0, border: 'none', padding: 0 }}
            >
              Sổ cái công nợ
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Thanh toán theo từng hóa đơn nhập kho / dịch vụ còn nợ.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dư nợ hiện tại</div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: currentDebt > 0 ? '#c2410c' : '#15803d',
                }}
              >
                {fmt(currentDebt)}
              </div>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => void handleRefresh()}
              disabled={isLoading}
              style={{ height: 34, padding: '0 14px', gap: 6, borderRadius: 6 }}
            >
              <RefreshCw size={14} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      <div className="supplier-detail-card">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Từ ngày</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ height: 36, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Đến ngày</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ height: 36, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Loại chứng từ</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as APDocType | '')}
              style={{ height: 36, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px' }}
            >
              <option value="">Tất cả</option>
              <option value="PurchaseInvoice">Nhập kho</option>
              <option value="PaymentVoucher">Thanh toán</option>
              <option value="ReturnAdjustment">Hoàn trả</option>
              <option value="ServiceInvoice">Dịch vụ</option>
            </select>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleApplyFilter}
            style={{ height: 36 }}
          >
            Áp dụng
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '10px 12px',
              marginBottom: 12,
              borderRadius: 8,
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 13,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div
          className="admin-table-card"
          style={{ borderRadius: 16, border: '1px solid var(--border-light)', position: 'relative' }}
        >
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                borderRadius: 16,
              }}
            >
              <Loader2 size={22} className="spin" />
            </div>
          )}
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Mã chứng từ</th>
                <th style={{ width: 100 }}>Loại</th>
                <th style={{ width: 100 }}>Ngày GD</th>
                <th>Diễn giải</th>
                <th style={{ width: 120, textAlign: 'right' }}>Biến động</th>
                <th style={{ width: 120, textAlign: 'right' }}>Còn lại HĐ</th>
                <th style={{ width: 110, textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.length > 0 ? (
                ledgers.map((entry) => {
                  const href = docNoLink(entry.docNo);
                  const invoice = isInvoice(entry);
                  const remaining = invoice ? remainingOf(entry) : null;
                  const canPay =
                    invoice && remaining != null && remaining > 0 && currentDebt > 0;

                  return (
                    <tr key={entry.id}>
                      <td>
                        {href ? (
                          <Link
                            to={href}
                            className="admin-subdomain-tag"
                            style={{ fontFamily: 'var(--font-mono)', textDecoration: 'none' }}
                          >
                            {entry.docNo}
                          </Link>
                        ) : (
                          <span
                            className="admin-subdomain-tag"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            {entry.docNo}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              entry.direction === 1
                                ? 'var(--blue-primary, #0f766e)'
                                : '#16a34a',
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {DOC_TYPE_LABEL[entry.docType] || entry.docType}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(entry.transactionDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-main)' }}>
                        {entry.description}
                        {entry.referenceNo ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Gắn HĐ: {entry.referenceNo}
                          </div>
                        ) : null}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: entry.direction === 1 ? '#111827' : '#008800',
                        }}
                      >
                        {entry.direction === 1 ? '+' : '-'}
                        {fmt(entry.amount)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color:
                            remaining != null && remaining > 0
                              ? '#c2410c'
                              : 'var(--text-muted)',
                          fontSize: 13,
                        }}
                      >
                        {remaining == null
                          ? '—'
                          : remaining <= 0
                            ? 'Đã đủ'
                            : fmt(remaining)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {invoice ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            disabled={!canPay}
                            onClick={() => openPayInvoice(entry)}
                            style={{
                              height: 30,
                              padding: '0 10px',
                              fontSize: 12,
                              borderRadius: 6,
                              opacity: canPay ? 1 : 0.45,
                            }}
                          >
                            Thanh toán
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}
                  >
                    {error
                      ? 'Không tải được dữ liệu.'
                      : 'Chưa có giao dịch — công nợ sẽ xuất hiện sau khi nhập kho (GRN) hoặc ghi thanh toán.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalItems > PAGE_SIZE && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              {totalItems} giao dịch · trang {pageIndex}/{totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pageIndex <= 1 || isLoading}
                onClick={() => void loadLedger(pageIndex - 1)}
              >
                Trước
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pageIndex >= totalPages || isLoading}
                onClick={() => void loadLedger(pageIndex + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <RecordSupplierPaymentModal
        isOpen={!!paymentTarget}
        supplierCode={supplier.code}
        supplierName={supplier.name}
        currentDebt={currentDebt}
        invoice={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSubmit={handlePayment}
      />
    </div>
  );
};
