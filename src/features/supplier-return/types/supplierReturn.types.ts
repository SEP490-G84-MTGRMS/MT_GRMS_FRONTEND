export type SupplierReturnStatus =
  | 'DRAFT'
  | 'PENDING_SUPPLIER'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SupplierReturnLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  goodsReceiptLineId?: string;
  batchCode?: string;
  expiryDate?: string;
  receivedQty: number;
  returnedQty: number;
  pendingReturnQty: number;
  availableReturnQty: number;
  requestedQty: number;
  approvedQty: number;
  rejectedQty: number;
  handedOverQty: number;
  unitCost: number;
  lineTotal: number;
  rejectionReason?: string;
  notes?: string;
}

export interface SupplierReturnListItem {
  id: string;
  code: string;
  goodsReceiptId: string;
  goodsReceiptCode: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  status: SupplierReturnStatus;
  reason: string;
  totalRequestedQty: number;
  totalApprovedQty: number;
  totalHandedOverQty: number;
  totalEstimatedAmount: number;
  createdAt: string;
  handedOverAt?: string;
  lineCount?: number;
}

export interface SupplierReturnDetail extends SupplierReturnListItem {
  reasonNotes?: string;
  supplierResponseNote?: string;
  cancellationReason?: string;
  attachmentUrl?: string;
  submittedAt?: string;
  respondedAt?: string;
  handedOverBy?: string;
  lines: SupplierReturnLine[];
}

export interface EligibleGrnLookup {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  receivedDate: string;
  lineCount: number;
}

export interface GrnReturnableLine {
  goodsReceiptLineId: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  batchCode?: string;
  expiryDate?: string;
  receivedQty: number;
  returnedQty: number;
  pendingReturnQty: number;
  availableReturnQty: number;
  unitCost: number;
}

export interface SupplierReturnKpiSummary {
  totalCount: number;
  pendingSupplierCount: number;
  approvedCount: number;
  completedCount: number;
  totalEstimatedAmount: number;
}

export interface SupplierReturnFilterState {
  keyword: string;
  branchId: string;
  supplierId: string;
  status: '' | SupplierReturnStatus;
  pageIndex: number;
  pageSize: number;
}

export interface CreateSupplierReturnPayload {
  goodsReceiptId: string;
  supplierId: string;
  branchId: string;
  reason: string;
  reasonNotes?: string;
  attachmentUrl?: string;
  submitImmediately?: boolean;
  lines: {
    productId: string;
    goodsReceiptLineId?: string;
    batchCode?: string;
    expiryDate?: string;
    requestedQty: number;
    unitCost: number;
    notes?: string;
  }[];
}

export interface RecordSupplierResponsePayload {
  resultType: 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
  supplierResponseNote?: string;
  lines: {
    lineId: string;
    approvedQty: number;
    rejectionReason?: string;
  }[];
}

export interface CompleteHandoverPayload {
  handedOverBy: string;
  notes?: string;
  lines: {
    lineId: string;
    handedOverQty: number;
  }[];
}

export interface CancelSupplierReturnPayload {
  reason: string;
}
