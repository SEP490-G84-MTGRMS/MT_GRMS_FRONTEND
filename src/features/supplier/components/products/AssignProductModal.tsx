import { useState, useEffect, useRef, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierSummary, MasterProduct, AssignProductInput } from '../../types/supplier.types';
import { supplierProductApi, type BatchAssignProductInput } from '../../api/supplierProductApi';
import {
  X,
  Building2,
  Search,
  Check,
  AlertCircle,
  PlusCircle,
  Store,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Info,
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
  onAssign?: (input: AssignProductInput, keepOpen?: boolean) => Promise<any>;
  onAssignBatch?: (input: BatchAssignProductInput, keepOpen?: boolean) => Promise<any>;
}

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
  // ── Supplier selection state ───────────────────────────────────────────
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // ── Products table selection state ─────────────────────────────────────
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [supplierAssignedIds, setSupplierAssignedIds] = useState<string[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState<boolean>(false);

  // ── Supply info fields (No SupplierProductCode, No DeliveryUoM on popup)
  // ĐVT luôn lấy từ Product Master theo yêu cầu nghiệp vụ
  const [agreedPriceInput, setAgreedPriceInput] = useState<string>('0');
  const [moqInput, setMoqInput] = useState<string>('1');

  // ── Linked branches count ──────────────────────────────────────────────
  const [linkedBranchesCount, setLinkedBranchesCount] = useState<number | null>(null);

  // ── UX & Form states ───────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string>('');
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  // ── Active supplier object ─────────────────────────────────────────────
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // ── Filtered suppliers for autocomplete dropdown ───────────────────────
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  // ── Filtered products for table (by search keyword) ───────────────────
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return masterProducts;
    return masterProducts.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      return matchName || matchSku;
    });
  }, [masterProducts, productSearch]);

  // ── Available (unassigned) products in current filtered view ───────────
  const availableFilteredProducts = useMemo(() => {
    return filteredProducts.filter((p) => !supplierAssignedIds.includes(p.id));
  }, [filteredProducts, supplierAssignedIds]);

  // ── Check if all available filtered products are currently selected ───
  const isAllAvailableSelected = useMemo(() => {
    if (availableFilteredProducts.length === 0) return false;
    return availableFilteredProducts.every((p) => selectedProductIds.includes(p.id));
  }, [availableFilteredProducts, selectedProductIds]);

  // ── Initialize / reset modal when opened ───────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const initialSupplierId = supplier?.id || '';
      setSelectedSupplierId(initialSupplierId);
      setSupplierSearch('');
      setIsSupplierDropdownOpen(false);

      setSelectedProductIds([]);
      setProductSearch('');
      setSupplierAssignedIds(initialAssignedIds);

      setAgreedPriceInput('0');
      setMoqInput('1');

      setFieldErrors({});
      setIsSubmitting(false);
      setSubmitSuccessMsg('');
      setShowCloseConfirm(false);

      if (initialSupplierId) {
        fetchSupplierDetails(initialSupplierId);
      } else {
        setLinkedBranchesCount(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Load supplier's assigned products & linked branches ───────────────
  const fetchSupplierDetails = async (supplierId: string) => {
    if (!supplierId) return;
    setIsLoadingAssigned(true);
    try {
      const [assignedIds, branches] = await Promise.all([
        supplierProductApi.getSupplierAssignedProductIds(supplierId),
        supplierProductApi.getSupplierLinkedBranches(supplierId),
      ]);
      setSupplierAssignedIds(assignedIds);
      setLinkedBranchesCount(branches.length);
    } catch {
      // Fallback: keep previous or empty
    } finally {
      setIsLoadingAssigned(false);
    }
  };

  // ── Close dropdown when clicking outside ───────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Handle supplier selection ──────────────────────────────────────────
  const handleSelectSupplier = (s: SupplierSummary) => {
    if (s.status === 'Inactive') return;

    setSelectedSupplierId(s.id);
    setSupplierSearch('');
    setIsSupplierDropdownOpen(false);
    setSelectedProductIds([]); // Reset selected products on supplier change
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.supplier;
      delete copy.products;
      return copy;
    });
    fetchSupplierDetails(s.id);
  };

  const handleClearSupplier = () => {
    setSelectedSupplierId('');
    setSelectedProductIds([]);
    setSupplierAssignedIds([]);
    setLinkedBranchesCount(null);
    setFieldErrors({});
  };

  // ── Toggle individual product selection ────────────────────────────────
  const handleToggleProduct = (productId: string) => {
    if (supplierAssignedIds.includes(productId)) return; // Do not allow toggling assigned products

    setSelectedProductIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
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

  // ── Toggle select all available products ───────────────────────────────
  const handleToggleSelectAll = () => {
    if (isAllAvailableSelected) {
      // Unselect all available filtered products
      const availableIds = new Set(availableFilteredProducts.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !availableIds.has(id)));
    } else {
      // Select all available filtered products
      const toAdd = availableFilteredProducts.map((p) => p.id);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...toAdd])));
      setFieldErrors((errs) => {
        const copy = { ...errs };
        delete copy.products;
        return copy;
      });
    }
  };

  // ── Format currency for input ──────────────────────────────────────────
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const parseCurrency = (str: string): number => {
    const cleaned = str.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseCurrency(raw);
    setAgreedPriceInput(formatCurrency(num));
    if (fieldErrors.price) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.price;
        return copy;
      });
    }
  };

  const handleMoqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    setMoqInput(val);
    if (fieldErrors.moq) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.moq;
        return copy;
      });
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedSupplierId) {
      errors.supplier = 'Vui lòng chọn nhà cung cấp hợp lệ.';
    }

    if (selectedProductIds.length === 0) {
      errors.products = 'Vui lòng chọn ít nhất 1 sản phẩm để gán cho nhà cung cấp.';
    }

    const price = parseCurrency(agreedPriceInput);
    if (isNaN(price) || price < 0) {
      errors.price = 'Giá nhập thỏa thuận phải lớn hơn hoặc bằng 0 đ.';
    }

    const moq = parseInt(moqInput, 10);
    if (isNaN(moq) || moq < 1) {
      errors.moq = 'Số lượng đặt tối thiểu (MOQ) phải từ 1 trở lên.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Form submission (batch assign) ─────────────────────────────────────
  const executeSubmit = async (keepOpen: boolean) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitSuccessMsg('');

    try {
      const price = parseCurrency(agreedPriceInput);
      const moq = parseInt(moqInput, 10) || 1;

      if (onAssignBatch) {
        await onAssignBatch(
          {
            supplierId: selectedSupplierId,
            productIds: selectedProductIds,
            agreedPrice: price,
            moq: moq,
          },
          keepOpen
        );
      } else if (onAssign) {
        // Fallback: loop through products if single assign handler provided
        for (const pid of selectedProductIds) {
          const product = masterProducts.find((p) => p.id === pid);
          await onAssign(
            {
              supplierId: selectedSupplierId,
              productId: pid,
              deliveryUoM: product?.baseUoM || 'Cái',
              agreedPrice: price,
              moq: moq,
              isPrimary: false,
            },
            true
          );
        }
      } else {
        // Directly call batch API
        await supplierProductApi.assignBatchProducts({
          supplierId: selectedSupplierId,
          productIds: selectedProductIds,
          agreedPrice: price,
          moq: moq,
        });
      }

      if (keepOpen) {
        // Multi-assign UX: update assigned list and reset selected products
        setSupplierAssignedIds((prev) => [...prev, ...selectedProductIds]);
        setSubmitSuccessMsg(
          `Đã gán thành công ${selectedProductIds.length} sản phẩm vào "${selectedSupplier?.name}". Bạn có thể tiếp tục chọn sản phẩm khác.`
        );
        setSelectedProductIds([]);
        setFieldErrors({});
      } else {
        onClose();
      }
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
    executeSubmit(false);
  };

  // ── Safe Close with confirmation if dirty ───────────────────────────────
  const hasUnsavedChanges = selectedProductIds.length > 0;

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

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
          maxWidth: 820,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          animation: 'fadeInModal 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════
            HEADER
           ══════════════════════════════════════════════════════════════ */}
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
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                Gán Sản Phẩm Vào Nhà Cung Cấp
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Chọn nhà cung cấp và chọn các sản phẩm Master để gán hàng loạt vào danh mục cung ứng.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            title="Đóng popup"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            BODY (FORM)
           ══════════════════════════════════════════════════════════════ */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
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
            {/* Global Error Banner */}
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

            {/* Success banner when using "Gán & Tiếp tục" */}
            {submitSuccessMsg && (
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{submitSuccessMsg}</span>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 1: CHỌN NHÀ CUNG CẤP (*)
               ══════════════════════════════════════════════════════════════ */}
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
                  1. Chọn Nhà cung cấp <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {selectedSupplier && (
                  <button
                    type="button"
                    onClick={handleClearSupplier}
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
                    <RotateCcw size={12} /> Đổi NCC khác
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
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} style={{ color: '#0f766e' }} />
                      <span>-- Tìm & chọn Nhà cung cấp (Tên, Mã NCC, SĐT) --</span>
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
                      <div
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid #f1f5f9',
                          position: 'sticky',
                          top: 0,
                          backgroundColor: '#ffffff',
                        }}
                      >
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
                        {filteredSuppliers.length === 0 ? (
                          <div
                            style={{
                              padding: '16px',
                              textAlign: 'center',
                              color: '#94a3b8',
                              fontSize: '0.84rem',
                            }}
                          >
                            Không tìm thấy nhà cung cấp nào.
                          </div>
                        ) : (
                          filteredSuppliers.map((s) => {
                            const isInactive = s.status === 'Inactive';
                            return (
                              <div
                                key={s.id}
                                onClick={() => handleSelectSupplier(s)}
                                style={{
                                  padding: '9px 12px',
                                  borderBottom: '1px solid #f8fafc',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: isInactive ? 'not-allowed' : 'pointer',
                                  backgroundColor: isInactive ? '#fafafa' : '#ffffff',
                                  opacity: isInactive ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isInactive) e.currentTarget.style.backgroundColor = '#f0fdfa';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isInactive) e.currentTarget.style.backgroundColor = '#ffffff';
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '0.88rem',
                                        color: isInactive ? '#64748b' : '#0f172a',
                                      }}
                                    >
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
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                                    {s.contactPerson && <span>LH: {s.contactPerson}</span>}
                                    {s.phone && <span> · SĐT: {s.phone}</span>}
                                  </div>
                                </div>

                                <div>
                                  {isInactive ? (
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        backgroundColor: '#f1f5f9',
                                        color: '#94a3b8',
                                      }}
                                    >
                                      Tạm ngưng
                                    </span>
                                  ) : (
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
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Supplier Summary Card */
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
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: '#f0fdfa',
                        color: '#0f766e',
                        border: '1px solid #ccfbf1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building2 size={18} />
                    </div>
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
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            fontWeight: 600,
                          }}
                        >
                          Hoạt động
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                        {selectedSupplier.contactPerson && (
                          <span>Người liên hệ: <b>{selectedSupplier.contactPerson}</b></span>
                        )}
                        {selectedSupplier.phone && <span> · SĐT: <b>{selectedSupplier.phone}</b></span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSupplier}
                    title="Chọn nhà cung cấp khác"
                    style={{
                      padding: '5px 10px',
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
                    }}
                  >
                    <RotateCcw size={12} /> Đổi NCC
                  </button>
                </div>
              )}

              {fieldErrors.supplier && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>
                  {fieldErrors.supplier}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 2: DANH SÁCH SẢN PHẨM MASTER DẠNG TABLE (*)
                - Hiển thị cột: [checkbox] | Mã SKU | Tên sản phẩm | Đơn vị
                - Bỏ tất cả các cột khác
                - Sản phẩm nào đã gán rồi thì disabled, không cho tick chọn
               ══════════════════════════════════════════════════════════════ */}
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
                  2. Chọn Sản phẩm Master (*)
                </label>
                {selectedSupplierId && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Đã chọn:{' '}
                    <strong style={{ color: '#0f766e', fontSize: '0.85rem' }}>
                      {selectedProductIds.length}
                    </strong>{' '}
                    / {availableFilteredProducts.length} sản phẩm khả dụng
                    {supplierAssignedIds.length > 0 && (
                      <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                        ({supplierAssignedIds.length} đã gán cho NCC này)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!selectedSupplierId ? (
                <div
                  style={{
                    height: 44,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#94a3b8',
                    fontSize: '0.84rem',
                  }}
                >
                  <Info size={15} />
                  <span>Vui lòng chọn nhà cung cấp ở Bước 1 trước khi chọn sản phẩm.</span>
                </div>
              ) : (
                <div
                  style={{
                    border: fieldErrors.products ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {/* Search Bar for Product Table */}
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
                          backgroundColor: '#ffffff',
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
                            <Square size={13} /> Bỏ chọn tất cả
                          </>
                        ) : (
                          <>
                            <CheckSquare size={13} /> Chọn tất cả khả dụng
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Fixed Table Header: Completely OUTSIDE the scroll container */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 140px 1fr 90px',
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #cbd5e1',
                      fontWeight: 700,
                      color: '#475569',
                      fontSize: '0.83rem',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllAvailableSelected}
                        onChange={handleToggleSelectAll}
                        disabled={availableFilteredProducts.length === 0}
                        style={{ cursor: 'pointer', accentColor: '#0f766e' }}
                        title="Chọn tất cả sản phẩm khả dụng"
                      />
                    </div>
                    <div style={{ padding: '8px 12px' }}>Mã SKU</div>
                    <div style={{ padding: '8px 12px' }}>Tên sản phẩm</div>
                    <div style={{ padding: '8px 12px', textAlign: 'center' }}>Đơn vị</div>
                  </div>

                  {/* Scrollable Body ONLY: Scrollbar and rows are strictly confined within this container */}
                  <div style={{ maxHeight: 230, overflowY: 'auto', backgroundColor: '#ffffff' }}>
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
                        <span>Đang tải danh mục cung ứng của nhà cung cấp...</span>
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
                        {masterProducts.length === 0
                          ? 'Không có sản phẩm nào trong danh mục Master.'
                          : 'Không tìm thấy sản phẩm nào khớp với từ khóa tìm kiếm.'}
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const isAssigned = supplierAssignedIds.includes(p.id);
                        const isSelected = selectedProductIds.includes(p.id);

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (!isAssigned) handleToggleProduct(p.id);
                            }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '44px 140px 1fr 90px',
                              alignItems: 'center',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.83rem',
                              backgroundColor: isAssigned
                                ? '#f8fafc'
                                : isSelected
                                ? '#f0fdfa'
                                : '#ffffff',
                              cursor: isAssigned ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.12s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isAssigned && !isSelected) {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isAssigned && !isSelected) {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                              }
                            }}
                          >
                            {/* Checkbox column */}
                            <div
                              style={{
                                padding: '8px 12px',
                                textAlign: 'center',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAssigned}
                                onChange={() => handleToggleProduct(p.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  cursor: isAssigned ? 'not-allowed' : 'pointer',
                                  accentColor: '#0f766e',
                                }}
                              />
                            </div>

                            {/* Cột Mã SKU */}
                            <div
                              style={{
                                padding: '8px 12px',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                color: isAssigned ? '#94a3b8' : '#0f766e',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {p.sku}
                            </div>

                            {/* Cột Tên sản phẩm */}
                            <div
                              style={{
                                padding: '8px 12px',
                                fontWeight: isSelected ? 700 : 500,
                                color: isAssigned ? '#94a3b8' : '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {p.name}
                              </span>
                              {isAssigned && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  Đã gán
                                </span>
                              )}
                            </div>

                            {/* Cột Đơn vị */}
                            <div
                              style={{
                                padding: '8px 12px',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: isAssigned ? '#94a3b8' : '#334155',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.baseUoM || 'Cái'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {fieldErrors.products && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>
                  {fieldErrors.products}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 3: THÔNG TIN CUNG ỨNG
                - Bỏ SupplierProductCode và DeliveryUoM
                - ĐVT luôn lấy từ Product Master
                - Chỉ còn: Giá nhập thỏa thuận (*) & MOQ (*)
               ══════════════════════════════════════════════════════════════ */}
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
                  3. Thông tin cung ứng
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  * Đơn vị tính tự động lấy theo ĐVT cơ sở của từng sản phẩm Master
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {/* Giá nhập thỏa thuận (*) */}
                <div>
                  <label
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Giá nhập thỏa thuận (*)<span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={agreedPriceInput}
                      onChange={handlePriceChange}
                      placeholder="0"
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 36px 0 12px',
                        borderRadius: 6,
                        border: fieldErrors.price ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      đ
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                    Giá thỏa thuận chung (nếu để 0 đ, hệ thống sẽ lấy theo giá vốn Master).
                  </div>
                  {fieldErrors.price && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}>
                      {fieldErrors.price}
                    </div>
                  )}
                </div>

                {/* Số lượng đặt tối thiểu (MOQ) (*) */}
                <div>
                  <label
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Số lượng đặt tối thiểu (MOQ) (*)<span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={moqInput}
                    onChange={handleMoqChange}
                    placeholder="1"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: fieldErrors.moq ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                    Số lượng tối thiểu khi tạo đơn đặt hàng mua (PO) từ NCC này.
                  </div>
                  {fieldErrors.moq && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}>
                      {fieldErrors.moq}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 4: THÔNG TIN PHÂN BỔ ĐẾN CHI NHÁNH
               ══════════════════════════════════════════════════════════════ */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  border: '1px solid #ccfbf1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Store size={16} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                  Tự động phân bổ sản phẩm đến các chi nhánh liên kết
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                  Sau khi gán thành công, hệ thống sẽ tự động phân bổ các sản phẩm này đến các chi nhánh đang liên kết với nhà cung cấp. Tồn kho và cấu hình riêng của từng chi nhánh được giữ nguyên, không bị ghi đè.
                </div>

                {selectedSupplierId && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {linkedBranchesCount !== null ? (
                      linkedBranchesCount > 0 ? (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            fontWeight: 600,
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          ✓ Nhà cung cấp này đang liên kết với {linkedBranchesCount} chi nhánh (sản phẩm sẽ được phân bổ ngay)
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            fontWeight: 500,
                            border: '1px solid #fde68a',
                          }}
                        >
                          Nhà cung cấp hiện chưa liên kết chi nhánh. Sản phẩm sẽ tự động phân bổ khi NCC được gán vào chi nhánh.
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        Đang kiểm tra chi nhánh liên kết...
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              FOOTER
             ══════════════════════════════════════════════════════════════ */}
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
                  Đang chọn:{' '}
                  <b style={{ color: '#0f766e' }}>{selectedProductIds.length}</b> sản phẩm
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Chưa chọn sản phẩm nào</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Button: Hủy bỏ */}
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
                  outline: 'none',
                }}
              >
                Hủy bỏ
              </button>

              {/* Button: Gán & Tiếp tục (giữ lại NCC, reset danh sách sản phẩm) */}
              <button
                type="button"
                onClick={() => executeSubmit(true)}
                disabled={isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1px solid #0f766e',
                  backgroundColor: '#ffffff',
                  color: '#0f766e',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor:
                    isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId
                      ? 0.5
                      : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  outline: 'none',
                }}
              >
                <PlusCircle size={15} />
                <span>Gán & Tiếp tục</span>
              </button>

              {/* Button: Xác nhận & Hoàn tất (gán và đóng popup) */}
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
                    isSubmitting || selectedProductIds.length === 0 || !selectedSupplierId
                      ? 0.5
                      : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang gán sản phẩm...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>
                      {selectedProductIds.length > 1
                        ? `Gán ${selectedProductIds.length} sản phẩm`
                        : 'Xác nhận & Hoàn tất'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ══════════════════════════════════════════════════════════════
            CONFIRM CLOSE DIALOG (Khi người dùng đang chọn dở SP mà đóng)
           ══════════════════════════════════════════════════════════════ */}
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
                Bạn đang chọn <strong>{selectedProductIds.length}</strong> sản phẩm chưa được lưu. Nếu đóng lúc này, các lựa chọn sẽ bị hủy. Bạn có chắc muốn đóng?
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
                  Tiếp tục chọn
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
