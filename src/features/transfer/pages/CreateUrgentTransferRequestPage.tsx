import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, Search, Trash2, Truck } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { transferService, type TransferAllocationPreview } from '../services/transferService';
import type { Branch, TransferItem } from '../types';
import '../transfer.css';

type DemandRow = TransferItem & { requestedQty: number };

export const CreateUrgentTransferRequestPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const destinationBranchId = user?.branchId ?? '';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalog, setCatalog] = useState<TransferItem[]>([]);
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
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
        const branchList = await transferService.branches();
        const sources = branchList.filter((branch) => branch.id !== destinationBranchId);
        setBranches(sources);
        const inventories = await Promise.all(sources.map((branch) => transferService.products(branch.id)));
        const merged = new Map<string, TransferItem>();
        inventories.flat().forEach((item) => {
          const existing = merged.get(item.productId);
          if (!existing) merged.set(item.productId, { ...item });
          else existing.onHandSender += item.onHandSender;
        });
        setCatalog([...merged.values()].filter((item) => item.onHandSender > 0));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Không tải được tồn khả dụng từ các chi nhánh.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [destinationBranchId]);

  const results = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    return catalog.filter((item) => !rows.some((row) => row.productId === item.productId)
      && `${item.productCode} ${item.productName}`.toLowerCase().includes(keyword)).slice(0, 8);
  }, [catalog, rows, search]);

  const payload = () => {
    const rawRel = relatedOrderId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRel);
    const mergedNote = !rawRel || isUuid
      ? note.trim() || undefined
      : [note.trim(), `Đơn liên quan: ${rawRel}`].filter(Boolean).join(' | ');
    return {
      toBranchId: destinationBranchId,
      requiredAt: requiredAt || undefined,
      relatedOrderId: isUuid ? rawRel : undefined,
      note: mergedNote,
      items: rows.map((row) => ({ productId: row.productId, quantity: row.requestedQty, unit: row.unitName })),
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
      setError(cause instanceof Error ? cause.message : 'Không thể tính phương án phân bổ.');
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
      setError(cause instanceof Error ? cause.message : 'Không thể tạo yêu cầu điều chuyển.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="transfer-container" style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button className="btn-secondary-white" onClick={() => navigate('/employee/transfers')}><ArrowLeft size={16} /></button>
        <div><h1 style={{ margin: 0, fontSize: 22 }}>Yêu cầu hàng gấp</h1><p style={{ margin: '4px 0 0', color: '#64748b' }}>Hệ thống phân bổ từ ít chi nhánh nhất theo tồn khả dụng thực tế.</p></div>
      </div>

      {error && <div style={{ padding: 12, marginBottom: 14, borderRadius: 12, background: '#fff7ed', color: '#9a3412', display: 'flex', gap: 8 }}><AlertTriangle size={18} />{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, .8fr)', gap: 18 }}>
        <section style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #e2e8f0' }}>
          <label style={{ fontWeight: 700 }}>Tìm sản phẩm đang có tại chi nhánh khác</label>
          <div style={{ position: 'relative', marginTop: 8 }}><Search size={17} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={loading ? 'Đang tải tồn kho…' : 'Nhập mã hoặc tên sản phẩm'} style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #cbd5e1', borderRadius: 12 }} /></div>
          {results.map((item) => <button key={item.productId} type="button" onClick={() => { setRows((current) => [...current, { ...item, requestedQty: 1 }]); setSearch(''); setPreview(null); }} style={{ width: '100%', textAlign: 'left', padding: 10, border: 0, borderBottom: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer' }}><b>{item.productCode}</b> · {item.productName} <span style={{ color: '#64748b' }}>· toàn chuỗi có thể xem: {item.onHandSender}</span></button>)}
          <div style={{ marginTop: 18 }}>
            {rows.map((row) => <div key={row.productId} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 38px', gap: 10, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}><div><b>{row.productName}</b><div style={{ color: '#64748b', fontSize: 12 }}>{row.productCode} · {row.unitName}</div></div><input type="number" min={0.01} step="0.01" value={row.requestedQty} onChange={(event) => { const value = Number(event.target.value); setRows((current) => current.map((item) => item.productId === row.productId ? { ...item, requestedQty: value } : item)); setPreview(null); }} style={{ padding: 9, border: '1px solid #cbd5e1', borderRadius: 10 }} /><button type="button" onClick={() => { setRows((current) => current.filter((item) => item.productId !== row.productId)); setPreview(null); }} style={{ border: 0, background: 'transparent', color: '#dc2626' }}><Trash2 size={17} /></button></div>)}
          </div>
        </section>

        <aside style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #e2e8f0', alignSelf: 'start' }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Thông tin yêu cầu</h2>
          <label>Hạn cần hàng<input type="datetime-local" value={requiredAt} onChange={(event) => setRequiredAt(event.target.value)} style={{ width: '100%', padding: 9, margin: '6px 0 12px', border: '1px solid #cbd5e1', borderRadius: 10 }} /></label>
          <label>Mã đơn hàng liên quan<input value={relatedOrderId} onChange={(event) => setRelatedOrderId(event.target.value)} placeholder="Không bắt buộc" style={{ width: '100%', padding: 9, margin: '6px 0 12px', border: '1px solid #cbd5e1', borderRadius: 10 }} /></label>
          <label>Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} style={{ width: '100%', padding: 9, marginTop: 6, border: '1px solid #cbd5e1', borderRadius: 10 }} /></label>
          <button type="button" className="btn-primary-teal" disabled={saving || !rows.length} onClick={() => void handlePreview()} style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}><Truck size={16} /> Xem phương án phân bổ</button>
          {preview && <div style={{ marginTop: 16 }}><b>{preview.isFullyAllocated ? 'Đã phân bổ đủ' : 'Chưa đủ tồn toàn chuỗi'}</b>{preview.sources.map((source) => <div key={source.fromBranchId} style={{ padding: 10, marginTop: 8, background: '#f8fafc', borderRadius: 10 }}><strong>{source.fromBranchName}</strong>{source.items.map((item) => <div key={item.productId} style={{ fontSize: 13, marginTop: 4 }}>{item.productName}: {item.allocatedQuantity} {item.unit}</div>)}</div>)}{preview.totals.some((item) => item.shortageQuantity > 0) && <div style={{ color: '#b45309', marginTop: 8 }}>Thiếu: {preview.totals.filter((item) => item.shortageQuantity > 0).map((item) => `${item.productName} ${item.shortageQuantity}`).join(', ')}</div>}<button type="button" className="btn-primary-teal" disabled={saving || !preview.isFullyAllocated} onClick={() => void handleConfirm()} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}><CheckCircle size={16} /> Xác nhận tạo phiếu</button></div>}
          <div style={{ marginTop: 14, color: '#64748b', fontSize: 12 }}>{branches.length} chi nhánh nguồn đang hoạt động được xét tự động.</div>
        </aside>
      </div>
    </div>
  );
};
