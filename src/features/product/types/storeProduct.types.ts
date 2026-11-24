export interface StoreProductUnitPrice {
  unitId?: string;
  unitName: string;
  conversionRate: number;
  price: number;
  isBaseUnit: boolean;
}

/** Một NCC nguồn nhập của SP tại cửa hàng (khi gộp nhiều NCC vào 1 dòng). */
export interface StoreProductSupplierSource {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  costPrice: number;
  minOrderQuantity: number;
  isPrimarySupplier?: boolean;
  deliveryUoM?: string;
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
  /** ĐVT tồn gốc (Product.BaseUnit) — currentStock được tính theo đơn vị này. */
  stockUnit?: string;
  /** 1 ĐVT nhập = bao nhiêu ĐVT tồn (base). */
  purchaseToStockRate?: number;
  imageUrl?: string;
  retailPrice: number; // Giá bán lẻ niêm yết tại cửa hàng (ĐVT cơ sở)
  costPrice: number; // Giá vốn từ SupplierProduct (NCC rẻ nhất khi nhiều NCC)
  /** Giá vốn TB tồn (WAC) theo ĐVT cơ sở; ĐVT khác = averageCost × conversionRate. */
  averageCost?: number;
  currentStock: number; // Tồn kho thực tế (SOH)
  minStockLevel: number; // Định mức tồn tối thiểu / an toàn
  /** Id NCC primary (rẻ nhất) — khi nhiều NCC xem `suppliers`. */
  supplierId?: string;
  primarySupplierCode?: string;
  primarySupplierName: string;
  isPrimarySupplier?: boolean;
  /** Còn ít nhất 1 NCC Active phục vụ CN cho SP này. */
  hasActiveSupplierSource?: boolean;
  /** SP đang bán tại CN nhưng mất nguồn NCC. */
  lostSupplierSource?: boolean;
  /** Danh sách NCC nguồn nhập (1 dòng catalog có thể nhiều NCC). */
  suppliers?: StoreProductSupplierSource[];
  /** Số NCC — >1 thì UI hiện "N NCC" + hover list. */
  supplierCount?: number;
  minOrderQuantity: number; // MOQ từ NCC — chỉ xem tại màn này
  status: 'Active' | 'Inactive';
  shelfLocation?: string;
  assignedDate: string;
  unitPrices?: StoreProductUnitPrice[];
  /** Master AllowRepack — có giá đóng khay (PROCESSED đ/kg). */
  allowRepack?: boolean;
  /** Giá đ/kg khi đóng khay. Null/≤0 → dùng retailPrice (RAW). */
  processedSellingPricePerKg?: number | null;
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

export interface AssignStoreProductItem {
  productId: string;
  supplierId?: string;
}

export interface AssignStoreProductInput {
  storeId: string;
  productIds: string[];
  items?: AssignStoreProductItem[];
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
  /** Giá đóng khay đ/kg — chỉ khi allowRepack. */
  processedSellingPricePerKg?: number | null;
}

