import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  AlertCircle,
  Camera,
  ChevronUp,
  ChevronDown,
  Save,
  Search,
  Check,
  Folder,
  Plus,
  Loader2,
} from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: ProductItem | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Partial<ProductItem>, saveAndAddNew?: boolean) => Promise<void> | void;
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

  // Category Searchable Dropdown state (phong cách tương tự EmployeeFormModal)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchKeyword, setCategorySearchKeyword] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Reset dropdown khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setIsCategoryDropdownOpen(false);
      setCategorySearchKeyword('');
    }
  }, [isOpen]);

  const filteredCategories = categories.filter((c) => {
    const kw = categorySearchKeyword.trim().toLowerCase();
    if (!kw) return true;
    return (
      c.name.toLowerCase().includes(kw) ||
      (c.code && c.code.toLowerCase().includes(kw))
    );
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Giá vốn, giá bán & Thuế VAT
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(0);

  // 3. Tồn kho & Định mức cảnh báo
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [maxStock, setMaxStock] = useState<number>(1000);
  const [hasBatches, setHasBatches] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Trạng thái lưu (loading)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        setMaxStock(productToEdit.maxStock ?? 1000);
        setVatRate(productToEdit.vatRate ?? 0);
        setHasBatches(productToEdit.hasBatches ?? false);
        setIsFavorite(productToEdit.isFavorite ?? false);
        setIsSubmitting(false);

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
        setMaxStock(1000);
        setVatRate(0);
        setHasBatches(false);
        setIsFavorite(false);
        setIsSubmitting(false);

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

  // Image Upload handler (Cloudinary Direct Unsigned Upload)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh không được vượt quá 5 MB!');
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrorMsg('');
      const secureUrl = await uploadImageToCloudinary(file);
      setImages((prev) => [...prev, secureUrl]);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình .env.'
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  // Submit Handler
  const handleSubmit = async (saveAndAddNew: boolean = false) => {
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
    if (minStock < 0) {
      setErrorMsg('Định mức tồn thấp nhất không được nhỏ hơn 0.');
      return;
    }
    if (maxStock < minStock) {
      setErrorMsg('Định mức tồn cao nhất không được nhỏ hơn định mức tồn thấp nhất.');
      return;
    }
    if (minStock < 0) {
      setErrorMsg('Định mức tồn thấp nhất không được nhỏ hơn 0.');
      return;
    }
    if (maxStock < minStock) {
      setErrorMsg('Định mức tồn cao nhất không được nhỏ hơn định mức tồn thấp nhất.');
      return;
    }
    if (sellingPrice < costPrice && costPrice > 0 && !warningMsg) {
      setWarningMsg('Cảnh báo: Giá bán đang thấp hơn giá vốn! Nhấn Lưu lần nữa để xác nhận.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setWarningMsg('');

      const selectedCategory = categories.find((c) => c.id === categoryId);

      const payload: Partial<ProductItem> = {
        productCode: productCode.trim() || undefined,
        barcode: barcode.trim() || undefined,
        productName: productName.trim(),
        categoryId,
        categoryName: selectedCategory ? selectedCategory.name : 'Khác',
        imageUrl: images[0] || undefined,
        baseUnit: baseUnit.trim() || 'Cái',
        sellingPrice,
        costPrice: userRole === 'StoreOwner' ? costPrice : productToEdit?.costPrice ?? 0,
        onHand: initialStock,
        minStock,
        maxStock,
        vatRate,
        hasBatches,
        isFavorite,
        description: description.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        uomConversions,
      };

      await onSave(payload, saveAndAddNew);

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
        setMinStock(0);
        setMaxStock(1000);
        setBaseUnit('Cái');
        setBaseUnitPrice(0);
        setUomConversions([]);
        setDescription('');
        setInternalNote('');
        setHasBatches(false);
        setIsFavorite(false);
        setVatRate(0);
        setErrorMsg('');
        setWarningMsg('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu hàng hóa.');
    } finally {
      setIsSubmitting(false);
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
            disabled={isSubmitting}
            title="Đóng"
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

                {/* (4) Nhóm hàng & (17) Tạo mới - Searchable Dropdown */}
                <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
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

                  {/* Trigger Box */}
                  <div
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: 38,
                      padding: '6px 12px',
                      background: '#FFFFFF',
                      border: isCategoryDropdownOpen ? '1.5px solid #0D9488' : '1px solid #CBD5E1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      boxShadow: isCategoryDropdownOpen ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <Folder size={16} color={selectedCategory ? '#0F766E' : '#94A3B8'} style={{ flexShrink: 0 }} />
                      {selectedCategory ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {selectedCategory.name}
                          </span>
                          {selectedCategory.code && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: '1px 6px',
                                background: '#F1F5F9',
                                color: '#64748B',
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              {selectedCategory.code}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: '#94A3B8' }}>
                          Chọn nhóm hàng (Bắt buộc)...
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedCategory && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryId('');
                          }}
                          title="Bỏ chọn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                        >
                          <X size={13} />
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        color="#64748B"
                        style={{
                          transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </div>

                  {/* Dropdown Menu Panel */}
                  {isCategoryDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1050,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Search Bar */}
                      <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '6px 10px',
                          }}
                        >
                          <Search size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                          <input
                            type="text"
                            value={categorySearchKeyword}
                            onChange={(e) => setCategorySearchKeyword(e.target.value)}
                            placeholder="Tìm kiếm nhóm hàng theo tên, mã..."
                            style={{
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              width: '100%',
                              fontSize: 13,
                              color: '#1E293B',
                            }}
                            autoFocus
                          />
                          {categorySearchKeyword && (
                            <button
                              type="button"
                              onClick={() => setCategorySearchKeyword('')}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#94A3B8',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Danh sách categories */}
                      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {filteredCategories.length === 0 ? (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                            <div>Không tìm thấy nhóm hàng nào phù hợp.</div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCategoryDropdownOpen(false);
                                onOpenCreateCategoryModal();
                              }}
                              style={{
                                marginTop: 8,
                                background: 'none',
                                border: 'none',
                                color: '#0F766E',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              + Bấm vào đây để tạo nhóm mới
                            </button>
                          </div>
                        ) : (
                          filteredCategories.map((c) => {
                            const isSelected = c.id === categoryId;
                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setCategoryId(c.id);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '9px 12px',
                                  cursor: 'pointer',
                                  background: isSelected ? '#F0FDFA' : 'transparent',
                                  borderLeft: isSelected ? '3px solid #0D9488' : '3px solid transparent',
                                  transition: 'background 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <Folder
                                    size={15}
                                    color={isSelected ? '#0F766E' : '#94A3B8'}
                                    style={{ flexShrink: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: isSelected ? 600 : 400,
                                      color: isSelected ? '#0F766E' : '#1E293B',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {c.name}
                                  </span>
                                  {c.code && (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        padding: '1px 5px',
                                        background: isSelected ? '#CCFBF1' : '#F1F5F9',
                                        color: isSelected ? '#0F766E' : '#64748B',
                                        borderRadius: 4,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {c.code}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {c.productCount !== undefined && (
                                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                                      {c.productCount} SP
                                    </span>
                                  )}
                                  {isSelected && <Check size={16} color="#0D9488" style={{ flexShrink: 0 }} />}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer tạo mới nhanh */}
                      <div
                        style={{
                          padding: '8px 12px',
                          borderTop: '1px solid #F1F5F9',
                          background: '#F8FAFC',
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            onOpenCreateCategoryModal();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0F766E',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 6px',
                          }}
                        >
                          <Plus size={14} />
                          Tạo mới nhóm hàng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: (5) Khung tải ảnh lên Cloudinary */}
              <div
                style={{
                  border: isUploadingImage ? '1.5px dashed #0D9488' : '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: 14,
                  backgroundColor: isUploadingImage ? '#F0FDFA' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: 180,
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                  disabled={isUploadingImage || isSubmitting}
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
                  {isUploadingImage ? (
                    <>
                      <Loader2
                        size={28}
                        color="#0D9488"
                        style={{
                          marginBottom: 8,
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F766E', marginBottom: 4 }}>
                        Đang tải lên Cloudinary...
                      </span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        Vui lòng chờ trong giây lát
                      </span>
                    </>
                  ) : (
                    <>
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
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        + Thêm ảnh
                      </button>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        Lưu trữ đám mây Cloudinary (Tối đa 5MB)
                      </span>
                    </>
                  )}
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

            <div style={{ display: 'grid', gridTemplateColumns: userRole === 'StoreOwner' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20 }}>
              {/* (6) Giá vốn - Chỉ Chủ cửa hàng mới xem/sửa theo BR-SEC-01 */}
              {userRole === 'StoreOwner' && (
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
              )}

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

              {/* Thuế suất VAT (%) */}
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
                  Thuế suất VAT (%)
                </label>
                <select
                  className="filter-select"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                >
                  <option value={0}>0% (Nông sản / Miễn thuế)</option>
                  <option value={5}>5% (Thực phẩm thiết yếu)</option>
                  <option value={8}>8% (Ưu đãi theo NĐ 94/2023)</option>
                  <option value={10}>10% (Tiêu chuẩn)</option>
                </select>
              </div>
            </div>

            {/* Thuộc tính nâng cao: Quản lý theo lô & Bán chạy */}
            <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={hasBatches}
                  onChange={(e) => setHasBatches(e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>Quản lý theo lô & hạn sử dụng (FEFO)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>Đánh dấu hàng bán chạy / yêu thích (Ưu tiên POS)</span>
              </label>
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
            disabled={isSubmitting}
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
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu & Thêm hàng mới'}
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
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
          >
            <Save size={16} />
            <span>{isSubmitting ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Lưu')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
