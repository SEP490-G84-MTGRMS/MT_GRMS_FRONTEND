import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Upload,
  Trash2,
  AlertTriangle,
  User,
  Check,
  Save,
} from 'lucide-react';
import type { TransferItem, BatchItem, Branch, TransferOrder } from '../types';
import { getTransferErrorMessage, transferService } from '../services/transferService';
import { formatDateTimeVN, formatDateVN, isBatchExpired, parseUtcDate } from '../utils/transferDate';
import { SelectBatchModal } from '../components/SelectBatchModal';
import { ImportTransferExcelModal } from '../components/ImportTransferExcelModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../transfer.css';

const pickDefaultFefoBatch = (batches?: BatchItem[]): BatchItem | undefined => {
  if (!batches?.length) return undefined;
  const valid = batches.filter((b) => !b.isExpired && !isBatchExpired(b.expiryDate) && b.onHand > 0);
  if (!valid.length) return undefined;
  return [...valid].sort((a, b) => {
    const timeA = parseUtcDate(a.expiryDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const timeB = parseUtcDate(b.expiryDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  })[0];
};

const getItemMaxAvailable = (item: TransferItem): number => {
  if (item.batchNumber && item.batches?.length) {
    const matched = item.batches.find(
      (b) => b.batchNumber.trim().toLowerCase() === item.batchNumber?.trim().toLowerCase()
    );
    if (matched) return matched.onHand;
  }
  return item.onHandSender;
};

export const CreateTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const transferBasePath = window.location.pathname.startsWith('/employee') ? '/employee/transfers' : '/store-owner/transfers';

  const duplicateFrom = (location.state as { duplicateFrom?: TransferOrder } | null)?.duplicateFrom ?? null;
  const pendingDuplicateRef = useRef<TransferOrder | null>(duplicateFrom);

  // Branch Selection
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<TransferItem[]>([]);
  const [receiverStockMap, setReceiverStockMap] = useState<Record<string, number>>({});
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [note, setNote] = useState('');

  // Items in current transfer order
  const [items, setItems] = useState<TransferItem[]>([]);

  // Product Search to add
  const [searchKw, setSearchKw] = useState('');
  const [batchModalItem, setBatchModalItem] = useState<TransferItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    transferService
      .branches()
      .then((result) => {
        setBranches(result);
        const dup = pendingDuplicateRef.current;
        if (dup) {
          const validFrom = result.find((b) => b.id === dup.fromBranchId)?.id ?? result[0]?.id ?? '';
          const validTo =
            result.find((b) => b.id === dup.toBranchId && b.id !== validFrom)?.id ??
            result.find((b) => b.id !== validFrom)?.id ??
            '';
          setFromBranchId(validFrom);
          setToBranchId(validTo);
          if (dup.note) setNote(dup.note);
          return;
        }
        if (result.length > 0) setFromBranchId(result[0].id);
        if (result.length > 1) setToBranchId(result[1].id);
      })
      .catch((error: unknown) => showToast(getTransferErrorMessage(error), 'warning'));
  }, []);

  // Guard: never let fromBranchId === toBranchId (prevents 2-branch deadlock)
  useEffect(() => {
    if (!branches.length || !fromBranchId) return;
    if (!toBranchId || toBranchId === fromBranchId) {
      const alternative = branches.find((b) => b.id !== fromBranchId);
      setToBranchId(alternative?.id ?? '');
    }
  }, [branches, fromBranchId, toBranchId]);

  // Load sender branch products & batches
  useEffect(() => {
    if (!fromBranchId) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    Promise.all([
      transferService.products(fromBranchId),
      transferService.batches(fromBranchId).catch(() => []),
    ])
      .then(([loadedProducts, loadedBatches]) => {
        if (cancelled) return;
        const enrichedProducts = loadedProducts.map((product): TransferItem => {
          const ownBatches = loadedBatches
            .filter((batch) => batch.productId === product.productId)
            .map((batch): BatchItem => ({
              id: batch.id,
              batchNumber: batch.batchNumber,
              expiryDate: batch.expiryDate,
              onHand: batch.onHand,
              isExpired: Boolean(batch.isExpired || isBatchExpired(batch.expiryDate)),
            }));
          const mergedBatches = ownBatches.length > 0 ? ownBatches : (product.batches ?? []);
          const hasBatch = Boolean(product.hasBatchManagement || mergedBatches.some((b) => Boolean(b.batchNumber)));
          return {
            ...product,
            hasBatchManagement: hasBatch,
            batches: mergedBatches,
          };
        });

        setProducts(enrichedProducts);

        // Hydrate duplicated transfer items if coming from "Sao chép"
        const dup = pendingDuplicateRef.current;
        if (dup) {
          pendingDuplicateRef.current = null;
          const copiedItems: TransferItem[] = [];
          const skipped: string[] = [];

          for (const sourceLine of dup.items) {
            const product = enrichedProducts.find((p) => p.productId === sourceLine.productId);
            if (!product || product.onHandSender <= 0) {
              skipped.push(sourceLine.productName || sourceLine.productCode);
              continue;
            }

            let chosenBatch: BatchItem | undefined;
            if (product.hasBatchManagement || product.batches?.length) {
              chosenBatch =
                product.batches?.find(
                  (b) =>
                    sourceLine.batchNumber &&
                    b.batchNumber.toLowerCase() === sourceLine.batchNumber.toLowerCase() &&
                    !b.isExpired &&
                    b.onHand > 0
                ) ?? pickDefaultFefoBatch(product.batches);

              if (!chosenBatch) {
                skipped.push(`${sourceLine.productName || sourceLine.productCode} (không có lô hợp lệ)`);
                continue;
              }
            }

            const maxAvail = chosenBatch ? chosenBatch.onHand : product.onHandSender;
            const qty = Math.min(sourceLine.sentQty, maxAvail);
            if (qty <= 0) {
              skipped.push(sourceLine.productName || sourceLine.productCode);
              continue;
            }

            copiedItems.push({
              ...product,
              batchNumber: chosenBatch?.batchNumber,
              expiryDate: chosenBatch?.expiryDate,
              sentQty: qty,
              amount: qty * product.unitPrice,
            });
          }

          setItems(copiedItems);
          if (skipped.length > 0) {
            showToast(
              `Đã sao chép ${copiedItems.length} mặt hàng. Bỏ qua do hết tồn/lô hết hạn: ${skipped.join(', ')}`,
              'warning'
            );
          } else if (copiedItems.length > 0) {
            showToast(`Đã sao chép ${copiedItems.length} mặt hàng từ phiếu ${dup.transferCode}.`);
          }
        } else {
          // Ensure existing items get enriched with batches & default FEFO batch if missing
          setItems((current) =>
            current.map((item) => {
              const matched = enrichedProducts.find((p) => p.productId === item.productId);
              if (!matched) return item;
              const batches = matched.batches ?? [];
              const hasBatch = Boolean(matched.hasBatchManagement || batches.some((b) => Boolean(b.batchNumber)));
              const defaultBatch = !item.batchNumber && hasBatch ? pickDefaultFefoBatch(batches) : undefined;
              return {
                ...item,
                hasBatchManagement: hasBatch,
                batches,
                batchNumber: item.batchNumber || defaultBatch?.batchNumber,
                expiryDate: item.expiryDate || defaultBatch?.expiryDate,
              };
            })
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) showToast(getTransferErrorMessage(error), 'warning');
      });

    return () => {
      cancelled = true;
    };
  }, [fromBranchId]);

  // BUG-041 (FE): Load REAL stock of receiver branch (toBranchId)
  useEffect(() => {
    if (!toBranchId) {
      setReceiverStockMap({});
      return;
    }

    let cancelled = false;
    transferService
      .products(toBranchId)
      .then((receiverProducts) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const prod of receiverProducts) {
          map[prod.productId] = prod.onHandSender;
        }
        setReceiverStockMap(map);
      })
      .catch(() => {
        if (!cancelled) setReceiverStockMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [toBranchId]);

  // Filter available products to add (inject live receiver stock)
  const searchResults = products
    .filter(
      (p) =>
        p.productName.toLowerCase().includes(searchKw.trim().toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchKw.trim().toLowerCase())
    )
    .map((p) => ({
      ...p,
      onHandReceiver: receiverStockMap[p.productId] ?? 0,
    }));

  const handleAddItem = (prod: TransferItem) => {
    if (prod.onHandSender <= 0) {
      showToast(`Sản phẩm "${prod.productName}" đã hết tồn kho tại chi nhánh gửi.`, 'warning');
      return;
    }
    if (items.some((it) => it.productId === prod.productId)) {
      showToast(`Sản phẩm "${prod.productName}" đã có trong danh sách!`, 'warning');
      return;
    }

    const needsBatch = Boolean(prod.hasBatchManagement || prod.batches?.length);
    let selectedBatch: BatchItem | undefined;
    if (needsBatch) {
      selectedBatch = pickDefaultFefoBatch(prod.batches);
      if (!selectedBatch) {
        showToast(`Sản phẩm "${prod.productName}" không còn lô hàng hợp lệ (chưa hết hạn) để chuyển.`, 'warning');
        return;
      }
    }

    const maxAvail = selectedBatch ? selectedBatch.onHand : prod.onHandSender;
    const initialQty = Math.min(1, maxAvail);
    const newItem: TransferItem = {
      ...prod,
      onHandReceiver: receiverStockMap[prod.productId] ?? 0,
      batchNumber: selectedBatch?.batchNumber,
      expiryDate: selectedBatch?.expiryDate,
      sentQty: initialQty,
      amount: initialQty * prod.unitPrice,
    };
    setItems((current) => [...current, newItem]);
    setSearchKw('');
    showToast(`Đã thêm "${prod.productName}" vào phiếu chuyển.`);
  };

  const handleUpdateQty = (id: string, qty: number) => {
    const item = items.find((line) => line.id === id);
    if (!item) return;
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Số lượng chuyển phải lớn hơn 0.', 'warning');
      return;
    }
    const maxAvailable = getItemMaxAvailable(item);
    if (qty > maxAvailable) {
      showToast('Số lượng chuyển vượt tồn khả dụng.', 'warning');
      return;
    }
    setItems((current) =>
      current.map((it) =>
        it.id === id ? { ...it, sentQty: qty, amount: qty * it.unitPrice } : it
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((current) => current.filter((it) => it.id !== id));
  };

  const handleSelectBatch = (batch: BatchItem, qty: number) => {
    if (!batchModalItem) return;
    if (batch.isExpired || isBatchExpired(batch.expiryDate)) {
      showToast('Không thể chọn lô hàng đã hết hạn sử dụng.', 'warning');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Số lượng chuyển phải lớn hơn 0.', 'warning');
      return;
    }
    if (qty > batch.onHand) {
      showToast('Số lượng vượt tồn của lô đã chọn.', 'warning');
      return;
    }
    setItems((current) =>
      current.map((it) =>
        it.id === batchModalItem.id
          ? {
              ...it,
              batchNumber: batch.batchNumber,
              expiryDate: batch.expiryDate,
              sentQty: qty,
              amount: qty * it.unitPrice,
            }
          : it
      )
    );
    showToast(
      `Đã chọn lô ${batch.batchNumber} (HSD: ${formatDateVN(batch.expiryDate, 'Không HSD')}) cho ${batchModalItem.productName}.`
    );
  };

  const handleChangeFromBranch = (nextFrom: string) => {
    setFromBranchId(nextFrom);
    setItems([]);
    if (nextFrom === toBranchId) {
      const alternative = branches.find((b) => b.id !== nextFrom);
      setToBranchId(alternative?.id ?? '');
    }
  };

  const totalQty = items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);

  const handleSubmit = async (status: 'Draft' | 'Pending') => {
    if (items.length === 0) {
      showToast('Vui lòng thêm ít nhất một mặt hàng để tạo phiếu chuyển!', 'warning');
      return;
    }
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) {
      showToast('Chi nhánh gửi và chi nhánh nhận không được trùng nhau!', 'warning');
      return;
    }

    for (const item of items) {
      if (!Number.isFinite(item.sentQty) || item.sentQty <= 0) {
        showToast(`Số lượng chuyển của "${item.productName}" phải lớn hơn 0.`, 'warning');
        return;
      }
      const maxAvailable = getItemMaxAvailable(item);
      if (item.sentQty > maxAvailable) {
        showToast(`Số lượng chuyển của "${item.productName}" vượt tồn khả dụng (${maxAvailable}).`, 'warning');
        return;
      }
      if ((item.hasBatchManagement || Boolean(item.batches?.length)) && !item.batchNumber) {
        showToast(`Vui lòng chọn lô hàng cho "${item.productName}".`, 'warning');
        return;
      }
      if (item.expiryDate && isBatchExpired(item.expiryDate)) {
        showToast(`Lô hàng của "${item.productName}" đã hết hạn sử dụng.`, 'warning');
        return;
      }
    }

    setIsSaving(true);
    try {
      await transferService.create({
        fromBranchId,
        toBranchId,
        note,
        items,
        submitImmediately: status === 'Pending',
      });
      showToast(status === 'Draft' ? 'Đã lưu phiếu nháp.' : 'Đã gửi phiếu đến chi nhánh nguồn.');
      setTimeout(() => navigate(transferBasePath), 500);
    } catch (error) {
      showToast(getTransferErrorMessage(error), 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="transfer-container transfer-create-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: 24,
          border: '1px solid #edf2f9',
          boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Trái: Link quay lại + Ô tìm kiếm hàng hóa + Nút thêm từ Excel */}
        <div className="transfer-create-header-left">
          <button
            type="button"
            onClick={() => navigate(transferBasePath)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#0F766E',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ArrowLeft size={16} /> Chuyển hàng
          </button>

          {/* Ô tìm kiếm */}
          <div className="transfer-create-search-box">
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: 36, borderRadius: 9999, boxSizing: 'border-box' }}
              placeholder="Tìm hàng hóa theo mã hoặc tên (F3)..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />

            {/* Dropdown gợi ý sản phẩm */}
            {searchKw.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: '#ffffff',
                  borderRadius: 14,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  zIndex: 30,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((p) => {
                  const isOutOfStock = p.onHandSender <= 0;
                  return (
                    <div
                      key={p.productId}
                      onClick={() => handleAddItem(p)}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        opacity: isOutOfStock ? 0.6 : 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (!isOutOfStock) e.currentTarget.style.backgroundColor = '#f0fdfa';
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>[{p.productCode}] {p.productName}</span>
                          {isOutOfStock && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#dc2626',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 9999,
                                padding: '1px 7px',
                              }}
                            >
                              Hết hàng
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                          Tồn gửi: <b>{p.onHandSender}</b> {p.unitName} &bull; Tồn nhận: <b>{p.onHandReceiver}</b>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0F766E', fontSize: 13 }}>
                        {p.unitPrice.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  );
                })}
                {searchResults.length === 0 && (
                  <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Không tìm thấy sản phẩm phù hợp.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thêm từ Excel */}
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => setIsImportModalOpen(true)}
            style={{ padding: '6px 14px', borderRadius: 9999, whiteSpace: 'nowrap' }}
          >
            <Upload size={14} style={{ color: '#0284c7' }} /> Thêm từ Excel
          </button>
        </div>

        {/* Phải: Người tạo & Ngày giờ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1e293b' }}>
            <User size={16} color="#0F766E" />
            <span>{user?.fullName || user?.email || 'Chủ cửa hàng'}</span>
          </div>
          <span>{formatDateTimeVN(new Date())}</span>
        </div>
      </div>

      {/* Main 2-column Layout */}
      <div className="transfer-create-layout">
        {/* CỘT TRÁI: Bảng hàng hóa chuyển */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            minWidth: 0,
          }}
        >
          {/* Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <Trash2 size={14} style={{ opacity: 0.6 }} />
                  </th>
                  <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 110 }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th style={{ width: 60, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Tồn kho</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Tồn kho nhận</th>
                  <th style={{ width: 100, textAlign: 'center' }}>SL chuyển</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Giá chuyển</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const maxAvailable = getItemMaxAvailable(it);
                  const receiverStock = receiverStockMap[it.productId] ?? it.onHandReceiver ?? 0;
                  return (
                    <tr key={it.id}>
                      {/* Xóa */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: 4,
                          }}
                          title="Xóa hàng khỏi phiếu"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>

                      {/* STT */}
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>

                      {/* Mã hàng link */}
                      <td>
                        <span className="transfer-link">{it.productCode}</span>
                      </td>

                      {/* Tên hàng + Lô */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>

                        {/* Thông tin Lô & Link chọn lô khác */}
                        {(it.hasBatchManagement || Boolean(it.batches?.length)) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            {it.batchNumber ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                }}
                              >
                                {it.batchNumber} - HSD: {formatDateVN(it.expiryDate, 'Không HSD')} (SL: {it.sentQty})
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 11,
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                }}
                              >
                                Chưa chọn lô
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setBatchModalItem(it)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0F766E',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              [+ Chọn lô khác]
                            </button>
                          </div>
                        )}
                      </td>

                      {/* ĐVT */}
                      <td style={{ textAlign: 'center' }}>{it.unitName}</td>

                      {/* Tồn kho gửi */}
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.onHandSender}</td>

                      {/* Tồn kho nhận */}
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{receiverStock}</td>

                      {/* Ô nhập SL chuyển */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="filter-input"
                          style={{ width: 65, textAlign: 'center', padding: '4px', borderRadius: 6 }}
                          value={it.sentQty}
                          onChange={(e) => handleUpdateQty(it.id, Number(e.target.value))}
                          min={1}
                          max={maxAvailable}
                        />
                      </td>

                      {/* Giá chuyển */}
                      <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString('vi-VN')}</td>

                      {/* Thành tiền */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {it.amount.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Dòng tổng cộng */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={7} style={{ textAlign: 'right', padding: 12 }}>
                    Tổng cộng:
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 15, color: '#0f172a' }}>
                    {totalQty}
                  </td>
                  <td />
                  <td style={{ textAlign: 'right', fontSize: 15, color: '#0F766E' }}>
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Khung Hướng dẫn luân chuyển hàng hóa */}
          <div
            style={{
              padding: 16,
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              fontSize: 12.5,
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              Hướng dẫn luân chuyển hàng hóa
            </div>
            <div>&bull; <b>Hàng thông thường:</b> Tìm theo tên hoặc mã và nhập số lượng cần chuyển.</div>
            <div>&bull; <b>Hàng có Lô - Hạn sử dụng:</b> Hệ thống tự chọn lô FEFO còn hạn gần nhất; nhấn "Chọn lô khác" để đổi lô.</div>
            <div>&bull; <b>File Excel:</b> Nhấn "Thêm từ Excel" để tải hàng loạt mã sản phẩm và số lượng từ file dữ liệu mẫu.</div>
          </div>
        </div>

        {/* CỘT PHẢI: Thông tin phiếu chuyển & Hành động */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Kho chuyển đi */}
          <div className="filter-group-card" style={{ borderTop: 'none', paddingTop: 0 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Kho chuyển đi:
            </label>
            <select
              className="filter-select"
              value={fromBranchId}
              onChange={(e) => handleChangeFromBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mã chuyển hàng */}
          <div className="filter-group-card" style={{ paddingTop: 10 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Mã chuyển hàng:
            </label>
            <input
              type="text"
              className="filter-input"
              placeholder="Mã phiếu tự động"
              value="Tự động cấp khi lưu"
              readOnly
              style={{ backgroundColor: '#f8fafc' }}
            />
          </div>

          {/* Trạng thái */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Trạng thái:</span>
            <span style={{ fontWeight: 700, color: '#0F766E', fontSize: 13 }}>Phiếu tạm</span>
          </div>

          {/* Tổng số lượng */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Tổng số lượng:</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{totalQty}</span>
          </div>

          {/* Chuyển tới * */}
          <div className="filter-group-card" style={{ paddingTop: 10 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Chuyển tới *:
            </label>
            <select
              className="filter-select"
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
            >
              {branches.filter((b) => b.id !== fromBranchId).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú */}
          <div className="filter-group-card" style={{ paddingTop: 10 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Ghi chú:
            </label>
            <textarea
              className="filter-input"
              style={{ width: '100%', minHeight: 80, borderRadius: 12, resize: 'vertical' }}
              placeholder="Nhập ghi chú luân chuyển kho, lý do điều chuyển..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Cảnh báo khóa sổ */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              border: '1px solid #fee2e2',
              fontSize: 12,
              color: '#b91c1c',
              lineHeight: 1.5,
              display: 'flex',
              gap: 6,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>Lưu ý:</b> Hệ thống sẽ không cho phép tạo phiếu nếu ngày chuyển hàng nằm trong khoảng thời gian đã khóa sổ.
            </span>
          </div>

          {/* Hàng nút bấm Lưu tạm & Gửi phiếu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className="btn-secondary-white"
              disabled={isSaving}
              onClick={() => void handleSubmit('Draft')}
              style={{ justifyContent: 'center' }}
            >
              <Save size={15} /> Lưu tạm
            </button>

            <button
              type="button"
              className="btn-primary-teal"
              disabled={isSaving}
              onClick={() => void handleSubmit('Pending')}
              style={{ justifyContent: 'center' }}
            >
              <Check size={15} /> Gửi phiếu
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chọn Lô */}
      {batchModalItem && (
        <SelectBatchModal
          isOpen={Boolean(batchModalItem)}
          productName={batchModalItem.productName}
          batches={batchModalItem.batches || []}
          selectedBatchNumber={batchModalItem.batchNumber}
          onClose={() => setBatchModalItem(null)}
          onSelectBatch={handleSelectBatch}
        />
      )}

      {/* Modal Import Excel */}
      <ImportTransferExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmUpload={(rows) => {
          const missing: string[] = [];
          let addedCount = 0;

          const byProductId = new Map<string, TransferItem>(
            items.map((item) => [item.productId, { ...item }])
          );

          for (const row of rows) {
            const product = products.find(
              (candidate) => candidate.productCode.toLowerCase() === row.productCode.toLowerCase()
            );
            if (!product) {
              missing.push(row.productCode);
              continue;
            }
            if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
              missing.push(`${row.productCode} (SL <= 0)`);
              continue;
            }
            if (product.onHandSender <= 0) {
              missing.push(`${row.productCode} (hết hàng)`);
              continue;
            }

            const existing = byProductId.get(product.productId);
            if (existing) {
              const maxAvail = getItemMaxAvailable(existing);
              const nextQty = existing.sentQty + row.quantity;
              if (nextQty > maxAvail) {
                missing.push(`${row.productCode} (vượt tồn)`);
                continue;
              }
              byProductId.set(product.productId, {
                ...existing,
                sentQty: nextQty,
                amount: nextQty * existing.unitPrice,
              });
              addedCount++;
            } else {
              const needsBatch = Boolean(product.hasBatchManagement || product.batches?.length);
              const defaultBatch = needsBatch ? pickDefaultFefoBatch(product.batches) : undefined;
              if (needsBatch && !defaultBatch) {
                missing.push(`${row.productCode} (không có lô hợp lệ)`);
                continue;
              }
              const maxAvail = defaultBatch ? defaultBatch.onHand : product.onHandSender;
              if (row.quantity > maxAvail) {
                missing.push(`${row.productCode} (vượt tồn)`);
                continue;
              }
              byProductId.set(product.productId, {
                ...product,
                onHandReceiver: receiverStockMap[product.productId] ?? 0,
                batchNumber: defaultBatch?.batchNumber,
                expiryDate: defaultBatch?.expiryDate,
                sentQty: row.quantity,
                amount: row.quantity * product.unitPrice,
              });
              addedCount++;
            }
          }

          setItems(Array.from(byProductId.values()));

          showToast(
            missing.length
              ? `Đã nhập ${addedCount} dòng. Không hợp lệ: ${missing.join(', ')}`
              : `Đã thêm ${addedCount} dòng sản phẩm từ Excel.`,
            missing.length ? 'warning' : 'success'
          );
        }}
      />
    </div>
  );
};
