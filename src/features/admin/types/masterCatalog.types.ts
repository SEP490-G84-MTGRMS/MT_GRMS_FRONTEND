export interface MasterProductUnit {
  id: string;
  unitName: string;
  conversionRate: number;
  barcode?: string | null;
  isPurchaseUnit: boolean;
}

export interface MasterProductItem {
  description?: string | null;
  id: string;
  barcode: string;
  name: string;
  brand: string;
  categoryName: string;
  baseUnit: string;
  suggestedRetailPrice?: number | null;
  vatRate: number;
  taxCategory: string;
  imageUrl?: string | null;
  usageCount: number;
  isActive: boolean;
  units: MasterProductUnit[];
}

export interface MasterProductDetail extends MasterProductItem {
  createdAt: string;
}

export interface MasterCatalogKpis {
  totalProducts: number;
  totalBrands: number;
  totalUsage: number;
  imageCoveragePercent: number;
}

export interface MasterCatalogFilterParams {
  keyword?: string;
  brand?: string;
  categoryName?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateMasterProductInput {
  barcode: string;
  name: string;
  brand: string;
  categoryName: string;
  baseUnit: string;
  suggestedRetailPrice?: number | null;
  vatRate?: number;
  taxCategory?: string;
  imageUrl?: string | null;
  description?: string | null;
  units?: Array<{
    unitName: string;
    conversionRate: number;
    barcode?: string | null;
    isPurchaseUnit?: boolean;
  }>;
}

export interface UpdateMasterProductInput {
  name: string;
  brand: string;
  categoryName: string;
  baseUnit: string;
  suggestedRetailPrice?: number | null;
  vatRate: number;
  taxCategory: string;
  imageUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  units?: Array<{
    unitName: string;
    conversionRate: number;
    barcode?: string | null;
    isPurchaseUnit?: boolean;
  }>;
}

export interface MasterProductExcelImportRow {
  rowNumber: number;
  barcode: string;
  name: string;
  brand: string;
  categoryName: string;
  baseUnit: string;
  suggestedPrice?: number | null;
  vatRate: number;
  imageUrl?: string | null;
  packagingSpecs?: string | null;
  isSuccess: boolean;
  errorMessage?: string | null;
}

export interface MasterProductExcelImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errorMessages: string[];
  rows: MasterProductExcelImportRow[];
}

export interface MasterProductSuggestion {
  masterProductId: string;
  barcode: string;
  name: string;
  brand: string;
  categoryName: string;
  baseUnit: string;
  suggestedRetailPrice?: number | null;
  vatRate: number;
  taxCategory: string;
  imageUrl?: string | null;
  units: MasterProductUnit[];
}
