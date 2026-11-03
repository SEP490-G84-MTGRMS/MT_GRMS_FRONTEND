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
  Tag,
} from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';
import { productApi } from '../api/productApi';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: ProductItem | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Partial<ProductItem>, saveAndAddNew?: boolean, deletedUnitIds?: string[]) => Promise<void> | void;
  onOpenCreateCategoryModal: () => void;
  onDelete?: (product: ProductItem) => void;
  userRole?: string; // e.g. "StoreOwner" | "Cashier"
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  categories,
  onClose,
  onSave,
  onOpenCreateCategoryModal,
  onDelete,
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

  // Tiện ích chuẩn hóa tiếng Việt không dấu để tìm kiếm nhóm hàng
  const removeVietnameseTones = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  const filteredCategories = categories.filter((c) => {
    const kw = categorySearchKeyword.trim().toLowerCase();
    if (!kw) return true;
    const kwNoTone = removeVietnameseTones(kw);
    const nameMatch =
      c.name.toLowerCase().includes(kw) ||
      removeVietnameseTones(c.name).includes(kwNoTone);
    const codeMatch = Boolean(
      c.code &&
        (c.code.toLowerCase().includes(kw) ||
          removeVietnameseTones(c.code).includes(kwNoTone))
    );
    return nameMatch || codeMatch;
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Giá vốn, giá bán
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Trạng thái lưu (loading)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 4. Đơn vị tính & Quy đổi
  const [isUomExpanded, setIsUomExpanded] = useState<boolean>(true);
  const [baseUnit, setBaseUnit] = useState('');
  const [baseUnitPrice, setBaseUnitPrice] = useState<number>(0);
  const [uomConversions, setUomConversions] = useState<UomConversion[]>([]);
  const [deletedUnitIds, setDeletedUnitIds] = useState<string[]>([]);

  // 5. Mô tả & Ghi chú sản phẩm
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Alerts & Validation Popup
  const [warningMsg, setWarningMsg] = useState('');
  const [validationPopupMsg, setValidationPopupMsg] = useState<string>('');

  const isEditing = Boolean(productToEdit);
  const hasTransactions = productToEdit?.hasTransactions || false;

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setProductCode(productToEdit.productCode || '');
        setBarcode(productToEdit.barcode || '');
        setProductName(productToEdit.productName || '');
        setCategoryId(productToEdit.categoryId || '');
        setImages(productToEdit.imageUrls && productToEdit.imageUrls.length > 0 ? productToEdit.imageUrls : (productToEdit.imageUrl ? [productToEdit.imageUrl] : []));

        setCostPrice(productToEdit.costPrice || 0);
        setSellingPrice(productToEdit.sellingPrice || 0);
        setIsFavorite(productToEdit.isFavorite ?? false);
        setIsSubmitting(false);

        setBaseUnit(productToEdit.baseUnit || '');
        setBaseUnitPrice(productToEdit.sellingPrice || 0);
        setDeletedUnitIds([]);

        if (productToEdit.uomConversions && productToEdit.uomConversions.length > 0) {
          setUomConversions(productToEdit.uomConversions);
        } else {
          // Tự động nạp đơn vị tính từ API nếu chưa có sẵn
          productApi
            .getProductUnits(productToEdit.id)
            .then((units) => {
              if (units && units.length > 0) {
                const nonBaseUnits = units.filter((u) => !u.isBaseUnit);
                setUomConversions(
                  nonBaseUnits.map((u) => ({
                    id: u.id,
                    unitName: u.unitName,
                    conversionRate: u.conversionRate,
                    barcode: u.barcode || '',
                    price: u.price,
                    productCode: '',
                  }))
                );
              } else {
                setUomConversions([]);
              }
            })
            .catch(() => {
              setUomConversions([]);
            });
        }

        setDescription(productToEdit.description || '');
        setInternalNote(productToEdit.internalNote || '');

        setWarningMsg('');
        setValidationPopupMsg('');
      } else {
        setProductCode('');
        setBarcode('');
        setProductName('');
        setCategoryId(categories[0]?.id || '');
        setImages([]);

        setCostPrice(0);
        setSellingPrice(0);

        setIsFavorite(false);
        setIsSubmitting(false);

        setBaseUnit('');
        setBaseUnitPrice(0);
        setUomConversions([]);
        setDeletedUnitIds([]);

        setDescription('');
        setInternalNote('');

        setWarningMsg('');
        setValidationPopupMsg('');
        setPreviewImageModalUrl(null);
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

  const triggerValidationError = (msg: string) => {
    setValidationPopupMsg(msg);
  };

  // Add UOM conversion row
  const handleAddUom = () => {
    if (!baseUnit.trim()) {
      triggerValidationError('Vui lòng nhập tên đơn vị cơ bản trước khi thêm đơn vị quy đổi.');
      return;
    }
    setValidationPopupMsg('');
    const newUom: UomConversion = {
      id: `uom-${Date.now()}`,
      unitName: '',
      conversionRate: 1,
      barcode: '',
      price: sellingPrice || 0,
      productCode: productCode.trim() || 'Mã tự động',
    };
    setUomConversions([...uomConversions, newUom]);
  };

  const handleUpdateUom = (id: string, field: keyof UomConversion, value: any) => {
    setUomConversions(
      uomConversions.map((u) => {
        if (u.id !== id) return u;
        if (field === 'unitName') {
          return {
            ...u,
            unitName: String(value),
            productCode: productCode.trim() || u.productCode || 'Mã tự động',
          };
        }
        if (field === 'conversionRate') {
          const newRate = Number(value) || 0;
          // Tự động tính giá bán theo tỷ lệ quy đổi * giá bán đơn vị cơ bản
          const autoPrice = newRate > 0 && sellingPrice > 0 ? newRate * sellingPrice : u.price;
          return { ...u, conversionRate: newRate, price: autoPrice };
        }
        return { ...u, [field]: value };
      })
    );
  };

  const handleRemoveUom = (id: string) => {
    if (!id.startsWith('uom-')) {
      setDeletedUnitIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    setUomConversions(uomConversions.filter((u) => u.id !== id));
  };

  // Image Upload handler (Cloudinary Direct Unsigned Upload)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) {
        triggerValidationError(`Kích thước ảnh "${files[i].name}" không được vượt quá 5 MB!`);
        return;
      }
    }

    try {
      setIsUploadingImage(true);
      setValidationPopupMsg('');
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const secureUrl = await uploadImageToCloudinary(files[i]);
        uploaded.push(secureUrl);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      triggerValidationError(
        err?.message || 'Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình .env.'
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetMainImage = (index: number) => {
    if (index === 0 || index >= images.length) return;
    const target = images[index];
    const others = images.filter((_, idx) => idx !== index);
    setImages([target, ...others]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  // Submit Handler
  const handleSubmit = async (saveAndAddNew: boolean = false) => {
    if (!productName.trim()) {
      triggerValidationError('Vui lòng nhập tên sản phẩm (Bắt buộc).');
      return;
    }
    if (!categoryId) {
      triggerValidationError('Vui lòng chọn nhóm hàng (Bắt buộc).');
      return;
    }
    if (!baseUnit.trim()) {
      triggerValidationError('Vui lòng nhập tên đơn vị cơ bản (Bắt buộc).');
      return;
    }
    
    if (sellingPrice < costPrice && costPrice > 0 && !warningMsg) {
      setWarningMsg('Cảnh báo: Giá bán đang thấp hơn giá vốn! Nhấn Lưu lần nữa để xác nhận.');
      return;
    }

    try {
      setIsSubmitting(true);
      setWarningMsg('');
      setValidationPopupMsg('');

      const selectedCategory = categories.find((c) => c.id === categoryId);

      const payload: Partial<ProductItem> = {
        productCode: productCode.trim() || undefined,
        barcode: barcode.trim() || undefined,
        productName: productName.trim(),
        categoryId,
        categoryName: selectedCategory ? selectedCategory.name : 'Khác',
        imageUrl: images[0] || undefined,
        imageUrls: images,
        baseUnit: baseUnit.trim(),
        sellingPrice,
        costPrice: userRole === 'StoreOwner' ? costPrice : productToEdit?.costPrice ?? 0,
        isFavorite,
        description: description.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        uomConversions,
      };

      await onSave(payload, saveAndAddNew, deletedUnitIds);

      if (!saveAndAddNew) {
        onClose();
      } else {
        setProductCode('');
        setBarcode('');
        setProductName('');
        setImages([]);
        setSellingPrice(0);
        setCostPrice(0);
        setBaseUnit('');
        setBaseUnitPrice(0);
        setUomConversions([]);
        setDeletedUnitIds([]);
        setDescription('');
        setInternalNote('');
        setIsFavorite(false);
        setWarningMsg('');
        setValidationPopupMsg('');
        setPreviewImageModalUrl(null);
      }
    } catch (err: any) {
      triggerValidationError(err?.message || 'Có lỗi xảy ra khi lưu hàng hóa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 1160, width: '96vw' }}>
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
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            backgroundColor: '#F8FAFC',
          }}
        >
          {warningMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                borderRadius: 10,
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
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '18px 20px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 16px 0',
                paddingBottom: 8,
                borderBottom: '1px solid #F1F5F9',
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
                      disabled={isEditing}
                      style={isEditing ? { backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: '#64748B' } : undefined}
                      title={isEditing ? 'Mã hàng không thể thay đổi sau khi tạo' : undefined}
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
                                data-testid={`category-option-${c.id}`}
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
                  multiple
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
                    padding: images.length > 0 ? '6px 8px' : '14px 10px',
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
                  ) : images.length > 0 ? (
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 120,
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setPreviewImageModalUrl(images[0])}
                      title="Bấm để xem ảnh phóng to"
                    >
                      <img
                        src={images[0]}
                        alt="Ảnh hàng hóa chính"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          display: 'flex',
                          gap: 6,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn-secondary-white"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 6,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                          onClick={() => setPreviewImageModalUrl(images[0])}
                        >
                          <Search size={12} style={{ marginRight: 4 }} /> Xem to
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-white"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 6,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                          disabled={isSubmitting}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus size={12} style={{ marginRight: 4 }} /> Thêm ảnh
                        </button>
                      </div>
                    </div>
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
                        (Tối đa 5MB)
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
                        onClick={() => setPreviewImageModalUrl(img)}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 6,
                          border: idx === 0 ? '2px solid #0D9488' : '1.5px solid #CBD5E1',
                          overflow: 'hidden',
                          position: 'relative',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                        title={idx === 0 ? 'Ảnh đại diện (Bấm để xem to)' : 'Bấm để xem to'}
                      >
                        <img
                          src={img}
                          alt={`thumb-${idx}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {idx === 0 ? (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: '#0D9488',
                              color: '#FFFFFF',
                              fontSize: 9,
                              fontWeight: 700,
                              textAlign: 'center',
                              lineHeight: '13px',
                            }}
                          >
                            Chính
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetMainImage(idx);
                            }}
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: 'rgba(15, 23, 42, 0.75)',
                              color: '#F8FAFC',
                              fontSize: 8,
                              fontWeight: 600,
                              textAlign: 'center',
                              lineHeight: '13px',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="Đặt làm ảnh đại diện"
                          >
                            Đặt chính
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: 10,
                            cursor: 'pointer',
                            padding: '1px 4px',
                            lineHeight: 1,
                            borderRadius: '0 0 0 4px',
                          }}
                          title="Xóa ảnh"
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
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '18px 20px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 16px 0',
                paddingBottom: 8,
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              Giá vốn, giá bán
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: userRole === 'StoreOwner' ? '1fr 1fr' : '1fr', gap: 20 }}>
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
                      placeholder="0"
                      value={costPrice === 0 ? '' : costPrice}
                      onChange={(e) => setCostPrice(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      onFocus={(e) => e.target.select()}
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
                    placeholder="0"
                    value={sellingPrice === 0 ? '' : sellingPrice}
                    onChange={(e) => handleSellingPriceChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    onFocus={(e) => e.target.select()}
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

            {/* Thuộc tính nâng cao: Quản lý theo lô & Bán chạy */}
            <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
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
          {/* 4. QUẢN LÝ THEO ĐƠN VỊ TÍNH VÀ THUỘC TÍNH (8, 7, 9, 18)   */}
          {/* ───────────────────────────────────────────────────────── */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '18px 20px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                paddingBottom: 8,
                borderBottom: isUomExpanded ? '1px solid #F1F5F9' : 'none',
                marginBottom: isUomExpanded ? 14 : 0,
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
                Quản lý theo đơn vị tính và thuộc tính
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
                      placeholder="VD: Chai, Lon, Gói, Hộp..."
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
                      placeholder="0"
                      value={baseUnitPrice === 0 ? '' : baseUnitPrice}
                      onChange={(e) => setBaseUnitPrice(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      onFocus={(e) => e.target.select()}
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
                        placeholder="1"
                        value={uom.conversionRate === 0 ? '' : uom.conversionRate}
                        onChange={(e) =>
                          handleUpdateUom(uom.id, 'conversionRate', e.target.value === '' ? 0 : Number(e.target.value))
                        }
                        onFocus={(e) => e.target.select()}
                        min={1}
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
                        value={uom.price === 0 ? '' : uom.price}
                        onChange={(e) =>
                          handleUpdateUom(uom.id, 'price', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))
                        }
                        onFocus={(e) => e.target.select()}
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
                    disabled={!baseUnit.trim()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: !baseUnit.trim() ? '#94a3b8' : '#0F766E',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: !baseUnit.trim() ? 'not-allowed' : 'pointer',
                      padding: '4px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: !baseUnit.trim() ? 0.6 : 1,
                    }}
                    title={!baseUnit.trim() ? 'Vui lòng nhập tên đơn vị cơ bản trước khi thêm đơn vị' : '+ Thêm đơn vị'}
                  >
                    + Thêm đơn vị
                  </button>
                  {!baseUnit.trim() && (
                    <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 8 }}>
                      (Cần nhập tên đơn vị cơ bản trước)
                    </span>
                  )}
                </div>

                {/* BẢNG HÀNG CÙNG LOẠI (Hiển thị khi có đơn vị quy đổi) */}
                {uomConversions.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <h5 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                        Hàng cùng loại
                      </h5>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Tag size={15} />
                        <span>Thiết lập giá</span>
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 100 }}>Đơn vị</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', width: 90 }}>Quy đổi</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: 120 }}>Mã hàng</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: 130 }}>Mã vạch</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', minWidth: 110 }}>Giá vốn</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', minWidth: 110 }}>Giá bán</th>
                                                        <th style={{ padding: '10px 12px', textAlign: 'center', width: 44 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Dòng 1: Đơn vị cơ bản */}
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1E293B' }}>
                              {baseUnit || 'Đơn vị cơ bản'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <input
                                type="text"
                                disabled
                                value={1}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  textAlign: 'center',
                                  fontSize: 13,
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                type="text"
                                placeholder="Tự động"
                                value={productCode}
                                onChange={(e) => setProductCode(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  fontSize: 13,
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                type="text"
                                placeholder=""
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  fontSize: 13,
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                type="number"
                                placeholder="0"
                                value={costPrice === 0 ? '' : costPrice}
                                onChange={(e) => setCostPrice(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                onFocus={(e) => e.target.select()}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  textAlign: 'right',
                                  fontSize: 13,
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                type="number"
                                placeholder="0"
                                value={sellingPrice === 0 ? '' : sellingPrice}
                                onChange={(e) => handleSellingPriceChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                onFocus={(e) => e.target.select()}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  textAlign: 'right',
                                  fontSize: 13,
                                }}
                              />
                            </td>
                            
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                disabled
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#cbd5e1',
                                  cursor: 'not-allowed',
                                  padding: 4,
                                }}
                                title="Không thể xóa đơn vị cơ bản"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>

                          {/* Dòng 2 trở đi: Các đơn vị quy đổi */}
                          {uomConversions.map((uom) => {
                            const convertedCost = costPrice > 0 ? costPrice * (uom.conversionRate || 1) : 0;
                            
                            return (
                              <tr key={uom.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', color: '#1E293B', fontWeight: 500 }}>
                                  {uom.unitName || '(Chưa đặt tên)'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    min={1}
                                    placeholder="1"
                                    value={uom.conversionRate === 0 ? '' : uom.conversionRate}
                                    onChange={(e) =>
                                      handleUpdateUom(uom.id, 'conversionRate', e.target.value === '' ? 0 : Number(e.target.value))
                                    }
                                    onFocus={(e) => e.target.select()}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      border: '1px solid #E2E8F0',
                                      textAlign: 'center',
                                      fontSize: 13,
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <input
                                    type="text"
                                    disabled
                                    placeholder="Theo mã hàng"
                                    value={productCode.trim() || uom.productCode || 'Mã tự động'}
                                    title="Mã hàng của đơn vị quy đổi mặc định giống mã sản phẩm"
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      border: '1px solid #E2E8F0',
                                      backgroundColor: '#F1F5F9',
                                      color: '#64748B',
                                      fontSize: 13,
                                      cursor: 'not-allowed',
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <input
                                    type="text"
                                    placeholder=""
                                    value={uom.barcode || ''}
                                    onChange={(e) => handleUpdateUom(uom.id, 'barcode', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      border: '1px solid #E2E8F0',
                                      fontSize: 13,
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <input
                                    type="text"
                                    disabled
                                    value={convertedCost.toLocaleString('vi-VN')}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      border: '1px solid #E2E8F0',
                                      background: '#f1f5f9',
                                      color: '#64748b',
                                      textAlign: 'right',
                                      fontSize: 13,
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={uom.price === 0 ? '' : uom.price}
                                    onChange={(e) =>
                                      handleUpdateUom(uom.id, 'price', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))
                                    }
                                    onFocus={(e) => e.target.select()}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      border: '1px solid #E2E8F0',
                                      textAlign: 'right',
                                      fontSize: 13,
                                    }}
                                  />
                                </td>
                                
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUom(uom.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#64748B',
                                      cursor: 'pointer',
                                      padding: 4,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Xóa đơn vị quy đổi"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 5. MÔ TẢ & GHI CHÚ SẢN PHẨM (12, 13)                      */}
          {/* ───────────────────────────────────────────────────────── */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '18px 20px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 16px 0',
                paddingBottom: 8,
                borderBottom: '1px solid #F1F5F9',
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
            justifyContent: isEditing && productToEdit && onDelete ? 'space-between' : 'flex-end',
            alignItems: 'center',
            gap: 12,
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          {isEditing && productToEdit && onDelete && (
            <button
              type="button"
              className="btn-danger-soft"
              onClick={() => onDelete(productToEdit)}
              disabled={isSubmitting}
              style={{
                borderRadius: 8,
                padding: '8px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={15} />
              <span>Xóa hàng hóa</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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

      {/* Lightbox Popup Xem Chi Tiết Ảnh Phóng To */}
      {previewImageModalUrl && (
        <div
          className="custom-modal-backdrop"
          style={{ zIndex: 10002, backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
          onClick={() => setPreviewImageModalUrl(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 12,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageModalUrl(null)}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                background: '#0F172A',
                color: '#FFFFFF',
                border: '2px solid #FFFFFF',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title="Đóng xem ảnh"
            >
              <X size={18} />
            </button>
            <img
              src={previewImageModalUrl}
              alt="Chi tiết ảnh hàng hóa"
              style={{
                maxWidth: '82vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 8,
                display: 'block',
              }}
            />
          </div>
        </div>
      )}

      {/* Validation Alert Popup */}
      {validationPopupMsg && (
        <div
          className="custom-modal-backdrop"
          style={{ zIndex: 10001, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          onClick={() => setValidationPopupMsg('')}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '24px 28px',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <AlertCircle size={28} color="#EF4444" />
            </div>
            <h4 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              Thông tin chưa hợp lệ
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              {validationPopupMsg}
            </p>
            <button
              type="button"
              className="btn-primary-teal"
              style={{
                width: '100%',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 8,
                justifyContent: 'center',
              }}
              onClick={() => setValidationPopupMsg('')}
              autoFocus
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
