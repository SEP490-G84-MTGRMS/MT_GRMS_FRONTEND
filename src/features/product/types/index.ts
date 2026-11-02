/**
 * Product Catalog Management Types (MT-GRMS Frontend)
 * Synchronized with Backend .NET 8 Clean Architecture DTOs
 */

// ==========================================
// 1. Core Backend DTOs (Tiểu cụm 1.1 & 1.2)
// ==========================================

export interface ProductResponse {
  id: string;
  productCode: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  baseUnit: string;
  sellingPrice: number;
  costPrice: number | null; // Ẩn với Cashier/Staff theo BR-SEC-01
  minStock: number;
  maxStock: number;
  vatRate: number;
  productType: string;
  status: string; // "Active" | "Discontinued"
  imageUrl?: string | null;
  imageUrls?: string[];
  description?: string | null;
  internalNote?: string | null;
  hasBatches: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ProductQueryFilter {
  searchTerm?: string;
  categoryId?: string;
  categoryIds?: string[];
  status?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CategoryDto {
  id: string;
  categoryCode?: string;
  code?: string;
  name: string;
  description?: string | null;
  displayOrder?: number;
  productCount: number;
}

// ==========================================
// 2. Backward Compatibility Types
// ==========================================

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  productCount: number;
  depth?: number;
}

export interface UomConversion {
  id: string;
  unitName: string;
  conversionRate: number;
  barcode?: string;
  price: number;
  productCode?: string; // Mặc định hiển thị theo mã hàng của sản phẩm
}

export interface ProductUnitResponse {
  id: string;
  productId: string;
  unitName: string;
  conversionRate: number;
  price: number;
  barcode?: string | null;
  isBaseUnit: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ProductUnitCreatePayload {
  unitName: string;
  conversionRate: number;
  price: number;
  barcode?: string | null;
  isBaseUnit?: boolean;
}

export interface ProductUnitUpdatePayload {
  unitName: string;
  conversionRate: number;
  price: number;
  barcode?: string | null;
  isBaseUnit?: boolean;
}

export interface ProductCreatePayload {
  name: string;
  categoryId: string;
  sellingPrice: number;
  productCode?: string;
  barcode?: string;
  baseUnit?: string;
  costPrice?: number | null;
  minStock?: number;
  maxStock?: number;
  vatRate?: number;
  productType?: string;
  status?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  description?: string | null;
  internalNote?: string | null;
  hasBatches?: boolean;
  isFavorite?: boolean;
  eligibleForVatReduction?: boolean;
}

export interface ProductUpdatePayload {
  name: string;
  categoryId: string;
  sellingPrice: number;
  barcode?: string | null;
  baseUnit?: string;
  costPrice?: number | null;
  minStock?: number;
  maxStock?: number;
  vatRate?: number;
  status?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  description?: string | null;
  internalNote?: string | null;
  hasBatches?: boolean;
  isFavorite?: boolean;
  eligibleForVatReduction?: boolean;
}

export interface ComboComponent {
  id: string;
  productId: string;
  productCode?: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
  sellingprice?: number;
}

export interface StockLedgerEntry {
  id: string;
  timestamp: string;
  documentCode: string;
  method: string;
  branchName: string;
  quantityChange: number;
  balance: number;
}

export interface BranchStock {
  branchId: string;
  branchName: string;
  onHand: number;
  available: number;
  committed?: number;
}

export interface ProductItem {
  id: string;
  productCode: string;
  barcode: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  baseUnit: string;
  sellingPrice: number;
  costPrice: number | null;
  onHand: number;
  committed: number;
  isFavorite?: boolean;
  hasBatches?: boolean;
  isCombo?: boolean;
  status: 'Active' | 'Discontinued';
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  imageUrls?: string[];
  minStock?: number;
  maxStock?: number;
  vatRate?: number; // 0, 5, 8, 10
  eligibleForVatReduction?: boolean; // Cờ giảm 20% thuế GTGT theo NQ 204/2025/QH15
  description?: string;
  internalNote?: string;
  hasTransactions?: boolean;
  uomConversions?: UomConversion[];
  comboComponents?: ComboComponent[];
  stockLedger?: StockLedgerEntry[];
  branchStocks?: BranchStock[];
}

export interface ProductFilterState {
  search: string;
  selectedCategories: string[];
  stockCriteria: 'all' | 'in_stock' | 'out_of_stock' | 'below_min' | 'negative';
  createdTime: 'all' | 'custom';
  customDate?: string;
  supplier?: string;
  status?: string;
  page: number;
  pageSize: number;
}
