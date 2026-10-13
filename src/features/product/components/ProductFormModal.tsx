import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, HelpCircle } from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: ProductItem | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Partial<ProductItem>, saveAndAddNew?: boolean) => void;
  onOpenCreateCategoryModal: () => void;
  userRole?: string; // e.g. "StoreOwner" | "Cashier"
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  categories,
  onClose,
  onSave,
  onOpenCreateCategoryModal,
  userRole = 'StoreOwner',
}) => {
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [baseUnit, setBaseUnit] = useState('Gói');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [maxStock, setMaxStock] = useState<number>(9999);
  const [vatRate, setVatRate] = useState<number>(8);
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [uomConversions, setUomConversions] = useState<UomConversion[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const isEditing = Boolean(productToEdit);
  const hasTransactions = productToEdit?.hasTransactions || false;

  useEffect(() => {
    if (productToEdit) {
      setProductCode(productToEdit.productCode);
      setBarcode(productToEdit.barcode);
      setProductName(productToEdit.productName);
      setCategoryId(productToEdit.categoryId);
      setBaseUnit(productToEdit.baseUnit);
      setSellingPrice(productToEdit.sellingPrice);
      setCostPrice(productToEdit.costPrice || 0);
      setMinStock(productToEdit.minStock || 0);
      setMaxStock(productToEdit.maxStock || 9999);
      setVatRate(productToEdit.vatRate || 8);
      setDescription(productToEdit.description || '');
      setInternalNote(productToEdit.internalNote || '');
      setUomConversions(productToEdit.uomConversions || []);
      setErrorMsg('');
      setWarningMsg('');
    } else {
      setProductCode('');
      setBarcode('');
      setProductName('');
      setCategoryId(categories[0]?.id || '');
      setBaseUnit('Gói');
      setSellingPrice(0);
      setCostPrice(0);
      setMinStock(0);
      setMaxStock(9999);
      setVatRate(8);
      setDescription('');
      setInternalNote('');
      setUomConversions([]);
      setErrorMsg('');
      setWarningMsg('');
    }
  }, [productToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const handleAddUom = () => {
    const newUom: UomConversion = {
      id: `uom-${Date.now()}`,
      unitName: '',
      conversionRate: 2,
      barcode: '',
      price: sellingPrice * 2,
    };
    setUomConversions([...uomConversions, newUom]);
  };

  const handleUpdateUom = (id: string, field: keyof UomConversion, value: any) => {
    setUomConversions(
      uomConversions.map((u) => (u.id === id ? { ...u, [field]: value } : u))
    );
  };

  const handleRemoveUom = (id: string) => {
    setUomConversions(uomConversions.filter((u) => u.id !== id));
  };

  const handleSubmit = (saveAndAddNew: boolean = false) => {
    if (!productName.trim()) {
      setErrorMsg('Vui lòng nhập tên hàng hóa.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Vui lòng chọn nhóm hàng.');
      return;
    }
    if (!baseUnit.trim()) {
      setErrorMsg('Vui lòng nhập đơn vị tính cơ bản.');
      return;
    }
    if (sellingPrice < costPrice && costPrice > 0 && !warningMsg) {
      setWarningMsg('Cảnh báo MSG12: Giá bán thấp hơn giá vốn nhập hàng! Nhấn Lưu lần nữa nếu bạn chắc chắn.');
      return;
    }

    // Auto generate product code if blank
    const finalCode = productCode.trim() || `SP${Math.floor(100000 + Math.random() * 900000)}`;
    const finalBarcode = barcode.trim() || `893${Math.floor(100000000 + Math.random() * 900000000)}`;
    const selectedCategory = categories.find((c) => c.id === categoryId);

    const payload: Partial<ProductItem> = {
      productCode: finalCode,
      barcode: finalBarcode,
      productName: productName.trim(),
      categoryId,
      categoryName: selectedCategory ? selectedCategory.name : 'Khác',
      baseUnit: baseUnit.trim(),
      sellingPrice,
      costPrice: userRole === 'StoreOwner' ? costPrice : productToEdit?.costPrice ?? 0,
      minStock,
      maxStock,
      vatRate,
      description,
      internalNote,
      uomConversions,
      isCombo: false,
    };

    onSave(payload, saveAndAddNew);
    if (!saveAndAddNew) {
      onClose();
    } else {
      setProductCode('');
      setBarcode('');
      setProductName('');
      setSellingPrice(0);
      setCostPrice(0);
      setUomConversions([]);
      setErrorMsg('');
      setWarningMsg('');
    }
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="custom-modal-header">
          <h3>{isEditing ? `Chỉnh sửa hàng hóa - ${productToEdit?.productName}` : 'Tạo hàng hóa mới'}</h3>
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

          {warningMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              <span>{warningMsg}</span>
            </div>
          )}

          {/* Khối 1: Thông tin cơ bản */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>Thông tin cơ bản</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Mã hàng
                </label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Mã tự động sinh (SPxxxxxx)"
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
                  placeholder="Nhập mã vạch (EAN-13, Code 128)"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Tên hàng <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Nhập tên sản phẩm (Bắt buộc)"
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
                  <option value="">-- Chọn nhóm hàng --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Thuế suất VAT (%)
                </label>
                <select
                  className="filter-select"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                >
                  <option value={0}>0% (Không chịu thuế)</option>
                  <option value={5}>5%</option>
                  <option value={8}>8% (Giảm thuế)</option>
                  <option value={10}>10% (Tiêu chuẩn)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Khối 2: Giá & Định mức tồn kho */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>Giá bán & Định mức kho</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Giá bán lẻ (đ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  className="filter-input"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  min={0}
                />
              </div>

              {userRole === 'StoreOwner' && (
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    Giá vốn nhập (đ)
                  </label>
                  <input
                    type="number"
                    className="filter-input"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    min={0}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Tồn tối thiểu (Min)
                </label>
                <input
                  type="number"
                  className="filter-input"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Tồn tối đa (Max)
                </label>
                <input
                  type="number"
                  className="filter-input"
                  value={maxStock}
                  onChange={(e) => setMaxStock(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          </fieldset>

          {/* Khối 3: Đơn vị tính & Quy đổi giá */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>
              Đơn vị tính & Quy đổi (Multi-UOM)
            </legend>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Đơn vị cơ bản (Base UOM) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {hasTransactions && (
                  <span
                    title="Đơn vị tính cơ bản không thể chỉnh sửa khi đã phát sinh giao dịch kho hoặc hóa đơn (BR-PROD-01)."
                    style={{ color: '#dc2626', cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                  >
                    <HelpCircle size={14} /> Khóa bất biến sau giao dịch
                  </span>
                )}
              </div>
              <input
                type="text"
                className="filter-input"
                style={{
                  maxWidth: 240,
                  backgroundColor: hasTransactions ? '#f1f5f9' : '#ffffff',
                  cursor: hasTransactions ? 'not-allowed' : 'text',
                }}
                disabled={hasTransactions}
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                placeholder="Ví dụ: Lon, Gói, Chai, Kg"
              />
            </div>

            {/* Bảng quy đổi ĐVT */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Đơn vị quy đổi thêm</span>
                <button
                  type="button"
                  className="btn-secondary-white"
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={handleAddUom}
                >
                  <Plus size={13} /> Thêm đơn vị quy đổi
                </button>
              </div>

              {uomConversions.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>Tên đơn vị</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 140 }}>
                        Giá trị quy đổi
                      </th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>Mã vạch riêng</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 140 }}>Giá bán</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {uomConversions.map((uom) => (
                      <tr key={uom.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            className="filter-input"
                            placeholder="Ví dụ: Lốc, Thùng"
                            value={uom.unitName}
                            onChange={(e) => handleUpdateUom(uom.id, 'unitName', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>1 {uom.unitName || 'đv'} =</span>
                            <input
                              type="number"
                              className="filter-input"
                              style={{ width: 70 }}
                              value={uom.conversionRate}
                              onChange={(e) => handleUpdateUom(uom.id, 'conversionRate', Number(e.target.value))}
                              min={2}
                            />
                            <span style={{ fontSize: 12, color: '#64748b' }}>{baseUnit}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            className="filter-input"
                            placeholder="Mã vạch quy đổi"
                            value={uom.barcode || ''}
                            onChange={(e) => handleUpdateUom(uom.id, 'barcode', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="number"
                            className="filter-input"
                            value={uom.price}
                            onChange={(e) => handleUpdateUom(uom.id, 'price', Number(e.target.value))}
                            min={0}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="category-edit-btn"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleRemoveUom(uom.id)}
                            title="Xóa đơn vị này"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#94a3b8', textAlign: 'center' }}>
                  Chưa có đơn vị quy đổi (Chỉ bán theo đơn vị cơ bản: {baseUnit})
                </div>
              )}
            </div>
          </fieldset>

          {/* Khối 4: Mô tả & Ghi chú */}
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
            <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>Mô tả & Ghi chú</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Mô tả chi tiết sản phẩm
                </label>
                <textarea
                  className="filter-input"
                  rows={3}
                  placeholder="Nhập thông tin giới thiệu sản phẩm..."
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
                  placeholder="Ghi chú dành riêng cho nhân viên cửa hàng..."
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
          {!isEditing && (
            <button
              type="button"
              className="btn-secondary-white"
              style={{ color: '#0F766E', borderColor: '#0F766E' }}
              onClick={() => handleSubmit(true)}
            >
              Lưu & Thêm mới
            </button>
          )}
          <button type="button" className="btn-primary-teal" onClick={() => handleSubmit(false)}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};
