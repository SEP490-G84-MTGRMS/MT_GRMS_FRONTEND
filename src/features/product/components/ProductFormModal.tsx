import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  AlertCircle,
  Camera,
  ChevronDown,
  Save,
  Search,
  Check,
  Folder,
  Plus,
  Loader2,
  History,
} from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';
import { readFileAsDataUrl } from '../../../utils/imageFile';
import { productApi } from '../api/productApi';
import { PriceHistoryModal } from './PriceHistoryModal';

/** ĐVT "Khay/Tray" không dùng làm quy đổi cố định — giá khay = kg × PROCESSED lúc đóng khay. */
const isTrayUnitName = (name?: string | null): boolean => {
  const n = (name || '').trim().toLowerCase();
  return n === 'khay' || n === 'tray' || n === 'hộp khay' || n === 'hop khay';
};

/**
 * Chuỗi quy đổi nhiều cấp:
 * 1 Thùng = 5 Lốc, 1 Lốc = 4 Hộp → lưu API conversionRate = 20 (về đơn vị cơ bản).
 */
type FormUnitRow = {
  id: string;
  unitName: string;
  /** 1 đơn vị này = convertsToQty × đơn vị convertsToId */
  convertsToQty: number;
  convertsToId: string | null;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  isBaseUnit: boolean;
  isPurchaseUnit: boolean;
};

const newUnitRowId = () => `uom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createUnitRow = (partial?: Partial<FormUnitRow>): FormUnitRow => ({
  id: newUnitRowId(),
  unitName: '',
  convertsToQty: 1,
  convertsToId: null,
  barcode: '',
  costPrice: 0,
  sellingPrice: 0,
  isBaseUnit: false,
  isPurchaseUnit: false,
  ...partial,
});

const formatQty = (n: number): string => {
  if (!Number.isFinite(n)) return '?';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
};

/** Tính hệ số về đơn vị cơ bản + nhãn chuỗi "1 Thùng = 5 Lốc = 20 Hộp". */
const resolveUnitChain = (
  rowId: string,
  rows: FormUnitRow[]
): { rateToBase: number; pathLabel: string; error?: string } => {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const start = byId.get(rowId);
  if (!start) return { rateToBase: NaN, pathLabel: '', error: 'Không tìm thấy đơn vị' };

  if (start.isBaseUnit) {
    const name = start.unitName.trim() || 'cơ bản';
    return { rateToBase: 1, pathLabel: `1 ${name}` };
  }

  let rate = 1;
  let current: FormUnitRow | undefined = start;
  const segments: string[] = [`1 ${start.unitName.trim() || '?'}`];
  const visited = new Set<string>();

  while (current && !current.isBaseUnit) {
    if (visited.has(current.id)) {
      return { rateToBase: NaN, pathLabel: '', error: 'Chuỗi quy đổi bị vòng lặp' };
    }
    visited.add(current.id);

    const qty = Number(current.convertsToQty);
    if (!qty || qty <= 0) {
      return { rateToBase: NaN, pathLabel: '', error: 'Số lượng quy đổi phải > 0' };
    }
    if (!current.convertsToId) {
      return { rateToBase: NaN, pathLabel: '', error: 'Chưa chọn đơn vị quy về' };
    }
    const next = byId.get(current.convertsToId);
    if (!next) {
      return { rateToBase: NaN, pathLabel: '', error: 'Đơn vị quy về không tồn tại' };
    }

    rate *= qty;
    segments.push(`${formatQty(rate)} ${next.unitName.trim() || '?'}`);
    current = next;
  }

  if (!current?.isBaseUnit) {
    return {
      rateToBase: NaN,
      pathLabel: '',
      error: 'Chuỗi quy đổi chưa tới đơn vị cơ bản',
    };
  }

  return { rateToBase: rate, pathLabel: segments.join(' = ') };
};

const sectionCardStyle: React.CSSProperties = {
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  padding: '18px 20px',
  backgroundColor: '#FFFFFF',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#0F172A',
  margin: '0 0 12px 0',
  paddingBottom: 8,
  borderBottom: '1px solid #F1F5F9',
};
const thStyle: React.CSSProperties = { padding: '10px 10px', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '8px 10px' };
const cellInputStyle: React.CSSProperties = { height: 34, padding: '6px 10px', fontSize: 13 };
const errorBorderStyle: React.CSSProperties = { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.12)' };
const cellErrorStyle: React.CSSProperties = { color: '#DC2626', fontSize: 11, marginTop: 3 };
const cellWarnStyle: React.CSSProperties = { color: '#B45309', fontSize: 11, marginTop: 3, fontWeight: 600 };
const radioStyle: React.CSSProperties = { accentColor: '#0F766E', width: 16, height: 16, cursor: 'pointer', margin: 0 };
const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '10px 0',
  borderBottom: '1px solid #F1F5F9',
};
const toggleTitleStyle: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: '#0F172A' };
const toggleHintStyle: React.CSSProperties = { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 1.45 };

const ToggleSwitch: React.FC<{ checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }> = ({
  checked,
  disabled,
  onChange,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      position: 'relative',
      width: 40,
      height: 22,
      flexShrink: 0,
      borderRadius: 999,
      border: 'none',
      padding: 0,
      background: checked ? '#0D9488' : '#CBD5E1',
      opacity: disabled ? 0.55 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s ease',
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 3,
        left: checked ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transition: 'left 0.15s ease',
      }}
    />
  </button>
);

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: ProductItem | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Partial<ProductItem>, saveAndAddNew?: boolean, deletedUnitIds?: string[]) => Promise<void> | void;
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
  const [showPriceHistory, setShowPriceHistory] = useState(false);

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
      setShowPriceHistory(false);
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

  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [productStatus, setProductStatus] = useState<'Active' | 'Discontinued'>('Active');
  const [hasBatches, setHasBatches] = useState<boolean>(false);
  const [allowRepack, setAllowRepack] = useState<boolean>(false);
  /** Giá đ/kg khi đóng khay (PROCESSED). Mặc định = RAW khi bật chia khay. */
  const [processedSellingPrice, setProcessedSellingPrice] = useState<number>(0);
  const [processedPriceDirty, setProcessedPriceDirty] = useState<boolean>(false);
  const [eligibleForVatReduction, setEligibleForVatReduction] = useState<boolean>(false);

  // Trạng thái lưu (loading)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Đơn vị & giá — danh sách dòng ngang hàng
  const [unitRows, setUnitRows] = useState<FormUnitRow[]>([
    createUnitRow({ isBaseUnit: true, isPurchaseUnit: true }),
  ]);
  const [deletedUnitIds, setDeletedUnitIds] = useState<string[]>([]);

  // 5. Mô tả & Ghi chú sản phẩm
  const [description, setDescription] = useState('');

  // Alerts & Validation Popup
  const [warningMsg, setWarningMsg] = useState('');
  const [validationPopupMsg, setValidationPopupMsg] = useState<string>('');
  const [touched, setTouched] = useState<{
    productCode?: boolean;
    barcode?: boolean;
    productName?: boolean;
    categoryId?: boolean;
    costPrice?: boolean;
    sellingPrice?: boolean;
    baseUnit?: boolean;
    description?: boolean;
  }>({});

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

        setIsFavorite(Boolean(productToEdit.isFavorite));
        setProductStatus(productToEdit.status === 'Discontinued' ? 'Discontinued' : 'Active');
        setHasBatches(Boolean(productToEdit.hasBatches));
        setAllowRepack(Boolean(productToEdit.allowRepack));
        {
          const raw = productToEdit.sellingPrice || 0;
          const processed = Number(productToEdit.processedSellingPricePerKg);
          const hasCustomProcessed = Number.isFinite(processed) && processed > 0 && processed !== raw;
          setProcessedSellingPrice(hasCustomProcessed ? processed : raw);
          setProcessedPriceDirty(hasCustomProcessed);
        }
        setEligibleForVatReduction(Boolean((productToEdit as any).eligibleForVatReduction));
        setIsSubmitting(false);
        setDeletedUnitIds([]);

        const buildBaseRow = (id: string, isPurchase: boolean): FormUnitRow =>
          createUnitRow({
            id,
            unitName: productToEdit.baseUnit || '',
            convertsToQty: 1,
            convertsToId: null,
            barcode: productToEdit.barcode || '',
            costPrice: productToEdit.costPrice || 0,
            sellingPrice: productToEdit.sellingPrice || 0,
            isBaseUnit: true,
            isPurchaseUnit: isPurchase,
          });

        /** API chỉ lưu rate + giá bán về base; giá vốn ĐVT khác suy từ giá vốn cơ bản × rate (BE không có cost theo ĐVT). */
        const mapExtra = (u: UomConversion, baseId: string): FormUnitRow => {
          const rate = u.conversionRate > 0 ? u.conversionRate : 1;
          const baseCost = productToEdit.costPrice || 0;
          return createUnitRow({
            id: u.id,
            unitName: u.unitName || '',
            convertsToQty: rate,
            convertsToId: baseId,
            barcode: u.barcode || '',
            costPrice: baseCost > 0 ? baseCost * rate : 0,
            sellingPrice: u.price || 0,
            isBaseUnit: false,
            isPurchaseUnit: Boolean(u.isPurchaseUnit),
          });
        };

        if (productToEdit.uomConversions && productToEdit.uomConversions.length > 0) {
          const trayUnits = productToEdit.uomConversions.filter((u) => isTrayUnitName(u.unitName));
          const keepUnits = productToEdit.uomConversions.filter((u) => !isTrayUnitName(u.unitName));
          if (trayUnits.length > 0) {
            setDeletedUnitIds(
              trayUnits.map((u) => u.id).filter((id) => id && !id.startsWith('uom-'))
            );
          }
          const hasNonBasePurchase = keepUnits.some((u) => Boolean(u.isPurchaseUnit));
          const baseIsPurchase =
            productToEdit.isBaseUnitPurchaseUnit !== undefined
              ? productToEdit.isBaseUnitPurchaseUnit
              : !hasNonBasePurchase;
          const baseId = 'base';
          setUnitRows([
            buildBaseRow(baseId, baseIsPurchase),
            ...keepUnits.map((u) => mapExtra(u, baseId)),
          ]);
        } else {
          const baseIsPurchase = productToEdit.isBaseUnitPurchaseUnit ?? true;
          setUnitRows([buildBaseRow('base', baseIsPurchase)]);
          productApi
            .getProductUnits(productToEdit.id)
            .then((units) => {
              if (!units || units.length === 0) return;
              const baseUnitApi = units.find((u) => u.isBaseUnit);
              const nonBase = units.filter((u) => !u.isBaseUnit && !isTrayUnitName(u.unitName));
              const tray = units.filter((u) => !u.isBaseUnit && isTrayUnitName(u.unitName));
              if (tray.length > 0) {
                setDeletedUnitIds((prev) => [
                  ...prev,
                  ...tray.map((u) => u.id).filter((id) => id && !prev.includes(id)),
                ]);
              }
              const hasNonBasePurchase = nonBase.some((u) => Boolean(u.isPurchaseUnit));
              const basePurchase = hasNonBasePurchase
                ? false
                : (baseUnitApi?.isPurchaseUnit ?? true);
              const baseId = baseUnitApi?.id || 'base';
              setUnitRows([
                createUnitRow({
                  id: baseId,
                  unitName: baseUnitApi?.unitName || productToEdit.baseUnit || '',
                  convertsToQty: 1,
                  convertsToId: null,
                  barcode: baseUnitApi?.barcode || productToEdit.barcode || '',
                  costPrice: productToEdit.costPrice || 0,
                  sellingPrice: baseUnitApi?.price ?? productToEdit.sellingPrice ?? 0,
                  isBaseUnit: true,
                  isPurchaseUnit: basePurchase,
                }),
                ...nonBase.map((u) => mapExtra({
                  id: u.id,
                  unitName: u.unitName,
                  conversionRate: u.conversionRate,
                  barcode: u.barcode || '',
                  price: u.price || 0,
                  isPurchaseUnit: Boolean(u.isPurchaseUnit),
                }, baseId)),
              ]);
            })
            .catch(() => {
              /* giữ dòng base đã set */
            });
        }

        {
          const desc = (productToEdit.description || '').trim();
          const note = (productToEdit.internalNote || '').trim();
          setDescription(
            desc && note && desc !== note ? `${desc}\n${note}` : desc || note
          );
        }

        setWarningMsg('');
        setValidationPopupMsg('');
        setTouched({});
      } else {
        setProductCode('');
        setBarcode('');
        setProductName('');
        setCategoryId(categories[0]?.id || '');
        setImages([]);

        setProcessedSellingPrice(0);
        setProcessedPriceDirty(false);

        setIsFavorite(false);
        setProductStatus('Active');
        setHasBatches(false);
        setAllowRepack(false);
        setIsSubmitting(false);

        setUnitRows([createUnitRow({ isBaseUnit: true, isPurchaseUnit: true })]);
        setDeletedUnitIds([]);

        setDescription('');

        setWarningMsg('');
        setValidationPopupMsg('');
        setTouched({});
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

  const baseRow = unitRows.find((r) => r.isBaseUnit) ?? unitRows[0];
  const sellingPrice = baseRow?.sellingPrice ?? 0;
  const costPrice = baseRow?.costPrice ?? 0;
  const baseUnit = baseRow?.unitName ?? '';
  const purchaseRow = unitRows.find((r) => r.isPurchaseUnit) ?? baseRow;
  const effectivePurchaseUnitName = (purchaseRow?.unitName || '').trim();
  const isPurchaseUnitKg = effectivePurchaseUnitName.toLowerCase() === 'kg';

  const patchUnitRow = (id: string, patch: Partial<FormUnitRow>) => {
    setUnitRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleAllowRepackChange = (next: boolean) => {
    setAllowRepack(next);
    if (next) {
      setHasBatches(true);
      const tray = unitRows.filter((u) => isTrayUnitName(u.unitName));
      if (tray.length > 0) {
        setDeletedUnitIds((ids) => [
          ...ids,
          ...tray.map((u) => u.id).filter((id) => id && !id.startsWith('uom-') && !ids.includes(id)),
        ]);
        setUnitRows((prev) => prev.filter((u) => !isTrayUnitName(u.unitName)));
      }
      if (!processedPriceDirty) {
        setProcessedSellingPrice(sellingPrice);
      }
    }
  };

  // Định dạng hiển thị số tiền có dấu chấm phân cách hàng nghìn (VD: 1.000.000)
  const formatCurrencyInput = (val: number): string => {
    if (!val || val <= 0) return '';
    return val.toLocaleString('vi-VN');
  };

  const parseCurrencyInput = (raw: string): number => {
    const digitsOnly = raw.replace(/\D/g, '');
    return digitsOnly === '' ? 0 : Math.max(0, Number(digitsOnly));
  };

  if (!isOpen) return null;

  const triggerValidationError = (msg: string) => {
    setValidationPopupMsg(msg);
  };

  // Real-time / Inline Validation Errors
  const trimmedProductCode = productCode.trim();
  const productCodeError =
    !isEditing && productCode !== ''
      ? trimmedProductCode.length > 50
        ? 'Mã hàng không được vượt quá 50 ký tự.'
        : /\s/.test(productCode) || !/^[A-Za-z0-9_-]+$/.test(trimmedProductCode)
        ? 'Mã hàng chỉ gồm chữ cái không dấu, số, gạch ngang (-) hoặc gạch dưới (_).'
        : ''
      : '';

  const trimmedBarcode = barcode.trim();
  const isMainBarcodeDuplicateWithUom =
    trimmedBarcode !== '' &&
    unitRows.some((u) => (u.barcode || '').trim().toLowerCase() === trimmedBarcode.toLowerCase());
  const barcodeError =
    barcode !== ''
      ? trimmedBarcode.length > 50 || /\s/.test(barcode)
        ? 'Mã vạch không được chứa khoảng trắng và tối đa 50 ký tự.'
        : isMainBarcodeDuplicateWithUom
        ? 'Mã vạch đang trùng với mã vạch của đơn vị.'
        : ''
      : '';

  const trimmedProductName = productName.trim();
  const productNameError =
    touched.productName && !trimmedProductName
      ? 'Vui lòng nhập tên sản phẩm (Bắt buộc).'
      : trimmedProductName.length > 200
      ? 'Tên sản phẩm không được vượt quá 200 ký tự.'
      : '';

  const categoryError =
    touched.categoryId && !categoryId ? 'Vui lòng chọn nhóm hàng (Bắt buộc).' : '';

  const costPriceError =
    costPrice < 0 || costPrice > 1_000_000_000
      ? 'Giá vốn không được nhỏ hơn 0 hoặc vượt quá 1.000.000.000 đ.'
      : '';

  const sellingPriceError =
    sellingPrice < 0 || sellingPrice > 1_000_000_000
      ? 'Giá bán không được nhỏ hơn 0 hoặc vượt quá 1.000.000.000 đ.'
      : '';

  const trimmedBaseUnit = baseUnit.trim();
  const baseUnitError =
    (touched.baseUnit || unitRows.length > 1) && !trimmedBaseUnit
      ? 'Vui lòng nhập tên đơn vị cơ bản (Bắt buộc).'
      : trimmedBaseUnit.length > 30
      ? 'Tên đơn vị cơ bản tối đa 30 ký tự.'
      : '';

  const descriptionError =
    description.trim().length > 1000 ? 'Mô tả / ghi chú không được vượt quá 1000 ký tự.' : '';

  const getUnitRowErrors = (row: FormUnitRow) => {
    const uName = (row.unitName || '').trim();
    const lowerName = uName.toLowerCase();
    const isDuplicateName =
      uName !== '' &&
      unitRows.some((other) => other.id !== row.id && (other.unitName || '').trim().toLowerCase() === lowerName);

    const unitNameError = !uName
      ? 'Vui lòng nhập tên đơn vị.'
      : uName.length > 30
      ? 'Tối đa 30 ký tự.'
      : isDuplicateName
      ? 'Trùng tên đơn vị tính.'
      : '';

    const chain = resolveUnitChain(row.id, unitRows);
    const conversionError = row.isBaseUnit
      ? ''
      : !row.convertsToQty || row.convertsToQty <= 0
      ? 'Số lượng phải > 0.'
      : !row.convertsToId
      ? 'Chọn đơn vị quy về.'
      : chain.error || '';

    const priceError =
      row.sellingPrice < 0 || row.sellingPrice > 1_000_000_000 ? 'Giá bán tối đa 1.000.000.000 đ.' : '';

    const rowCostError =
      row.costPrice < 0 || row.costPrice > 1_000_000_000 ? 'Giá vốn tối đa 1.000.000.000 đ.' : '';

    const uBarcode = (row.barcode || '').trim();
    const lowerBarcode = uBarcode.toLowerCase();
    const isDuplicateBarcodeWithMain =
      !row.isBaseUnit && trimmedBarcode !== '' && lowerBarcode === trimmedBarcode.toLowerCase();
    const isDuplicateBarcodeWithOther =
      uBarcode !== '' &&
      unitRows.some(
        (other) => other.id !== row.id && (other.barcode || '').trim().toLowerCase() === lowerBarcode
      );

    const rowBarcodeError =
      row.barcode && (/\s/.test(row.barcode) || uBarcode.length > 50)
        ? 'Không chứa khoảng trắng (tối đa 50 ký tự).'
        : uBarcode && (isDuplicateBarcodeWithMain || isDuplicateBarcodeWithOther)
        ? 'Trùng mã vạch.'
        : '';

    return {
      unitNameError,
      conversionError,
      pathLabel: chain.pathLabel,
      rateToBase: chain.rateToBase,
      priceError,
      rowCostError,
      rowBarcodeError,
    };
  };

  const handleAddUnitRow = () => {
    setValidationPopupMsg('');
    setUnitRows((prev) => {
      const baseId = prev.find((r) => r.isBaseUnit)?.id ?? null;
      return [
        ...prev,
        createUnitRow({
          convertsToId: baseId,
          convertsToQty: 1,
        }),
      ];
    });
  };

  const handleSelectBaseUnit = (id: string) => {
    if (hasTransactions) return;
    const promoted = unitRows.find((r) => r.id === id);
    if (promoted && !promoted.isBaseUnit && !promoted.id.startsWith('uom-') && promoted.id !== 'base') {
      setDeletedUnitIds((prev) => (prev.includes(promoted.id) ? prev : [...prev, promoted.id]));
    }
    setUnitRows((prev) => {
      const oldBase = prev.find((r) => r.isBaseUnit);
      const oldBaseId = oldBase?.id;
      const demotedNewId = newUnitRowId();
      const newBaseId = 'base';

      return prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            id: newBaseId,
            isBaseUnit: true,
            convertsToQty: 1,
            convertsToId: null,
          };
        }
        if (r.isBaseUnit) {
          return {
            ...r,
            id: demotedNewId,
            isBaseUnit: false,
            convertsToQty: 1,
            convertsToId: newBaseId,
          };
        }
        let convertsToId = r.convertsToId;
        if (convertsToId === id) convertsToId = newBaseId;
        if (convertsToId === oldBaseId) convertsToId = demotedNewId;
        return { ...r, isBaseUnit: false, convertsToId };
      });
    });
  };

  const handleSelectPurchaseUnit = (id: string) => {
    const selected = unitRows.find((u) => u.id === id);
    setUnitRows((prev) => prev.map((r) => ({ ...r, isPurchaseUnit: r.id === id })));
    if ((selected?.unitName || '').trim().toLowerCase() !== 'kg') {
      setAllowRepack(false);
    }
  };

  const handleUpdateUnitRow = (
    id: string,
    field: keyof FormUnitRow,
    value: string | number | boolean | null
  ) => {
    if (field === 'unitName' && isTrayUnitName(String(value))) {
      triggerValidationError(
        'Không thêm ĐVT "Khay". Bật "Cho chia khay" và cấu hình "Giá khi đóng khay (đ/kg)" — khối lượng từng khay chỉ biết lúc chế biến.'
      );
      return;
    }
    const row = unitRows.find((r) => r.id === id);
    if (field === 'sellingPrice' && row?.isBaseUnit && allowRepack && !processedPriceDirty) {
      setProcessedSellingPrice(Number(value) || 0);
    }
    if (field === 'unitName' && row?.isPurchaseUnit && String(value).trim().toLowerCase() !== 'kg') {
      setAllowRepack(false);
    }
    if (row?.isBaseUnit && (field === 'convertsToQty' || field === 'convertsToId')) {
      patchUnitRow(id, { convertsToQty: 1, convertsToId: null });
      return;
    }
    if (field === 'convertsToId' && value === id) {
      triggerValidationError('Không thể quy đổi một đơn vị về chính nó.');
      return;
    }
    patchUnitRow(id, { [field]: value } as Partial<FormUnitRow>);
  };

  const handleRemoveUnitRow = (id: string) => {
    if (unitRows.length <= 1) {
      triggerValidationError('Cần giữ ít nhất một đơn vị.');
      return;
    }
    const removed = unitRows.find((u) => u.id === id);
    if (!id.startsWith('uom-') && id !== 'base') {
      setDeletedUnitIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    setUnitRows((prev) => {
      let next = prev.filter((u) => u.id !== id);
      if (!next.some((r) => r.isBaseUnit) && next[0]) {
        next = next.map((r, idx) =>
          idx === 0
            ? { ...r, isBaseUnit: true, convertsToQty: 1, convertsToId: null }
            : r
        );
      }
      const baseId = next.find((r) => r.isBaseUnit)?.id ?? next[0]?.id ?? null;
      next = next.map((r) => {
        if (r.convertsToId === id) {
          return { ...r, convertsToId: r.isBaseUnit ? null : baseId };
        }
        return r;
      });
      if (!next.some((r) => r.isPurchaseUnit) && next[0]) {
        next = next.map((r, idx) => ({ ...r, isPurchaseUnit: idx === 0 }));
      }
      return next;
    });
    if (removed?.isPurchaseUnit && (removed.unitName || '').trim().toLowerCase() === 'kg') {
      setAllowRepack(false);
    }
  };

  // Image preview handler (chỉ đọc cục bộ, backend upload lên Cloudinary khi bấm Lưu)
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
      const dataUrls = await Promise.all(Array.from(files).map(readFileAsDataUrl));
      setImages((prev) => [...prev, ...dataUrls]);
    } catch (err: any) {
      triggerValidationError(
        err?.message || 'Không thể đọc tệp ảnh. Vui lòng thử lại.'
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
    setTouched({
      productCode: true,
      barcode: true,
      productName: true,
      categoryId: true,
      costPrice: true,
      sellingPrice: true,
      baseUnit: true,
      description: true,
    });

    if (isUploadingImage) {
      triggerValidationError('Đang tải ảnh lên Cloudinary, vui lòng chờ hoàn tất trước khi lưu.');
      return;
    }

    const trimmedName = productName.trim();
    if (!trimmedName) {
      triggerValidationError('Vui lòng nhập tên sản phẩm (Bắt buộc).');
      return;
    }
    if (trimmedName.length > 200) {
      triggerValidationError('Tên sản phẩm không được vượt quá 200 ký tự.');
      return;
    }

    const trimmedCode = productCode.trim();
    if (!isEditing && trimmedCode) {
      if (trimmedCode.length > 50 || !/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
        triggerValidationError('Mã hàng không được vượt quá 50 ký tự và chỉ gồm chữ cái không dấu, số, gạch ngang/dưới.');
        return;
      }
    }

    const trimmedBarcode = barcode.trim();
    if (trimmedBarcode) {
      if (trimmedBarcode.length > 50 || /\s/.test(trimmedBarcode)) {
        triggerValidationError('Mã vạch không hợp lệ (tối đa 50 ký tự, không chứa khoảng trắng).');
        return;
      }
    }

    if (!categoryId) {
      triggerValidationError('Vui lòng chọn nhóm hàng (Bắt buộc).');
      return;
    }

    const trimmedBaseUnit = baseUnit.trim();
    if (!trimmedBaseUnit) {
      triggerValidationError('Vui lòng nhập tên đơn vị cơ bản (Bắt buộc).');
      return;
    }
    if (trimmedBaseUnit.length > 30) {
      triggerValidationError('Tên đơn vị cơ bản không được vượt quá 30 ký tự.');
      return;
    }

    if (sellingPrice < 0 || sellingPrice > 1_000_000_000) {
      triggerValidationError('Giá bán không được nhỏ hơn 0 hoặc vượt quá 1.000.000.000 đ.');
      return;
    }
    if (isPurchaseUnitKg && allowRepack) {
      const processed = processedSellingPrice > 0 ? processedSellingPrice : sellingPrice;
      if (processed <= 0) {
        triggerValidationError('Giá khi đóng khay (đ/kg) phải lớn hơn 0, hoặc để trùng giá nguyên quả.');
        return;
      }
      if (processed > 1_000_000_000) {
        triggerValidationError('Giá khi đóng khay không được vượt quá 1.000.000.000 đ.');
        return;
      }
    }
    if (costPrice < 0 || costPrice > 1_000_000_000) {
      triggerValidationError('Giá vốn không được nhỏ hơn 0 hoặc vượt quá 1.000.000.000 đ.');
      return;
    }

    if (description.trim().length > 1000) {
      triggerValidationError('Mô tả / ghi chú không được vượt quá 1000 ký tự.');
      return;
    }

    // Validate chuỗi quy đổi đơn vị
    {
      const seenUnitNames = new Set<string>();
      const seenBarcodes = new Set<string>();
      if (trimmedBarcode) seenBarcodes.add(trimmedBarcode.toLowerCase());

      if (!unitRows.some((r) => r.isBaseUnit)) {
        triggerValidationError('Vui lòng chọn một đơn vị cơ bản.');
        return;
      }
      if (!unitRows.some((r) => r.isPurchaseUnit)) {
        triggerValidationError('Vui lòng chọn một đơn vị nhập hàng.');
        return;
      }

      for (const row of unitRows) {
        const uName = (row.unitName || '').trim();
        if (!uName) {
          triggerValidationError('Vui lòng nhập tên cho tất cả các đơn vị.');
          return;
        }
        if (isTrayUnitName(uName)) {
          triggerValidationError(
            'Không dùng ĐVT "Khay" trong quy đổi. Dùng "Giá khi đóng khay (đ/kg)" khi bật chia khay / chế biến.'
          );
          return;
        }
        if (uName.length > 30) {
          triggerValidationError(`Tên đơn vị "${uName}" không được vượt quá 30 ký tự.`);
          return;
        }
        const lowerName = uName.toLowerCase();
        if (seenUnitNames.has(lowerName)) {
          triggerValidationError(`Tên đơn vị "${uName}" bị trùng.`);
          return;
        }
        seenUnitNames.add(lowerName);

        const chain = resolveUnitChain(row.id, unitRows);
        if (chain.error) {
          triggerValidationError(`Đơn vị "${uName}": ${chain.error}.`);
          return;
        }
        if (!row.isBaseUnit && (!chain.rateToBase || chain.rateToBase <= 0)) {
          triggerValidationError(`Đơn vị "${uName}": chưa quy đổi được về đơn vị cơ bản.`);
          return;
        }
        if (row.sellingPrice < 0 || row.sellingPrice > 1_000_000_000) {
          triggerValidationError(`Giá bán của đơn vị "${uName}" không hợp lệ (0 - 1.000.000.000 đ).`);
          return;
        }
        if (row.costPrice < 0 || row.costPrice > 1_000_000_000) {
          triggerValidationError(`Giá vốn của đơn vị "${uName}" không hợp lệ (0 - 1.000.000.000 đ).`);
          return;
        }

        const uBarcode = (row.barcode || '').trim();
        if (uBarcode) {
          if (uBarcode.length > 50 || /\s/.test(uBarcode)) {
            triggerValidationError(`Mã vạch của đơn vị "${uName}" không hợp lệ (tối đa 50 ký tự, không chứa khoảng trắng).`);
            return;
          }
          const lowerBarcode = uBarcode.toLowerCase();
          if (!row.isBaseUnit && seenBarcodes.has(lowerBarcode)) {
            triggerValidationError(`Mã vạch "${uBarcode}" của đơn vị "${uName}" bị trùng.`);
            return;
          }
          seenBarcodes.add(lowerBarcode);
        }
      }
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
      const base = unitRows.find((r) => r.isBaseUnit) ?? unitRows[0];
      const purchase = unitRows.find((r) => r.isPurchaseUnit) ?? base;
      const extras = unitRows.filter(
        (r) => r.id !== base.id && !isTrayUnitName(r.unitName)
      );

      const repackOn = isPurchaseUnitKg && allowRepack;
      const processedEffective = repackOn
        ? processedSellingPrice > 0
          ? processedSellingPrice
          : base.sellingPrice
        : null;

      const unitsToSave: UomConversion[] = extras.map((r) => {
        const chain = resolveUnitChain(r.id, unitRows);
        return {
          id: r.id,
          unitName: r.unitName.trim(),
          conversionRate: chain.rateToBase > 0 ? chain.rateToBase : 1,
          barcode: r.barcode.trim() || '',
          price: r.sellingPrice || 0,
          productCode: productCode.trim() || 'Mã tự động',
          isPurchaseUnit: Boolean(r.isPurchaseUnit),
        };
      });

      // BE chỉ lưu 1 giá vốn theo ĐVT cơ bản. Ưu tiên giá vốn dòng ĐV nhập (giá nhập) → quy về base.
      let costToSave = 0;
      if (userRole === 'StoreOwner') {
        if (purchase && !purchase.isBaseUnit && purchase.costPrice > 0) {
          const chain = resolveUnitChain(purchase.id, unitRows);
          if (chain.rateToBase > 0) costToSave = purchase.costPrice / chain.rateToBase;
        }
        if (!(costToSave > 0) && base.costPrice > 0) {
          costToSave = base.costPrice;
        }
        if (!(costToSave > 0)) {
          for (const r of unitRows) {
            if (r.isBaseUnit || !(r.costPrice > 0)) continue;
            const chain = resolveUnitChain(r.id, unitRows);
            if (chain.rateToBase > 0) {
              costToSave = r.costPrice / chain.rateToBase;
              break;
            }
          }
        }
      } else {
        costToSave = productToEdit?.costPrice ?? 0;
      }

      const payload: Partial<ProductItem> = {
        productCode: productCode.trim() || undefined,
        barcode: barcode.trim() || undefined,
        productName: productName.trim(),
        categoryId,
        categoryName: selectedCategory ? selectedCategory.name : 'Khác',
        imageUrl: images[0] || undefined,
        imageUrls: images,
        baseUnit: base.unitName.trim(),
        sellingPrice: base.sellingPrice,
        processedSellingPricePerKg: processedEffective,
        costPrice: costToSave,
        isFavorite,
        status: productStatus,
        hasBatches: hasBatches || repackOn,
        allowRepack: repackOn,
        eligibleForVatReduction,
        description: description.trim() || undefined,
        internalNote: '',
        isBaseUnitPurchaseUnit: Boolean(base.isPurchaseUnit),
        purchaseUnit: purchase.unitName.trim() || base.unitName.trim(),
        uomConversions: unitsToSave,
      };

      await onSave(payload, saveAndAddNew, deletedUnitIds);

      if (!saveAndAddNew) {
        onClose();
      } else {
        setProductCode('');
        setBarcode('');
        setProductName('');
        setImages([]);
        setProcessedSellingPrice(0);
        setProcessedPriceDirty(false);
        setUnitRows([createUnitRow({ isBaseUnit: true, isPurchaseUnit: true })]);
        setDeletedUnitIds([]);
        setDescription('');
        setIsFavorite(false);
        setProductStatus('Active');
        setHasBatches(false);
        setAllowRepack(false);
        setWarningMsg('');
        setValidationPopupMsg('');
        setTouched({});
        setPreviewImageModalUrl(null);
      }
    } catch (err: any) {
      triggerValidationError(err?.message || 'Có lỗi xảy ra khi lưu hàng hóa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="custom-modal-backdrop">
      <div
        className="custom-modal-box"
        style={{
          maxWidth: 1160,
          width: '96vw',
          height: 'min(88vh, 900px)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        {/* ========================================================= */}
        {/* HEADER: Tiêu đề & Nút đóng (19)                           */}
        {/* ========================================================= */}
        <div className="custom-modal-header" style={{ padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
              {isEditing ? `Chỉnh sửa hàng hóa - ${productToEdit?.productName}` : 'Thêm hàng hóa'}
            </h3>
            {isEditing && productToEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12.5, color: '#64748B' }}>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600, color: '#334155' }}>
                  {productToEdit.productCode}
                </span>
                <span
                  style={{
                    padding: '1px 8px',
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: 11.5,
                    ...(productStatus === 'Active'
                      ? { background: '#DCFCE7', color: '#15803D' }
                      : { background: '#F1F5F9', color: '#64748B' }),
                  }}
                >
                  {productStatus === 'Active' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                </span>
                {hasTransactions && <span>· Đã có giao dịch</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isEditing && productToEdit && (
              <button
                type="button"
                onClick={() => setShowPriceHistory(true)}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd6fe',
                  background: '#f5f3ff',
                  color: '#6d28d9',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                title="Xem lịch sử thay đổi giá trước khi chỉnh sửa"
              >
                <History size={15} />
                Lịch sử giá
              </button>
            )}
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
        </div>

        {/* ========================================================= */}
        {/* BODY FORM                                                 */}
        {/* ========================================================= */}
        <div
          className="custom-modal-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
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
              1. Thông tin chung
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        Mã hàng
                      </label>
                      {!isEditing && (
                        <span style={{ fontSize: 11, color: productCode.length > 50 ? '#DC2626' : '#94A3B8' }}>
                          {productCode.length}/50
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Mã tự động sinh"
                      value={productCode}
                      onChange={(e) => {
                        setProductCode(e.target.value);
                        setTouched((prev) => ({ ...prev, productCode: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, productCode: true }))}
                      disabled={isEditing}
                      style={{
                        ...(isEditing ? { backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: '#64748B' } : {}),
                        ...(productCodeError ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.12)' } : {}),
                      }}
                      title={isEditing ? 'Mã hàng không thể thay đổi sau khi tạo' : undefined}
                    />
                    {productCodeError && (
                      <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{productCodeError}</span>
                      </div>
                    )}
                  </div>

                  {/* (2) Mã vạch */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        Mã vạch
                      </label>
                      <span style={{ fontSize: 11, color: barcode.length > 50 ? '#DC2626' : '#94A3B8' }}>
                        {barcode.length}/50
                      </span>
                    </div>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Nhập mã vạch (Barcode)"
                      value={barcode}
                      onChange={(e) => {
                        setBarcode(e.target.value);
                        setTouched((prev) => ({ ...prev, barcode: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, barcode: true }))}
                      style={barcodeError ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.12)' } : undefined}
                    />
                    {barcodeError && (
                      <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{barcodeError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* (3) Tên hàng */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      Tên hàng <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: 11, color: productName.length > 200 ? '#DC2626' : '#94A3B8' }}>
                      {productName.length}/200
                    </span>
                  </div>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Nhập tên sản phẩm (Bắt buộc)"
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      setTouched((prev) => ({ ...prev, productName: true }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, productName: true }))}
                    style={productNameError ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.12)' } : undefined}
                  />
                  {productNameError && (
                    <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{productNameError}</span>
                    </div>
                  )}
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
                    onClick={() => {
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                      setTouched((prev) => ({ ...prev, categoryId: true }));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: 38,
                      padding: '6px 12px',
                      background: '#FFFFFF',
                      border: categoryError
                        ? '1.5px solid #EF4444'
                        : isCategoryDropdownOpen
                        ? '1.5px solid #0D9488'
                        : '1px solid #CBD5E1',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      boxShadow: categoryError
                        ? '0 0 0 2px rgba(239, 68, 68, 0.12)'
                        : isCategoryDropdownOpen
                        ? '0 0 0 3px rgba(13, 148, 136, 0.12)'
                        : 'none',
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
                            setTouched((prev) => ({ ...prev, categoryId: true }));
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
                  {categoryError && (
                    <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{categoryError}</span>
                    </div>
                  )}

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
          {/* 2. ĐƠN VỊ & GIÁ — một bảng duy nhất                         */}
          {/* ───────────────────────────────────────────────────────── */}
          <div style={sectionCardStyle}>
            <h4 style={sectionTitleStyle}>2. Đơn vị &amp; giá</h4>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>
              Ví dụ: 1 Lốc = 4 Hộp, 1 Thùng = 5 Lốc → hệ thống tự ra 1 Thùng = 20 Hộp (đơn vị cơ bản).
            </p>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>Đơn vị</th>
                    <th style={{ ...thStyle, textAlign: 'left', minWidth: 320 }}>Quy đổi</th>
                    {userRole === 'StoreOwner' && (
                      <th style={{ ...thStyle, textAlign: 'right', width: 110 }}>Giá vốn</th>
                    )}
                    <th style={{ ...thStyle, textAlign: 'right', width: 120 }}>
                      Giá bán <span style={{ color: '#EF4444' }}>*</span>
                    </th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 72 }}>Cơ bản</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 72 }}>ĐV nhập</th>
                    <th style={{ ...thStyle, width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {unitRows.map((row) => {
                    const rowErr = getUnitRowErrors(row);
                    const lockBaseName = hasTransactions && row.isBaseUnit;
                    const showBaseErr = row.isBaseUnit && baseUnitError;
                    const convertTargets = unitRows.filter((o) => o.id !== row.id);
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                        <td style={tdStyle}>
                          <input
                            type="text"
                            className="filter-input"
                            placeholder="Hộp, Lốc, Thùng..."
                            value={row.unitName}
                            disabled={lockBaseName}
                            title={lockBaseName ? 'Đã có giao dịch — không đổi tên đơn vị cơ bản' : undefined}
                            onChange={(e) => {
                              handleUpdateUnitRow(row.id, 'unitName', e.target.value);
                              if (row.isBaseUnit) setTouched((prev) => ({ ...prev, baseUnit: true }));
                            }}
                            onBlur={() => {
                              if (row.isBaseUnit) setTouched((prev) => ({ ...prev, baseUnit: true }));
                            }}
                            style={{
                              ...cellInputStyle,
                              ...(lockBaseName
                                ? { backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'not-allowed' }
                                : {}),
                              ...(rowErr.unitNameError || showBaseErr ? errorBorderStyle : {}),
                            }}
                          />
                          {(rowErr.unitNameError || showBaseErr) && (
                            <div style={cellErrorStyle}>{rowErr.unitNameError || baseUnitError}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {row.isBaseUnit ? (
                            <div style={{ paddingTop: 8, color: '#94A3B8', fontSize: 12.5 }}>
                              Đơn vị tồn kho (chuẩn = 1)
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexWrap: 'nowrap',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span style={{ color: '#64748B', fontWeight: 600, flexShrink: 0 }}>
                                  1 {row.unitName.trim() || '…'} =
                                </span>
                                <input
                                  type="number"
                                  className="filter-input"
                                  min={0.0001}
                                  step="any"
                                  placeholder="4"
                                  value={row.convertsToQty === 0 ? '' : row.convertsToQty}
                                  onChange={(e) =>
                                    handleUpdateUnitRow(
                                      row.id,
                                      'convertsToQty',
                                      e.target.value === '' ? 0 : Number(e.target.value)
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  style={{
                                    ...cellInputStyle,
                                    width: 64,
                                    flexShrink: 0,
                                    textAlign: 'center',
                                    ...(rowErr.conversionError ? errorBorderStyle : {}),
                                  }}
                                />
                                <select
                                  className="filter-input"
                                  value={row.convertsToId || ''}
                                  onChange={(e) =>
                                    handleUpdateUnitRow(row.id, 'convertsToId', e.target.value || null)
                                  }
                                  style={{
                                    ...cellInputStyle,
                                    width: 110,
                                    flexShrink: 0,
                                    ...(rowErr.conversionError ? errorBorderStyle : {}),
                                  }}
                                >
                                  <option value="">Chọn ĐVT</option>
                                  {convertTargets.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.unitName.trim() || '(chưa đặt tên)'}
                                    </option>
                                  ))}
                                </select>
                                {rowErr.pathLabel && !rowErr.conversionError && (
                                  <span
                                    style={{
                                      fontSize: 11.5,
                                      color: '#0F766E',
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                    title={rowErr.pathLabel}
                                  >
                                    · {rowErr.pathLabel}
                                  </span>
                                )}
                              </div>
                              {rowErr.conversionError && (
                                <div style={cellErrorStyle}>{rowErr.conversionError}</div>
                              )}
                            </div>
                          )}
                        </td>
                        {userRole === 'StoreOwner' && (
                          <td style={tdStyle}>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="filter-input"
                              placeholder="0"
                              value={formatCurrencyInput(row.costPrice)}
                              onChange={(e) => {
                                handleUpdateUnitRow(row.id, 'costPrice', parseCurrencyInput(e.target.value));
                                if (row.isBaseUnit) setTouched((prev) => ({ ...prev, costPrice: true }));
                              }}
                              onFocus={(e) => e.target.select()}
                              style={{
                                ...cellInputStyle,
                                textAlign: 'right',
                                ...(rowErr.rowCostError || (row.isBaseUnit && costPriceError) ? errorBorderStyle : {}),
                              }}
                            />
                            {(rowErr.rowCostError || (row.isBaseUnit && costPriceError)) && (
                              <div style={cellErrorStyle}>{rowErr.rowCostError || costPriceError}</div>
                            )}
                          </td>
                        )}
                        <td style={tdStyle}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="filter-input"
                            placeholder="0"
                            value={formatCurrencyInput(row.sellingPrice)}
                            onChange={(e) => {
                              handleUpdateUnitRow(row.id, 'sellingPrice', parseCurrencyInput(e.target.value));
                              if (row.isBaseUnit) setTouched((prev) => ({ ...prev, sellingPrice: true }));
                            }}
                            onFocus={(e) => e.target.select()}
                            style={{
                              ...cellInputStyle,
                              textAlign: 'right',
                              fontWeight: row.isBaseUnit ? 600 : 400,
                              ...(rowErr.priceError || (row.isBaseUnit && sellingPriceError) ? errorBorderStyle : {}),
                            }}
                          />
                          {(rowErr.priceError || (row.isBaseUnit && sellingPriceError)) && (
                            <div style={cellErrorStyle}>{rowErr.priceError || sellingPriceError}</div>
                          )}
                          {row.costPrice > 0 &&
                            row.sellingPrice > 0 &&
                            row.sellingPrice < row.costPrice && (
                              <div style={cellWarnStyle}>Thấp hơn giá vốn</div>
                            )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', paddingTop: 16 }}>
                          <input
                            type="radio"
                            name="product-base-unit"
                            checked={row.isBaseUnit}
                            disabled={hasTransactions}
                            onChange={() => handleSelectBaseUnit(row.id)}
                            title="Đơn vị cơ bản (tồn kho)"
                            style={radioStyle}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', paddingTop: 16 }}>
                          <input
                            type="radio"
                            name="product-purchase-unit"
                            checked={row.isPurchaseUnit}
                            onChange={() => handleSelectPurchaseUnit(row.id)}
                            title="Đơn vị nhập hàng"
                            style={radioStyle}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', paddingTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveUnitRow(row.id)}
                            disabled={unitRows.length <= 1 || (hasTransactions && row.isBaseUnit)}
                            title={
                              unitRows.length <= 1
                                ? 'Cần ít nhất một đơn vị'
                                : hasTransactions && row.isBaseUnit
                                ? 'Không xóa đơn vị cơ bản khi đã có giao dịch'
                                : 'Xóa đơn vị'
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor:
                                unitRows.length <= 1 || (hasTransactions && row.isBaseUnit)
                                  ? 'not-allowed'
                                  : 'pointer',
                              color:
                                unitRows.length <= 1 || (hasTransactions && row.isBaseUnit)
                                  ? '#CBD5E1'
                                  : '#64748B',
                              padding: 4,
                              display: 'inline-flex',
                            }}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={handleAddUnitRow}
                title="Thêm đơn vị"
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
                <Plus size={14} /> Thêm đơn vị
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 3. BÁN & TỒN KHO                                          */}
          {/* ───────────────────────────────────────────────────────── */}
          <div style={sectionCardStyle}>
            <h4 style={sectionTitleStyle}>3. Bán &amp; tồn kho</h4>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={toggleRowStyle}>
                <div>
                  <div style={toggleTitleStyle}>Quản lý theo lô &amp; hạn sử dụng (FEFO)</div>
                  <div style={toggleHintStyle}>
                    {allowRepack && isPurchaseUnitKg
                      ? 'Bắt buộc bật khi cho chia khay.'
                      : 'Mỗi lần nhập tạo một lô có HSD; xuất bán lô hết hạn trước.'}
                  </div>
                </div>
                <ToggleSwitch
                  checked={hasBatches || (allowRepack && isPurchaseUnitKg)}
                  disabled={allowRepack && isPurchaseUnitKg}
                  onChange={setHasBatches}
                />
              </div>

              <div style={toggleRowStyle}>
                <div>
                  <div style={{ ...toggleTitleStyle, color: isPurchaseUnitKg ? '#0F172A' : '#94A3B8' }}>
                    Cho chia khay / chế biến
                  </div>
                  <div style={toggleHintStyle}>
                    {isPurchaseUnitKg
                      ? 'Hàng nhập theo KG có thể đóng khay; giá khay tính theo khối lượng thực tế lúc đóng.'
                      : `Chỉ áp dụng khi đơn vị nhập là KG (hiện tại: ${effectivePurchaseUnitName || 'chưa chọn'}).`}
                  </div>
                </div>
                <ToggleSwitch
                  checked={allowRepack && isPurchaseUnitKg}
                  disabled={!isPurchaseUnitKg}
                  onChange={handleAllowRepackChange}
                />
              </div>

              {isPurchaseUnitKg && allowRepack && (
                <div style={{ padding: '12px 14px', margin: '0 0 6px 0', background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 170 }}>
                      Giá khi đóng khay (đ/kg)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 200 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="filter-input"
                        style={{ paddingRight: 32, fontWeight: 600 }}
                        placeholder="Mặc định = giá nguyên quả"
                        value={formatCurrencyInput(processedSellingPrice)}
                        onChange={(e) => {
                          setProcessedPriceDirty(true);
                          setProcessedSellingPrice(parseCurrencyInput(e.target.value));
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                      <span style={{ position: 'absolute', right: 12, fontSize: 13, fontWeight: 600, color: '#64748B', pointerEvents: 'none' }}>
                        đ
                      </span>
                    </div>
                    {processedSellingPrice > 0 && (
                      <span style={{ fontSize: 12.5, color: '#0F766E', fontWeight: 600 }}>
                        Ví dụ: khay 0,5 kg → {(Math.round((0.5 * processedSellingPrice) / 100) * 100).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>
                  <div style={{ ...toggleHintStyle, marginTop: 6 }}>
                    Dưa/gọt sẵn: đặt khác giá nguyên quả. Thịt chỉ chia khay: để trùng giá nguyên quả.
                  </div>
                  {costPrice > 0 && processedSellingPrice > 0 && processedSellingPrice < costPrice && (
                    <div style={{ ...cellWarnStyle, fontSize: 12 }}>
                      Giá đóng khay đang thấp hơn giá vốn ({costPrice.toLocaleString('vi-VN')} đ/kg).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* 4. MÔ TẢ & GHI CHÚ (thu gọn mặc định)                      */}
          {/* ───────────────────────────────────────────────────────── */}
          <div style={sectionCardStyle}>
            <h4 style={sectionTitleStyle}>4. Mô tả / ghi chú</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Nội dung</label>
              <span style={{ fontSize: 11, color: description.length > 1000 ? '#DC2626' : '#94A3B8' }}>
                {description.length}/1000
              </span>
            </div>
            <textarea
              className="filter-input"
              rows={3}
              placeholder="Ghi chú cho thu ngân, thủ kho, hoặc mô tả ngắn về hàng hóa..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setTouched((prev) => ({ ...prev, description: true }));
              }}
              style={descriptionError ? errorBorderStyle : undefined}
            />
            {descriptionError && <div style={cellErrorStyle}>{descriptionError}</div>}
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
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {productStatus === 'Active' ? 'Đang bán' : 'Ngừng KD'}
            </span>
            <ToggleSwitch
              checked={productStatus === 'Active'}
              disabled={isSubmitting}
              onChange={(next) => setProductStatus(next ? 'Active' : 'Discontinued')}
            />
          </div>

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
                {isSubmitting ? 'Đang lưu...' : 'Lưu & thêm mới'}
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
    {showPriceHistory && productToEdit && (
      <PriceHistoryModal
        isOpen={showPriceHistory}
        onClose={() => setShowPriceHistory(false)}
        productId={productToEdit.id}
        productName={productToEdit.productName}
      />
    )}
    </>
  );
};
