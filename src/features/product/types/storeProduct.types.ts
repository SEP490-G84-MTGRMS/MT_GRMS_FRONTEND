export interface StoreProductItem {
  id: string;
  storeId: string;
  storeName: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  retailPrice: number; // Giá bán lẻ niêm yết tại cửa hàng
  costPrice: number; // Giá vốn nhập sỉ từ NCC
  currentStock: number; // Tồn kho thực tế (SOH)
  minStockLevel: number; // Định mức tồn tối thiểu / an toàn
  primarySupplierName: string;
  minOrderQuantity: number; // Số lượng đặt hàng tối thiểu MOQ
  status: 'Active' | 'Inactive';
  shelfLocation?: string;
  assignedDate: string;
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
  storeNames?: string[];
  categories?: string[];
  storeId: string;
  categoryFilter: string;
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
  minStockLevel?: number;
  minOrderQuantity?: number;
  status?: 'Active' | 'Inactive';
  shelfLocation?: string;
}
