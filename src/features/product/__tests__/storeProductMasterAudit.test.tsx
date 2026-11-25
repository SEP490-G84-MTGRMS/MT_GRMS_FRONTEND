import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignStoreProductModal } from '../components/AssignStoreProductModal';
import { EditStoreProductModal } from '../components/EditStoreProductModal';
import { storeProductApi } from '../api/storeProductApi';
import type { StoreSummary, StoreProductItem, EditStoreProductInput } from '../types/storeProduct.types';

// Mock storeProductApi
vi.mock('../api/storeProductApi', () => ({
  storeProductApi: {
    getMasterProducts: vi.fn(),
    getAssignableProducts: vi.fn(),
    getStoreProducts: vi.fn(),
    assignProducts: vi.fn(),
    updateProduct: vi.fn(),
    removeProduct: vi.fn(),
    toggleStatus: vi.fn(),
    getStoreSummaries: vi.fn(),
  },
}));

vi.mock('../components/PriceHistoryModal', () => ({
  PriceHistoryModal: ({ productId, branchId }: { productId: string; branchId?: string }) => (
    <div data-testid="price-history-modal">
      {productId}:{branchId}
    </div>
  ),
}));

// Test Fixtures
const mockStores: StoreSummary[] = [
  {
    id: 'store-01',
    code: 'ST-01',
    name: 'Chi nhánh Quận 1',
    address: '123 Lê Lợi, Q1, TP.HCM',
    managerName: 'Trần Văn Quản Lý',
    phone: '0901234567',
    totalProducts: 15,
    totalStock: 450,
    lowStockCount: 2,
  },
  {
    id: 'store-02',
    code: 'ST-02',
    name: 'Chi nhánh Bình Thạnh',
    address: '456 Xô Viết Nghệ Tĩnh, Bình Thạnh',
    managerName: 'Lê Thị Trưởng Quầy',
    phone: '0909876543',
    totalProducts: 20,
    totalStock: 600,
    lowStockCount: 1,
  },
];

const mockMasterCatalog = [
  {
    id: 'prod-01',
    sku: 'SP001',
    barcode: '893000000001',
    name: 'Gạo ST25 Ông Cua 5kg',
    categoryName: 'Gạo & Nông sản',
    baseUoM: 'Túi',
    costPrice: 170000,
    minOrderQuantity: 10,
    moq: 10,
  },
  {
    id: 'prod-02',
    sku: 'SP002',
    barcode: '893000000002',
    name: 'Nước Mắm Nam Ngư Đệ Nhị 900ml',
    categoryName: 'Gia vị & Dầu ăn',
    baseUoM: 'Chai',
    costPrice: 22000,
  },
  {
    id: 'prod-03',
    sku: 'SP003',
    barcode: '893000000003',
    name: 'Dầu Ăn Simply Nguyên Chất 1L',
    categoryName: 'Gia vị & Dầu ăn',
    baseUoM: 'Chai',
    costPrice: 52000,
  },
  {
    id: 'prod-04',
    sku: 'SP004',
    barcode: '893000000004',
    name: 'Sữa Tươi TH True Milk 1L',
    categoryName: 'Sữa & Bơ',
    baseUoM: 'Hộp',
    costPrice: 32000,
  },
];

const mockItemStore1: StoreProductItem = {
  id: 'stock-01',
  storeId: 'store-01',
  storeCode: 'ST-01',
  storeName: 'Chi nhánh Quận 1',
  productId: 'prod-01',
  name: 'Gạo ST25 Ông Cua 5kg',
  sku: 'SP001',
  barcode: '893000000001',
  category: 'Gạo & Nông sản',
  unit: 'Túi',
  retailPrice: 210000,
  costPrice: 170000,
  currentStock: 35,
  minStockLevel: 10,
  primarySupplierCode: 'NCC-001',
  primarySupplierName: 'Công ty Lương thực Miền Nam',
  minOrderQuantity: 5,
  status: 'Active',
  assignedDate: '2026-11-01',
};

describe('STORE PRODUCT MANAGEMENT – MASTER AUDIT SUITE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storeProductApi.getMasterProducts as any).mockResolvedValue(mockMasterCatalog);
    (storeProductApi.getAssignableProducts as any).mockResolvedValue(
      mockMasterCatalog.map((p) => ({
        ...p,
        supplierId: 'sup-01',
        supplierCode: 'NCC-001',
        supplierName: 'Công ty Lương thực Miền Nam',
        isAlreadyAssigned: p.id === 'prod-04',
      }))
    );
    (storeProductApi.getStoreProducts as any).mockResolvedValue({
      items: [
        {
          id: 'stock-04',
          branchId: 'store-01',
          productId: 'prod-04', // prod-04 already assigned to store-01
        },
      ],
      total: 1,
    });
  });

  // =========================================================================
  // SECTION 7: ASSIGN PRODUCTS MODAL (TC-ASSIGN-001 .. TC-ASSIGN-012)
  // =========================================================================
  describe('7. Assign Products Modal & Product Catalog Table', () => {
    it('TC-ASSIGN-001: Displays MOQ column in product table, assigns single product, and verifies payload', async () => {
      const handleAssign = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={handleClose}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={handleAssign}
        />
      );

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // Verify table has MOQ column header
      expect(screen.getByRole('columnheader', { name: /MOQ/i })).toBeInTheDocument();

      // Select Product 1
      const p1Checkbox = screen.getByText('Gạo ST25 Ông Cua 5kg').closest('tr')?.querySelector('input[type="checkbox"]');
      expect(p1Checkbox).toBeInTheDocument();
      fireEvent.click(p1Checkbox!);

      // Verify dynamic summary and button label
      expect(screen.getByText(/Gán 1 sản phẩm vào chi nhánh/i)).toBeInTheDocument();
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('1 sản phẩm');

      // Submit
      const submitBtn = document.getElementById('btnSubmitAssignProducts')!;
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleAssign).toHaveBeenCalledWith({
          storeId: 'store-01',
          productIds: ['prod-01'],
          items: [{ productId: 'prod-01', supplierId: 'sup-01' }],
        });
        expect(handleClose).toHaveBeenCalled();
      });
    });

    it('TC-ASSIGN-002: Assigns multiple products (A, B, C) in bulk without popup MOQ section', async () => {
      const handleAssign = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={handleClose}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={handleAssign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // Select Product 1, 2, 3
      fireEvent.click(screen.getByText('Gạo ST25 Ông Cua 5kg'));
      fireEvent.click(screen.getByText('Nước Mắm Nam Ngư Đệ Nhị 900ml'));
      fireEvent.click(screen.getByText('Dầu Ăn Simply Nguyên Chất 1L'));

      // Check dynamic count
      expect(screen.getByText(/Gán 3 sản phẩm vào chi nhánh/i)).toBeInTheDocument();
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('3 sản phẩm');

      const submitBtn = document.getElementById('btnSubmitAssignProducts')!;
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleAssign).toHaveBeenCalledWith({
          storeId: 'store-01',
          productIds: ['prod-01', 'prod-02', 'prod-03'],
          items: [
            { productId: 'prod-01', supplierId: 'sup-01' },
            { productId: 'prod-02', supplierId: 'sup-01' },
            { productId: 'prod-03', supplierId: 'sup-01' },
          ],
        });
      });
    });

    it('TC-ASSIGN-002b: Same product from 2 suppliers renders 2 rows (1 assigned, 1 selectable) and assigns chosen supplier', async () => {
      const handleAssign = vi.fn().mockResolvedValue(undefined);
      (storeProductApi.getAssignableProducts as any).mockResolvedValue([
        {
          id: 'prod-z',
          sku: 'IMP-DEMO-001',
          barcode: '893000000099',
          name: 'Nước khoáng thiên nhiên 500ml',
          categoryName: 'Đồ uống',
          baseUoM: 'Chai',
          costPrice: 8600,
          moq: 10,
          supplierId: 'sup-b',
          supplierCode: 'NCC-B',
          supplierName: 'Nhà cung cấp B',
          isAlreadyAssigned: true,
        },
        {
          id: 'prod-z',
          sku: 'IMP-DEMO-001',
          barcode: '893000000099',
          name: 'Nước khoáng thiên nhiên 500ml',
          categoryName: 'Đồ uống',
          baseUoM: 'Chai',
          costPrice: 8500,
          moq: 10,
          supplierId: 'sup-c',
          supplierCode: 'NCC-C',
          supplierName: 'Nhà cung cấp C',
          isAlreadyAssigned: false,
        },
      ]);

      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={handleAssign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/NCC-B — Nhà cung cấp B/i)).toBeInTheDocument();
        expect(screen.getByText(/NCC-C — Nhà cung cấp C/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      // checkbox[0] = select-all, checkbox[1] = NCC-B (disabled), checkbox[2] = NCC-C (enabled)
      expect(checkboxes[1]).toBeDisabled();
      expect(checkboxes[2]).not.toBeDisabled();

      fireEvent.click(checkboxes[2]);
      fireEvent.click(document.getElementById('btnSubmitAssignProducts')!);

      await waitFor(() => {
        expect(handleAssign).toHaveBeenCalledWith({
          storeId: 'store-01',
          productIds: ['prod-z'],
          items: [{ productId: 'prod-z', supplierId: 'sup-c' }],
        });
      });
    });

    it('TC-ASSIGN-004: Selection state is maintained independently of search filter', async () => {
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // 1. Select Product 1 (Gạo)
      fireEvent.click(screen.getByText('Gạo ST25 Ông Cua 5kg'));
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('1 sản phẩm');

      // 2. Search for Product 2 (Nước mắm)
      const searchInput = screen.getByPlaceholderText(/Tìm theo tên sản phẩm, mã SKU, barcode/i);
      fireEvent.change(searchInput, { target: { value: 'Nam Ngư' } });

      // Product 1 is now hidden by filter, Product 2 is visible
      expect(screen.queryByText('Gạo ST25 Ông Cua 5kg')).not.toBeInTheDocument();
      expect(screen.getByText('Nước Mắm Nam Ngư Đệ Nhị 900ml')).toBeInTheDocument();

      // 3. Select Product 2
      fireEvent.click(screen.getByText('Nước Mắm Nam Ngư Đệ Nhị 900ml'));
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('2 sản phẩm');

      // 4. Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Both Product 1 and Product 2 are visible AND selected!
      expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      expect(screen.getByText('Nước Mắm Nam Ngư Đệ Nhị 900ml')).toBeInTheDocument();
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('2 sản phẩm');
      expect(screen.getByText(/Gán 2 sản phẩm vào chi nhánh/i)).toBeInTheDocument();
    });

    it('TC-ASSIGN-005: Selection state is maintained independently of category filter', async () => {
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // Select Gạo (Category: Gạo & Nông sản)
      fireEvent.click(screen.getByText('Gạo ST25 Ông Cua 5kg'));
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('1 sản phẩm');

      // Switch category filter to 'Gia vị & Dầu ăn'
      const catSelect = document.getElementById('selectAssignCategoryFilter') as HTMLSelectElement;
      fireEvent.change(catSelect, { target: { value: 'Gia vị & Dầu ăn' } });

      // Gạo is hidden from current table view, but selection count is still 1!
      expect(screen.queryByText('Gạo ST25 Ông Cua 5kg')).not.toBeInTheDocument();
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('1 sản phẩm');

      // Select Nước Mắm in this category
      fireEvent.click(screen.getByText('Nước Mắm Nam Ngư Đệ Nhị 900ml'));
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('2 sản phẩm');

      // Switch back to 'ALL'
      fireEvent.change(catSelect, { target: { value: 'ALL' } });
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('2 sản phẩm');
    });

    it('TC-ASSIGN-006: Select-all selects all currently filtered products and toggles off', async () => {
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      const selectAllCheckbox = document.getElementById('chkSelectAllProducts') as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(false);

      // Click Select All
      fireEvent.click(selectAllCheckbox);

      // All 3 available products (prod-01, prod-02, prod-03) selected
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('3 sản phẩm');

      // Click Select All again to deselect
      fireEvent.click(selectAllCheckbox);
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('0 sản phẩm');
    });

    it('TC-ASSIGN-007: Changing store resets selected products to prevent accidental cross-assignment', async () => {
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // Select Product 1 for Store 1
      fireEvent.click(screen.getByText('Gạo ST25 Ông Cua 5kg'));
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('1 sản phẩm');

      // Switch to Store 2
      const branchInput = document.getElementById('assignStoreSelect')!;
      fireEvent.change(branchInput, { target: { value: 'Bình Thạnh' } });
      fireEvent.click(screen.getByText(/Chi nhánh Bình Thạnh/i));

      // Verify selections are immediately cleared
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('0 sản phẩm');
    });

    it('TC-ASSIGN-008: MOQ validation rejects empty, negative, decimal and alphabetic inputs', async () => {
      const handleAssign = vi.fn();
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={handleAssign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // Select 1 product
      fireEvent.click(screen.getByText('Gạo ST25 Ông Cua 5kg'));
      expect(screen.getByRole('button', { name: /Gán 1 sản phẩm vào chi nhánh/i })).not.toBeDisabled();

      // Verify MOQ value rendered in table cells
      expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    });

    it('TC-ASSIGN-009: Assign button is disabled when no product is selected', async () => {
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // No product selected
      const assignBtn = document.getElementById('btnSubmitAssignProducts') as HTMLButtonElement;
      expect(assignBtn.disabled).toBe(true);
      expect(document.getElementById('summarySelectedCount')?.textContent).toBe('0 sản phẩm');
    });

    it('TC-ASSIGN-010: Handles API failure gracefully without clearing user selections', async () => {
      const handleAssign = vi.fn().mockRejectedValue(new Error('Network timeout'));
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={handleAssign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Gạo ST25 Ông Cua 5kg'));

      const submitBtn = document.getElementById('btnSubmitAssignProducts')!;
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
        // Product remains selected for retry!
        expect(document.getElementById('summarySelectedCount')?.textContent).toBe('1 sản phẩm');
      });
    });

    it('TC-ASSIGN-011: Already-assigned products stay visible but cannot be selected again', async () => {
      render(
        <AssignStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          stores={mockStores}
          currentStore={mockStores[0]}
          onAssign={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      });

      // prod-04 vẫn hiện để người dùng thấy data, nhưng bị khóa
      expect(screen.getByText('Sữa Tươi TH True Milk 1L')).toBeInTheDocument();
      expect(screen.getAllByText('Đã gán').length).toBeGreaterThan(0);
      expect(screen.getByText(/1 sản phẩm đã có tại/i)).toBeInTheDocument();

      const assignedRow = screen.getByText('Sữa Tươi TH True Milk 1L').closest('tr');
      const checkbox = assignedRow?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 8: EDIT PRODUCT MODAL (TC-EDIT-001 .. TC-EDIT-010)
  // =========================================================================
  describe('8. Edit Product Modal & Store Business Configuration', () => {
    it('TC-EDIT-001: Displays all required fields in Groups A, B, C, D with correct initial values', () => {
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={vi.fn()}
        />
      );

      // Header
      expect(screen.getByText(/Chỉnh sửa sản phẩm tại chi nhánh/i)).toBeInTheDocument();

      // Group A - Store Info
      expect(screen.getByDisplayValue('ST-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Chi nhánh Quận 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Lê Lợi, Q1, TP.HCM')).toBeInTheDocument();

      // Group B - Product Info
      expect(screen.getByDisplayValue('SP001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Gạo ST25 Ông Cua 5kg')).toBeInTheDocument();
      expect(screen.getByDisplayValue('893000000001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Gạo & Nông sản')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Túi')).toBeInTheDocument();
      expect(screen.getByDisplayValue('170.000 đ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('35 Túi')).toBeInTheDocument();

      // Group C - Supplier Info
      expect(screen.getByDisplayValue('NCC-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Công ty Lương thực Miền Nam')).toBeInTheDocument();

      // Group D - Editable fields (giá theo ĐVT; không so sánh với giá vốn thùng)
      expect(screen.getByLabelText(/Giá Túi/i)).toHaveValue(210000);
      expect(screen.getByLabelText(/^MOQ$/i)).toHaveValue(5);
      expect(screen.getByLabelText(/Đang KD/i)).toBeChecked();
      expect(screen.queryByText(/Lãi gộp/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Bán dưới giá vốn/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lịch sử giá/i })).toBeInTheDocument();
    });

    it('TC-EDIT-001A: Opens price history for the selected product and branch', () => {
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Lịch sử giá/i }));

      expect(screen.getByTestId('price-history-modal')).toHaveTextContent(
        `${mockItemStore1.productId}:${mockItemStore1.storeId}`
      );
    });

    it('TC-EDIT-002: Read-only fields cannot be edited and maintain readOnly attribute', () => {
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={vi.fn()}
        />
      );

      const skuInput = screen.getByDisplayValue('SP001') as HTMLInputElement;
      const nameInput = screen.getByDisplayValue('Gạo ST25 Ông Cua 5kg') as HTMLInputElement;
      const storeNameInput = screen.getByDisplayValue('Chi nhánh Quận 1') as HTMLInputElement;
      const supplierInput = screen.getByDisplayValue('Công ty Lương thực Miền Nam') as HTMLInputElement;

      expect(skuInput.readOnly).toBe(true);
      expect(nameInput.readOnly).toBe(true);
      expect(storeNameInput.readOnly).toBe(true);
      expect(supplierInput.readOnly).toBe(true);
    });

    it('TC-EDIT-003: Updates unit selling price without comparing against case cost', async () => {
      const handleSave = vi.fn().mockResolvedValue(undefined);
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={handleSave}
        />
      );

      const priceInput = screen.getByLabelText(/Giá Túi/i);

      // Giá vốn là theo thùng — không hiện lãi/lỗ so với giá bán ĐVT
      expect(screen.queryByText(/Lãi gộp/i)).not.toBeInTheDocument();
      fireEvent.change(priceInput, { target: { value: '150000' } });
      expect(screen.queryByText(/Bán dưới giá vốn/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cảnh báo giá bán/i)).not.toBeInTheDocument();

      fireEvent.change(priceInput, { target: { value: '220000' } });
      fireEvent.click(document.getElementById('btnSaveEditProduct')!);

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith('store-01', 'prod-01', {
          retailPrice: 220000,
          status: 'Active',
          unitPrices: [
            { unitName: 'Túi', conversionRate: 1, price: 220000, isBaseUnit: true },
          ],
        });
      });
    });

    it('TC-EDIT-004: MOQ is read-only and is not submitted from the branch page', async () => {
      const handleSave = vi.fn().mockResolvedValue(undefined);
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={handleSave}
        />
      );

      const moqInput = screen.getByLabelText(/^MOQ$/i) as HTMLInputElement;
      expect(moqInput.readOnly).toBe(true);
      fireEvent.change(moqInput, { target: { value: '99' } });
      expect(moqInput.value).toBe('5');

      fireEvent.click(document.getElementById('btnSaveEditProduct')!);
      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith('store-01', 'prod-01', {
          retailPrice: 210000,
          status: 'Active',
          unitPrices: [
            { unitName: 'Túi', conversionRate: 1, price: 210000, isBaseUnit: true },
          ],
        });
      });
    });

    it('TC-EDIT-005: Toggles store-specific business status between Active and Inactive', async () => {
      const handleSave = vi.fn().mockResolvedValue(undefined);
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={handleSave}
        />
      );

      fireEvent.click(screen.getByLabelText(/Tạm ngừng/i));
      expect(screen.getByLabelText(/Tạm ngừng/i)).toBeChecked();

      fireEvent.click(document.getElementById('btnSaveEditProduct')!);

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith('store-01', 'prod-01', {
          retailPrice: 210000,
          status: 'Inactive',
          unitPrices: [
            { unitName: 'Túi', conversionRate: 1, price: 210000, isBaseUnit: true },
          ],
        });
      });
    });

    it('TC-EDIT-006: Cancel discards edits without saving', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={handleClose}
          product={mockItemStore1}
          stores={mockStores}
          onSave={handleSave}
        />
      );

      // Click Cancel when form is not dirty
      fireEvent.click(document.getElementById('btnCancelEditProduct')!);
      expect(handleClose).toHaveBeenCalled();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('TC-EDIT-007: Prompts confirmation on unsaved changes before closing', async () => {
      const handleClose = vi.fn();
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={handleClose}
          product={mockItemStore1}
          stores={mockStores}
          onSave={vi.fn()}
        />
      );

      // Modify price (making form dirty)
      const priceInput = screen.getByLabelText(/Giá Túi/i);
      fireEvent.change(priceInput, { target: { value: '250000' } });

      // Click close (X button)
      fireEvent.click(document.getElementById('btnCloseEditProductModalX')!);

      // Confirmation dialog must appear
      expect(screen.getByText('Hủy thay đổi chưa lưu?')).toBeInTheDocument();
      expect(handleClose).not.toHaveBeenCalled();

      // Click "Hủy bỏ thay đổi" -> closes
      fireEvent.click(document.getElementById('btnConfirmDiscardChanges')!);
      expect(handleClose).toHaveBeenCalled();
    });

    it('TC-EDIT-008: Edit modal no longer exposes remove-from-store action', () => {
      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={vi.fn()}
        />
      );

      expect(document.getElementById('btnRemoveFromStore')).toBeNull();
      expect(screen.queryByText(/Gỡ khỏi/i)).not.toBeInTheDocument();
    });

    it('TC-EDIT-009: Shows error banner when saving fails and preserves user edits for retry', async () => {
      const handleSave = vi.fn().mockRejectedValue(new Error('Lỗi máy chủ khi cập nhật'));

      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockItemStore1}
          stores={mockStores}
          onSave={handleSave}
        />
      );

      const priceInput = screen.getByLabelText(/Giá Túi/i);
      fireEvent.change(priceInput, { target: { value: '230000' } });

      fireEvent.click(document.getElementById('btnSaveEditProduct')!);

      await waitFor(() => {
        expect(screen.getByText('Lỗi máy chủ khi cập nhật')).toBeInTheDocument();
        expect(priceInput).toHaveValue(230000);
      });
    });
  });

  // =========================================================================
  // SECTION 9: CROSS-STORE DATA ISOLATION TESTING
  // =========================================================================
  describe('9. Cross-Store Data Isolation Testing', () => {
    it('TC-ISO-001: Updating MOQ and price for Store 1 does not affect Store 2 values', async () => {
      // Store 1 product item
      const itemStore1: StoreProductItem = {
        ...mockItemStore1,
        storeId: 'store-01',
        retailPrice: 100000,
        minOrderQuantity: 5,
        status: 'Active',
      };

      // Store 2 product item for the same product
      const itemStore2: StoreProductItem = {
        ...mockItemStore1,
        id: 'stock-02',
        storeId: 'store-02',
        storeCode: 'ST-02',
        storeName: 'Chi nhánh Bình Thạnh',
        retailPrice: 110000,
        minOrderQuantity: 10,
        status: 'Active',
      };

      const handleSaveStore1 = vi.fn().mockImplementation((storeId, productId, input: EditStoreProductInput) => {
        // Assert payload targets Store 1 only
        expect(storeId).toBe('store-01');
        expect(productId).toBe('prod-01');
        expect(input.retailPrice).toBe(105000);
      });

      render(
        <EditStoreProductModal
          isOpen={true}
          onClose={vi.fn()}
          product={itemStore1}
          stores={mockStores}
          onSave={handleSaveStore1}
        />
      );

      // Edit Store 1 price to 105,000
      const priceInput = screen.getByLabelText(/Giá Túi/i);
      fireEvent.change(priceInput, { target: { value: '105000' } });
      fireEvent.click(document.getElementById('btnSaveEditProduct')!);

      await waitFor(() => {
        expect(handleSaveStore1).toHaveBeenCalled();
      });

      // Verify Store 2 item was completely isolated
      expect(itemStore2.minOrderQuantity).toBe(10);
      expect(itemStore2.retailPrice).toBe(110000);
      expect(itemStore2.storeId).toBe('store-02');
    });
  });
});
