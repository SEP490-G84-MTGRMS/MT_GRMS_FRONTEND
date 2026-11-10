import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  RefreshCw,
  Trash2,
  ClipboardCheck,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import { branchApi } from '../../purchase-order/api/branchApi';
import { batchApi } from '../../batch/api/batchApi';
import type { BatchItem } from '../../batch/types/batch.types';
import { stocktakeApi } from '../api/stocktakeApi';
import {
  DEFECTIVE_REASON_OPTIONS,
  NEAR_EXPIRY_ACTION_OPTIONS,
  type UpsertStocktakeLineInput,
} from '../types/stocktake.types';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';

interface LocationState {
  preselectedBatches?: BatchItem[];
  branchId?: string;
}

const mapBatchToLine = (b: BatchItem): UpsertStocktakeLineInput => {
  const isExpired = b.status === 'Expired';
  const isNearExpiry = b.status === 'Critical' || b.status === 'Warning';
  return {
    branchStockId: b.id,
    productId: b.productId,
    sku: b.sku,
    productName: b.productName,
    unit: b.unit,
    batchCode: b.batchCode !== '—' ? b.batchCode : null,
    expiryDate: b.rawExpiryDate ? new Date(b.rawExpiryDate).toISOString() : null,
    shelfLocation: b.shelfLocation !== '—' ? b.shelfLocation : null,
    supplierId: b.supplierId || null,
    supplierName: b.supplierName !== '—' ? b.supplierName : null,
    goodsReceiptId: b.originalGrnId || null,
    goodsReceiptNo: b.originalGrnNo || null,
    goodsReceiptLineId: null,
    unitCost: b.costPrice || 0,
    systemQty: b.qtyCurrent,
    goodQty: isExpired ? 0 : b.qtyCurrent,
    defectiveQty: 0,
    damagedQty: 0,
    nearExpiryQty: 0,
    expiredQty: isExpired ? b.qtyCurrent : 0,
    defectiveReasonCode: null,
    defectiveReasonDetail: null,
    nearExpiryAction: isNearExpiry ? 'DISCOUNT_SALE' : null,
    discountPercent: null,
    evidenceUrl: null,
    note: null,
  };
};

export const StocktakeFormPage: FC<{ defaultRole?: 'store_owner' | 'employee' }> = ({
  defaultRole = 'store_owner',
}) => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as LocationState | null) || null;

  const userRole = useAuthStore((s) => s.user?.role);
  const userBranchId = useAuthStore((s) => s.user?.branchId);
  const isStoreOwner =
    defaultRole === 'store_owner' &&
    (userRole === 'STORE_OWNER' || userRole === 'ADMIN' || !userRole);
  const basePath = defaultRole === 'employee' ? '/employee/stocktakes' : '/store-owner/stocktakes';

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState<string>(
    locState?.branchId || userBranchId || ''
  );
  const [scopeType, setScopeType] = useState<string>(
    locState?.preselectedBatches?.length ? 'SELECTED_ITEMS' : 'FULL_BRANCH'
  );
  const [scopeReference, setScopeReference] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [lines, setLines] = useState<UpsertStocktakeLineInput[]>(() =>
    locState?.preselectedBatches?.length
      ? locState.preselectedBatches.map(mapBatchToLine)
      : []
  );
  const [autoBalanceGoodQty, setAutoBalanceGoodQty] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'error') => {
      setErrorMsg(type === 'error' ? message : '');
      setToast({ id: Date.now().toString(), message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // Load branches
  useEffect(() => {
    let mounted = true;
    branchApi
      .getBranches({ status: 'active', pageIndex: 1, pageSize: 100 })
      .then((res) => {
        if (!mounted) return;
        if (res.items?.length) {
          const list = res.items.map((b) => ({
            id: b.id,
            name: `${b.code || ''} — ${b.name}`.trim(),
          }));
          setBranches(list);
          if (!branchId && list[0]) {
            setBranchId(list[0].id);
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [branchId]);

  // Load existing stocktake when in edit mode
  useEffect(() => {
    if (!id) return;
    stocktakeApi
      .getById(id)
      .then((detail) => {
        setBranchId(detail.branchId);
        setScopeType(detail.scopeType);
        setScopeReference(detail.scopeReference || '');
        setNote(detail.note || '');
        setLines(
          detail.lines.map((l) => ({
            branchStockId: l.branchStockId,
            productId: l.productId,
            sku: l.sku,
            productName: l.productName,
            unit: l.unit,
            batchCode: l.batchCode,
            expiryDate: l.expiryDate,
            shelfLocation: l.shelfLocation,
            supplierId: l.supplierId,
            supplierName: l.supplierName,
            goodsReceiptId: l.goodsReceiptId,
            goodsReceiptNo: l.goodsReceiptNo,
            goodsReceiptLineId: l.goodsReceiptLineId,
            unitCost: l.unitCost,
            systemQty: l.systemQty,
            goodQty: l.goodQty,
            defectiveQty: l.defectiveQty,
            damagedQty: l.damagedQty,
            nearExpiryQty: l.nearExpiryQty,
            expiredQty: l.expiredQty,
            defectiveReasonCode: l.defectiveReasonCode || null,
            defectiveReasonDetail: l.defectiveReasonDetail || null,
            nearExpiryAction: l.nearExpiryAction || null,
            discountPercent: l.discountPercent || null,
            evidenceUrl: l.evidenceUrl || null,
            note: l.note || null,
          }))
        );
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : 'Không thể tải phiếu kiểm kê để chỉnh sửa.';
        showToast(msg, 'error');
      });
  }, [id, showToast]);

  const loadBatchesFromInventory = useCallback(
    async (appendOnly = false) => {
      if (!branchId) {
        showToast('Vui lòng chọn chi nhánh kiểm kê trước.', 'warning');
        return;
      }
      setIsLoadingBatches(true);
      setErrorMsg('');
      try {
        const res = await batchApi.getBatches({
          keyword: searchKeyword,
          productName: '',
          sku: '',
          batchCode: '',
          supplierName: '',
          branchId,
          status: 'ALL',
          pageIndex: 1,
          pageSize: 100,
        });

        let filtered = res.items;
        if (scopeType === 'BY_CATEGORY' && scopeReference.trim()) {
          const kw = scopeReference.trim().toLowerCase();
          filtered = filtered.filter((b) => b.categoryName.toLowerCase().includes(kw));
        } else if (scopeType === 'BY_SHELF' && scopeReference.trim()) {
          const kw = scopeReference.trim().toLowerCase();
          filtered = filtered.filter(
            (b) =>
              b.shelfLocation.toLowerCase().includes(kw) ||
              b.zoneArea.toLowerCase().includes(kw)
          );
        }

        const mapped = filtered.map(mapBatchToLine);
        if (appendOnly) {
          setLines((prev) => {
            const existingKeys = new Set(
              prev.map((p) => p.branchStockId || `${p.productId}_${p.batchCode || ''}`)
            );
            const added = mapped.filter(
              (m) =>
                !existingKeys.has(m.branchStockId || `${m.productId}_${m.batchCode || ''}`)
            );
            return [...prev, ...added];
          });
        } else {
          setLines(mapped);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Không thể tải danh sách lô hàng từ tồn kho.';
        showToast(msg, 'error');
      } finally {
        setIsLoadingBatches(false);
      }
    },
    [branchId, scopeType, scopeReference, searchKeyword, showToast]
  );

  // Auto-load batches if creating new without preselected batches once branchId is ready
  useEffect(() => {
    if (!isEditMode && !locState?.preselectedBatches?.length && branchId && lines.length === 0) {
      void loadBatchesFromInventory(false);
    }
  }, [isEditMode, locState, branchId, lines.length, loadBatchesFromInventory]);

  const handleQtyChange = (
    idx: number,
    field: 'goodQty' | 'defectiveQty' | 'damagedQty' | 'nearExpiryQty' | 'expiredQty',
    rawVal: string
  ) => {
    const val = Math.max(0, Number(rawVal) || 0);
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const updated = { ...line, [field]: val };

        if (field !== 'goodQty' && autoBalanceGoodQty) {
          const otherBuckets =
            (field === 'defectiveQty' ? val : updated.defectiveQty) +
            (field === 'damagedQty' ? val : updated.damagedQty) +
            (field === 'nearExpiryQty' ? val : updated.nearExpiryQty) +
            (field === 'expiredQty' ? val : updated.expiredQty);
          updated.goodQty = Math.max(0, updated.systemQty - otherBuckets);
        }

        if (updated.defectiveQty > 0 && !updated.defectiveReasonCode) {
          updated.defectiveReasonCode = 'MANUFACTURING_DEFECT';
        }
        if (updated.nearExpiryQty > 0 && !updated.nearExpiryAction) {
          updated.nearExpiryAction = 'DISCOUNT_SALE';
        }
        return updated;
      })
    );
  };

  const handleFieldChange = <K extends keyof UpsertStocktakeLineInput>(
    idx: number,
    field: K,
    value: UpsertStocktakeLineInput[K]
  ) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line)));
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (submitImmediately: boolean) => {
    setErrorMsg('');
    if (!branchId) {
      showToast('Vui lòng chọn chi nhánh thực hiện kiểm kê.', 'error');
      return;
    }
    if (lines.length === 0) {
      showToast('Phiếu kiểm kê phải có ít nhất 1 dòng hàng hóa.', 'error');
      return;
    }

    for (const l of lines) {
      if (l.defectiveQty > 0 && !l.defectiveReasonCode) {
        showToast(
          `Dòng SP "${l.productName}" có SL lỗi NCC > 0 nhưng chưa chọn mã lý do lỗi.`,
          'error'
        );
        return;
      }
      if (
        l.defectiveQty > 0 &&
        l.defectiveReasonCode === 'OTHER' &&
        !l.defectiveReasonDetail?.trim()
      ) {
        showToast(
          `Dòng SP "${l.productName}" chọn lý do lỗi KHÁC (OTHER) phải nhập mô tả chi tiết.`,
          'error'
        );
        return;
      }
      if (l.nearExpiryQty > 0 && !l.nearExpiryAction) {
        showToast(
          `Dòng SP "${l.productName}" có SL cận hạn > 0 nhưng chưa chọn hướng xử lý cận hạn.`,
          'error'
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        branchId,
        scopeType,
        scopeReference: scopeReference.trim() || null,
        note: note.trim() || null,
        submitImmediately,
        lines,
      };

      const saved =
        isEditMode && id
          ? await stocktakeApi.update(id, payload)
          : await stocktakeApi.create(payload);

      showToast(
        submitImmediately
          ? 'Đã gửi phiếu kiểm kê lên Store Owner duyệt thành công!'
          : 'Đã lưu nháp phiếu kiểm kê thành công!',
        'success'
      );
      navigate(`${basePath}/${saved.id}`, {
        state: {
          toastMessage: submitImmediately
            ? `Đã gửi phiếu kiểm kê ${saved.code} chờ Store Owner phê duyệt!`
            : `Đã lưu nháp phiếu kiểm kê ${saved.code}!`,
        },
      });
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const rawMsg =
        e.response?.data?.message || e.message || 'Lỗi khi lưu phiếu kiểm kê hàng hóa.';
      const friendlyMsg =
        e.response?.status === 404
          ? `Không tìm thấy API /api/stocktakes (404) — vui lòng khởi động lại Backend để nạp StocktakesController (${rawMsg}).`
          : rawMsg;
      showToast(friendlyMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const totalSystem = lines.reduce((s, l) => s + l.systemQty, 0);
  const totalGood = lines.reduce((s, l) => s + l.goodQty, 0);
  const totalDefective = lines.reduce((s, l) => s + l.defectiveQty, 0);
  const totalDamaged = lines.reduce((s, l) => s + l.damagedQty, 0);
  const totalNearExpiry = lines.reduce((s, l) => s + l.nearExpiryQty, 0);
  const totalExpired = lines.reduce((s, l) => s + l.expiredQty, 0);

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
      <div className="so-list-header" style={{ marginBottom: 12 }}>
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
            <h1 className="so-list-title" style={{ margin: 0 }}>
              <ClipboardCheck size={22} color="#0f766e" />
              <span>
                {isEditMode
                  ? 'Cập nhật Phiếu Kiểm Kê Hàng Hóa'
                  : 'Lập Phiếu Kiểm Kê Hàng Hóa Tại Chi Nhánh'}
              </span>
            </h1>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Ghi nhận số lượng kiểm đếm thực tế và phân loại tình trạng hàng hóa (Tốt / Lỗi NCC / Hỏng / Cận hạn / Hết hạn)
            </div>
          </div>
        </div>

        <div className="so-list-header-actions">
          <button
            type="button"
            className="po-btn po-btn-secondary"
            disabled={isSaving}
            onClick={() => void handleSave(false)}
          >
            <Save size={14} />
            <span>Lưu nháp (DRAFT)</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{ backgroundColor: '#0f766e' }}
            disabled={isSaving}
            onClick={() => void handleSave(true)}
          >
            <Send size={14} />
            <span>Gửi Store Owner duyệt (Cách ly hàng lỗi/hỏng)</span>
          </button>
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

      {/* Khu vực 1: Thông tin chung của phiếu kiểm kê */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <div>
          <label
            style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}
          >
            Chi nhánh kiểm kê <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={branchId}
            disabled={!isStoreOwner && Boolean(userBranchId)}
            onChange={(e) => setBranchId(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
            }}
          >
            <option value="">-- Chọn chi nhánh --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}
          >
            Phạm vi kiểm kê
          </label>
          <select
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
            }}
          >
            <option value="FULL_BRANCH">Toàn bộ chi nhánh</option>
            <option value="BY_CATEGORY">Theo ngành hàng</option>
            <option value="BY_SHELF">Theo khu vực / vị trí kệ</option>
            <option value="SELECTED_ITEMS">Theo lô / sản phẩm được chọn</option>
          </select>
        </div>

        {(scopeType === 'BY_CATEGORY' || scopeType === 'BY_SHELF') && (
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
              {scopeType === 'BY_CATEGORY' ? 'Tên ngành hàng' : 'Mã kệ / Khu vực'}
            </label>
            <input
              type="text"
              value={scopeReference}
              onChange={(e) => setScopeReference(e.target.value)}
              placeholder={
                scopeType === 'BY_CATEGORY' ? 'VD: Sữa, Đồ uống...' : 'VD: C-B-01, Kho mát...'
              }
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
        )}

        <div>
          <label
            style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}
          >
            Thêm / Lọc nhanh sản phẩm, mã lô
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Nhập SKU, tên SP hoặc mã lô..."
              style={{
                flex: 1,
                height: 36,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              className="po-btn po-btn-secondary"
              style={{ height: 36 }}
              disabled={isLoadingBatches}
              onClick={() => void loadBatchesFromInventory(true)}
              title="Thêm các lô khớp bộ lọc vào bảng kiểm kê"
            >
              <Plus size={14} />
              <span>Thêm lô</span>
            </button>
            <button
              type="button"
              className="po-btn po-btn-secondary"
              style={{ height: 36 }}
              disabled={isLoadingBatches}
              onClick={() => void loadBatchesFromInventory(false)}
              title="Tải lại toàn bộ danh sách lô theo phạm vi"
            >
              <RefreshCw size={14} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label
            style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}
          >
            Ghi chú đợt kiểm kê
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Kiểm kê định kỳ cuối ca / Phát hiện thùng sữa bị móp, rỉ nắp từ lô nhập..."
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Khu vực 2: Bảng kiểm kê hàng hóa */}
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
        {/* Summary & Helper Bar */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12.5 }}>
            <span>
              Tổng dòng kiểm kê: <b>{lines.length}</b>
            </span>
            <span>
              Tồn hệ thống: <b>{totalSystem}</b>
            </span>
            <span style={{ color: '#15803d' }}>
              Hàng tốt: <b>{totalGood}</b>
            </span>
            <span style={{ color: '#dc2626' }}>
              Lỗi do NCC: <b>{totalDefective}</b>
            </span>
            <span style={{ color: '#b45309' }}>
              Hỏng tại CH: <b>{totalDamaged}</b>
            </span>
            <span style={{ color: '#2563eb' }}>
              Cận hạn: <b>{totalNearExpiry}</b>
            </span>
            <span style={{ color: '#be123c' }}>
              Hết hạn: <b>{totalExpired}</b>
            </span>
          </div>

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
              checked={autoBalanceGoodQty}
              onChange={(e) => setAutoBalanceGoodQty(e.target.checked)}
              style={{ accentColor: '#0f766e' }}
            />
            <span>Tự động trừ vào SL Hàng tốt khi nhập SL lỗi/hỏng/cận hạn</span>
          </label>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', minWidth: 1320, borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f1f5f9',
                  borderBottom: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 700,
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '9px 10px', width: 36, textAlign: 'center' }}>#</th>
                <th style={{ padding: '9px 10px', width: 210 }}>Sản phẩm / SKU</th>
                <th style={{ padding: '9px 10px', width: 150 }}>Mã lô / HSD / Kệ</th>
                <th style={{ padding: '9px 10px', width: 150 }}>Nguồn nhập (GRN / NCC)</th>
                <th style={{ padding: '9px 10px', width: 80, textAlign: 'right' }}>Tồn HT</th>
                <th style={{ padding: '9px 10px', width: 95, textAlign: 'right', color: '#15803d' }}>
                  SL Tốt
                </th>
                <th style={{ padding: '9px 10px', width: 95, textAlign: 'right', color: '#dc2626' }}>
                  Lỗi NCC
                </th>
                <th style={{ padding: '9px 10px', width: 95, textAlign: 'right', color: '#b45309' }}>
                  Hỏng CH
                </th>
                <th style={{ padding: '9px 10px', width: 95, textAlign: 'right', color: '#2563eb' }}>
                  Cận hạn
                </th>
                <th style={{ padding: '9px 10px', width: 95, textAlign: 'right', color: '#be123c' }}>
                  Hết hạn
                </th>
                <th style={{ padding: '9px 10px', width: 85, textAlign: 'right' }}>Thực đếm</th>
                <th style={{ padding: '9px 10px', width: 85, textAlign: 'right' }}>Chênh lệch</th>
                <th style={{ padding: '9px 10px', minWidth: 220 }}>
                  Phân loại lý do / Hướng xử lý / Ghi chú
                </th>
                <th style={{ padding: '9px 10px', width: 42, textAlign: 'center' }} />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}
                  >
                    Chưa có dòng sản phẩm nào trong bảng kiểm kê. Chọn chi nhánh và bấm &quot;Tải lại&quot; hoặc chọn lô từ màn hình FEFO.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const actualQty =
                    line.goodQty +
                    line.defectiveQty +
                    line.damagedQty +
                    line.nearExpiryQty +
                    line.expiredQty;
                  const varianceQty = actualQty - line.systemQty;
                  const hasIssue =
                    line.defectiveQty > 0 ||
                    line.damagedQty > 0 ||
                    line.nearExpiryQty > 0 ||
                    line.expiredQty > 0 ||
                    varianceQty !== 0;

                  return (
                    <tr
                      key={`${line.branchStockId || line.productId}_${idx}`}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: hasIssue ? '#fffbeb' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{line.productName}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>
                          {line.sku} · ĐVT: {line.unit}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}>
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
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>
                          {line.goodsReceiptNo || '—'}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            maxWidth: 145,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={line.supplierName || ''}
                        >
                          {line.supplierName || '—'}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        {line.systemQty}
                      </td>

                      {/* GoodQty */}
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={line.goodQty}
                          onChange={(e) => handleQtyChange(idx, 'goodQty', e.target.value)}
                          style={{
                            width: 72,
                            height: 30,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border: '1px solid #86efac',
                            backgroundColor: '#f0fdf4',
                            fontWeight: 700,
                            color: '#15803d',
                          }}
                        />
                      </td>

                      {/* DefectiveQty */}
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={line.defectiveQty}
                          onChange={(e) => handleQtyChange(idx, 'defectiveQty', e.target.value)}
                          style={{
                            width: 72,
                            height: 30,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border:
                              line.defectiveQty > 0 ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            backgroundColor: line.defectiveQty > 0 ? '#fef2f2' : '#ffffff',
                            fontWeight: 700,
                            color: line.defectiveQty > 0 ? '#dc2626' : '#475569',
                          }}
                        />
                      </td>

                      {/* DamagedQty */}
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={line.damagedQty}
                          onChange={(e) => handleQtyChange(idx, 'damagedQty', e.target.value)}
                          style={{
                            width: 72,
                            height: 30,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border:
                              line.damagedQty > 0 ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                            backgroundColor: line.damagedQty > 0 ? '#fffbeb' : '#ffffff',
                            fontWeight: 700,
                            color: line.damagedQty > 0 ? '#b45309' : '#475569',
                          }}
                        />
                      </td>

                      {/* NearExpiryQty */}
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={line.nearExpiryQty}
                          onChange={(e) => handleQtyChange(idx, 'nearExpiryQty', e.target.value)}
                          style={{
                            width: 72,
                            height: 30,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border:
                              line.nearExpiryQty > 0 ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                            backgroundColor: line.nearExpiryQty > 0 ? '#eff6ff' : '#ffffff',
                            fontWeight: 700,
                            color: line.nearExpiryQty > 0 ? '#1d4ed8' : '#475569',
                          }}
                        />
                      </td>

                      {/* ExpiredQty */}
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={line.expiredQty}
                          onChange={(e) => handleQtyChange(idx, 'expiredQty', e.target.value)}
                          style={{
                            width: 72,
                            height: 30,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border:
                              line.expiredQty > 0 ? '1.5px solid #e11d48' : '1px solid #cbd5e1',
                            backgroundColor: line.expiredQty > 0 ? '#ffe4e6' : '#ffffff',
                            fontWeight: 700,
                            color: line.expiredQty > 0 ? '#be123c' : '#475569',
                          }}
                        />
                      </td>

                      {/* ActualQty */}
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        {actualQty}
                      </td>

                      {/* VarianceQty */}
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color:
                            varianceQty < 0
                              ? '#dc2626'
                              : varianceQty > 0
                              ? '#2563eb'
                              : '#15803d',
                        }}
                      >
                        {varianceQty > 0 ? `+${varianceQty}` : varianceQty}
                      </td>

                      {/* Reason & Action */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {line.defectiveQty > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <select
                                value={line.defectiveReasonCode || ''}
                                onChange={(e) =>
                                  handleFieldChange(idx, 'defectiveReasonCode', e.target.value)
                                }
                                style={{
                                  height: 28,
                                  fontSize: 11.5,
                                  padding: '0 6px',
                                  borderRadius: 4,
                                  border: '1px solid #fca5a5',
                                  backgroundColor: '#fef2f2',
                                  color: '#991b1b',
                                  fontWeight: 600,
                                }}
                              >
                                <option value="">-- Chọn lý do lỗi NCC --</option>
                                {DEFECTIVE_REASON_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {line.defectiveReasonCode === 'OTHER' && (
                                <input
                                  type="text"
                                  placeholder="Mô tả chi tiết lỗi (bắt buộc)..."
                                  value={line.defectiveReasonDetail || ''}
                                  onChange={(e) =>
                                    handleFieldChange(idx, 'defectiveReasonDetail', e.target.value)
                                  }
                                  style={{
                                    height: 28,
                                    fontSize: 11.5,
                                    padding: '0 8px',
                                    borderRadius: 4,
                                    border: '1px solid #ef4444',
                                    flex: 1,
                                    minWidth: 140,
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {line.nearExpiryQty > 0 && (
                            <select
                              value={line.nearExpiryAction || ''}
                              onChange={(e) =>
                                handleFieldChange(idx, 'nearExpiryAction', e.target.value)
                              }
                              style={{
                                height: 28,
                                fontSize: 11.5,
                                padding: '0 6px',
                                borderRadius: 4,
                                border: '1px solid #93c5fd',
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                fontWeight: 600,
                              }}
                            >
                              <option value="">-- Hướng xử lý cận hạn --</option>
                              {NEAR_EXPIRY_ACTION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}

                          <input
                            type="text"
                            placeholder="Ghi chú / Link ảnh minh chứng..."
                            value={line.note || ''}
                            onChange={(e) => handleFieldChange(idx, 'note', e.target.value)}
                            style={{
                              height: 26,
                              fontSize: 11.5,
                              padding: '0 8px',
                              borderRadius: 4,
                              border: '1px solid #e2e8f0',
                            }}
                          />
                        </div>
                      </td>

                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: 4,
                          }}
                          title="Xóa dòng này khỏi phiếu kiểm kê"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StocktakeFormPage;

