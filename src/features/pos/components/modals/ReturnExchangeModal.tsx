import React, { useState } from 'react';
import type { InvoiceDTO } from '../../types/inventory.types';
import type { Product } from '../../types/pos.types';
import { ArrowLeftRight, RotateCcw, Plus, Trash2, AlertTriangle, AlertCircle, PackageCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  invoice: InvoiceDTO | null;
  availableProducts: Product[];
  currentDrawerCash?: number;
  onClose: () => void;
  onConfirm: (data: {
    returnedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitName?: string;
      condition?: 'Restock' | 'Damaged';
      orderDetailId?: string;
      isGift?: boolean;
    }>;
    newItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitName?: string;
      discountAmount?: number;
    }>;
    settlementMethod: string;
    reason?: string;
    note?: string;
  }) => Promise<void>;
}

export const RETURN_REASON_OPTIONS = [
  { value: 'DEFECTIVE', label: 'Lỗi do Nhà Sản Xuất (bao bì rách, móp, biến chất, lỗi kỹ thuật)' },
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
  onClose,
  onConfirm,
}) => {
  // 1. Quản lý số lượng và tình trạng hàng trả cho từng món trong hóa đơn gốc
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnConditions, setReturnConditions] = useState<Record<string, 'Restock' | 'Damaged'>>({});

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
  const [selectedNewProductId, setSelectedNewProductId] = useState<string>('');
  const [selectedNewUnitName, setSelectedNewUnitName] = useState<string>('');
  const [selectedNewQty, setSelectedNewQty] = useState<number>(1);

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

  const selectedProductObj = availableProducts.find((p) => p.id === selectedNewProductId);
  const selectedProductUnits = selectedProductObj ? getEffectiveUnitPrices(selectedProductObj) : [];

  // Reset state khi mở modal với invoice mới
  React.useEffect(() => {
    if (isOpen && invoice) {
      setReturnQtys({});
      setReturnConditions({});
      setNewItems([]);
      setSelectedNewProductId('');
      setSelectedNewUnitName('');
      setSelectedNewQty(1);
      setSettlementMethod('CASH');
      setReturnReason('DEFECTIVE');
      setNote('');
    }
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

  // Kiểm tra két quầy có đủ tiền mặt để hoàn trả không (REQ-POS-RETURN-UNIT-CONVERSION-04)
  const isDrawerCashInsufficient =
    netAmount < 0 &&
    currentDrawerCash !== undefined &&
    refundAmount > currentDrawerCash;

  // Ràng buộc đơn đặt trước: Chỉ cho phép Đổi hàng (Exchange), chặn hoàn tiền mặt trừ khi lỗi NSX (REQ-POS-PREORDER-RETURN-EXCHANGE-RULES-03)
  const isPreOrderExchangeOnlyBlocked =
    isPreOrderInvoice &&
    (newItems.length === 0 || netAmount < 0) &&
    returnReason !== 'DEFECTIVE';

  const handleReturnQtyChange = (lineKey: string, maxQty: number, val: number) => {
    const validQty = Math.max(0, Math.min(maxQty, Math.floor(val || 0)));
    setReturnQtys((prev) => ({
      ...prev,
      [lineKey]: validQty,
    }));
    // Mặc định tình trạng là Restock nếu chưa có
    if (validQty > 0 && !returnConditions[lineKey]) {
      setReturnConditions((prev) => ({
        ...prev,
        [lineKey]: 'Restock',
      }));
    }
  };

  const handleAddNewItem = () => {
    if (!selectedNewProductId) return;
    const prod = availableProducts.find((p) => p.id === selectedNewProductId);
    if (!prod) return;

    const units = getEffectiveUnitPrices(prod);
    const chosenUnit = units.find((u) => u.unitName === selectedNewUnitName) || units[0];
    const unitName = chosenUnit?.unitName || prod.baseUnit || 'Cái';
    const unitPrice = chosenUnit?.price || prod.basePrice;
    const qtyToAdd = selectedNewQty > 0 ? selectedNewQty : 1;

    setNewItems((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id && i.selectedUnitName === unitName);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id && i.selectedUnitName === unitName
            ? { ...i, quantity: i.quantity + qtyToAdd }
            : i
        );
      }
      return [
        ...prev,
        {
          product: { ...prod, unitPrices: units },
          quantity: qtyToAdd,
          selectedUnitName: unitName,
          unitPrice: unitPrice,
          unitId: chosenUnit?.unitId,
        },
      ];
    });
    setSelectedNewProductId('');
    setSelectedNewUnitName('');
    setSelectedNewQty(1);
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
    const returnedItemsList = (invoice.items || [])
      .map((originalItem, idx) => {
        const key = getLineKey(originalItem, idx);
        const qty = returnQtys[key] || 0;
        if (qty <= 0) return null;
        const refundableUnit = originalItem.isGift ? 0 : (originalItem.actualPrice ?? originalItem.unitPrice);
        return {
          productId: originalItem.productId,
          quantity: qty,
          unitPrice: refundableUnit,
          unitName: originalItem.unitName,
          condition: returnConditions[key] || ('Restock' as const),
          orderDetailId: originalItem.itemId || undefined,
          isGift: Boolean(originalItem.isGift),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const newItemsList = newItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitName: item.selectedUnitName,
    }));

    if (returnedItemsList.length === 0 && newItemsList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để trả hoặc 1 sản phẩm để đổi mới!');
      return;
    }

    if (returnReason === 'OTHER' && !note.trim()) {
      alert('Vui lòng nhập chi tiết lý do đổi/trả hàng vào ô ghi chú!');
      return;
    }

    // Ràng buộc đơn đặt trước
    if (isPreOrderExchangeOnlyBlocked) {
      alert(
        '⛔ Đơn đặt trước đã bàn giao chỉ hỗ trợ ĐỔI SẢN PHẨM KHÁC (Exchange), không áp dụng trả hàng lấy lại tiền mặt trừ khi có lỗi từ Nhà Sản Xuất!\n' +
        'Vui lòng chọn sản phẩm đổi mới tương đương hoặc chọn lý do "Lỗi do Nhà Sản Xuất".'
      );
      return;
    }

    // Kiểm tra tiền mặt két quầy
    if (netAmount < 0) {
      if (isDrawerCashInsufficient) {
        alert(
          `⚠️ Tiền mặt trong két quầy hiện tại (${currentDrawerCash?.toLocaleString('vi-VN')} đ) KHÔNG ĐỦ để hoàn trả ${refundAmount.toLocaleString('vi-VN')} đ cho khách!\n` +
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
        settlementMethod: netAmount < 0 ? 'CASH' : settlementMethod,
        reason: returnReason,
        note,
      });
      onClose();
    } catch (e: any) {
      alert(`Lỗi khi xử lý đổi/trả hàng: ${e?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 920, width: '95%' }}>
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
                <b>Chính sách Đơn Đặt Trước:</b> Khách hàng chỉ được <b>ĐỔI SANG SẢN PHẨM KHÁC (Exchange)</b>,
                tuyệt đối <b>không hoàn tiền mặt</b> nếu khách đổi ý / trả ngang. Chỉ hoàn tiền mặt khi sản phẩm có <b>Lỗi do Nhà Sản Xuất (NSX)</b>.
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

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '8px 10px' }}>Sản phẩm</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 70 }}>ĐVT</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 95 }}>Giá mua</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 70 }}>Đã mua</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 95 }}>SL trả</th>
                    <th style={{ padding: '8px 10px', width: 175 }}>Tình trạng hàng trả</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Tiền hoàn trả</th>
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
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                fontSize: 10.5,
                                fontWeight: 700,
                              }}
                            >
                              🎁 Quà tặng KM (Hoàn 0 đ)
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
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={currentQty}
                            onChange={(e) => handleReturnQtyChange(lineKey, item.quantity, parseFloat(e.target.value))}
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
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <select
                            disabled={currentQty === 0}
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
                              cursor: currentQty > 0 ? 'pointer' : 'not-allowed',
                              opacity: currentQty > 0 ? 1 : 0.5,
                            }}
                          >
                            <option value="Restock">✨ Nguyên vẹn (Nhập kho bán)</option>
                            <option value="Damaged">⚠️ Hàng lỗi/hỏng (Chờ hủy/NCC)</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: item.isGift ? '#15803d' : currentQty > 0 ? '#b91c1c' : '#94a3b8' }}>
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

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <select
                value={selectedNewProductId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setSelectedNewProductId(pid);
                  const prod = availableProducts.find((p) => p.id === pid);
                  const units = prod ? getEffectiveUnitPrices(prod) : [];
                  const defaultUnit = units[0]?.unitName || prod?.baseUnit || 'Cái';
                  setSelectedNewUnitName(defaultUnit);
                  setSelectedNewQty(1);
                }}
                style={{ flex: 2, minWidth: 260, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">-- Tìm chọn sản phẩm đổi mới từ danh mục --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.basePrice.toLocaleString('vi-VN')} đ (Tồn: {p.quantityOnHand} {p.baseUnit || ''})
                  </option>
                ))}
              </select>

              {/* Chọn đơn vị tính của sản phẩm đổi */}
              {selectedProductObj && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>Đơn vị:</label>
                  <select
                    value={selectedNewUnitName}
                    onChange={(e) => setSelectedNewUnitName(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1.5px solid #059669',
                      fontSize: 13,
                      backgroundColor: '#f0fdf4',
                      color: '#166534',
                      fontWeight: 700,
                    }}
                  >
                    {selectedProductUnits.map((u) => (
                      <option key={u.unitName} value={u.unitName}>
                        {u.unitName} {u.conversionRate > 1 ? `(x${u.conversionRate})` : ''} — {u.price.toLocaleString('vi-VN')} đ
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Chọn số lượng */}
              {selectedProductObj && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>SL:</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedNewQty}
                    onChange={(e) => setSelectedNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: 60,
                      padding: '7px 8px',
                      borderRadius: 6,
                      border: '1.5px solid #059669',
                      fontSize: 13,
                      textAlign: 'center',
                      fontWeight: 700,
                    }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAddNewItem}
                disabled={!selectedNewProductId}
                className="pos-btn-primary"
                style={{ padding: '7px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={15} /> Thêm món
              </button>
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

            {/* Trường hợp 1: Khách lấy món đắt tiền hơn -> Khách trả thêm tiền */}
            {netAmount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Phương thức thu thêm tiền từ khách:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="settlementMethod"
                    value="CASH"
                    checked={settlementMethod === 'CASH'}
                    onChange={() => setSettlementMethod('CASH')}
                  />
                  Tiền mặt
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="settlementMethod"
                    value="VIETQR"
                    checked={settlementMethod === 'VIETQR'}
                    onChange={() => setSettlementMethod('VIETQR')}
                  />
                  VietQR
                </label>
                {invoice.customerName && invoice.customerName !== 'Khách lẻ' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="settlementMethod"
                      value="DEBT"
                      checked={settlementMethod === 'DEBT'}
                      onChange={() => setSettlementMethod('DEBT')}
                    />
                    Ghi vào sổ nợ khách hàng
                  </label>
                )}
              </div>
            )}

            {/* Trường hợp 2: Cửa hàng hoàn lại tiền cho khách -> BẮT BUỘC 100% TIỀN MẶT TỪ KÉT QUẦY */}
            {netAmount < 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                    Hình thức hoàn tiền cho khách:
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
                    }}
                  >
                    Tiền mặt từ két quầy
                  </span>
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
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <b>Két quầy không đủ tiền mặt để hoàn trả!</b>
                      <div style={{ marginTop: 2 }}>
                        Tiền mặt hiện có trong két: <b>{currentDrawerCash?.toLocaleString('vi-VN')} đ</b> &bull; Cần hoàn: <b>{refundAmount.toLocaleString('vi-VN')} đ</b>.
                      </div>
                      <div style={{ marginTop: 4, color: '#b91c1c', fontStyle: 'italic' }}>
                        Vui lòng lập <b>Phiếu thu nạp thêm tiền vào két</b> tại ca làm việc trước khi thực hiện hoàn tiền mặt.
                      </div>
                    </div>
                  </div>
                )}
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
                  <b>Không thể hoàn tiền mặt cho Đơn Đặt Trước!</b>
                  <div style={{ marginTop: 2 }}>
                    Đơn hàng đặt trước chỉ cho phép <b>Đổi sang sản phẩm khác có giá trị tương đương</b>.
                    Tuyệt đối không hoàn tiền mặt nếu lý do là khách đổi ý / mua nhầm.
                  </div>
                  <div style={{ marginTop: 4, fontStyle: 'italic', color: '#b91c1c' }}>
                    (Ngoại lệ: Nếu sản phẩm bị hỏng do NSX, hãy chọn lý do "Lỗi do Nhà Sản Xuất" để được duyệt hoàn tiền).
                  </div>
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
            {isSubmitting ? 'Đang xử lý...' : '✓ Xác Nhận Đổi / Trả Hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
