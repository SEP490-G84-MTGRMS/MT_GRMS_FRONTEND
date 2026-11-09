import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierSummary, MasterProduct, AssignProductInput } from '../../types/supplier.types';
import { supplierApi } from '../../api/supplierApi';
import {
  supplierProductApi,
  type BatchAssignProductInput,
  type SupplierAssignedProductInfo,
} from '../../api/supplierProductApi';
import {
  X,
  Building2,
  Search,
  Check,
  AlertCircle,
  Store,
  ChevronDown,
  RotateCcw,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';

interface AssignProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: SupplierSummary | null;
  suppliers?: SupplierSummary[];
  masterProducts: MasterProduct[];
  assignedProductIds?: string[];
  onAssign?: (input: AssignProductInput) => Promise<any>;
  onAssignBatch?: (input: BatchAssignProductInput) => Promise<any>;
}

type ProductTerms = Record<string, { price: string; moq: string; shortage: string }>;

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN').format(Number.isFinite(val) ? val : 0);

const parseCurrency = (str: string): number => {
  const cleaned = String(str ?? '').replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

const defaultTerms = (
  masterPrice = 0,
  masterMoq = 1
): { price: string; moq: string; shortage: string } => ({
  price: String(Math.max(0, Math.round(masterPrice || 0))),
  moq: String(Math.max(1, Math.round(masterMoq || 1))),
  shortage: '0',
});

export const AssignProductModal: FC<AssignProductModalProps> = ({
  isOpen,
  onClose,
  supplier,
  suppliers = [],
  masterProducts = [],
  assignedProductIds: initialAssignedIds = [],
  onAssign,
  onAssignBatch,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [localSuppliers, setLocalSuppliers] = useState<SupplierSummary[]>([]);
  const [localMasterProducts, setLocalMasterProducts] = useState<MasterProduct[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [assignedMap, setAssignedMap] = useState<Record<string, SupplierAssignedProductInfo>>({});
  const [productTerms, setProductTerms] = useState<ProductTerms>({});
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const supplierOptions = useMemo(() => {
    const merged = [...suppliers, ...localSuppliers];
    const byId = new Map<string, SupplierSummary>();
    merged.forEach((s) => {
      if (s?.id) byId.set(s.id, s);
    });
    return Array.from(byId.values());
  }, [suppliers, localSuppliers]);

  const selectedSupplier = useMemo(
    () => supplierOptions.find((s) => s.id === selectedSupplierId) || null,
    [supplierOptions, selectedSupplierId]
  );

  const activeSuppliers = useMemo(
    () => supplierOptions.filter((s) => s.status === 'Active' || !s.status),
    [supplierOptions]
  );

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return activeSuppliers;
    return activeSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [activeSuppliers, supplierSearch]);

  const productCatalog = useMemo(() => {
    return masterProducts.length > 0 ? masterProducts : localMasterProducts;
  }, [masterProducts, localMasterProducts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productCatalog;
    return productCatalog.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [productCatalog, productSearch]);

  const availableFilteredProducts = useMemo(
    () => filteredProducts.filter((p) => !assignedMap[p.id]),
    [filteredProducts, assignedMap]
  );

  const isAllAvailableSelected = useMemo(() => {
    if (availableFilteredProducts.length === 0) return false;
    return availableFilteredProducts.every((p) => selectedProductIds.includes(p.id));
  }, [availableFilteredProducts, selectedProductIds]);

  const resetSelectionState = useCallback(() => {
    setSelectedProductIds([]);
    setProductSearch('');
    setProductTerms({});
    setFieldErrors({});
  }, []);

  const fetchSupplierAssignments = useCallback(async (supplierId: string) => {
    if (!supplierId) {
      setAssignedMap({});
      return;
    }
    setIsLoadingAssigned(true);
    try {
      const assigned = await supplierProductApi.getSupplierAssignedProducts(supplierId);
      const map: Record<string, SupplierAssignedProductInfo> = {};
      assigned.forEach((item) => {
        map[item.productId] = item;
      });
      setAssignedMap(map);
    } catch {
      setAssignedMap({});
    } finally {
      setIsLoadingAssigned(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setSupplierSearch('');
    setIsSupplierDropdownOpen(false);
    resetSelectionState();
    setIsSubmitting(false);
    setShowCloseConfirm(false);
    setFieldErrors({});

    const pickDefaultSupplierId = (list: SupplierSummary[]): string => {
      if (supplier?.id && (supplier.status === 'Active' || !supplier.status)) {
        return supplier.id;
      }
      const firstActive = list.find((s) => s.status === 'Active' || !s.status);
      return firstActive?.id || '';
    };

    const applyDefaultSupplier = (list: SupplierSummary[]) => {
      const defaultId = pickDefaultSupplierId(list);
      setSelectedSupplierId(defaultId);
      if (!defaultId) {
        setAssignedMap({});
        return;
      }
      const seedMap: Record<string, SupplierAssignedProductInfo> = {};
      initialAssignedIds.forEach((id) => {
        seedMap[id] = { productId: id, agreedPrice: 0, moq: 1, allowedShortageQty: 0 };
      });
      setAssignedMap(seedMap);
      void fetchSupplierAssignments(defaultId);
    };

    const bootstrapModal = async () => {
      setIsLoadingSuppliers(true);
      try {
        let nextSuppliers = suppliers.filter((s) => s.status === 'Active' || !s.status);
        if (nextSuppliers.length === 0) {
          const res = await supplierApi.getSuppliers({
            pageIndex: 1,
            pageSize: 100,
            status: 'Active',
          });
          nextSuppliers = res.items ?? [];
        }
        setLocalSuppliers(nextSuppliers);

        if (masterProducts.length === 0) {
          const products = await supplierProductApi.getMasterProducts();
          setLocalMasterProducts(products as MasterProduct[]);
        } else {
          setLocalMasterProducts([]);
        }

        applyDefaultSupplier(nextSuppliers);
      } catch (err: any) {
        setLocalSuppliers([]);
        setSelectedSupplierId('');
        setAssignedMap({});
        setFieldErrors({
          supplier: err.message || 'Không thể tải dữ liệu nhà cung cấp / sản phẩm.',
        });
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    void bootstrapModal();
    // Only reset when modal opens or preselected supplier changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, supplier?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSupplier = (s: SupplierSummary) => {
    if (s.status && s.status !== 'Active') return;
    setSelectedSupplierId(s.id);
    setSupplierSearch('');
    setIsSupplierDropdownOpen(false);
    resetSelectionState();
    void fetchSupplierAssignments(s.id);
  };

  const handleClearSupplier = () => {
    setSelectedSupplierId('');
    setAssignedMap({});
    resetSelectionState();
  };

  const termsFromMaster = (productId: string): { price: string; moq: string; shortage: string } => {
    const product = productCatalog.find((p) => p.id === productId);
    return defaultTerms(product?.defaultWholesalePrice ?? 0, product?.defaultMoq ?? 1);
  };

  const ensureTerms = (productId: string): { price: string; moq: string; shortage: string } =>
    productTerms[productId] ?? termsFromMaster(productId);

  const handleToggleProduct = (productId: string) => {
    if (assignedMap[productId]) return;

    setSelectedProductIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      if (!exists) {
        setProductTerms((terms) => ({
          ...terms,
          [productId]: terms[productId] ?? termsFromMaster(productId),
        }));
      }
      if (next.length > 0) {
        setFieldErrors((errs) => {
          const copy = { ...errs };
          delete copy.products;
          return copy;
        });
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllAvailableSelected) {
      const availableIds = new Set(availableFilteredProducts.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !availableIds.has(id)));
      return;
    }

    const toAdd = availableFilteredProducts.map((p) => p.id);
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...toAdd])));
    setProductTerms((prev) => {
      const next = { ...prev };
      toAdd.forEach((id) => {
        if (!next[id]) next[id] = termsFromMaster(id);
      });
      return next;
    });
    setFieldErrors((errs) => {
      const copy = { ...errs };
      delete copy.products;
      return copy;
    });
  };

  const updateRowPrice = (productId: string, raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setProductTerms((prev) => ({
      ...prev,
      [productId]: { ...ensureTerms(productId), price: digits },
    }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[`price_${productId}`];
      delete copy.form;
      return copy;
    });
  };

  const updateRowMoq = (productId: string, raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setProductTerms((prev) => ({
      ...prev,
      [productId]: { ...ensureTerms(productId), moq: digits },
    }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[`moq_${productId}`];
      delete copy.form;
      return copy;
    });
  };

  const updateRowShortage = (productId: string, raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setProductTerms((prev) => ({
      ...prev,
      [productId]: { ...ensureTerms(productId), shortage: digits },
    }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[`shortage_${productId}`];
      delete copy.form;
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedSupplierId) {
      errors.supplier = 'Vui lòng chọn nhà cung cấp hợp lệ.';
    }

    if (selectedProductIds.length === 0) {
      errors.products = 'Vui lòng chọn ít nhất 1 sản phẩm để gán cho nhà cung cấp.';
    }

    selectedProductIds.forEach((id) => {
      if (assignedMap[id]) {
        errors.products = 'Không thể gán lại sản phẩm đã thuộc nhà cung cấp này.';
        return;
      }

      const terms = ensureTerms(id);
      const price = parseCurrency(terms.price);
      if (Number.isNaN(price) || price < 0) {
        errors[`price_${id}`] = 'Giá nhập phải ≥ 0.';
      }

      const moq = parseInt(terms.moq, 10);
      if (!terms.moq || Number.isNaN(moq) || moq < 1) {
        errors[`moq_${id}`] = 'MOQ phải > 0.';
      }

      const shortage = parseInt(terms.shortage || '0', 10);
      if (Number.isNaN(shortage) || shortage < 0) {
        errors[`shortage_${id}`] = 'Thiếu cho phép ≥ 0.';
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const items = selectedProductIds.map((pid) => {
        const terms = ensureTerms(pid);
        return {
          productId: pid,
          agreedPrice: parseCurrency(terms.price),
          moq: parseInt(terms.moq, 10),
          allowedShortageQty: parseInt(terms.shortage || '0', 10) || 0,
        };
      });

      if (onAssignBatch) {
        await onAssignBatch({
          supplierId: selectedSupplierId,
          productIds: selectedProductIds,
          items,
        });
      } else if (onAssign) {
        for (const item of items) {
          const product = productCatalog.find((p) => p.id === item.productId);
          await onAssign({
            supplierId: selectedSupplierId,
            productId: item.productId,
            deliveryUoM: product?.baseUoM || 'Cái',
            agreedPrice: item.agreedPrice,
            moq: item.moq,
            allowedShortageQty: item.allowedShortageQty,
            isPrimary: false,
          });
        }
      } else {
        await supplierProductApi.assignBatchProducts({
          supplierId: selectedSupplierId,
          productIds: selectedProductIds,
          items,
        });
      }

      onClose();
    } catch (err: any) {
      setFieldErrors((prev) => ({
        ...prev,
        form: err.message || 'Thao tác gán sản phẩm không thành công. Vui lòng thử lại.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void executeSubmit();
  };

  const hasUnsavedChanges = selectedProductIds.length > 0;

  const handleAttemptClose = () => {
    if (isSubmitting) return;
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const gridColumns = '40px 48px 100px 1.2fr 64px 88px 110px 80px 130px 80px';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={handleAttemptClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 1280,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={22} />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Gán Sản Phẩm Vào Nhà Cung Cấp
            </h2>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
            }}
            title="Đóng popup"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          <div
            style={{
              padding: '16px 22px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {fieldErrors.form && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{fieldErrors.form}</span>
              </div>
            )}

            {/* Supplier selection */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                  Nhà cung cấp <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {selectedSupplier && (
                  <button
                    type="button"
                    onClick={handleClearSupplier}
                    disabled={isSubmitting}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f766e',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RotateCcw size={12} /> Đổi NCC
                  </button>
                )}
              </div>

              {!selectedSupplier ? (
                <div ref={supplierDropdownRef} style={{ position: 'relative' }}>
                  <div
                    onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                    style={{
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: fieldErrors.supplier ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: '#64748b',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} style={{ color: '#0f766e' }} />
                      <span>Tìm theo tên, mã NCC hoặc SĐT...</span>
                    </div>
                    <ChevronDown size={16} style={{ color: '#94a3b8' }} />
                  </div>

                  {isSupplierDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        backgroundColor: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                        zIndex: 100,
                        maxHeight: 250,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ position: 'relative' }}>
                          <Search
                            size={14}
                            style={{
                              position: 'absolute',
                              left: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#94a3b8',
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Gõ mã, tên hoặc SĐT nhà cung cấp..."
                            value={supplierSearch}
                            onChange={(e) => setSupplierSearch(e.target.value)}
                            autoFocus
                            style={{
                              width: '100%',
                              height: 32,
                              padding: '0 10px 0 32px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              fontSize: '0.84rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ overflowY: 'auto', flex: 1 }}>
                        {isLoadingSuppliers ? (
                          <div
                            style={{
                              padding: 16,
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: '0.84rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                            }}
                          >
                            <Loader2 size={14} className="animate-spin" />
                            Đang tải danh sách nhà cung cấp...
                          </div>
                        ) : filteredSuppliers.length === 0 ? (
                          <div
                            style={{
                              padding: 16,
                              textAlign: 'center',
                              color: '#94a3b8',
                              fontSize: '0.84rem',
                            }}
                          >
                            Không tìm thấy nhà cung cấp đang hoạt động.
                          </div>
                        ) : (
                          filteredSuppliers.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => handleSelectSupplier(s)}
                              style={{
                                padding: '9px 12px',
                                borderBottom: '1px solid #f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0fdfa';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                                    {s.name}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '0.74rem',
                                      color: '#0f766e',
                                      backgroundColor: '#f0fdfa',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      border: '1px solid #ccfbf1',
                                    }}
                                  >
                                    {s.code}
                                  </span>
                                </div>
                                {s.phone && (
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                                    SĐT: {s.phone}
                                  </div>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: '#ecfdf5',
                                  color: '#059669',
                                  fontWeight: 600,
                                }}
                              >
                                Hoạt động
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building2 size={18} style={{ color: '#0f766e' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                          {selectedSupplier.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.74rem',
                            color: '#0f766e',
                            backgroundColor: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {selectedSupplier.code}
                        </span>
                      </div>
                      {selectedSupplier.phone && (
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                          SĐT: {selectedSupplier.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {fieldErrors.supplier && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>
                  {fieldErrors.supplier}
                </div>
              )}
            </div>

            {/* Product table */}
            <div>
              <label
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Danh sách sản phẩm Master
              </label>

              {!selectedSupplierId ? (
                <div
                  style={{
                    height: 88,
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '0.84rem',
                  }}
                >
                  Chọn nhà cung cấp để tải danh sách sản phẩm.
                </div>
              ) : (
                <div
                  style={{
                    border: fieldErrors.products ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    overflow: 'auto',
                    backgroundColor: '#ffffff',
                    minWidth: 0,
                  }}
                >
                  <div style={{ minWidth: 1080 }}>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search
                        size={14}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{
                          width: '100%',
                          height: 32,
                          padding: '0 28px 0 32px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: '0.82rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: 2,
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {availableFilteredProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#0f766e',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isAllAvailableSelected ? (
                          <>
                            <Square size={13} /> Bỏ chọn
                          </>
                        ) : (
                          <>
                            <CheckSquare size={13} /> Chọn tất cả chưa gán
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridColumns,
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #cbd5e1',
                      fontWeight: 700,
                      color: '#475569',
                      fontSize: '0.78rem',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllAvailableSelected}
                        onChange={handleToggleSelectAll}
                        disabled={availableFilteredProducts.length === 0}
                        style={{ cursor: 'pointer', accentColor: '#0f766e' }}
                      />
                    </div>
                    <div style={{ padding: '8px 4px', textAlign: 'center' }}>Ảnh</div>
                    <div style={{ padding: '8px 8px' }}>SKU</div>
                    <div style={{ padding: '8px 8px' }}>Tên sản phẩm</div>
                    <div style={{ padding: '8px 8px', textAlign: 'center' }}>ĐVT</div>
                    <div style={{ padding: '8px 8px', textAlign: 'center' }}>Trạng thái</div>
                    <div style={{ padding: '8px 8px', textAlign: 'right' }}>Giá nhập</div>
                    <div style={{ padding: '8px 8px', textAlign: 'right' }}>MOQ</div>
                    <div style={{ padding: '8px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      Thiếu cho phép
                    </div>
                    <div style={{ padding: '8px 8px', textAlign: 'center' }}>Thao tác</div>
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {isLoadingAssigned ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '28px 16px',
                          color: '#64748b',
                          gap: 8,
                          fontSize: '0.84rem',
                        }}
                      >
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang tải trạng thái gán sản phẩm...</span>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '28px 16px',
                          color: '#94a3b8',
                          fontSize: '0.83rem',
                        }}
                      >
                        {productCatalog.length === 0
                          ? 'Không có sản phẩm Master.'
                          : 'Không tìm thấy sản phẩm khớp từ khóa.'}
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const assigned = assignedMap[p.id];
                        const isAssigned = !!assigned;
                        const isSelected = selectedProductIds.includes(p.id);
                        const terms = ensureTerms(p.id);
                        const priceError = fieldErrors[`price_${p.id}`];
                        const moqError = fieldErrors[`moq_${p.id}`];
                        const shortageError = fieldErrors[`shortage_${p.id}`];

                        return (
                          <div
                            key={p.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: gridColumns,
                              alignItems: 'center',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.8rem',
                              backgroundColor: isAssigned
                                ? '#f8fafc'
                                : isSelected
                                ? '#f0fdfa'
                                : '#ffffff',
                            }}
                          >
                            <div style={{ padding: '8px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAssigned || isSubmitting}
                                onChange={() => handleToggleProduct(p.id)}
                                style={{
                                  cursor: isAssigned ? 'not-allowed' : 'pointer',
                                  accentColor: '#0f766e',
                                }}
                              />
                            </div>

                            <div style={{ padding: '6px 4px', textAlign: 'center' }}>
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    display: 'block',
                                    margin: '0 auto',
                                    opacity: isAssigned ? 0.55 : 1,
                                    background: '#f8fafc',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 6,
                                    border: '1px dashed #cbd5e1',
                                    background: '#f8fafc',
                                    margin: '0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 9,
                                    color: '#94a3b8',
                                  }}
                                >
                                  N/A
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                padding: '8px',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                color: isAssigned ? '#94a3b8' : '#0f766e',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.sku}
                            </div>

                            <div
                              style={{
                                padding: '8px',
                                fontWeight: isSelected ? 700 : 500,
                                color: isAssigned ? '#94a3b8' : '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={p.name}
                            >
                              {p.name}
                            </div>

                            <div
                              style={{
                                padding: '8px',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: isAssigned ? '#94a3b8' : '#334155',
                              }}
                            >
                              {p.baseUoM || 'Cái'}
                            </div>

                            <div style={{ padding: '8px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  backgroundColor: isAssigned ? '#f1f5f9' : '#ecfdf5',
                                  color: isAssigned ? '#64748b' : '#047857',
                                  border: isAssigned ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                                }}
                              >
                                {isAssigned ? 'Đã gán' : 'Chưa gán'}
                              </span>
                            </div>

                            <div style={{ padding: '6px 8px' }}>
                              {isAssigned ? (
                                <div
                                  style={{
                                    textAlign: 'right',
                                    color: '#64748b',
                                    fontWeight: 600,
                                  }}
                                >
                                  {formatCurrency(assigned.agreedPrice)}
                                </div>
                              ) : isSelected ? (
                                <div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={terms.price}
                                    onChange={(e) => updateRowPrice(p.id, e.target.value)}
                                    disabled={isSubmitting}
                                    style={{
                                      width: '100%',
                                      height: 30,
                                      padding: '0 8px',
                                      borderRadius: 6,
                                      border: priceError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                      textAlign: 'right',
                                      fontSize: '0.78rem',
                                      boxSizing: 'border-box',
                                    }}
                                  />
                                  {priceError && (
                                    <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: 2 }}>
                                      {priceError}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'right', color: '#cbd5e1' }}>—</div>
                              )}
                            </div>

                            <div style={{ padding: '6px 8px' }}>
                              {isAssigned ? (
                                <div
                                  style={{
                                    textAlign: 'right',
                                    color: '#64748b',
                                    fontWeight: 600,
                                  }}
                                >
                                  {assigned.moq} {p.baseUoM || 'Cái'}
                                </div>
                              ) : isSelected ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={terms.moq}
                                      onChange={(e) => updateRowMoq(p.id, e.target.value)}
                                      disabled={isSubmitting}
                                      style={{
                                        width: '100%',
                                        height: 30,
                                        padding: '0 8px',
                                        borderRadius: 6,
                                        border: moqError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                        textAlign: 'right',
                                        fontSize: '0.78rem',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        color: '#64748b',
                                        whiteSpace: 'nowrap',
                                        minWidth: 28,
                                      }}
                                    >
                                      {p.baseUoM || 'Cái'}
                                    </span>
                                  </div>
                                  {moqError && (
                                    <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: 2 }}>
                                      {moqError}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'right', color: '#cbd5e1' }}>—</div>
                              )}
                            </div>

                            <div style={{ padding: '6px 8px' }}>
                              {isAssigned ? (
                                <div
                                  style={{
                                    textAlign: 'right',
                                    color: '#64748b',
                                    fontWeight: 600,
                                  }}
                                >
                                  {assigned.allowedShortageQty ?? 0} {p.baseUoM || 'Cái'}
                                </div>
                              ) : isSelected ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={terms.shortage}
                                      onChange={(e) => updateRowShortage(p.id, e.target.value)}
                                      disabled={isSubmitting}
                                      style={{
                                        width: '100%',
                                        height: 30,
                                        padding: '0 8px',
                                        borderRadius: 6,
                                        border: shortageError
                                          ? '1.5px solid #ef4444'
                                          : '1px solid #cbd5e1',
                                        textAlign: 'right',
                                        fontSize: '0.78rem',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        color: '#64748b',
                                        whiteSpace: 'nowrap',
                                        minWidth: 28,
                                      }}
                                    >
                                      {p.baseUoM || 'Cái'}
                                    </span>
                                  </div>
                                  {shortageError && (
                                    <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: 2 }}>
                                      {shortageError}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'right', color: '#cbd5e1' }}>—</div>
                              )}
                            </div>

                            <div
                              style={{
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '0.72rem',
                                color: isAssigned ? '#64748b' : '#94a3b8',
                                fontWeight: 600,
                              }}
                            >
                              {isAssigned ? 'Giữ nguyên' : isSelected ? 'Sẽ gán' : '—'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  </div>
                </div>
              )}

              {fieldErrors.products && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>
                  {fieldErrors.products}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '12px 22px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {selectedProductIds.length > 0 ? (
                <span>
                  Đã chọn: <b style={{ color: '#0f766e' }}>{selectedProductIds.length}</b> sản phẩm
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Chưa chọn sản phẩm nào</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handleAttemptClose}
                disabled={isSubmitting}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor:
                    isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang gán...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Xác nhận gán</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {showCloseConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}
            onClick={() => setShowCloseConfirm(false)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 10,
                padding: '20px 24px',
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                border: '1px solid #e2e8f0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <AlertCircle size={20} style={{ color: '#f59e0b' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Xác nhận đóng popup
                </h4>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                Bạn đang chọn <strong>{selectedProductIds.length}</strong> sản phẩm chưa lưu. Đóng
                popup sẽ hủy lựa chọn hiện tại.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Tiếp tục
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false);
                    onClose();
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Đồng ý đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
