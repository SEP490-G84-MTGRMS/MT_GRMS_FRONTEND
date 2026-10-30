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
}

export interface ComboComponent {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
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
  minStock?: number;
  maxStock?: number;
  vatRate?: number;
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
