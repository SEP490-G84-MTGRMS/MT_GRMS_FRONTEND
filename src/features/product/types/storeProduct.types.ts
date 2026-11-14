export interface StoreProductUnitPrice {
  unitId?: string;
  unitName: string;
  conversionRate: number;
  price: number;
  isBaseUnit: boolean;
}

export interface StoreProductItem {
  id: string;
  storeId: string;
  storeCode?: string;
  storeName: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  /** Đơn vị nhập (DeliveryUoM / IsPurchaseUnit / BaseUnit) — không phải ĐVT bán lẻ. */
  unit: string;
  imageUrl?: string;
  retailPrice: number; // Giá bán lẻ niêm yết tại cửa hàng (ĐVT cơ sở)
  costPrice: number; // Giá vốn từ SupplierProduct
  currentStock: number; // Tồn kho thực tế (SOH)
  minStockLevel: number; // Định mức tồn tối thiểu / an toàn
  /** Id NCC của dòng nguồn nhập (1 BranchProduct có thể nhiều dòng / nhiều NCC). */
  supplierId?: string;
  primarySupplierCode?: string;
  primarySupplierName: string;
  isPrimarySupplier?: boolean;
  /** Còn ít nhất 1 NCC Active phục vụ CN cho SP này. */
  hasActiveSupplierSource?: boolean;
  /** SP đang bán tại CN nhưng mất nguồn NCC. */
  lostSupplierSource?: boolean;
  minOrderQuantity: number; // MOQ từ NCC — chỉ xem tại màn này
  status: 'Active' | 'Inactive';
  shelfLocation?: string;
  assignedDate: string;
  unitPrices?: StoreProductUnitPrice[];
}

export interface StoreSummary {
  id: string;
  code: string;
  name: string;
  address: string;
  managerName: string;
  phone: string;
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
}

export interface StoreProductFilterValues {
  searchTerm?: string;
  skus?: string[];
  names?: string[];
  storeCodes?: string[];
  storeNames?: string[];
  supplierCodes?: string[];
  supplierNames?: string[];
  storeId: string;
  categoryFilter?: string;
  statusFilter: 'ALL' | 'Active' | 'Inactive';
  stockAlertFilter?: 'ALL' | 'LOW' | 'OUT_OF_STOCK' | 'NORMAL';
}

export interface AssignStoreProductInput {
  storeId: string;
  productIds: string[];
  defaultRetailPrice?: number;
  defaultMinStock?: number;
  defaultMinOrderQuantity?: number;
}

export interface EditStoreProductInput {
  retailPrice: number;
  unitPrices?: StoreProductUnitPrice[];
  minStockLevel?: number;
  /** Không gửi lên API — MOQ chỉ sửa ở màn NCC */
  minOrderQuantity?: number;
  status?: 'Active' | 'Inactive';
  supplierId?: string;
  shelfLocation?: string;
}

