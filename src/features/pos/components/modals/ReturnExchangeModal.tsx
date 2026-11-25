import React, { useState } from 'react';
import type { InvoiceDTO } from '../../types/inventory.types';
import type { Product } from '../../types/pos.types';
import { PosProductSearchInput } from '../PosProductSearchInput';
import { ArrowLeftRight, RotateCcw, Plus, Trash2, AlertTriangle, AlertCircle, PackageCheck, Gift, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { httpClient } from '../../../../api/httpClient';

interface Props {
  isOpen: boolean;
  invoice: InvoiceDTO | null;
  availableProducts: Product[];
  currentDrawerCash?: number;
  isStoreOwner?: boolean;
  cashFundSource?: 'SHIFT' | 'SAFE';
  refundSourceLabel?: string;
  onClose: () => void;
  onConfirm: (data: {
    returnedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitName?: string;
      condition?: 'Restock' | 'Damaged';
      orderDetailId?: string;
      batchId?: string;
      isGift?: boolean;
    }>;
    newItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitName?: string;
      unitId?: string;
      conversionRate?: number;
      discountAmount?: number;
    }>;
    settlementMethod: string;
    reason?: string;
    note?: string;
    cashFundSource?: 'SHIFT' | 'SAFE';
  }) => Promise<void>;
}

export const RETURN_REASON_OPTIONS = [
  { value: 'DEFECTIVE', label: 'Lỗi do nhà sản xuất' },
  { value: 'WRONG_ITEM', label: 'Khách / Thu ngân chọn nhầm sản phẩm hoặc đơn vị tính' },
  { value: 'CHANGE_MIND', label: 'Khách đổi ý (chỉ áp dụng Đổi sang sản phẩm khác)' },
  { value: 'EXPIRED_NEAR_DATE', label: 'Sản phẩm cận hạn hoặc quá hạn sử dụng trên kệ' },
  { value: 'OTHER', label: 'Lý do khác (bắt buộc nhập ghi chú chi tiết bên dưới)' },
];

export const ReturnExchangeModal: React.FC<Props> = ({
  isOpen,
  invoice,
  availableProducts,
  currentDrawerCash,
  isStoreOwner = false,
  cashFundSource,
  refundSourceLabel,
  onClose,
  onConfirm,
}) => {
  // 1. Quản lý số lượng và tình trạng hàng trả cho từng món trong hóa đơn gốc
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnLotQtys, setReturnLotQtys] = useState<Record<string, number>>({});
  const [returnConditions, setReturnConditions] = useState<Record<string, 'Restock' | 'Damaged'>>({});

  const getAllocations = (item: NonNullable<InvoiceDTO['items']>[number]) =>
    item.stockAllocations || [];
  const [lotExpiryDates, setLotExpiryDates] = useState<Record<string, string>>({});

  // 2. Quản lý danh sách hàng khách lấy mới kèm đơn vị tính quy đổi
  const [newItems, setNewItems] = useState<
    Array<{
      product: Product;
      quantity: number;
      selectedUnitName: string;
      unitPrice: number;
      unitId?: string;
    }>
  >([]);

  // 3. Phương thức thanh toán bù / hoàn & Lý do đổi trả
  const [settlementMethod, setSettlementMethod] = useState<string>('CASH');
  const [returnReason, setReturnReason] = useState<string>('DEFECTIVE');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper đảm bảo sản phẩm luôn có danh sách đơn vị quy đổi
  const getEffectiveUnitPrices = (product: Product) => {
    if (product.unitPrices && product.unitPrices.length > 0) {
      return product.unitPrices;
    }
    const baseName = product.baseUnit || 'Cái';
    return [
      { unitId: `${product.id}-base`, unitName: baseName, conversionRate: 1, price: product.basePrice, isBaseUnit: true },
      { unitId: `${product.id}-pack`, unitName: `Thùng (x10 ${baseName})`, conversionRate: 10, price: product.basePrice * 10, isBaseUnit: false },
    ];
  };

  // Reset state khi mở modal với invoice mới
  React.useEffect(() => {
    if (isOpen && invoice) {
      setReturnQtys({});
      setReturnLotQtys({});
      setReturnConditions({});
      setNewItems([]);
      setSettlementMethod(invoice.paymentMethod === 'CREDIT' ? 'REDUCE_DEBT' : 'CASH');
      setReturnReason('DEFECTIVE');
      setNote('');
    }
  }, [isOpen, invoice]);

  React.useEffect(() => {
    if (!isOpen || !invoice?.branchId) {
      setLotExpiryDates({});
      return;
    }
    const soldLotIds = new Set(
      (invoice.items || []).flatMap((item) => (item.stockAllocations || []).map((a) => a.branchStockId))
    );
    if (soldLotIds.size === 0) return;
    let cancelled = false;
    httpClient.get('/batches', { params: { branchId: invoice.branchId, pageSize: 500 } })
      .then((response) => {
        if (cancelled) return;
        const raw = response.data?.data?.items ?? response.data?.data ?? response.data ?? [];
        const rows = Array.isArray(raw) ? raw : [];
        const next: Record<string, string> = {};
        for (const row of rows) {
          const id = row.batchId || row.branchStockId || row.id;
          if (id && soldLotIds.has(id) && row.expiryDate) next[id] = row.expiryDate;
        }
        setLotExpiryDates(next);
      })
      .catch(() => setLotExpiryDates({}));
    return () => { cancelled = true; };
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  // Nhận diện Hóa đơn có nguồn gốc từ Đơn đặt trước giữ kho
  const isPreOrderInvoice = Boolean(
    invoice.isPreOrder ||
    invoice.orderOrigin === 'PRE_ORDER' ||
    invoice.invoiceId.startsWith('PO-') ||
    invoice.invoiceId.startsWith('PRE-')
  );

  const getLineKey = (item: NonNullable<InvoiceDTO['items']>[number], idx: number) =>
    item.itemId || `${item.productId}_${item.isGift ? 'gift' : 'paid'}_${idx}`;

  // Tính tổng tiền hàng trả (dòng quà tặng khuyến mãi IsGift luôn hoàn 0 đ - REQ-ORD-BOGO-03)
  const totalReturnAmount = (invoice.items || []).reduce((sum, item, idx) => {
    const key = getLineKey(item, idx);
    const qty = returnQtys[key] || 0;
    const refundableUnit = item.isGift ? 0 : (item.actualPrice ?? item.unitPrice);
    return sum + qty * refundableUnit;
  }, 0);

  // Tính tổng tiền hàng đổi mới
  const totalNewAmount = newItems.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  // Chênh lệch Net Amount (> 0: khách bù thêm, < 0: shop hoàn lại)
  const netAmount = totalNewAmount - totalReturnAmount;
  const refundAmount = Math.max(0, -netAmount);
  const isCreditReturn = invoice.paymentMethod === 'CREDIT';

  // Kiểm tra két quầy có đủ tiền mặt để hoàn trả không (REQ-POS-RETURN-UNIT-CONVERSION-04)
  const isDrawerCashInsufficient =
    netAmount < 0 &&
    !isCreditReturn &&
    currentDrawerCash !== undefined &&
    refundAmount > currentDrawerCash;

  // Ràng buộc đơn đặt trước: Chỉ cho phép Đổi hàng (Exchange), chặn hoàn tiền mặt trừ khi lỗi NSX (REQ-POS-PREORDER-RETURN-EXCHANGE-RULES-03)
  const isPreOrderExchangeOnlyBlocked = false;

  const handleReturnQtyChange = (
    lineKey: string,
    maxQty: number,
    val: number,
    item?: NonNullable<InvoiceDTO['items']>[number]
  ) => {
    const validQty = Math.max(0, Math.min(maxQty, Math.floor(val || 0)));
    setReturnQtys((prev) => ({
      ...prev,
      [lineKey]: validQty,
    }));

    if (item) {
      const allocations = getAllocations(item);
      if (allocations.length === 1) {
        setReturnLotQtys((prev: Record<string, number>) => ({
          ...prev,
          [`${lineKey}:${allocations[0].branchStockId}`]: validQty,
        }));
      } else if (allocations.length > 1) {
        const conversionRate = allocations.reduce((sum: number, a: { quantityBase: number }) => sum + a.quantityBase, 0) / item.quantity;
        let remainingToAllocate = validQty;
        const newLotQtys: Record<string, number> = {};
        for (const a of allocations) {
          const maxLotQty = (a.quantityBase - a.returnedBase) / conversionRate;
          const allocQty = Math.min(remainingToAllocate, maxLotQty);
          newLotQtys[`${lineKey}:${a.branchStockId}`] = allocQty;
          remainingToAllocate -= allocQty;
        }
        setReturnLotQtys((prev: Record<string, number>) => ({
          ...prev,
          ...newLotQtys,
        }));
      }
    }

    // Mặc định tình trạng là Restock nếu chưa có
    if (validQty > 0 && !returnConditions[lineKey]) {
      setReturnConditions((prev) => ({
        ...prev,
        [lineKey]: 'Restock',
      }));
    }
  };

  const handleReturnLotQtyChange = (
    lineKey: string,
    branchStockId: string,
    maxQty: number,
    value: number,
    allocations: Array<{ branchStockId: string }>
  ) => {
    const lotKey = `${lineKey}:${branchStockId}`;
    const validQty = Math.max(0, Math.min(maxQty, Number(value) || 0));
    setReturnLotQtys((prev) => {
      const next = { ...prev, [lotKey]: validQty };
      const total = allocations.reduce(
        (sum, allocation) => sum + (next[`${lineKey}:${allocation.branchStockId}`] || 0),
        0
      );
      setReturnQtys((qtys) => ({ ...qtys, [lineKey]: total }));
      return next;
    });
    if (validQty > 0 && !returnConditions[lineKey]) {
      setReturnConditions((prev) => ({ ...prev, [lineKey]: 'Restock' }));
    }
  };

  const handleSelectNewProduct = (prod: Product) => {
    const units = getEffectiveUnitPrices(prod);
    const chosenUnit = units.find((u) => u.isBaseUnit) || units[0];
    const unitName = chosenUnit?.unitName || prod.baseUnit || 'Cái';
    const unitPrice = chosenUnit?.price ?? prod.basePrice;

    setNewItems((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id && i.selectedUnitName === unitName);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id && i.selectedUnitName === unitName
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          product: { ...prod, unitPrices: units },
          quantity: 1,
          selectedUnitName: unitName,
          unitPrice,
          unitId: chosenUnit?.unitId,
        },
      ];
    });
  };

  const handleRemoveNewItem = (productId: string, unitName: string) => {
    setNewItems((prev) => prev.filter((i) => !(i.product.id === productId && i.selectedUnitName === unitName)));
  };

  const handleUpdateNewItemQty = (productId: string, unitName: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveNewItem(productId, unitName);
      return;
    }
    setNewItems((prev) =>
      prev.map((i) => (i.product.id === productId && i.selectedUnitName === unitName ? { ...i, quantity: qty } : i))
    );
  };

  const handleUpdateNewItemUnit = (productId: string, oldUnitName: string, newUnitName: string) => {
    setNewItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId || item.selectedUnitName !== oldUnitName) return item;
        const units = getEffectiveUnitPrices(item.product);
        const matched = units.find((u) => u.unitName === newUnitName);
        const newPrice = matched?.price ?? (item.product.basePrice * (matched?.conversionRate ?? 1));
        return {
          ...item,
          selectedUnitName: newUnitName,
          unitPrice: newPrice,
          unitId: matched?.unitId,
        };
      })
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (note.trim().length > 500) { alert('Ghi chú tối đa 500 ký tự.'); return; }
    if (invoice.items.some((item, index) => {
      const quantity = returnQtys[getLineKey(item, index)] ?? 0;
      return !Number.isFinite(quantity) || quantity < 0 || quantity > item.quantity;
    }) || newItems.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      alert('Số lượng đổi/trả hoặc đơn giá không hợp lệ; số lượng trả không được vượt quá hóa đơn gốc.');
      return;
    }
    const returnedItemsList = (invoice.items || [])
      .flatMap((originalItem, idx) => {
        const key = getLineKey(originalItem, idx);
        const qty = returnQtys[key] || 0;
        if (qty <= 0) return [];
        const refundableUnit = originalItem.isGift ? 0 : (originalItem.actualPrice ?? originalItem.unitPrice);
        const baseItem = {
          productId: originalItem.productId,
          unitPrice: refundableUnit,
          unitName: originalItem.unitName,
          condition: returnConditions[key] || ('Restock' as const),
          orderDetailId: originalItem.itemId || undefined,
          isGift: Boolean(originalItem.isGift),
        };
        const allocations = getAllocations(originalItem);
        if (allocations.length > 0) {
          return allocations.flatMap((allocation) => {
            const lotQty = returnLotQtys[`${key}:${allocation.branchStockId}`] || 0;
            return lotQty > 0
              ? [{ ...baseItem, quantity: lotQty, batchId: allocation.branchStockId }]
              : [];
          });
        }
        return [{ ...baseItem, quantity: qty, batchId: originalItem.batchId || undefined }];
      });

    const newItemsList = newItems.map((item) => {
      const units = getEffectiveUnitPrices(item.product);
      const selectedUnit = units.find((u) => u.unitName === item.selectedUnitName);
      return {
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitName: item.selectedUnitName,
        conversionRate: selectedUnit?.conversionRate ?? 1,
        unitId: item.unitId || selectedUnit?.unitId,
      };
    });

    if (returnedItemsList.length === 0 && newItemsList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để trả hoặc 1 sản phẩm để đổi mới!');
      return;
    }

    if (returnReason === 'OTHER' && !note.trim()) {
      alert('Vui lòng nhập chi tiết lý do đổi/trả hàng vào ô ghi chú!');
      return;
    }

    const expiredRestock = returnedItemsList.some((item) =>
      item.condition === 'Restock' && item.batchId && lotExpiryDates[item.batchId] &&
      new Date(lotExpiryDates[item.batchId]).getTime() < new Date().setHours(0, 0, 0, 0)
    );
    if (expiredRestock) {
      alert('Lô đã hết hạn sử dụng, không thể nhập lại kho bán. Vui lòng chọn tình trạng Hàng lỗi/hỏng.');
      return;
    }

    // Ràng buộc đơn đặt trước
    if (isPreOrderExchangeOnlyBlocked) {
      alert(
        'Chọn sản phẩm đổi có giá trị tương đương. Đơn đặt trước chỉ được hoàn tiền mặt khi có lỗi do nhà sản xuất.'
      );
      return;
    }

    // Kiểm tra tiền mặt két quầy
    if (netAmount < 0) {
      if (isDrawerCashInsufficient) {
        alert(
          `Tiền mặt trong két quầy hiện tại (${currentDrawerCash?.toLocaleString('vi-VN')} đ) KHÔNG ĐỦ để hoàn trả ${refundAmount.toLocaleString('vi-VN')} đ cho khách!\n` +
          `Vui lòng lập phiếu thu nạp thêm tiền vào két ca trước khi tiếp tục hoàn tiền.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        returnedItems: returnedItemsList,
        newItems: newItemsList,
        settlementMethod: netAmount < 0 && invoice.paymentMethod !== 'CREDIT' ? 'CASH' : settlementMethod,
        reason: returnReason,
        note,
        cashFundSource: cashFundSource ?? (isStoreOwner ? 'SAFE' : 'SHIFT'),
      });
      onClose();
    } catch (e: any) {
      alert(`Lỗi khi xử lý đổi/trả hàng: ${e?.response?.data?.message || e?.response?.data?.detail || e?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 1040, width: '95%' }}>
        {/* Header */}
        <div className="pos-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeftRight size={18} color="var(--primary-emerald, #059669)" />
                Đổi / Trả Hàng
              </b>
              {isPreOrderInvoice && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    border: '1px solid #fde68a',
                  }}
                >
                  <PackageCheck size={13} /> Đơn Đặt Trước Giữ Kho
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Hóa đơn gốc: <b>{invoice.invoiceId}</b> &bull; Khách hàng: <b>{invoice.customerName || 'Khách lẻ'}</b>
              {currentDrawerCash !== undefined && (
                <> &bull; Tiền mặt két quầy hiện tại: <b style={{ color: '#0f766e' }}>{currentDrawerCash.toLocaleString('vi-VN')} đ</b></>
              )}
            </div>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="pos-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px' }}>
          {/* Cảnh báo đặc thù Đơn Đặt Trước */}
          {isPreOrderInvoice && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 6,
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                fontSize: 12,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <div>
                Đơn đặt trước được đổi sang sản phẩm khác. Chỉ hoàn tiền mặt khi có lỗi do nhà sản xuất.
              </div>
            </div>
          )}

          {/* KHỐI 1: Hàng khách trả */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RotateCcw size={16} /> 1. Chọn sản phẩm khách trả lại
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#b91c1c' }}>
                Tổng tiền trả: <b>{totalReturnAmount.toLocaleString('vi-VN')} đ</b>
              </span>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 900, fontSize: 12.5, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '8px 10px' }}>Sản phẩm</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 70 }}>ĐVT</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 95 }}>Giá mua</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 70 }}>Đã mua</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 95 }}>SL trả</th>
                    <th scope="col" style={{ padding: '8px 10px', minWidth: 170 }}>Lô hàng</th>
                    <th scope="col" style={{ padding: '8px 10px', minWidth: 112 }}>Tình trạng</th>
                    <th scope="col" style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 104 }}>Tiền hoàn</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, idx) => {
                    const lineKey = getLineKey(item, idx);
                    const currentQty = returnQtys[lineKey] || 0;
                    const condition = returnConditions[lineKey] || 'Restock';
                    const refundableUnit = item.isGift ? 0 : (item.actualPrice ?? item.unitPrice);
                    return (
                      <tr key={lineKey} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.isGift ? '#f0fdf4' : undefined }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                          {item.productName}
                          {item.isGift && (
                            <span
                              style={{
                                marginLeft: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                fontSize: 10.5,
                                fontWeight: 700,
                              }}
                            >
                              <Gift size={10} color="#15803d" /> Quà tặng KM (Hoàn 0 đ)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#0f766e', fontWeight: 600 }}>
                          {item.unitName || 'Cái'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {item.isGift ? (
                            <span style={{ color: '#15803d', fontWeight: 600 }}>0 đ (Tặng)</span>
                          ) : (
                            `${refundableUnit.toLocaleString('vi-VN')} đ`
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {(() => {
                            const allocations = getAllocations(item);
                            const singleAlloc = allocations.length === 1 ? allocations[0] : null;
                            const conversionRate = allocations.length
                              ? allocations.reduce((sum: number, a: { quantityBase: number }) => sum + a.quantityBase, 0) / item.quantity
                              : 1;
                            const maxQty = singleAlloc
                              ? Math.min(item.quantity, (singleAlloc.quantityBase - singleAlloc.returnedBase) / conversionRate)
                              : item.quantity;

                            return (
                              <input
                                type="number"
                                min={0}
                                max={maxQty}
                                value={currentQty}
                                disabled={allocations.length > 1}
                                aria-label={singleAlloc ? `Số lượng hoàn lô ${singleAlloc.batchCode || singleAlloc.branchStockId}` : `Số lượng trả ${item.productName}`}
                                onChange={(e) => handleReturnQtyChange(lineKey, maxQty, parseFloat(e.target.value), item)}
                                style={{
                                  width: 65,
                                  textAlign: 'center',
                                  padding: '4px 6px',
                                  borderRadius: 4,
                                  border: currentQty > 0 ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                  fontWeight: currentQty > 0 ? 700 : 400,
                                  color: currentQty > 0 ? '#b91c1c' : '#1e293b',
                                }}
                              />
                            );
                          })()}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {(() => {
                            const allocations = getAllocations(item);
                            if (!allocations.length) {
                              return (
                                <span style={{ fontSize: 11.5, color: '#475569' }}>
                                  {item.batchId
                                    ? `${item.batchId} · HSD: ${lotExpiryDates[item.batchId]?.slice(0, 10).split('-').reverse().join('/') || 'Không có'}`
                                    : 'Hóa đơn thiếu vết lô'}
                                </span>
                              );
                            }
                            const conversionRate = allocations.reduce((sum: number, a: { quantityBase: number }) => sum + a.quantityBase, 0) / item.quantity;
                            if (allocations.length === 1) {
                              const a = allocations[0];
                              const maxQty = (a.quantityBase - a.returnedBase) / conversionRate;
                              return (
                                <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.4 }}>
                                  <b style={{ color: '#0f766e' }}>{a.batchCode || a.branchStockId}</b>
                                  <div style={{ color: '#64748b' }}>
                                    HSD: {lotExpiryDates[a.branchStockId]?.slice(0, 10).split('-').reverse().join('/') || 'Không có'} · Còn {maxQty} {item.unitName || 'cái'}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div style={{ display: 'grid', gap: 5 }}>
                                {allocations.map((a: { branchStockId: string; batchCode?: string; quantityBase: number; returnedBase: number }) => {
                                  const maxQty = (a.quantityBase - a.returnedBase) / conversionRate;
                                  const lotKey = `${lineKey}:${a.branchStockId}`;
                                  return (
                                    <label key={a.branchStockId} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                                      <span style={{ flex: 1 }}>
                                        {a.batchCode || a.branchStockId}
                                        <br />
                                        HSD: {lotExpiryDates[a.branchStockId]?.slice(0, 10).split('-').reverse().join('/') || 'Không có'} · Còn {maxQty} {item.unitName || 'cái'}
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={maxQty}
                                        step="any"
                                        aria-label={`Số lượng hoàn lô ${a.batchCode || a.branchStockId}`}
                                        value={returnLotQtys[lotKey] || 0}
                                        onChange={(e) => handleReturnLotQtyChange(
                                          lineKey,
                                          a.branchStockId,
                                          maxQty,
                                          Number(e.target.value),
                                          allocations
                                        )}
                                        style={{ width: 55, padding: '3px' }}
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <select
                            aria-label={`Tình trạng hàng trả ${item.productName}`}
                            value={condition}
                            onChange={(e) =>
                              setReturnConditions((prev) => ({
                                ...prev,
                                [lineKey]: e.target.value as 'Restock' | 'Damaged',
                              }))
                            }
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              border: condition === 'Restock' ? '1px solid #86efac' : '1px solid #fca5a5',
                              backgroundColor: condition === 'Restock' ? '#f0fdf4' : '#fef2f2',
                              color: condition === 'Restock' ? '#166534' : '#991b1b',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="Restock">Nguyên vẹn</option>
                            <option value="Damaged">Lỗi / hỏng</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: item.isGift ? '#15803d' : currentQty > 0 ? '#b91c1c' : '#94a3b8' }}>
                          {item.isGift ? '0 đ' : `${(currentQty * refundableUnit).toLocaleString('vi-VN')} đ`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* KHỐI 2: Hàng khách đổi mới */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> 2. Chọn sản phẩm đổi mới (nếu có)
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#047857' }}>
                Tổng tiền đổi: <b>{totalNewAmount.toLocaleString('vi-VN')} đ</b>
              </span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <PosProductSearchInput
                products={availableProducts}
                onSelectProduct={handleSelectNewProduct}
                placeholder="Quét Barcode, SKU hoặc tìm tên sản phẩm đổi mới..."
                ariaLabel="Quét Barcode hoặc tìm sản phẩm đổi mới"
                buttonLabel="Thêm / Tìm"
                resetTrigger={isOpen ? invoice.invoiceId : false}
              />
            </div>

            {newItems.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 10px' }}>Sản phẩm mới</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: 140 }}>Đơn vị tính</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: 100 }}>Số lượng</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: 50 }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newItems.map((item) => (
                      <tr key={`${item.product.id}-${item.selectedUnitName}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.product.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {(() => {
                            const units = getEffectiveUnitPrices(item.product);
                            return (
                              <select
                                value={item.selectedUnitName}
                                onChange={(e) => handleUpdateNewItemUnit(item.product.id, item.selectedUnitName, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: 12,
                                  borderRadius: 6,
                                  border: '1px solid #059669',
                                  color: '#065f46',
                                  backgroundColor: '#f0fdf4',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {units.map((u) => (
                                  <option key={u.unitName} value={u.unitName}>
                                    {u.unitName} {u.conversionRate > 1 ? `(x${u.conversionRate})` : ''}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateNewItemQty(item.product.id, item.selectedUnitName, parseInt(e.target.value) || 1)}
                            style={{ width: 60, textAlign: 'center', padding: '3px 4px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          {(item.quantity * item.unitPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewItem(item.product.id, item.selectedUnitName)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* KHỐI 3: Bù trừ chênh lệch & Phương thức xử lý */}
          <div
            style={{
              padding: '14px',
              backgroundColor: netAmount > 0 ? '#eff6ff' : netAmount < 0 ? '#f0fdf4' : '#f8fafc',
              border: `1.5px solid ${netAmount > 0 ? '#93c5fd' : netAmount < 0 ? '#86efac' : '#cbd5e1'}`,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                Bù trừ chênh lệch:
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: netAmount > 0 ? '#1d4ed8' : netAmount < 0 ? '#15803d' : '#475569',
                }}
              >
                {netAmount > 0 && `Khách cần trả thêm: +${netAmount.toLocaleString('vi-VN')} đ`}
                {netAmount < 0 && `Cửa hàng hoàn lại: ${Math.abs(netAmount).toLocaleString('vi-VN')} đ`}
                {netAmount === 0 && 'Chênh lệch: 0 đ (Đổi ngang)'}
              </span>
            </div>

            {/* BẮT BUỘC CHỌN LÝ DO ĐỔI TRẢ */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Lý do đổi / trả hàng <span style={{ color: '#dc2626' }}>*</span>:
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {RETURN_REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trường hợp 1: Khách lấy món đắt tiền hơn -> Khách trả thêm tiền (các thêm) */}
            {netAmount > 0 && (
              <div style={{ marginTop: 10, padding: '12px 14px', backgroundColor: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={15} color="#1d4ed8" />
                    Khách hàng bù thêm (các thêm):
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>
                    +{netAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5, marginBottom: 10 }}>
                  <div>• <b>Nghiệp vụ:</b> Khách đổi sang sản phẩm mới có giá trị cao hơn. Hệ thống sẽ sinh đơn đổi hàng mới mã <b>DT...</b>.</div>
                  <div>• <b>Tác động doanh thu:</b> Ghi nhận doanh thu thuần tăng thêm <b>+{netAmount.toLocaleString('vi-VN')} đ</b> vào ca và ngày hiện tại.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px dashed #93c5fd' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>Phương thức thu thêm từ khách:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="settlementMethod"
                      value="CASH"
                      checked={settlementMethod === 'CASH'}
                      onChange={() => setSettlementMethod('CASH')}
                    />
                    Tiền mặt (Cộng vào két ca)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="settlementMethod"
                      value="VIETQR"
                      checked={settlementMethod === 'VIETQR'}
                      onChange={() => setSettlementMethod('VIETQR')}
                    />
                    VietQR / Chuyển khoản
                  </label>
                  {invoice.customerName && invoice.customerName !== 'Khách lẻ' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="settlementMethod"
                        value="DEBT"
                        checked={settlementMethod === 'DEBT'}
                        onChange={() => setSettlementMethod('DEBT')}
                      />
                      Ghi nợ vào sổ công nợ
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Trường hợp 2: Cửa hàng hoàn lại tiền cho khách */}
            {netAmount < 0 && (
              <div style={{ marginTop: 10, padding: '12px 14px', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingDown size={15} color="#15803d" />
                    {isCreditReturn ? 'Trừ công nợ khách hàng:' : 'Nguồn tiền hoàn trả cho khách:'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      borderRadius: 4,
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: 12,
                      fontWeight: 700,
                      border: '1px solid #86efac',
                    }}
                  >
                    {isCreditReturn
                      ? 'Giảm dư nợ, không chi tiền mặt'
                      : refundSourceLabel || (currentDrawerCash !== undefined ? 'Két ca thu ngân hiện tại' : 'Két sắt chi nhánh (Sổ quỹ)')}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
                  <div>• <b>Số tiền hoàn trả:</b> <span style={{ color: '#dc2626', fontWeight: 800, fontSize: 13 }}>{Math.abs(netAmount).toLocaleString('vi-VN')} đ</span></div>
                  <div>• <b>Tác động doanh thu:</b> Tự động <b>giảm doanh thu ca và doanh thu ngày: -{Math.abs(netAmount).toLocaleString('vi-VN')} đ</b> tương ứng theo phiếu trả hàng <b>TH...</b>.</div>
                  <div>• <b>Dòng tiền:</b> {isCreditReturn ? 'Giảm trực tiếp công nợ khách hàng, không tạo phiếu chi tiền mặt' : currentDrawerCash !== undefined ? 'Tự động tạo dòng tiền ra RETURN_REFUND trong ca, trừ trực tiếp tiền mặt bàn giao ca' : 'Tự động hạch toán phiếu chi quỹ từ két sắt chi nhánh qua Sổ quỹ'}.</div>
                  {!isCreditReturn && currentDrawerCash !== undefined && (
                    <div style={{ marginTop: 4 }}>
                      • <b>Số dư tiền mặt két ca:</b> <b>{currentDrawerCash.toLocaleString('vi-VN')} đ</b> {isDrawerCashInsufficient ? <span style={{ color: '#dc2626', fontWeight: 700 }}>— Không đủ để hoàn trả!</span> : <span style={{ color: '#15803d', fontWeight: 700 }}>— Đủ điều kiện hoàn tiền</span>}
                    </div>
                  )}
                </div>

                {/* Cảnh báo tiền mặt két quầy không đủ */}
                {isDrawerCashInsufficient && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1.5px solid #fca5a5',
                      borderRadius: 6,
                      color: '#991b1b',
                      fontSize: 12.5,
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <b>Két quầy không đủ tiền mặt để hoàn trả!</b>
                      <div style={{ marginTop: 2 }}>
                        Tiền mặt hiện có trong két ca: <b>{currentDrawerCash?.toLocaleString('vi-VN')} đ</b> &bull; Cần hoàn: <b>{refundAmount.toLocaleString('vi-VN')} đ</b>.
                      </div>
                      <div style={{ marginTop: 4, color: '#b91c1c', fontStyle: 'italic' }}>
                        Vui lòng lập <b>Phiếu thu nạp thêm tiền vào két</b> tại ca làm việc trước khi thực hiện hoàn tiền mặt.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trường hợp 3: Đổi hàng ngang giá */}
            {netAmount === 0 && (
              <div style={{ marginTop: 10, padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <CheckCircle2 size={15} color="#059669" />
                  Đổi hàng ngang giá (Chênh lệch: 0 đ)
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Giá trị hàng mới đổi bằng đúng giá trị hàng trả. Không phát sinh thu thêm tiền hay hoàn tiền mặt. Doanh thu ca và doanh thu ngày được giữ nguyên.
                </div>
              </div>
            )}

            {/* Cảnh báo vi phạm chính sách Đơn Đặt Trước */}
            {isPreOrderExchangeOnlyBlocked && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #f87171',
                  borderRadius: 6,
                  color: '#991b1b',
                  fontSize: 12.5,
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  Chọn sản phẩm đổi có giá trị tương đương, hoặc chọn lý do “Lỗi do nhà sản xuất” nếu đúng tình trạng hàng.
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder={
                  returnReason === 'OTHER'
                    ? 'Bắt buộc nhập chi tiết lý do đổi trả hàng vào đây...'
                    : 'Ghi chú thêm về tình trạng sản phẩm hoặc yêu cầu của khách...'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: returnReason === 'OTHER' && !note.trim() ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: 12.5,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pos-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="pos-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </button>
          <button
            type="button"
            className="pos-btn-primary"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (totalReturnAmount === 0 && totalNewAmount === 0) ||
              isDrawerCashInsufficient ||
              isPreOrderExchangeOnlyBlocked
            }
            title={
              isDrawerCashInsufficient
                ? 'Tiền két quầy không đủ để hoàn tiền'
                : isPreOrderExchangeOnlyBlocked
                  ? 'Đơn đặt trước chỉ được đổi hàng, không hoàn tiền mặt'
                  : undefined
            }
            style={{
              padding: '8px 18px',
              fontSize: 13.5,
              opacity:
                isSubmitting ||
                  (totalReturnAmount === 0 && totalNewAmount === 0) ||
                  isDrawerCashInsufficient ||
                  isPreOrderExchangeOnlyBlocked
                  ? 0.5
                  : 1,
              cursor:
                isSubmitting ||
                  (totalReturnAmount === 0 && totalNewAmount === 0) ||
                  isDrawerCashInsufficient ||
                  isPreOrderExchangeOnlyBlocked
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Đổi / Trả Hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
