export interface UomConversion {
  id: string;
  unitName: string;
  conversionRate: number; // e.g. 1 Thùng = 24 Lon (rate = 24)
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
  documentCode: string; // e.g. KK000001, PN00012, HD0098
  method: string; // "Kiểm kho khởi tạo", "Nhập hàng từ NCC", "Bán hàng POS", "Điều chuyển kho"
  branchName: string;
  quantityChange: number; // + hoặc -
  balance: number;
}

export interface BranchStock {
  branchId: string;
  branchName: string;
  onHand: number;
  available: number;
  committed?: number;
}

export interface Category {
  id: string;
  code: string; // CAT-xxx
  name: string;
  parentId?: string | null;
  productCount: number;
  depth?: number;
}

export interface ProductItem {
  id: string;
  productCode: string; // SPxxxxxx hoặc mã barcode
  barcode: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  baseUnit: string;
  sellingPrice: number;
  costPrice: number | null; // che giấu nếu là Cashier/Employee (BR-SEC-01)
  onHand: number;
  committed: number; // Khách đặt
  isFavorite?: boolean;
  isCombo?: boolean;
  status: 'Active' | 'Discontinued';
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  minStock?: number;
  maxStock?: number;
  vatRate?: number; // 0, 5, 8, 10
  description?: string;
  internalNote?: string;
  hasTransactions?: boolean; // Khóa Base UOM nếu true (BR-PROD-01)
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
