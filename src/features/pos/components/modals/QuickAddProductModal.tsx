import { useState } from 'react';
import type { FC } from 'react';
import type { Product } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndAddToCart: (product: Product) => void;
}

export const QuickAddProductModal: FC<Props> = ({ isOpen, onClose, onSaveAndAddToCart }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('Cái');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('snack_candy');
  const [initialStock, setInitialStock] = useState<number>(10);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Vui lòng nhập tên sản phẩm!');
      return;
    }
    if (!sellingPrice || Number(sellingPrice) <= 0) {
      alert('Vui lòng nhập giá bán hợp lệ!');
      return;
    }

    const generatedSku = sku.trim() || `SP${Math.floor(100000 + Math.random() * 900000)}`;
    const newProduct: Product = {
      id: `sp-quick-${Date.now()}`,
      sku: generatedSku,
      barcode: `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: name.trim(),
      baseUnit: unit.trim() || 'Cái',
      basePrice: Number(sellingPrice),
      costPrice: costPrice ? Number(costPrice) : Math.round(Number(sellingPrice) * 0.7),
      quantityOnHand: initialStock,
      category,
      batchCode: `LOT-${new Date().getFullYear()}`,
      expiryDate: '2027-12-31',
    };

    onSaveAndAddToCart(newProduct);
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 620 }}>
        <div className="pos-modal-header">
          <b>＋ Thêm nhanh hàng hóa mới</b>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pos-modal-body">
          <table className="pos-form-table" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td width="25%">Tên hàng (*):</td>
                <td colSpan={3}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên sản phẩm..."
                    className="pos-input"
                    style={{ fontWeight: 600, width: '100%' }}
                  />
                </td>
              </tr>
              <tr>
                <td>Mã / Barcode:</td>
                <td width="30%">
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Mã tự động"
                    className="pos-input"
                    style={{ width: '100%' }}
                  />
                </td>
                <td width="20%">Đơn vị tính:</td>
                <td width="25%">
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="pos-input"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>
              <tr>
                <td>Giá bán (*):</td>
                <td>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="pos-input"
                      style={{ fontWeight: 700, color: 'var(--blue-primary)', width: '100%', paddingRight: 28 }}
                    />
                    <span style={{ position: 'absolute', right: 12, fontSize: 13, fontWeight: 600, color: '#64748b', pointerEvents: 'none' }}>đ</span>
                  </div>
                </td>
                <td>Giá vốn:</td>
                <td>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="pos-input"
                      style={{ width: '100%', paddingRight: 28 }}
                    />
                    <span style={{ position: 'absolute', right: 12, fontSize: 13, fontWeight: 600, color: '#64748b', pointerEvents: 'none' }}>đ</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Nhóm hàng:</td>
                <td>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="pos-select"
                    style={{ width: '100%' }}
                  >
                    <option value="beverage">Đồ uống</option>
                    <option value="noodle_food">Mì & Thực phẩm</option>
                    <option value="snack_candy">Bánh kẹo & Snack</option>
                    <option value="dairy">Sữa & Chế phẩm</option>
                    <option value="household">Gia dụng & Hóa mỹ phẩm</option>
                  </select>
                </td>
                <td>Tồn kho ban đầu:</td>
                <td>
                  <input
                    type="number"
                    value={initialStock}
                    onChange={(e) => setInitialStock(Number(e.target.value))}
                    className="pos-input"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary" onClick={onClose}>
            Bỏ qua
          </button>
          <button type="button" className="pos-btn-primary" onClick={handleSubmit}>
            <b>✓ Lưu hàng hóa & Thêm vào giỏ</b>
          </button>
        </div>
      </div>
    </div>
  );
};
