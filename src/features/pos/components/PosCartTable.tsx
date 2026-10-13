import { useState } from 'react';
import type { FC } from 'react';
import { Plus, X, Tag, AlertTriangle, ShoppingBag, Trash2 } from 'lucide-react';
import type { CartItem } from '../types/pos.types';

interface Props {
  cart: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemDiscount: (id: string, discount: number, type: 'vnd' | 'percent') => void;
  onOpenQuickAddProduct: () => void;
  onOpenBelowCostWarning: (item: CartItem) => void;
  orderNote: string;
  onOrderNoteChange: (note: string) => void;
}

export const PosCartTable: FC<Props> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemDiscount,
  onOpenQuickAddProduct,
  onOpenBelowCostWarning,
  orderNote,
  onOrderNoteChange,
}) => {
  const [activeDiscountItemId, setActiveDiscountItemId] = useState<string | null>(null);

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalItemAmount = cart.reduce((sum, item) => sum + item.totalAmount, 0);

  const toggleDiscountPopover = (id: string) => {
    setActiveDiscountItemId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="pos-cart-section">
      {/* Thanh tiêu đề giỏ hàng */}
      <div className="pos-cart-header-bar">
        <b className="pos-cart-heading">DANH SÁCH MẶT HÀNG TRONG ĐƠN HÀNG</b>
        <button
          type="button"
          className="pos-btn-secondary"
          onClick={onOpenQuickAddProduct}
          style={{ fontSize: 12.5 }}
          title="Thêm nhanh hàng hóa mới"
        >
          <Plus size={13} />
          <span>Thêm nhanh mặt hàng mới</span>
        </button>
      </div>

      {/* Bảng giỏ hàng */}
      <div className="pos-table-responsive">
        <table className="pos-cart-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>STT</th>
              <th style={{ width: 40, textAlign: 'center' }}>Xóa</th>
              <th style={{ width: 110 }}>Mã hàng</th>
              <th>Tên mặt hàng &amp; Quy cách</th>
              <th style={{ width: 70, textAlign: 'center' }}>ĐVT</th>
              <th style={{ width: 80, textAlign: 'center' }}>Số lượng</th>
              <th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th>
              <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
              <th style={{ width: 60, textAlign: 'center' }}>Tùy chọn</th>
            </tr>
          </thead>
          <tbody>
            {cart.length > 0 ? (
              cart.map((item, index) => {
                const isBelowCost = item.actualPrice < item.product.costPrice;
                const isPopoverOpen = activeDiscountItemId === item.id;

                return (
                  <tr key={item.id} className="pos-cart-row">
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="pos-delete-row-btn"
                        onClick={() => onRemoveItem(item.id)}
                        title="Xóa món khỏi giỏ"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                    <td>
                      <b style={{ color: 'var(--blue-primary)', fontFamily: 'var(--font-mono)' }}>
                        {item.product.sku}
                      </b>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product.name}</div>
                      {item.product.spec && (
                        <span style={{ fontSize: 12, color: '#475569', marginRight: 8 }}>
                          {item.product.spec}
                        </span>
                      )}
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                        &#10003; Tồn kho: {item.product.quantityOnHand} &bull; KH đặt:{' '}
                        {item.product.allocatedQty ?? 0}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onUpdateQuantity(item.id, val > 0 ? val : 1);
                        }}
                        className="pos-qty-input"
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{item.unitPrice.toLocaleString('vi-VN')}</div>
                      {item.discountPerItem > 0 && (
                        <div style={{ fontSize: 11, color: '#dc2626' }}>
                          - {item.discountPerItem.toLocaleString('vi-VN')}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {item.totalAmount.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'center', position: 'relative' }}>
                      <button
                        type="button"
                        className={`pos-options-btn ${isPopoverOpen ? 'active' : ''}`}
                        onClick={() => toggleDiscountPopover(item.id)}
                        title="Điều chỉnh chiết khấu món"
                      >
                        &#8942;
                      </button>

                      {/* Popover điều chỉnh chiết khấu món */}
                      {isPopoverOpen && (
                        <div className="pos-item-discount-popover">
                          <div className="pos-popover-title">
                            <b>Chiết khấu {item.product.sku}</b>
                            <button
                              type="button"
                              onClick={() => toggleDiscountPopover(item.id)}
                              className="pos-popover-close"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="pos-popover-body">
                            <div className="pos-popover-row">
                              <span>Đơn giá niêm yết:</span>
                              <b>{item.unitPrice.toLocaleString('vi-VN')} đ</b>
                            </div>
                            <div className="pos-popover-row">
                              <span>Giảm giá trực tiếp:</span>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input
                                  type="number"
                                  value={item.discountPerItem}
                                  onChange={(e) =>
                                    onUpdateItemDiscount(
                                      item.id,
                                      Math.max(0, Number(e.target.value)),
                                      item.discountType
                                    )
                                  }
                                  className="pos-input"
                                  style={{ width: 80, textAlign: 'right' }}
                                />
                                <button
                                  type="button"
                                  className={`pos-badge-btn ${item.discountType === 'vnd' ? 'active' : ''}`}
                                  onClick={() => onUpdateItemDiscount(item.id, item.discountPerItem, 'vnd')}
                                >
                                  VND
                                </button>
                                <button
                                  type="button"
                                  className={`pos-badge-btn ${item.discountType === 'percent' ? 'active' : ''}`}
                                  onClick={() => onUpdateItemDiscount(item.id, item.discountPerItem, 'percent')}
                                >
                                  %
                                </button>
                              </div>
                            </div>
                            <div className="pos-popover-row">
                              <span>Giá bán thực tế:</span>
                              <b style={{ color: 'var(--blue-primary)' }}>
                                {item.actualPrice.toLocaleString('vi-VN')} đ
                              </b>
                            </div>

                            {/* Cảnh báo bán dưới giá vốn */}
                            <div style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                className="pos-below-cost-btn"
                                onClick={() => {
                                  toggleDiscountPopover(item.id);
                                  onOpenBelowCostWarning(item);
                                }}
                              >
                                <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                                {isBelowCost ? 'Đang bán dưới giá vốn (Cần PIN)' : 'Kiểm tra giá vốn'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ShoppingBag size={32} className="text-slate-300" />
                    <span>Chưa có mặt hàng nào trong đơn. Quét mã vạch [F2] hoặc chọn mặt hàng ở chế độ Bán thường.</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Dải khuyến mại tự động hóa đơn */}
            {cart.length > 0 && (
              <tr style={{ backgroundColor: '#fdf2f8' }}>
                <td colSpan={9} style={{ padding: '8px 12px', color: '#db2777', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={14} className="text-pink-600" />
                    <span>Khuyến mại hóa đơn: Giảm giá tự động 7.00% theo chương trình khách hàng</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Chân giỏ hàng: Ghi chú đơn & Tổng tiền hàng */}
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <td colSpan={5} style={{ padding: '8px 12px' }}>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => onOrderNoteChange(e.target.value)}
                  placeholder="Ghi chú đơn hàng (ví dụ: giao giờ hành chính, gọi trước khi đến)..."
                  className="pos-input"
                  style={{ width: '100%', maxWidth: 450 }}
                />
              </td>
              <td colSpan={4} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 13 }}>
                Tổng tiền hàng: <b>{totalQuantity}</b> món &nbsp;|&nbsp;{' '}
                <b style={{ fontSize: 15, color: '#0f172a' }}>
                  {totalItemAmount.toLocaleString('vi-VN')} đ
                </b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
