import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, Package } from 'lucide-react';
import type { ProductItem, Category, ComboComponent } from '../types';

interface ComboFormModalProps {
  isOpen: boolean;
  categories: Category[];
  availableProducts: ProductItem[];
  onClose: () => void;
  onSave: (combo: Partial<ProductItem>) => void;
  onOpenCreateCategoryModal: () => void;
}

export const ComboFormModal: React.FC<ComboFormModalProps> = ({
  isOpen,
  categories,
  availableProducts,
  onClose,
  onSave,
  onOpenCreateCategoryModal,
}) => {
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [baseUnit, setBaseUnit] = useState('Giỏ quà');
  const [sellingPrice, setSellingPrice] = useState<number>(200000);
  const [components, setComponents] = useState<ComboComponent[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Non-combo products available for picking
  const selectableProducts = availableProducts.filter((p) => !p.isCombo);

  const handleAddComponent = () => {
    if (!selectedProductId) return;
    const found = selectableProducts.find((p) => p.id === selectedProductId);
    if (!found) return;

    if (components.some((c) => c.productId === found.id)) {
      setErrorMsg(`Sản phẩm "${found.productName}" đã có trong danh sách thành phần!`);
      return;
    }

    const newComp: ComboComponent = {
      id: `comp-${Date.now()}`,
      productId: found.id,
      productCode: found.productCode,
      productName: found.productName,
      quantity: 1,
      costPrice: found.costPrice || 0,
      sellingPrice: found.sellingPrice,
    };

    setComponents([...components, newComp]);
    setSelectedProductId('');
    setErrorMsg('');
  };

  const handleUpdateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setComponents(
      components.map((c) => (c.id === id ? { ...c, quantity: qty } : c))
    );
  };

  const handleRemoveComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id));
  };

  // Auto calculated Total Cost Price
  const totalCost = components.reduce(
    (sum, c) => sum + c.costPrice * c.quantity,
    0
  );

  // Auto calculated Total Component Selling Price
  const totalComponentsSelling = components.reduce(
    (sum, c) => sum + c.sellingPrice * c.quantity,
    0
  );

  // Auto calculate dynamic available stock
  const dynamicStock =
    components.length > 0
      ? Math.min(
          ...components.map((c) => {
            const product = availableProducts.find((p) => p.id === c.productId);
            const onHand = product ? product.onHand : 0;
            return Math.floor(onHand / c.quantity);
          })
        )
      : 0;

  const handleSubmit = () => {
    if (!productName.trim()) {
      setErrorMsg('Vui lòng nhập tên gói combo.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Vui lòng chọn nhóm hàng.');
      return;
    }
    if (components.length === 0) {
      setErrorMsg('Vui lòng thêm ít nhất 1 hàng hóa thành phần vào combo.');
      return;
    }

    const finalCode = productCode.trim() || `CB${Math.floor(100000 + Math.random() * 900000)}`;
    const finalBarcode = barcode.trim() || `893000${Math.floor(100000 + Math.random() * 900000)}`;
    const selectedCategory = categories.find((c) => c.id === categoryId);

    const payload: Partial<ProductItem> = {
      productCode: finalCode,
      barcode: finalBarcode,
      productName: productName.trim(),
      categoryId,
      categoryName: selectedCategory ? selectedCategory.name : 'Quà tặng',
      baseUnit: baseUnit.trim() || 'Gói combo',
      sellingPrice,
      costPrice: totalCost,
      onHand: dynamicStock,
      committed: 0,
      minStock: 5,
      maxStock: 50,
      vatRate: 8,
      isCombo: true,
      comboComponents: components,
      description,
      internalNote,
      status: 'Active',
      branchStocks: [
        {
          branchId: 'b-1',
          branchName: 'Chi nhánh trung tâm',
          onHand: dynamicStock,
          available: dynamicStock,
          committed: 0,
        },
      ],
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 950 }}>
        {/* Header */}
        <div className="custom-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} color="#0F766E" />
            <h3>Tạo combo - đóng gói</h3>
          </div>
          <button type="button" className="custom-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Khối 1: Thông tin cơ bản */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>Thông tin combo</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Mã hàng
                </label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Tự động sinh (CBxxxxxx)"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Mã vạch (Barcode)
                </label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Nhập mã vạch combo"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Tên gói combo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Ví dụ: Giỏ quà Tết An Khang, Combo 3 món..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    Nhóm hàng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={onOpenCreateCategoryModal}
                    style={{ background: 'none', border: 'none', color: '#0F766E', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Tạo mới
                  </button>
                </div>
                <select
                  className="filter-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Đơn vị tính cơ bản
                </label>
                <input
                  type="text"
                  className="filter-input"
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  placeholder="Giỏ quà, Gói..."
                />
              </div>
            </div>
          </fieldset>

          {/* Khối 2: Hàng thành phần */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>
              Hàng thành phần đóng gói
            </legend>

            {/* Chọn thêm hàng thành phần */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <select
                className="filter-select"
                style={{ flex: 1 }}
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">-- Chọn sản phẩm thành phần để thêm vào combo --</option>
                {selectableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.productCode}] {p.productName} - Tồn: {p.onHand} {p.baseUnit} - Giá bán: {p.sellingPrice.toLocaleString()} đ
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary-teal"
                style={{ padding: '8px 16px' }}
                onClick={handleAddComponent}
              >
                <Plus size={16} /> Thêm vào Combo
              </button>
            </div>

            {/* Bảng chi tiết thành phần */}
            {components.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 40, textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 120 }}>Mã hàng</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>Tên hàng thành phần</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 90, textAlign: 'center' }}>Số lượng</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 110, textAlign: 'right' }}>Giá vốn</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 120, textAlign: 'right' }}>Tổng giá vốn</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 110, textAlign: 'right' }}>Giá bán</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 120, textAlign: 'right' }}>Tổng giá bán</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 40, textAlign: 'center' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c, index) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.productCode}</td>
                        <td style={{ padding: '8px 10px' }}>{c.productName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            className="filter-input"
                            style={{ width: 60, textAlign: 'center' }}
                            value={c.quantity}
                            onChange={(e) => handleUpdateQty(c.id, Number(e.target.value))}
                            min={1}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                          {c.costPrice.toLocaleString()} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                          {(c.costPrice * c.quantity).toLocaleString()} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                          {c.sellingPrice.toLocaleString()} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                          {(c.sellingPrice * c.quantity).toLocaleString()} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="category-edit-btn"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleRemoveComponent(c.id)}
                            title="Xóa khỏi combo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Dòng tổng cộng */}
                    <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '10px', textAlign: 'right' }}>Tổng cộng thành phần:</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0F766E' }}>
                        {totalCost.toLocaleString()} đ
                      </td>
                      <td />
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        {totalComponentsSelling.toLocaleString()} đ
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Chưa có mặt hàng thành phần nào. Hãy chọn sản phẩm từ dropdown ở trên.
              </div>
            )}

            {/* Chỉ số tồn kho động */}
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdfa', borderRadius: 12, border: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#134e4a' }}>
                💡 <b>Tồn kho khả dụng của Combo:</b> Tự động tính = <b>{dynamicStock}</b> {baseUnit} (dựa trên mức tồn nhỏ nhất của các thành phần)
              </span>
            </div>
          </fieldset>

          {/* Khối 3: Giá bán Combo trọn gói */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>Thiết lập giá bán Combo</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Giá bán trọn gói (đ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  className="filter-input"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Tổng giá vốn tự tính (đ)
                </label>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 18, border: '1px solid #e2e8f0', fontWeight: 700, color: '#0F766E' }}>
                  {totalCost.toLocaleString()} đ
                </div>
              </div>
            </div>
          </fieldset>

          {/* Khối 4: Mô tả & Ghi chú */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>Mô tả & Ghi chú nội bộ</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Mô tả chi tiết combo
                </label>
                <textarea
                  className="filter-input"
                  rows={2}
                  placeholder="Giới thiệu thành phần giỏ quà, hướng dẫn bảo quản..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Ghi chú nội bộ
                </label>
                <textarea
                  className="filter-input"
                  rows={2}
                  placeholder="Ghi chú nhân viên gói hàng, kho..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
              </div>
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="custom-modal-footer">
          <button type="button" className="btn-secondary-white" onClick={onClose}>
            Bỏ qua
          </button>
          <button type="button" className="btn-primary-teal" onClick={handleSubmit}>
            Lưu Combo
          </button>
        </div>
      </div>
    </div>
  );
};
