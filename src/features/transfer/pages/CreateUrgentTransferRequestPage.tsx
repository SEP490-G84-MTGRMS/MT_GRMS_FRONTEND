import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, Search, Trash2, Truck } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  getTransferErrorMessage,
  transferService,
  type TransferAllocationPreview,
  type TransferAvailableProduct,
} from '../services/transferService';
import type { Branch, TransferOrder } from '../types';
import '../transfer.css';

type DemandRow = TransferAvailableProduct & { requestedQty: number };

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const CreateUrgentTransferRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const destinationBranchId = user?.branchId ?? '';
  const duplicateFrom = (location.state as { duplicateFrom?: TransferOrder } | null)?.duplicateFrom ?? null;
  const pendingDuplicateRef = useRef<TransferOrder | null>(duplicateFrom);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalog, setCatalog] = useState<TransferAvailableProduct[]>([]);
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [relatedOrderInput, setRelatedOrderInput] = useState('');
  const [requiredAt, setRequiredAt] = useState('');
  const [preview, setPreview] = useState<TransferAllocationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!destinationBranchId) {
        setError('Tài khoản staff chưa được gán chi nhánh.');
        setLoading(false);
        return;
      }
      try {
        const [availableProducts, branchList] = await Promise.all([
          transferService.availableUrgentProducts(destinationBranchId),
          transferService.branches().catch(() => []),
        ]);
        setBranches(branchList.filter((branch) => branch.id !== destinationBranchId));
        setCatalog(availableProducts.filter((item) => item.totalAvailableQuantity > 0));

        const dup = pendingDuplicateRef.current;
        if (dup) {
          pendingDuplicateRef.current = null;
          if (dup.note) setNote(dup.note);
          const prefilled: DemandRow[] = [];
          for (const line of dup.items) {
            const matched = availableProducts.find((p) => p.productId === line.productId && p.totalAvailableQuantity > 0);
            if (matched && !prefilled.some((r) => r.productId === matched.productId)) {
              prefilled.push({
                ...matched,
                requestedQty: Math.min(line.sentQty, matched.totalAvailableQuantity),
              });
            }
          }
          if (prefilled.length > 0) setRows(prefilled);
        }
      } catch (cause) {
        setError(getTransferErrorMessage(cause));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [destinationBranchId]);

  const results = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    return catalog
      .filter(
        (item) =>
          !rows.some((row) => row.productId === item.productId) &&
          `${item.productCode} ${item.productName}`.toLowerCase().includes(keyword)
      )
      .slice(0, 8);
  }, [catalog, rows, search]);

  const payload = () => {
    let requiredAtIso: string | undefined;
    if (requiredAt) {
      const parsed = new Date(requiredAt);
      if (!Number.isNaN(parsed.getTime())) {
        requiredAtIso = parsed.toISOString();
      }
    }
    const trimmedOrder = relatedOrderInput.trim();
    const uuidMatch = Boolean(trimmedOrder && isUuid(trimmedOrder));
    return {
      toBranchId: destinationBranchId,
      requiredAt: requiredAtIso,
      relatedOrderId: uuidMatch ? trimmedOrder : undefined,
      relatedOrderCode: trimmedOrder && !uuidMatch ? trimmedOrder : undefined,
      note: note.trim() || undefined,
      items: rows.map((row) => ({ productId: row.productId, quantity: row.requestedQty, unit: row.baseUnit })),
    };
  };

  const handlePreview = async () => {
    if (!rows.length || rows.some((row) => row.requestedQty <= 0)) {
      setError('Hãy thêm sản phẩm và nhập số lượng cần lớn hơn 0.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      setPreview(await transferService.previewUrgentAllocation(payload()));
    } catch (cause) {
      setError(getTransferErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      await transferService.createUrgentRequest(payload());
      navigate('/employee/transfers');
    } catch (cause) {
      setError(getTransferErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="transfer-container" style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button type="button" className="btn-secondary-white" onClick={() => navigate('/employee/transfers')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Yêu cầu hàng gấp</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>
            Hệ thống phân bổ từ ít chi nhánh nhất theo tồn khả dụng thực tế.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 14, borderRadius: 12, background: '#fff7ed', color: '#9a3412', display: 'flex', gap: 8 }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, .8fr)', gap: 18 }}>
        <section style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #e2e8f0' }}>
          <label style={{ fontWeight: 700 }}>Tìm sản phẩm đang có tại chi nhánh khác</label>
          <div style={{ position: 'relative', marginTop: 8 }}>
            <Search size={17} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={loading ? 'Đang tải tồn kho…' : 'Nhập mã hoặc tên sản phẩm'}
              style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #cbd5e1', borderRadius: 12, boxSizing: 'border-box' }}
            />
          </div>
          {results.map((item) => (
            <button
              key={item.productId}
              type="button"
              onClick={() => {
                setRows((current) => [...current, { ...item, requestedQty: 1 }]);
                setSearch('');
                setPreview(null);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: 10,
                border: 0,
                borderBottom: '1px solid #f1f5f9',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <b>{item.productCode}</b> · {item.productName}{' '}
              <span style={{ color: '#64748b' }}>
                · tồn khả dụng toàn chuỗi: {item.totalAvailableQuantity} {item.baseUnit}
              </span>
            </button>
          ))}
          <div style={{ marginTop: 18 }}>
            {rows.map((row) => (
              <div
                key={row.productId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 38px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <b>{row.productName}</b>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {row.productCode} · {row.baseUnit} · Tồn khả dụng: {row.totalAvailableQuantity}
                  </div>
                </div>
                <input
                  type="number"
                  min={0.01}
                  max={row.totalAvailableQuantity}
                  step="0.01"
                  value={row.requestedQty}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setRows((current) =>
                      current.map((item) =>
                        item.productId === row.productId ? { ...item, requestedQty: value } : item
                      )
                    );
                    setPreview(null);
                  }}
                  style={{ padding: 9, border: '1px solid #cbd5e1', borderRadius: 10 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setRows((current) => current.filter((item) => item.productId !== row.productId));
                    setPreview(null);
                  }}
                  style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #e2e8f0', alignSelf: 'start' }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Thông tin yêu cầu</h2>
          <label>
            Hạn cần hàng
            <input
              type="datetime-local"
              value={requiredAt}
              onChange={(event) => setRequiredAt(event.target.value)}
              style={{ width: '100%', padding: 9, margin: '6px 0 12px', border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box' }}
            />
          </label>
          <label>
            Mã đơn hàng liên quan
            <input
              value={relatedOrderInput}
              onChange={(event) => {
                setRelatedOrderInput(event.target.value);
                setPreview(null);
              }}
              placeholder="VD: HD261124001 (không bắt buộc)"
              style={{ width: '100%', padding: 9, margin: '6px 0 12px', border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box' }}
            />
          </label>
          <label>
            Ghi chú
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              style={{ width: '100%', padding: 9, marginTop: 6, border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box' }}
            />
          </label>
          <button
            type="button"
            className="btn-primary-teal"
            disabled={saving || !rows.length}
            onClick={() => void handlePreview()}
            style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
          >
            <Truck size={16} /> Xem phương án phân bổ
          </button>
          {preview && (
            <div style={{ marginTop: 16 }}>
              <b>{preview.isFullyAllocated ? 'Đã phân bổ đủ' : 'Chưa đủ tồn toàn chuỗi'}</b>
              {preview.sources.map((source) => (
                <div key={source.fromBranchId} style={{ padding: 10, marginTop: 8, background: '#f8fafc', borderRadius: 10 }}>
                  <strong>{source.fromBranchName}</strong>
                  {source.items.map((item) => (
                    <div key={item.productId} style={{ fontSize: 13, marginTop: 4 }}>
                      {item.productName}: {item.allocatedQuantity} {item.unit}
                    </div>
                  ))}
                </div>
              ))}
              {preview.totals.some((item) => item.shortageQuantity > 0) && (
                <div style={{ color: '#b45309', marginTop: 8 }}>
                  Thiếu:{' '}
                  {preview.totals
                    .filter((item) => item.shortageQuantity > 0)
                    .map((item) => `${item.productName} ${item.shortageQuantity}`)
                    .join(', ')}
                </div>
              )}
              <button
                type="button"
                className="btn-primary-teal"
                disabled={saving || !preview.isFullyAllocated}
                onClick={() => void handleConfirm()}
                style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
              >
                <CheckCircle size={16} /> Xác nhận tạo phiếu
              </button>
            </div>
          )}
          <div style={{ marginTop: 14, color: '#64748b', fontSize: 12 }}>
            {branches.length} chi nhánh nguồn đang hoạt động được xét tự động.
          </div>
        </aside>
      </div>
    </div>
  );
};
