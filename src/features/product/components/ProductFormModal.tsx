import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  AlertCircle,
  Camera,
  ChevronUp,
  ChevronDown,
  Save,
} from 'lucide-react';
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
  // 1. Thông tin cơ bản
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Giá vốn, giá bán
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  // 3. Tồn kho & Định mức cảnh báo
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [maxStock, setMaxStock] = useState<number>(999999999);

  // 4. Đơn vị tính & Quy đổi
  const [isUomExpanded, setIsUomExpanded] = useState<boolean>(true);
  const [baseUnit, setBaseUnit] = useState('chai');
  const [baseUnitPrice, setBaseUnitPrice] = useState<number>(0);
  const [uomConversions, setUomConversions] = useState<UomConversion[]>([]);

  // 5. Mô tả & Ghi chú sản phẩm
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const isEditing = Boolean(productToEdit);
  const hasTransactions = productToEdit?.hasTransactions || false;

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setProductCode(productToEdit.productCode || '');
        setBarcode(productToEdit.barcode || '');
        setProductName(productToEdit.productName || '');
        setCategoryId(productToEdit.categoryId || '');
        setImages(productToEdit.imageUrl ? [productToEdit.imageUrl] : []);

        setCostPrice(productToEdit.costPrice || 0);
        setSellingPrice(productToEdit.sellingPrice || 0);

        setInitialStock(productToEdit.onHand || 0);
        setMinStock(productToEdit.minStock ?? 0);
        setMaxStock(productToEdit.maxStock ?? 999999999);

        setBaseUnit(productToEdit.baseUnit || 'chai');
        setBaseUnitPrice(productToEdit.sellingPrice || 0);
        setUomConversions(productToEdit.uomConversions || []);

        setDescription(productToEdit.description || '');
        setInternalNote(productToEdit.internalNote || '');

        setErrorMsg('');
        setWarningMsg('');
      } else {
        setProductCode('');
        setBarcode('');
        setProductName('');
        setCategoryId(categories[0]?.id || '');
        setImages([]);

        setCostPrice(0);
        setSellingPrice(0);

        setInitialStock(0);
        setMinStock(0);
        setMaxStock(999999999);

        setBaseUnit('chai');
        setBaseUnitPrice(0);
        setUomConversions([]);

        setDescription('');
        setInternalNote('');

        setErrorMsg('');
        setWarningMsg('');
      }
    }
  }, [productToEdit, isOpen]);

  // Khi tạo mới nhóm hàng thành công: tự động chọn nhóm hàng mới mà không làm mất dữ liệu đang nhập
  const prevCatCountRef = useRef(categories.length);
  useEffect(() => {
    if (categories.length > prevCatCountRef.current) {
      const latestCat = categories[categories.length - 1];
      if (latestCat) {
        setCategoryId(latestCat.id);
      }
    }
    prevCatCountRef.current = categories.length;
  }, [categories]);

  // Sync selling price with base unit price if not edited separately
  const handleSellingPriceChange = (val: number) => {
    setSellingPrice(val);
    setBaseUnitPrice(val);
  };

  if (!isOpen) return null;

  // Add UOM conversion row
  const handleAddUom = () => {
    const newUom: UomConversion = {
      id: `uom-${Date.now()}`,
      unitName: '',
      conversionRate: 10,
      barcode: '',
      price: sellingPrice > 0 ? sellingPrice * 10 : 0,
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

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Mỗi ảnh không được vượt quá 2 MB!');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImages((prev) => [...prev, uploadEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  // Submit Handler
  const handleSubmit = (saveAndAddNew: boolean = false) => {
    if (!productName.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm (Bắt buộc).');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Vui lòng chọn nhóm hàng (Bắt buộc).');
      return;
    }
    if (!baseUnit.trim()) {
      setErrorMsg('Vui lòng nhập tên đơn vị cơ bản.');
      return;
    }
    if (sellingPrice < costPrice && costPrice > 0 && !warningMsg) {
      setWarningMsg('Cảnh báo: Giá bán đang thấp hơn giá vốn! Nhấn Lưu lần nữa để xác nhận.');
      return;
    }

    const finalCode = productCode.trim() || `SP${Math.floor(100000 + Math.random() * 900000)}`;
    const finalBarcode = barcode.trim() || `893${Math.floor(100000000 + Math.random() * 900000000)}`;
    const selectedCategory = categories.find((c) => c.id === categoryId);

    const payload: Partial<ProductItem> = {
      productCode: finalCode,
      barcode: finalBarcode,
      productName: productName.trim(),
      categoryId,
      categoryName: selectedCategory ? selectedCategory.name : 'Khác',
      imageUrl: images[0] || undefined,
      baseUnit: baseUnit.trim(),
      sellingPrice,
      costPrice: userRole === 'StoreOwner' ? costPrice : productToEdit?.costPrice ?? 0,
      onHand: initialStock,
      minStock,
      maxStock,
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
      setImages([]);
      setSellingPrice(0);
      setCostPrice(0);
      setInitialStock(0);
      setUomConversions([]);
      setErrorMsg('');
      setWarningMsg('');
    }
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 960 }}>
        {/* ========================================================= */}
        {/* HEADER: Tiêu đề & Nút đóng (19)                           */}
        {/* ========================================================= */}
        <div className="custom-modal-header" style={{ padding: '16px 24px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            {isEditing ? `Chỉnh sửa hàng hóa - ${productToEdit?.productName}` : 'Tạo hàng hóa'}
          </h3>
          <button
            type="button"
            className="custom-modal-close"
            onClick={onClose}
            title="Đóng (19)"
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================================= */}
        {/* BODY FORM                                                 */}
        {/* ========================================================= */}
        <div
          className="custom-modal-body"
          style={{
            maxHeight: 'calc(88vh - 130px)',
            overflowY: 'auto',
            padding: '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 500,
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
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <AlertCircle size={16} />
              <span>{warningMsg}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* 1. THÔNG TIN CƠ BẢN (1, 2, 3, 4, 5, 17)                   */}
          {/* ───────────────────────────────────────────────────────── */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 14px 0',
                paddingBottom: 6,
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              Thông tin cơ bản
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 280px',
                gap: 24,
                alignItems: 'start',
              }}
            >
              {/* Cột trái: (1) Mã hàng, (2) Mã vạch, (3) Tên hàng, (4) Nhóm hàng */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* (1) Mã hàng */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      Mã hàng
                    </label>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Mã tự động sinh"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                    />
                  </div>

                  {/* (2) Mã vạch */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      Mã vạch
                    </label>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Nhập mã vạch (Barcode)"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                  </div>
                </div>

                {/* (3) Tên hàng */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    Tên hàng <span style={{ color: '#EF4444' }}>*</span>
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

                {/* (4) Nhóm hàng & (17) Tạo mới */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      Nhóm hàng <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={onOpenCreateCategoryModal}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0F766E',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
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
                    <option value="">Chọn nhóm hàng (Bắt buộc)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cột phải: (5) Khung tải ảnh */}
              <div
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: 14,
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: 180,
                  boxSizing: 'border-box',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px 10px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <Camera size={26} color="#475569" style={{ marginBottom: 8 }} />
                  <button
                    type="button"
                    className="btn-secondary-white"
                    style={{
                      padding: '5px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderColor: '#94A3B8',
                      marginBottom: 6,
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    + Thêm ảnh
                  </button>
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    Mỗi ảnh không quá 2 MB
                  </span>
                </div>

                {/* Hàng ảnh thumbnail preview */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 10,
                    width: '100%',
                    paddingTop: 10,
                    borderTop: '1px solid #E2E8F0',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {images.length > 0 ? (
                    images.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={img}
                          alt={`thumb-${idx}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: 10,
                            cursor: 'pointer',
                            padding: '1px 3px',
                            lineHeight: 1,
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    // 4 ô thumbnail placeholder như wireframe
                    [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: 14, opacity: 0.4 }}>🖼️</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 2. GIÁ VỐN, GIÁ BÁN (6, 7)                                */}
          {/* ───────────────────────────────────────────────────────── */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 14px 0',
                paddingBottom: 6,
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              Giá vốn, giá bán
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* (6) Giá vốn */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Giá vốn
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    style={{ paddingRight: 32 }}
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    min={0}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#64748B',
                      pointerEvents: 'none',
                    }}
                  >
                    đ
                  </span>
                </div>
              </div>

              {/* (7) Giá bán */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Giá bán <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    style={{ paddingRight: 32 }}
                    value={sellingPrice}
                    onChange={(e) => handleSellingPriceChange(Number(e.target.value))}
                    min={0}
                    required
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#64748B',
                      pointerEvents: 'none',
                    }}
                  >
                    đ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 3. TỒN KHO & ĐỊNH MỨC CẢNH BÁO (11, 10)                     */}
          {/* ───────────────────────────────────────────────────────── */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 4px 0',
              }}
            >
              Tồn kho & Định mức cảnh báo
            </h4>
            <p
              style={{
                fontSize: 12,
                color: '#64748B',
                margin: '0 0 14px 0',
                paddingBottom: 6,
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              Quản lý số lượng tồn kho và định mức tồn. Khi chạm định mức, hệ thống sẽ gửi cảnh báo nhập hàng.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              {/* (11) Tồn kho ban đầu */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Tồn kho ban đầu
                </label>
                <input
                  type="number"
                  className="filter-input"
                  value={initialStock}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                  min={0}
                />
              </div>

              {/* (10) Định mức tồn thấp nhất */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Định mức tồn thấp nhất
                </label>
                <input
                  type="number"
                  className="filter-input"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  min={0}
                />
              </div>

              {/* (10) Định mức tồn cao nhất */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Định mức tồn cao nhất
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
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 4. QUẢN LÝ THEO ĐƠN VỊ TÍNH VÀ THUỘC TÍNH (8, 7, 9, 18)   */}
          {/* ───────────────────────────────────────────────────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                paddingBottom: 6,
                borderBottom: '1px solid #E2E8F0',
                marginBottom: 10,
              }}
              onClick={() => setIsUomExpanded(!isUomExpanded)}
            >
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                Quản lý theo đơn vị tính và thuộc tính^
              </h4>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: 0,
                }}
              >
                {isUomExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {isUomExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h5 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: '0 0 4px 0' }}>
                    Đơn vị tính
                  </h5>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                    Thêm đơn vị bán hoặc nhập như chai, lốc, thùng. Đặt công thức quy đổi để tính nhanh giá và tồn kho. Ví dụ: 1 lốc = 4 chai, 1 thùng = 20 lốc.
                  </p>
                </div>

                {/* Dòng đơn vị cơ bản: (8) Tên đơn vị cơ bản & (7) Giá bán */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 220 }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Tên đơn vị cơ bản
                    </label>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="chai"
                      value={baseUnit}
                      disabled={hasTransactions}
                      onChange={(e) => setBaseUnit(e.target.value)}
                    />
                  </div>

                  <div style={{ width: 180 }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Giá bán
                    </label>
                    <input
                      type="number"
                      className="filter-input"
                      value={baseUnitPrice}
                      onChange={(e) => setBaseUnitPrice(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>

                {/* Danh sách đơn vị quy đổi (9) */}
                {uomConversions.map((uom) => (
                  <div
                    key={uom.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 0',
                    }}
                  >
                    {/* Tên đơn vị */}
                    <div style={{ width: 220 }}>
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="thùng, lốc..."
                        value={uom.unitName}
                        onChange={(e) => handleUpdateUom(uom.id, 'unitName', e.target.value)}
                      />
                    </div>

                    <span style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>=</span>

                    {/* Giá trị quy đổi */}
                    <div style={{ width: 100 }}>
                      <input
                        type="number"
                        className="filter-input"
                        value={uom.conversionRate}
                        onChange={(e) =>
                          handleUpdateUom(uom.id, 'conversionRate', Number(e.target.value))
                        }
                        min={2}
                      />
                    </div>

                    {/* Text tên đơn vị cơ bản */}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 40 }}>
                      {baseUnit || 'đơn vị'}
                    </span>

                    {/* Giá bán đơn vị quy đổi */}
                    <div style={{ width: 180 }}>
                      <input
                        type="number"
                        className="filter-input"
                        placeholder="Giá bán"
                        value={uom.price}
                        onChange={(e) =>
                          handleUpdateUom(uom.id, 'price', Number(e.target.value))
                        }
                        min={0}
                      />
                    </div>

                    {/* Nút xóa */}
                    <button
                      type="button"
                      onClick={() => handleRemoveUom(uom.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Xóa đơn vị"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {/* (18) + Thêm đơn vị */}
                <div>
                  <button
                    type="button"
                    onClick={handleAddUom}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0F766E',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    + Thêm đơn vị
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 5. MÔ TẢ & GHI CHÚ SẢN PHẨM (12, 13)                      */}
          {/* ───────────────────────────────────────────────────────── */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 14px 0',
                paddingBottom: 6,
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              Mô tả & Ghi chú sản phẩm
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* (12) Mô tả chi tiết */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Mô tả chi tiết
                </label>
                <textarea
                  className="filter-input"
                  rows={3}
                  placeholder="Nhập thông tin giới thiệu, thành phần, hướng dẫn sử dụng sản phẩm..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* (13) Ghi chú nội bộ */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Ghi chú nội bộ
                </label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Ghi chú dành cho thu ngân, thủ kho kiểm hàng..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FOOTER: (14) Bỏ qua, (15) Lưu & Thêm mới, (16) Lưu        */}
        {/* ========================================================= */}
        <div
          className="custom-modal-footer"
          style={{
            padding: '16px 28px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          {/* (14) Bỏ qua */}
          <button
            type="button"
            className="btn-secondary-white"
            onClick={onClose}
            style={{ borderRadius: 8, padding: '8px 18px' }}
          >
            Bỏ qua
          </button>

          {/* (15) Lưu & Thêm hàng mới */}
          {!isEditing && (
            <button
              type="button"
              className="btn-secondary-white"
              style={{
                borderRadius: 8,
                padding: '8px 18px',
                borderColor: '#CBD5E1',
              }}
              onClick={() => handleSubmit(true)}
            >
              Lưu & Thêm hàng mới
            </button>
          )}

          {/* (16) 💾 Lưu */}
          <button
            type="button"
            className="btn-primary-teal"
            style={{
              borderRadius: 8,
              padding: '8px 20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => handleSubmit(false)}
          >
            <Save size={16} />
            <span>Lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
