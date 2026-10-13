import { useState, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import {
  INITIAL_SUPPLIERS,
  MASTER_PRODUCTS,
  MOCK_SUPPLIER_PRODUCTS,
} from '../lib/mockData';
import type {
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from '../types/supplier.types';
import { SupplierContextCard } from '../components/products/SupplierContextCard';
import {
  SupplierProductFilterBar,
  type SupplierProductFilterValues,
} from '../components/products/SupplierProductFilterBar';
import { SupplierProductTable } from '../components/products/SupplierProductTable';
import { AssignProductModal } from '../components/products/AssignProductModal';
import { EditSupplierProductModal } from '../components/products/EditSupplierProductModal';
import { AdminToast, type ToastState, PlusIcon } from '../../admin/components';
import { Layers } from 'lucide-react';
import '../supplier.css';

export const SupplierProductManagementPage: FC = () => {
  const { id: paramSupplierId } = useParams<{ id?: string }>();

  // Suppliers state
  const suppliers = INITIAL_SUPPLIERS;

  // Products state mapped by supplierId
  const [supplierProductsCatalog, setSupplierProductsCatalog] = useState<
    Record<string, SupplierProductItem[]>
  >(MOCK_SUPPLIER_PRODUCTS);

  // Applied filter criteria state - Only updated when clicking "Tìm kiếm" or reset
  const [appliedFilters, setAppliedFilters] = useState<SupplierProductFilterValues>({
    searchTerm: '',
    supplierId: paramSupplierId && suppliers.some((s) => s.id === paramSupplierId) ? paramSupplierId : 'ALL',
    categoryFilter: 'ALL',
    statusFilter: 'ALL',
  });

  // Current active supplier (if a single supplier is selected)
  const currentSupplier = useMemo(() => {
    if (appliedFilters.supplierId !== 'ALL') {
      return suppliers.find((s) => s.id === appliedFilters.supplierId) || suppliers[0];
    }
    return suppliers[0];
  }, [suppliers, appliedFilters.supplierId]);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierProductItem | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  };

  // Flattened all products across all suppliers
  const allProducts = useMemo(() => {
    return Object.values(supplierProductsCatalog).flat();
  }, [supplierProductsCatalog]);

  // Products scope based on applied supplierId filter
  const rawProducts = useMemo(() => {
    if (appliedFilters.supplierId === 'ALL') {
      return allProducts;
    }
    return supplierProductsCatalog[appliedFilters.supplierId] || [];
  }, [allProducts, supplierProductsCatalog, appliedFilters.supplierId]);

  // Available categories across all products
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [allProducts]);

  // Filtered products list - Strictly dependent on appliedFilters
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((p) => {
      if (appliedFilters.searchTerm.trim()) {
        const term = appliedFilters.searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(term);
        const matchBarcode = p.barcode.toLowerCase().includes(term);
        const matchSku = p.sku.toLowerCase().includes(term);
        const matchSuppCode = p.supplierProductCode?.toLowerCase().includes(term) ?? false;
        if (!matchName && !matchBarcode && !matchSku && !matchSuppCode) return false;
      }
      if (appliedFilters.categoryFilter !== 'ALL' && p.categoryName !== appliedFilters.categoryFilter) {
        return false;
      }
      if (appliedFilters.statusFilter !== 'ALL' && p.status !== appliedFilters.statusFilter) {
        return false;
      }
      return true;
    });
  }, [rawProducts, appliedFilters]);

  // Filter Search & Reset Handlers
  const handleApplySearch = (newValues: SupplierProductFilterValues) => {
    setAppliedFilters(newValues);
  };

  const handleResetFilters = () => {
    setAppliedFilters({
      searchTerm: '',
      supplierId: 'ALL',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
    });
  };

  // Item Handlers
  const handleAssignProduct = (input: AssignProductInput) => {
    const master = MASTER_PRODUCTS.find((p) => p.id === input.productId);
    if (!master) return;

    const targetSupplierId = input.supplierId || currentSupplier.id;

    const newItem: SupplierProductItem = {
      id: `sp-${Date.now()}`,
      supplierId: targetSupplierId,
      productId: input.productId,
      barcode: master.barcode,
      sku: master.sku,
      name: master.name,
      categoryName: master.categoryName,
      deliveryUoM: input.deliveryUoM,
      baseUoM: master.baseUoM,
      agreedPrice: input.agreedPrice,
      importPrice: input.agreedPrice,
      unit: input.deliveryUoM,
      moq: input.moq,
      isPrimary: input.isPrimary ?? false,
      supplierProductCode: input.supplierProductCode,
      effectiveDate: new Date().toISOString().split('T')[0],
      status: 'Active',
    };

    setSupplierProductsCatalog((prev) => {
      const existing = prev[targetSupplierId] || [];
      const updated = [newItem, ...existing];
      return { ...prev, [targetSupplierId]: updated };
    });

    showToast(`Đã gán thành công sản phẩm "${master.name}" cho nhà cung cấp.`);
  };

  const handleSaveEdit = (input: EditSupplierProductInput) => {
    if (!editingItem) return;
    const suppId = editingItem.supplierId;

    setSupplierProductsCatalog((prev) => {
      const existing = prev[suppId] || [];
      const updated = existing.map((item) => {
        if (item.id === input.id) {
          return {
            ...item,
            deliveryUoM: input.deliveryUoM,
            unit: input.deliveryUoM,
            agreedPrice: input.agreedPrice,
            importPrice: input.agreedPrice,
            moq: input.moq,
            isPrimary: input.isPrimary,
            supplierProductCode: input.supplierProductCode,
          };
        }
        return item;
      });
      return { ...prev, [suppId]: updated };
    });
    showToast('Đã cập nhật thành công giá nhập sỉ thỏa thuận và số lượng tối thiểu.');
  };

  const handleToggleStatus = (item: SupplierProductItem) => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setSupplierProductsCatalog((prev) => {
      const existing = prev[item.supplierId] || [];
      return {
        ...prev,
        [item.supplierId]: existing.map((p) =>
          p.id === item.id ? { ...p, status: nextStatus } : p
        ),
      };
    });
    showToast(
      nextStatus === 'Active'
        ? `Đã kích hoạt lại mặt hàng "${item.name}".`
        : `Đã tạm ngưng cung ứng mặt hàng "${item.name}".`
    );
  };

  const assignedProductIds = useMemo(
    () => rawProducts.map((p) => p.productId),
    [rawProducts]
  );

  return (
    <div>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', margin: 0, lineHeight: 1.25 }}>
            <Layers size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--blue-primary)' }} />
            Sản Phẩm Theo Nhà Cung Cấp
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            id="btnOpenAssignProductModal"
            className="admin-btn admin-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 18px',
              borderRadius: 'var(--radius-pill)',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
            onClick={() => setIsAssignModalOpen(true)}
          >
            <PlusIcon size={14} />
            <span>Gán sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* Context Card: Only displayed when a specific supplier is filtered */}
      {appliedFilters.supplierId !== 'ALL' && (
        <SupplierContextCard
          supplier={currentSupplier}
          suppliers={suppliers}
          onSelectSupplier={(newId) =>
            setAppliedFilters((prev) => ({ ...prev, supplierId: newId }))
          }
          productCount={rawProducts.length}
        />
      )}

      {/* Unified Filters & Search Component - All filters in ONE component and requires clicking search */}
      <SupplierProductFilterBar
        initialValues={appliedFilters}
        suppliers={suppliers}
        categories={availableCategories}
        totalCount={rawProducts.length}
        filteredCount={filteredProducts.length}
        onSearch={handleApplySearch}
        onReset={handleResetFilters}
      />

      {/* Data Table */}
      <SupplierProductTable
        products={filteredProducts}
        suppliers={suppliers}
        onEdit={(item) => setEditingItem(item)}
        onToggleStatus={handleToggleStatus}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
      />

      {/* Modal 1: Assign New Product */}
      <AssignProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        supplier={currentSupplier}
        masterProducts={MASTER_PRODUCTS}
        assignedProductIds={assignedProductIds}
        onAssign={handleAssignProduct}
      />

      {/* Modal 2: Edit Product Price & MOQ */}
      <EditSupplierProductModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        supplierName={
          suppliers.find((s) => s.id === editingItem?.supplierId)?.name || currentSupplier.name
        }
        onSave={handleSaveEdit}
      />
    </div>
  );
};
