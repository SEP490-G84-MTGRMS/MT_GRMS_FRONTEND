import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import { branchApi } from '../../purchase-order/api/branchApi';
import { batchApi } from '../../batch/api/batchApi';
import type { BatchItem } from '../../batch/types/batch.types';
import { stocktakeApi } from '../api/stocktakeApi';
import { type UpsertStocktakeLineInput } from '../types/stocktake.types';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';
import { StocktakeAddProductModal } from '../components/StocktakeAddProductModal';
import {
  StocktakeFormHeaderCard,
  type StocktakeBranchOption,
} from '../components/form/StocktakeFormHeaderCard';
import {
  StocktakeProductEntryTable,
  type StocktakeCountPatch,
} from '../components/form/StocktakeProductEntryTable';
import { StocktakeFormFooter } from '../components/form/StocktakeFormFooter';
import { fetchLotsForProduct } from '../utils/stocktakeLotExpand';
import {
  buildCountUnitOptionsFromBatch,
  mergeProductUnitOptions,
} from '../utils/stocktakeCountUnit';
import { productApi } from '../../product/api/productApi';

interface LocationState {
  preselectedBatches?: Array<BatchItem & { confirmQty?: number }>;
  branchId?: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ Store Owner duyệt',
  APPROVED: 'Đã duyệt kiểm kê',
  REJECTED: 'Đã từ chối',
  NEEDS_RECOUNT: 'Yêu cầu kiểm kê lại',
};

const lineActualQty = (l: UpsertStocktakeLineInput) =>
  l.goodQty + l.defectiveQty + l.damagedQty + l.expiredQty;

const lineKey = (l: UpsertStocktakeLineInput) =>
  l.branchStockId || `${l.productId}_${l.batchCode || ''}`;

const applyCount = (
  line: UpsertStocktakeLineInput,
  patch: StocktakeCountPatch
): UpsertStocktakeLineInput => {
  let actual = patch.actualQty ?? lineActualQty(line);
  let expired = patch.expiredQty ?? line.expiredQty;
  let damaged = patch.damagedQty ?? line.damagedQty;

  actual = Math.max(0, actual);
  expired = Math.max(0, expired);
  damaged = Math.max(0, damaged);
  if (expired + damaged > actual) {
    if (patch.actualQty !== undefined) actual = expired + damaged;
    else if (patch.expiredQty !== undefined) expired = Math.max(0, actual - damaged);
    else damaged = Math.max(0, actual - expired);
  }

  const evidenceUrl =
    patch.evidenceUrl !== undefined ? patch.evidenceUrl : line.evidenceUrl;

  return {
    ...line,
    goodQty: Math.max(0, actual - expired - damaged),
    expiredQty: expired,
    damagedQty: damaged,
    defectiveQty: 0,
    nearExpiryQty: 0,
    nearExpiryAction: null,
    defectiveReasonCode: null,
    defectiveReasonDetail: null,
    evidenceUrl: evidenceUrl ?? null,
  };
};

const mapBatchToLine = (
  b: BatchItem & { confirmQty?: number }
): UpsertStocktakeLineInput => {
  const isExpired = b.status === 'Expired';
  const confirmed =
    typeof b.confirmQty === 'number' && b.confirmQty >= 0 ? b.confirmQty : b.qtyCurrent;
  const countOpts = buildCountUnitOptionsFromBatch(b);
  const stockUnit = countOpts[0]?.name || b.stockUnit || b.unit || 'Cái';
  const purchaseUnit = (b.unit || stockUnit).trim() || stockUnit;
  const purchaseRate =
    Number(b.purchaseToStockRate) > 0 ? Number(b.purchaseToStockRate) : 1;
  // Mặc định nhập theo ĐVT tồn (base). User có thể đổi sang thùng/hộp trên từng dòng.
  const defaultCount = countOpts[0];
  return {
    branchStockId: b.id,
    productId: b.productId,
    sku: b.sku,
    productName: b.productName,
    unit: defaultCount?.name || stockUnit,
    stockUnit,
    purchaseUnit,
    purchaseToStockRate: purchaseRate,
    countUnit: defaultCount?.name || stockUnit,
    countToStockRate: defaultCount?.toStockRate || 1,
    countUnitOptions: countOpts,
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

const formatBranchLabel = (code?: string | null, name?: string | null) =>
  `${code || ''} — ${name || ''}`.replace(/^ — /, '').replace(/ — $/, '').trim();

export const StocktakeFormPage: FC<{ defaultRole?: 'store_owner' | 'employee' }> = ({
  defaultRole = 'store_owner',
}) => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as LocationState | null) || null;

  const user = useAuthStore((s) => s.user);
  const userRole = user?.role;
  const userBranchId = user?.branchId || '';
  const isStoreOwner =
    defaultRole === 'store_owner' ||
    userRole === 'STORE_OWNER' ||
    userRole === 'ADMIN';
  const canPickBranch = isStoreOwner && !isEditMode;
  const basePath = defaultRole === 'employee' ? '/employee/stocktakes' : '/store-owner/stocktakes';

  const [branches, setBranches] = useState<StocktakeBranchOption[]>([]);
  const [branchId, setBranchId] = useState<string>(userBranchId || locState?.branchId || '');
  const [stocktakeCode, setStocktakeCode] = useState<string>('');
  const [createdByName, setCreatedByName] = useState<string>(
    user?.fullName || (isStoreOwner ? 'Chủ cửa hàng' : 'Nhân viên')
  );
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());
  const [status, setStatus] = useState<string>('DRAFT');
  const [note, setNote] = useState<string>('');
  const [lines, setLines] = useState<UpsertStocktakeLineInput[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'error') => {
      setToast({ id: Date.now().toString(), message, type });
      setTimeout(() => setToast(null), 4500);
    },
    []
  );

  const extractErrorMessage = (err: unknown, fallback: string) => {
    const e = err as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    const apiMsg = e.response?.data?.message || e.response?.data?.error;
    if (apiMsg) return apiMsg;
    if (e.message && !/^Request failed with status code \d+$/i.test(e.message)) {
      return e.message;
    }
    return fallback;
  };

  // Resolve branch list (Owner chọn CN; Employee dùng CN tài khoản)
  useEffect(() => {
    if (isEditMode) return;
    let mounted = true;
    branchApi
      .getBranches({ status: 'active', pageIndex: 1, pageSize: 100 })
      .then((res) => {
        if (!mounted) return;
        const list = (res.items || []).map((b) => ({
          id: b.id,
          label: formatBranchLabel(b.code, b.name) || b.name,
        }));
        setBranches(list);

        const preferred = userBranchId || locState?.branchId || '';
        const preferredOk = preferred && list.some((b) => b.id === preferred) ? preferred : '';
        const resolved = preferredOk || (isStoreOwner ? list[0]?.id || '' : '');

        if (!resolved) {
          setErrorMsg(
            isStoreOwner
              ? 'Chưa có chi nhánh nào trong hệ thống — hãy tạo chi nhánh trước.'
              : 'Tài khoản chưa được gán chi nhánh — không thể lập phiếu kiểm kê.'
          );
          return;
        }
        setBranchId(resolved);

        // Deep-link từ Batches: prefill các lô đã chọn — không load toàn bộ tồn
        const preselected = locState?.preselectedBatches;
        if (preselected?.length) {
          setLines(preselected.map(mapBatchToLine));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setErrorMsg('Không thể tải danh sách chi nhánh.');
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Edit mode
  useEffect(() => {
    if (!id) return;
    setIsLoadingEdit(true);
    stocktakeApi
      .getById(id)
      .then((detail) => {
        setBranchId(detail.branchId);
        setBranches((prev) => {
          if (prev.some((b) => b.id === detail.branchId)) return prev;
          const label =
            formatBranchLabel(detail.branchCode, detail.branchName) || detail.branchName;
          return [...prev, { id: detail.branchId, label }];
        });
        setStocktakeCode(detail.code || '');
        setCreatedByName(
          detail.createdByName || user?.fullName || (isStoreOwner ? 'Chủ cửa hàng' : 'Nhân viên')
        );
        setCreatedAt(detail.createdAt || new Date().toISOString());
        setStatus(detail.status);
        setNote(detail.note || '');
        setLines(
          sortLinesByProduct(
            detail.lines.map((l) => ({
              branchStockId: l.branchStockId,
              productId: l.productId,
              sku: l.sku,
              productName: l.productName,
              unit: l.unit,
              stockUnit: l.unit,
              purchaseUnit: l.unit,
              purchaseToStockRate: 1,
              countUnit: l.unit,
              countToStockRate: 1,
              countUnitOptions: [{ name: l.unit || 'Cái', toStockRate: 1 }],
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
              defectiveQty: 0,
              damagedQty: l.damagedQty + (l.defectiveQty || 0),
              nearExpiryQty: 0,
              expiredQty: l.expiredQty,
              defectiveReasonCode: null,
              defectiveReasonDetail: null,
              nearExpiryAction: null,
              discountPercent: l.discountPercent || null,
              evidenceUrl: l.evidenceUrl || null,
              note: l.note || null,
            }))
          )
        );
        void enrichCountUnitsFromProduct(detail.lines.map((l) => l.productId));
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : 'Không thể tải phiếu kiểm kê để chỉnh sửa.';
        showToast(msg, 'error');
      })
      .finally(() => setIsLoadingEdit(false));
    // enrichCountUnitsFromProduct ổn định (useCallback [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, showToast, user?.fullName, isStoreOwner]);

  const sortLinesByProduct = (list: UpsertStocktakeLineInput[]) =>
    [...list].sort((a, b) => {
      const c = (a.sku || '').localeCompare(b.sku || '');
      if (c !== 0) return c;
      return (a.batchCode || '').localeCompare(b.batchCode || '');
    });

  const enrichCountUnitsFromProduct = useCallback(async (productIds: string[]) => {
    const unique = [...new Set(productIds.filter(Boolean))];
    if (unique.length === 0) return;
    await Promise.all(
      unique.map(async (productId) => {
        try {
          const units = await productApi.getProductUnits(productId);
          if (!units.length) return;
          setLines((prev) =>
            prev.map((line) => {
              if (line.productId !== productId) return line;
              const merged = mergeProductUnitOptions(line.countUnitOptions || [], units);
              return { ...line, countUnitOptions: merged };
            })
          );
        } catch {
          // ignore — vẫn dùng stock/purchase từ lô
        }
      })
    );
  }, []);

  const addBatchesToLines = useCallback(
    (batches: BatchItem[], toastOk = true) => {
      const withStock = batches.filter((b) => b.qtyCurrent > 0);
      if (withStock.length === 0) {
        showToast('Không có lô tồn kho (số lượng > 0) phù hợp để thêm.', 'warning');
        return;
      }
      setLines((prev) => {
        const existing = new Set(prev.map(lineKey));
        const mapped = withStock.map(mapBatchToLine).filter((m) => !existing.has(lineKey(m)));
        if (mapped.length === 0) {
          showToast('Sản phẩm này đã có đủ lô trên phiếu kiểm kê.', 'warning');
          return prev;
        }
        const productCount = new Set(mapped.map((m) => m.productId)).size;
        if (toastOk) {
          showToast(
            productCount === 1
              ? `Đã thêm ${mapped.length} lô của "${mapped[0].productName}".`
              : `Đã thêm ${mapped.length} lô từ ${productCount} sản phẩm.`,
            'success'
          );
        }
        void enrichCountUnitsFromProduct(mapped.map((m) => m.productId));
        return sortLinesByProduct([...prev, ...mapped]);
      });
    },
    [showToast, enrichCountUnitsFromProduct]
  );

  const handleCountUnitChange = (idx: number, unitName: string, toStockRate: number) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === idx
          ? {
              ...line,
              unit: unitName,
              countUnit: unitName,
              countToStockRate: toStockRate > 0 ? toStockRate : 1,
            }
          : line
      )
    );
  };

  const handleQuickSearch = async () => {
    if (!branchId) {
      showToast(
        isStoreOwner
          ? 'Vui lòng chọn chi nhánh trước.'
          : 'Tài khoản chưa được gán chi nhánh.',
        'warning'
      );
      return;
    }
    const kw = searchKeyword.trim();
    if (!kw) {
      showToast('Nhập SKU hoặc tên sản phẩm để thêm vào phiếu.', 'warning');
      return;
    }

    setIsSearching(true);
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
      const matched = (res.items || []).filter((b) => b.qtyCurrent > 0);
      if (matched.length === 0) {
        showToast(`Không tìm thấy tồn kho khớp "${kw}".`, 'warning');
        return;
      }

      const kwLower = kw.toLowerCase();
      const exactSku = matched.filter((b) => b.sku.toLowerCase() === kwLower);
      const seed = exactSku.length > 0 ? exactSku : matched;
      // Chọn theo sản phẩm: expand mọi lô tồn của từng productId khớp
      const productMap = new Map<string, BatchItem>();
      for (const b of seed) {
        if (!productMap.has(b.productId)) productMap.set(b.productId, b);
      }

      const allLots: BatchItem[] = [];
      for (const [, sample] of productMap) {
        const lots = await fetchLotsForProduct(branchId, sample.productId, sample.sku);
        allLots.push(...lots);
      }

      if (allLots.length === 0) {
        showToast(`Không tìm thấy lô tồn kho cho "${kw}".`, 'warning');
        return;
      }
      addBatchesToLines(allLots);
      setSearchKeyword('');
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Không thể tìm sản phẩm trong tồn kho.'), 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCountChange = (idx: number, patch: StocktakeCountPatch) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? applyCount(line, patch) : line)));
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEvidenceUpload = async (idx: number, file: File | null) => {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const url = await uploadImageToCloudinary(file, 'mtgrms/stocktakes');
      handleCountChange(idx, { evidenceUrl: url });
      showToast('Đã tải ảnh minh chứng lên thành công.', 'success');
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Không thể tải ảnh minh chứng.'), 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleBranchChange = (nextBranchId: string) => {
    if (nextBranchId === branchId) return;
    setBranchId(nextBranchId);
    setLines([]);
    setSearchKeyword('');
  };

  const handleSave = async (submitImmediately: boolean) => {
    if (!branchId) {
      showToast(
        isStoreOwner
          ? 'Vui lòng chọn chi nhánh để lập phiếu kiểm kê.'
          : 'Tài khoản chưa được gán chi nhánh — không thể lưu phiếu kiểm kê.',
        'error'
      );
      return;
    }
    if (lines.length === 0) {
      showToast('Phiếu kiểm kê phải có ít nhất 1 dòng hàng hóa. Hãy tìm và thêm sản phẩm.', 'error');
      return;
    }

    // Chỉ đưa vào phiếu các lô có hư hỏng hoặc hết hạn.
    const abnormalLines = lines.filter((l) => l.damagedQty > 0 || l.expiredQty > 0);
    if (abnormalLines.length === 0) {
      showToast(
        'Chỉ lưu các lô có số lượng hư hỏng hoặc hết hạn. Hãy nhập hư hỏng/hết hạn trước khi lưu.',
        'error'
      );
      return;
    }

    const skipped = lines.length - abnormalLines.length;
    if (skipped > 0) {
      showToast(
        `Đã bỏ ${skipped} lô không có hư hỏng/hết hạn khỏi phiếu kiểm kê.`,
        'warning'
      );
    }

    for (const l of abnormalLines) {
      const actual = lineActualQty(l);
      if (l.expiredQty + l.damagedQty > actual) {
        showToast(
          `Dòng "${l.productName}": hết hạn + hư hỏng không được lớn hơn số lượng thực tế.`,
          'error'
        );
        return;
      }
      if (!l.evidenceUrl) {
        showToast(
          `Dòng "${l.productName}": cần ảnh minh chứng khi có số lượng hết hạn hoặc hư hỏng.`,
          'error'
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        branchId,
        scopeType: 'SELECTED_ITEMS',
        scopeReference: null,
        note: note.trim() || null,
        submitImmediately,
        createdByName: createdByName || user?.fullName || null,
        lines: abnormalLines.map((l) => applyCount(l, {})),
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
      showToast(extractErrorMessage(err, 'Lỗi khi lưu phiếu kiểm kê hàng hóa.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const createdAtLabel = (() => {
    try {
      return new Date(createdAt).toLocaleString('vi-VN');
    } catch {
      return createdAt;
    }
  })();

  const existingProductIds = new Set(lines.map((l) => l.productId));

  if (isLoadingEdit) {
    return (
      <div
        style={{
          padding: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#64748b',
        }}
      >
        <Loader2 size={20} className="animate-spin" color="#0d9488" />
        Đang tải phiếu kiểm kê…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px 24px 24px',
        backgroundColor: '#f8fafc',
        height: 'calc(100vh - 60px)',
        maxHeight: 'calc(100vh - 60px)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <StocktakeAddProductModal
        isOpen={addProductOpen}
        branchId={branchId}
        existingProductIds={existingProductIds}
        onClose={() => setAddProductOpen(false)}
        onAdd={(batches) => addBatchesToLines(batches)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => navigate(basePath)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Quay lại danh sách phiếu kiểm kê"
        >
          <ArrowLeft size={16} />
        </button>

        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ClipboardCheck size={20} color="#0d9488" />
            <span>
              {isEditMode
                ? `Cập nhật phiếu kiểm kê ${stocktakeCode || ''}`.trim()
                : 'Lập phiếu kiểm kê hàng hóa'}
            </span>
            {(isSaving || isSearching) && (
              <Loader2 size={16} className="animate-spin" color="#0d9488" />
            )}
          </h1>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <StocktakeFormHeaderCard
            stocktakeCode={stocktakeCode}
            branchId={branchId}
            branches={branches}
            createdBy={createdByName}
            createdAtLabel={createdAtLabel}
            statusLabel={STATUS_LABELS[status] || status}
            canPickBranch={canPickBranch}
            disabled={isSaving}
            onBranchChange={handleBranchChange}
          />

          <StocktakeProductEntryTable
            lines={lines}
            branchId={branchId}
            isSearching={isSearching}
            uploadingIdx={uploadingIdx}
            searchKeyword={searchKeyword}
            onSearchKeywordChange={setSearchKeyword}
            onQuickSearch={() => void handleQuickSearch()}
            onOpenFindModal={() => {
              if (!branchId) {
                showToast('Vui lòng chọn chi nhánh trước.', 'warning');
                return;
              }
              setAddProductOpen(true);
            }}
            onCountChange={handleCountChange}
            onCountUnitChange={handleCountUnitChange}
            onRemoveLine={handleRemoveLine}
            onEvidenceUpload={(idx, file) => void handleEvidenceUpload(idx, file)}
            onAlert={(msg) => showToast(msg, 'warning')}
            lineActualQty={lineActualQty}
          />
        </div>

        <StocktakeFormFooter
          notes={note}
          isSaving={isSaving}
          disabled={!branchId}
          onNotesChange={setNote}
          onCancel={() => navigate(basePath)}
          onSaveDraft={() => void handleSave(false)}
          onSubmit={() => void handleSave(true)}
        />
      </div>
    </div>
  );
};

export default StocktakeFormPage;
