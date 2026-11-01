import React, { useState } from 'react';
import type { InvoiceDTO } from '../../types/inventory.types';
import type { Product } from '../../types/pos.types';
import { ArrowLeftRight, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  invoice: InvoiceDTO | null;
  availableProducts: Product[];
  onClose: () => void;
  onConfirm: (data: {
    returnedItems: Array<{ productId: string; quantity: number; unitPrice: number }>;
    newItems: Array<{ productId: string; quantity: number; unitPrice: number; discountAmount?: number }>;
    settlementMethod: string;
    note?: string;
  }) => Promise<void>;
}

export const ReturnExchangeModal: React.FC<Props> = ({
  isOpen,
  invoice,
  availableProducts,
  onClose,
  onConfirm,
}) => {
  // 1. Quản lý số lượng hàng trả cho từng món trong hóa đơn gốc { [productId]: quantity }
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});

  // 2. Quản lý danh sách hàng khách lấy mới
  const [newItems, setNewItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [selectedNewProductId, setSelectedNewProductId] = useState<string>('');

  // 3. Phương thức thanh toán bù / hoàn
  const [settlementMethod, setSettlementMethod] = useState<string>('CASH');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state khi mở modal với invoice mới
  React.useEffect(() => {
    if (isOpen && invoice) {
      setReturnQtys({});
      setNewItems([]);
      setSelectedNewProductId('');
      setSettlementMethod('CASH');
      setNote('');
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  // Tính tổng tiền hàng trả
  const totalReturnAmount = (invoice.items || []).reduce((sum, item) => {
    const qty = returnQtys[item.productId] || 0;
    return sum + qty * item.unitPrice;
  }, 0);

  // Tính tổng tiền hàng đổi mới
  const totalNewAmount = newItems.reduce((sum, item) => {
    return sum + item.quantity * item.product.basePrice;
  }, 0);

  // Chênh lệch Net Amount
  const netAmount = totalNewAmount - totalReturnAmount;

  const handleReturnQtyChange = (productId: string, maxQty: number, val: number) => {
    const validQty = Math.max(0, Math.min(maxQty, Math.floor(val || 0)));
    setReturnQtys((prev) => ({
      ...prev,
      [productId]: validQty,
    }));
  };

  const handleAddNewItem = () => {
    if (!selectedNewProductId) return;
    const prod = availableProducts.find((p) => p.id === selectedNewProductId);
    if (!prod) return;

    setNewItems((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
    setSelectedNewProductId('');
  };

  const handleRemoveNewItem = (productId: string) => {
    setNewItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleUpdateNewItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveNewItem(productId);
      return;
    }
    setNewItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  };

  const handleSubmit = async () => {
    const returnedItemsList = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([pId, qty]) => {
        const originalItem = invoice.items?.find((i) => i.productId === pId);
        return {
          productId: pId,
          quantity: qty,
          unitPrice: originalItem?.unitPrice || 0,
        };
      });

    const newItemsList = newItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.product.basePrice,
    }));

    if (returnedItemsList.length === 0 && newItemsList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để trả hoặc 1 sản phẩm để đổi mới!');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        returnedItems: returnedItemsList,
        newItems: newItemsList,
        settlementMethod,
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
      <div className="pos-modal-dialog" style={{ maxWidth: 840, width: '92%' }}>
        {/* Header */}
        <div className="pos-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <b style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeftRight size={18} color="var(--primary-emerald, #059669)" />
              Đổi / Trả Hàng Chuẩn KiotViet
            </b>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Hóa đơn gốc: <b>{invoice.invoiceId}</b> &bull; Khách hàng: <b>{invoice.customerName || 'Khách lẻ'}</b>
            </div>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="pos-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px' }}>
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
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá mua</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đã mua</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 130 }}>SL muốn trả</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tiền hoàn trả</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item) => {
                    const currentQty = returnQtys[item.productId] || 0;
                    return (
                      <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.productName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={currentQty}
                            onChange={(e) => handleReturnQtyChange(item.productId, item.quantity, parseFloat(e.target.value))}
                            style={{
                              width: 70,
                              textAlign: 'center',
                              padding: '4px 6px',
                              borderRadius: 4,
                              border: currentQty > 0 ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                              fontWeight: currentQty > 0 ? 700 : 400,
                              color: currentQty > 0 ? '#b91c1c' : '#1e293b',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: currentQty > 0 ? '#b91c1c' : '#94a3b8' }}>
                          {(currentQty * item.unitPrice).toLocaleString('vi-VN')} đ
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

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select
                value={selectedNewProductId}
                onChange={(e) => setSelectedNewProductId(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">-- Tìm chọn sản phẩm đổi mới từ danh mục --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.basePrice.toLocaleString('vi-VN')} đ (Tồn: {p.quantityOnHand})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddNewItem}
                disabled={!selectedNewProductId}
                className="pos-btn-primary"
                style={{ padding: '6px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
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
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: 110 }}>Số lượng</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: 50 }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newItems.map((item) => (
                      <tr key={item.product.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.product.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.product.basePrice.toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateNewItemQty(item.product.id, parseInt(e.target.value) || 1)}
                            style={{ width: 60, textAlign: 'center', padding: '3px 4px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          {(item.quantity * item.product.basePrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewItem(item.product.id)}
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

          {/* KHỐI 3: Bù trừ chênh lệch */}
          <div
            style={{
              padding: '14px',
              backgroundColor: netAmount > 0 ? '#eff6ff' : netAmount < 0 ? '#f0fdf4' : '#f8fafc',
              border: `1.5px solid ${netAmount > 0 ? '#93c5fd' : netAmount < 0 ? '#86efac' : '#cbd5e1'}`,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                ⚖️ Bù Trừ Chênh Lệch (Net Settlement):
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

            {/* Lựa chọn phương thức thu/hoàn tiền */}
            {netAmount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Phương thức thanh toán thêm:</span>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="settlementMethod"
                    value="DEBT"
                    checked={settlementMethod === 'DEBT'}
                    onChange={() => setSettlementMethod('DEBT')}
                  />
                  Ghi vào sổ nợ
                </label>
              </div>
            )}

            {netAmount < 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Hình thức hoàn trả cho khách:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="settlementMethod"
                    value="REFUND_CASH"
                    checked={settlementMethod === 'REFUND_CASH' || settlementMethod === 'CASH'}
                    onChange={() => setSettlementMethod('REFUND_CASH')}
                  />
                  Hoàn tiền mặt
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="settlementMethod"
                    value="REDUCE_DEBT"
                    checked={settlementMethod === 'REDUCE_DEBT'}
                    onChange={() => setSettlementMethod('REDUCE_DEBT')}
                  />
                  Trừ vào Sổ nợ của khách
                </label>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="Ghi chú lý do đổi trả (VD: Khách đổi ý lấy chai lớn, sản phẩm còn nguyên bao bì...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12.5 }}
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
            disabled={isSubmitting || (totalReturnAmount === 0 && totalNewAmount === 0)}
            style={{ padding: '8px 18px', fontSize: 13.5 }}
          >
            {isSubmitting ? 'Đang xử lý...' : '✓ Xác Nhận Đổi / Trả Hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
