import type { FC } from 'react';
import { Tag, ShoppingBag, Trash2 } from 'lucide-react';
import type { CartItem } from '../types/pos.types';

interface Props {
  cart: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemDiscount: (id: string, discount: number, type: 'vnd' | 'percent') => void;
  onUpdateItemUnit?: (id: string, unitName: string, price: number, unitId?: string) => void;

  onOpenBelowCostWarning: (item: CartItem) => void;
  onOpenCatalogModal?: () => void;
  orderNote: string;
  onOrderNoteChange: (note: string) => void;
  appliedPromotions?: string[];
}

export const PosCartTable: FC<Props> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemUnit,

  orderNote,
  onOrderNoteChange,
  appliedPromotions = [],
}) => {
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalItemAmount = cart.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="pos-cart-section">
      {/* Thanh tiêu đề giỏ hàng */}
      <div className="pos-cart-header-bar">
        <b className="pos-cart-heading">DANH SÁCH MẶT HÀNG TRONG ĐƠN HÀNG</b>
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
            </tr>
          </thead>
          <tbody>
            {cart.length > 0 ? (
              cart.map((item, index) => {

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
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>&#10003; Tồn kho: {item.product.quantityOnHand}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.product.unitPrices && item.product.unitPrices.length > 1 ? (
                        <select
                          className="pos-unit-select"
                          value={item.unitId || item.unit}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = item.product.unitPrices?.find(
                              (u) => (u.unitId && u.unitId === val) || u.unitName === val
                            );
                            if (matched && onUpdateItemUnit) {
                              onUpdateItemUnit(item.id, matched.unitName, matched.price, matched.unitId);
                            }
                          }}
                          title="Chọn đơn vị tính"
                        >
                          {item.product.unitPrices.map((u, uIdx) => (
                            <option key={u.unitId || `${u.unitName}-${uIdx}`} value={u.unitId || u.unitName}>
                              {u.unitName}{u.conversionRate > 1 ? ` (x${u.conversionRate})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{item.unit}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (Number.isFinite(val)) onUpdateQuantity(item.id, val);
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

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ShoppingBag size={32} className="text-slate-300" />
                    <span>Chưa có mặt hàng nào trong đơn. Quét mã vạch [F2] hoặc chọn mặt hàng ở chế độ Bán thường.</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Dải khuyến mại tự động hóa đơn */}
            {cart.length > 0 && appliedPromotions && appliedPromotions.length > 0 && (
              <tr style={{ backgroundColor: '#fdf2f8' }}>
                <td colSpan={8} style={{ padding: '8px 12px', color: '#db2777', fontWeight: 600 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {appliedPromotions.map((promo, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag size={14} className="text-pink-600" />
                        <span>Khuyến mại: {promo}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Chân giỏ hàng cố định: Ghi chú đơn & Tổng tiền hàng */}
      <div className="pos-cart-footer-bar">
        <div className="pos-cart-footer-note">
          <input
            type="text"
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value)}
            maxLength={500}
            placeholder="Ghi chú đơn hàng"
            className="pos-input"
            style={{ width: '100%' }}
          />
        </div>
        <div className="pos-cart-footer-total">
          <span>Tổng tiền hàng: <b>{totalQuantity}</b> món</span>
          <span className="pos-cart-footer-divider">|</span>
          <b className="pos-cart-footer-amount">
            {totalItemAmount.toLocaleString('vi-VN')} đ
          </b>
        </div>
      </div>
    </div>
  );
};
