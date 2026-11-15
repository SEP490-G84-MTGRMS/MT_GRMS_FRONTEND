export type TransferStatus = 'Draft' | 'Pending' | 'InTransit' | 'Completed' | 'Cancelled';
export type TransferCompletionResult = 'Received' | 'ReceivedWithDiscrepancy' | 'Returned' | 'Partial';
export type TransferOrigin = 'OwnerAllocation' | 'StaffUrgentRequest';
export type TransferPriority = 'Normal' | 'Urgent';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface BatchItem {
  id: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD or DD/MM/YYYY
  onHand: number;
  isExpired?: boolean;
}

export interface TransferItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string;
  onHandSender: number;
  onHandReceiver: number;
  sentQty: number;
  receivedQty?: number;
  unitPrice: number;
  amount: number;
  batchNumber?: string;
  expiryDate?: string;
  note?: string;
  hasBatchManagement?: boolean;
  batches?: BatchItem[];
}

export interface TransferOrder {
  id: string;
  transferCode: string; // TRFxxxxxx
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  createdBy: string;
  transferDate: string; // DD/MM/YYYY HH:mm
  receiveDate?: string;
  expectedDeliveryDate?: string;
  status: TransferStatus;
  completionResult?: TransferCompletionResult;
  origin?: TransferOrigin;
  priority?: TransferPriority;
  submittedAt?: string;
  hasDiscrepancy?: boolean;
  totalAmount: number;
  note?: string;
  discrepancyNote?: string;
  cancelReason?: string;
  isFavorite?: boolean;
  items: TransferItem[];
  history?: Array<{ id: string; fromStatus?: string; toStatus: string; action: string; actorUserId: string; actorBranchId?: string; actorRole: string; reason?: string; createdAt: string }>;
}

export interface TransferFilterState {
  searchCode: string;
  fromBranchId: string;
  toBranchId: string;
  statusList: TransferStatus[];
  filterTransferDate: boolean;
  filterReceiveDate: boolean;
  timeRange: 'all' | 'this_month' | 'custom';
  customDate?: string;
  recvStatus: 'all' | 'match' | 'mismatch';
}
