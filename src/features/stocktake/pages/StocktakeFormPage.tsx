import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties, FC } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Save,
  Send,
  Trash2,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
  Plus,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import { branchApi } from '../../purchase-order/api/branchApi';
import { batchApi } from '../../batch/api/batchApi';
import type { BatchItem } from '../../batch/types/batch.types';
import { stocktakeApi } from '../api/stocktakeApi';
import { type UpsertStocktakeLineInput } from '../types/stocktake.types';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';

interface LocationState {
  preselectedBatches?: Array<BatchItem & { confirmQty?: number }>;
  branchId?: string;
}

const lineActualQty = (l: UpsertStocktakeLineInput) =>
  l.goodQty + l.defectiveQty + l.damagedQty + l.expiredQty;

const lineIssueQty = (l: UpsertStocktakeLineInput) => l.defectiveQty + l.damagedQty;

const lineIssueKind = (l: UpsertStocktakeLineInput): 'defective' | 'damaged' =>
  l.defectiveQty > 0 ? 'defective' : 'damaged';

const applyCount = (
  line: UpsertStocktakeLineInput,
  patch: {
    actualQty?: number;
    expiredQty?: number;
    issueQty?: number;
    issueKind?: 'defective' | 'damaged';
  }
): UpsertStocktakeLineInput => {
  const kind = patch.issueKind ?? lineIssueKind(line);
  let actual = patch.actualQty ?? lineActualQty(line);
  let expired = patch.expiredQty ?? line.expiredQty;
  let issue = patch.issueQty ?? lineIssueQty(line);

  actual = Math.max(0, actual);
  expired = Math.max(0, expired);
  issue = Math.max(0, issue);
  if (expired + issue > actual) {
    if (patch.actualQty !== undefined) actual = expired + issue;
    else if (patch.expiredQty !== undefined) expired = Math.max(0, actual - issue);
    else issue = Math.max(0, actual - expired);
  }

  return {
    ...line,
    goodQty: Math.max(0, actual - expired - issue),
    expiredQty: expired,
    defectiveQty: kind === 'defective' ? issue : 0,
    damagedQty: kind === 'damaged' ? issue : 0,
    nearExpiryQty: 0,
    nearExpiryAction: null,
    defectiveReasonCode:
      kind === 'defective' && issue > 0
        ? line.defectiveReasonCode || 'MANUFACTURING_DEFECT'
        : null,
    defectiveReasonDetail: kind === 'defective' ? line.defectiveReasonDetail : null,
  };
};

const mapBatchToLine = (
  b: BatchItem & { confirmQty?: number }
): UpsertStocktakeLineInput => {
  const isExpired = b.status === 'Expired';
  const confirmed =
    typeof b.confirmQty === 'number' && b.confirmQty >= 0 ? b.confirmQty : b.qtyCurrent;
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
    goodQty: isExpired ? 0 : confirmed,
    defectiveQty: 0,
    damagedQty: 0,
    nearExpiryQty: 0,
    expiredQty: isExpired ? confirmed : 0,
    defectiveReasonCode: null,
    defectiveReasonDetail: null,
    nearExpiryAction: null,
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
  const [scopeType, setScopeType] = useState<string>('SELECTED_ITEMS');
  const [scopeReference, setScopeReference] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [lines, setLines] = useState<UpsertStocktakeLineInput[]>(() =>
    locState?.preselectedBatches?.length
      ? locState.preselectedBatches.map(mapBatchToLine)
      : []
  );
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        setScopeType(detail.scopeType === 'BY_SHELF' ? 'FULL_BRANCH' : detail.scopeType);
        setScopeReference(detail.scopeType === 'BY_SHELF' ? '' : detail.scopeReference || '');
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
            goodQty: l.goodQty + (l.nearExpiryQty || 0),
            defectiveQty: l.defectiveQty,
            damagedQty: l.damagedQty,
            nearExpiryQty: 0,
            expiredQty: l.expiredQty,
            defectiveReasonCode: l.defectiveReasonCode || null,
            defectiveReasonDetail: l.defectiveReasonDetail || null,
            nearExpiryAction: null,
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

  const addProductsFromSearch = useCallback(async () => {
    if (!branchId) {
      showToast('Vui lòng chọn chi nhánh kiểm kê trước.', 'warning');
      return;
    }
    const kw = searchKeyword.trim();
    if (!kw) {
      showToast('Quét mã vạch hoặc nhập SKU / tên sản phẩm để thêm vào phiếu.', 'warning');
      searchInputRef.current?.focus();
      return;
    }

    setIsLoadingBatches(true);
    setErrorMsg('');
    try {
      const res = await batchApi.getBatches({
        keyword: kw,
        productName: '',
        sku: '',
        batchCode: '',
        supplierName: '',
        branchId,
        status: 'ALL',
        pageIndex: 1,
        pageSize: 50,
      });

      let matched = res.items;
      if (scopeType === 'BY_CATEGORY' && scopeReference.trim()) {
        const cat = scopeReference.trim().toLowerCase();
        matched = matched.filter((b) => b.categoryName.toLowerCase().includes(cat));
      }

      const kwLower = kw.toLowerCase();
      const exact = matched.filter(
        (b) =>
          b.sku.toLowerCase() === kwLower ||
          (b.batchCode && b.batchCode !== '—' && b.batchCode.toLowerCase() === kwLower)
      );
      const toAdd = exact.length > 0 ? exact : matched;

      if (toAdd.length === 0) {
        showToast(`Không tìm thấy lô tồn kho khớp "${kw}".`, 'warning');
        searchInputRef.current?.select();
        return;
      }

      const mapped = toAdd.map(mapBatchToLine);
      const existingKeys = new Set(
        lines.map((p) => p.branchStockId || `${p.productId}_${p.batchCode || ''}`)
      );
      const added = mapped.filter(
        (m) => !existingKeys.has(m.branchStockId || `${m.productId}_${m.batchCode || ''}`)
      );

      if (added.length === 0) {
        showToast('Sản phẩm / lô này đã có trên phiếu kiểm kê.', 'warning');
      } else {
        setLines((prev) => [...prev, ...added]);
        showToast(
          added.length === 1
            ? `Đã thêm ${added[0].productName} vào phiếu.`
            : `Đã thêm ${added.length} lô vào phiếu kiểm kê.`,
          'success'
        );
      }

      setSearchKeyword('');
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể tìm sản phẩm trong tồn kho.';
      showToast(msg, 'error');
    } finally {
      setIsLoadingBatches(false);
    }
  }, [branchId, scopeType, scopeReference, searchKeyword, lines, showToast]);

  const handleCountChange = (
    idx: number,
    patch: {
      actualQty?: number;
      expiredQty?: number;
      issueQty?: number;
      issueKind?: 'defective' | 'damaged';
    }
  ) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? applyCount(line, patch) : line)));
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
      const actual = lineActualQty(l);
      const issue = lineIssueQty(l);
      if (l.expiredQty + issue > actual) {
        showToast(
          `Dòng "${l.productName}": hết hạn + lỗi/hỏng không được lớn hơn số lượng thực tế.`,
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
        lines: lines.map((l) => applyCount(l, {})),
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
      navigate(basePath, {
        state: {
          toastMessage: submitImmediately
            ? `Đã gửi phiếu kiểm kê ${saved.code} lên Store Owner chờ phê duyệt!`
            : `Đã lưu nháp phiếu kiểm kê ${saved.code} vào danh sách!`,
          highlightId: saved.id,
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

  const handleResetFilters = () => {
    setSearchKeyword('');
    setScopeType('SELECTED_ITEMS');
    setScopeReference('');
    searchInputRef.current?.focus();
  };

  const tableMinWidth = 1180;
  const tableFitStyle: CSSProperties = {
    width: '100%',
    minWidth: tableMinWidth,
    tableLayout: 'fixed',
  };
  const filterFieldStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  };
  const filterLabelStyle: CSSProperties = {
    width: 84,
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
  const filterControlStyle: CSSProperties = {
    height: 32,
    flex: 1,
    minWidth: 0,
    width: '100%',
    padding: '0 8px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: 44 }} />
      <col style={{ width: 210 }} />
      <col style={{ width: 160 }} />
      <col style={{ width: 140 }} />
      <col style={{ width: 80 }} />
      <col style={{ width: 96 }} />
      <col style={{ width: 88 }} />
      <col style={{ width: 150 }} />
      <col style={{ width: 88 }} />
      <col style={{ width: 48 }} />
    </colgroup>
  );

  const qtyInputStyle = (active?: boolean, color?: string): CSSProperties => ({
    width: '100%',
    maxWidth: 88,
    height: 30,
    textAlign: 'right',
    padding: '0 6px',
    borderRadius: 5,
    border: active && color ? `1.5px solid ${color}` : '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontWeight: 700,
    color: active && color ? color : '#0f172a',
  });

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
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
            <ClipboardCheck size={22} color="var(--blue-primary, #0f766e)" />
            <span>
              {isEditMode ? 'Cập nhật phiếu kiểm kê' : 'Lập phiếu kiểm kê'}
            </span>
            {(isLoadingBatches || isSaving) && (
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: 'var(--blue-primary, #0f766e)' }}
              />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate(basePath)}
          >
            <ClipboardList size={14} />
            <span>Danh sách phiếu</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            disabled={isSaving}
            onClick={() => void handleSave(false)}
          >
            <Save size={14} />
            <span>Lưu nháp</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            disabled={isSaving}
            onClick={() => void handleSave(true)}
          >
            <Send size={14} />
            <span>Gửi duyệt</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            flexShrink: 0,
            marginBottom: 8,
            padding: '8px 12px',
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

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <div className="so-list-filter">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px 14px',
            }}
          >
            <div style={filterFieldStyle}>
              <label style={filterLabelStyle} htmlFor="stocktake-branch">
                Chi nhánh:
              </label>
              <select
                id="stocktake-branch"
                value={branchId}
                disabled={!isStoreOwner && Boolean(userBranchId)}
                onChange={(e) => setBranchId(e.target.value)}
                style={{
                  ...filterControlStyle,
                  border: branchId ? '1px solid #0d9488' : '1px solid #cbd5e1',
                  color: branchId ? '#0f766e' : '#1e293b',
                  backgroundColor: branchId ? '#f0fdfa' : '#ffffff',
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

            <div style={filterFieldStyle}>
              <label style={filterLabelStyle} htmlFor="stocktake-scope">
                Phạm vi:
              </label>
              <select
                id="stocktake-scope"
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
                style={{
                  ...filterControlStyle,
                  border: '1px solid #0d9488',
                  color: '#0f766e',
                  backgroundColor: '#f0fdfa',
                }}
              >
                <option value="FULL_BRANCH">Toàn bộ chi nhánh</option>
                <option value="BY_CATEGORY">Theo ngành hàng</option>
                <option value="SELECTED_ITEMS">Theo lô / sản phẩm chọn</option>
              </select>
            </div>

            <div style={filterFieldStyle}>
              <label style={filterLabelStyle} htmlFor="stocktake-category">
                Ngành hàng:
              </label>
              <input
                id="stocktake-category"
                type="text"
                value={scopeReference}
                disabled={scopeType !== 'BY_CATEGORY'}
                onChange={(e) => setScopeReference(e.target.value)}
                placeholder={scopeType === 'BY_CATEGORY' ? 'VD: Sữa, Đồ uống...' : 'Chỉ dùng khi lọc ngành hàng'}
                style={{
                  ...filterControlStyle,
                  backgroundColor: scopeType === 'BY_CATEGORY' ? '#ffffff' : '#f8fafc',
                }}
              />
            </div>

            <div style={filterFieldStyle}>
              <label style={filterLabelStyle} htmlFor="stocktake-keyword">
                Tìm / quét:
              </label>
              <input
                id="stocktake-keyword"
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                autoFocus
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addProductsFromSearch();
                  }
                }}
                placeholder="Quét mã vạch hoặc nhập SKU, tên SP, mã lô..."
                style={filterControlStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px dashed #f1f5f9',
              flexWrap: 'wrap',
            }}
          >
            <div className="so-list-filter-actions" style={{ marginLeft: 'auto', flexWrap: 'nowrap' }}>
              <button
                type="button"
                className="so-list-filter-search"
                disabled={isLoadingBatches}
                onClick={() => void addProductsFromSearch()}
                title="Quét mã hoặc tìm SKU/tên rồi thêm vào phiếu kiểm kê"
              >
                {isLoadingBatches ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Thêm sản phẩm</span>
              </button>
              <button
                type="button"
                className="so-list-filter-reset"
                onClick={handleResetFilters}
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="so-list-table-card so-list-table-card--wrap">
        <div className="so-list-table-head">
          <table className="so-list-table" style={tableFitStyle}>
            {tableColGroup}
            <thead>
              <tr>
                <th className="so-list-th" style={{ textAlign: 'center' }}>#</th>
                <th className="so-list-th">Sản phẩm / SKU</th>
                <th className="so-list-th">Mã lô / HSD / Kệ</th>
                <th className="so-list-th">Nguồn nhập</th>
                <th className="so-list-th" style={{ textAlign: 'right' }}>Tồn HT</th>
                <th className="so-list-th" style={{ textAlign: 'right' }}>Thực tế</th>
                <th className="so-list-th" style={{ textAlign: 'right', color: '#be123c' }}>Hết hạn</th>
                <th className="so-list-th" style={{ textAlign: 'right', color: '#b45309' }}>Lỗi / hư hỏng</th>
                <th className="so-list-th" style={{ textAlign: 'right' }}>Chênh lệch</th>
                <th className="so-list-th" />
              </tr>
            </thead>
          </table>
        </div>

        <div className="so-list-table-body">
          <table className="so-list-table" style={tableFitStyle}>
            {tableColGroup}
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}
                  >
                    Phiếu đang trống. Quét mã vạch hoặc nhập SKU / tên sản phẩm rồi bấm Thêm sản phẩm.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const actualQty = lineActualQty(line);
                  const issueQty = lineIssueQty(line);
                  const issueKind = lineIssueKind(line);
                  const varianceQty = actualQty - line.systemQty;
                  const hasIssue = issueQty > 0 || line.expiredQty > 0 || varianceQty !== 0;

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
                      <td>
                        <div className="so-list-name">{line.productName}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>
                          {line.sku} · ĐVT: {line.unit}
                        </div>
                      </td>
                      <td>
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
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>
                          {line.goodsReceiptNo || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
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

                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={actualQty}
                          onChange={(e) =>
                            handleCountChange(idx, { actualQty: Math.max(0, Number(e.target.value) || 0) })
                          }
                          style={qtyInputStyle()}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          value={line.expiredQty}
                          onChange={(e) =>
                            handleCountChange(idx, {
                              expiredQty: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          style={qtyInputStyle(line.expiredQty > 0, '#be123c')}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                          <input
                            type="number"
                            min={0}
                            value={issueQty}
                            onChange={(e) =>
                              handleCountChange(idx, {
                                issueQty: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            style={qtyInputStyle(issueQty > 0, '#b45309')}
                          />
                          {issueQty > 0 && (
                            <select
                              value={issueKind}
                              onChange={(e) =>
                                handleCountChange(idx, {
                                  issueKind: e.target.value as 'defective' | 'damaged',
                                })
                              }
                              style={{
                                width: '100%',
                                height: 26,
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 4,
                                border: '1px solid #fcd34d',
                                backgroundColor: '#fffbeb',
                                color: '#92400e',
                              }}
                            >
                              <option value="damaged">Hỏng tại CH</option>
                              <option value="defective">Lỗi NCC</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color:
                            varianceQty < 0 ? '#dc2626' : varianceQty > 0 ? '#2563eb' : '#15803d',
                        }}
                      >
                        {varianceQty > 0 ? `+${varianceQty}` : varianceQty}
                      </td>

                      <td className="so-list-td--actions" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="so-list-action-btn"
                          onClick={() => handleRemoveLine(idx)}
                          title="Xóa dòng này khỏi phiếu kiểm kê"
                          style={{ width: 28, padding: 0 }}
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

