import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generateUuidV7 } from '../../../utils/uuid';
import type { FC } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  QrCode,
  Banknote,
  PackageCheck,
  Printer,
  ChevronRight,
  X,
  XCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  CreditCard,
  RotateCcw,
  Building2,
  Ticket,
  Star,
  Gift,
  Loader2,
  Eye,
} from 'lucide-react';
import { TablePagination, ConfirmDialog, SortableHeader, useTableSort } from '../../../components/common';
import { AdminToast, type ToastState } from '../../admin/components';
import type { InvoiceDTO, PreOrderDTO } from '../types/inventory.types';
import { ReturnExchangeModal } from '../components/modals/ReturnExchangeModal';
import { CreatePreOrderModal } from '../components/modals/CreatePreOrderModal';
import { FulfillPreOrderModal } from '../components/modals/FulfillPreOrderModal';
import { PosReceiptModal } from '../components/PosReceiptModal';
import type { Product, Customer, ReceiptData } from '../types/pos.types';
import { posOrderApi } from '../api/posOrderApi';
import { posShiftApi } from '../api/posShiftApi';
import { employeeApi } from '../../employee/api/employeeApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';
import '../../../styles/so-list-page.css';
import './invoice-management-list.css';

/**
 * Tách và làm sạch thời gian hẹn nhận hàng từ Note đơn đặt trước
 * Tránh hiển thị chuỗi dài gồm cả SĐT, ghi chú xuất hàng và tag hệ thống [CHỐT CUỐI NGÀY: ...]
 */
const parseOrderDateToLocal = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const d = new Date(hasTz ? trimmed : `${trimmed}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const matchesTimePreset = (
  rawDate: string | undefined,
  preset: 'all' | 'today' | 'yesterday' | 'week' | 'month',
): boolean => {
  if (preset === 'all') return true;
  const d = parseOrderDateToLocal(rawDate);
  if (!d) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (preset === 'today') {
    return d >= startOfToday && d <= endOfToday;
  }
  if (preset === 'yesterday') {
    const startYesterday = new Date(startOfToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const endYesterday = new Date(startOfToday.getTime() - 1);
    return d >= startYesterday && d <= endYesterday;
  }
  if (preset === 'week') {
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    return d >= startOfWeek && d <= endOfToday;
  }
  if (preset === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return d >= startOfMonth && d <= endOfToday;
  }
  return true;
};

const parsePreOrderPickupAndNotes = (rawNote?: string | null, expectedPickupDate?: string | null) => {
  const formattedPickup = expectedPickupDate
    ? (parseOrderDateToLocal(expectedPickupDate)?.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) ?? '')
    : '';

  if (!rawNote || !rawNote.trim()) {
    return {
      pickupAppointment: formattedPickup || '—',
      fulfillmentNote: null as string | null,
      notes: null as string | null,
    };
  }

  // 1. Ưu tiên dùng expectedPickupDate từ DB; chỉ fallback regex cho đơn cũ chưa có cột riêng
  let pickupAppointment = formattedPickup;
  if (!pickupAppointment) {
    const matchAppt = rawNote.match(/Hẹn nhận:\s*([^.|]+)/i);
    if (matchAppt && matchAppt[1]) {
      pickupAppointment = matchAppt[1].trim();
    }
  }

  // 2. Trích xuất ghi chú xuất hàng/bàn giao nếu có
  let fulfillmentNote: string | null = null;
  const matchFulfill = rawNote.match(/Xuất hàng:\s*([^|]+)/i);
  if (matchFulfill && matchFulfill[1]) {
    fulfillmentNote = matchFulfill[1].trim();
  }

  // 3. Làm sạch ghi chú bổ sung khác (loại bỏ thông tin khách trùng lặp và tag hệ thống [CHỐT CUỐI NGÀY: ...])
  let cleanNote = rawNote
    .replace(/Hẹn nhận:\s*[^.|]+[.]?/i, '')
    .replace(/Khách:\s*[^.|]+[.]?/i, '')
    .replace(/\|\s*Xuất hàng:[^|]*/gi, '')
    .replace(/\[CHỐT CUỐI NGÀY:[^\]]*\]/gi, '')
    .replace(/\[ĐÃ VÀO KÉT SẮT\]/gi, '')
    .replace(/[|]/g, '')
    .trim();

  return {
    pickupAppointment: pickupAppointment || '—',
    fulfillmentNote,
    notes: cleanNote.length > 0 ? cleanNote : null,
  };
};

type ReturnReturnedItem = {
  productName: string;
  qtyText: string;
  conditionLabel: string;
  amountText: string;
};

type ReturnNewItem = {
  itemId: string;
  productName: string;
  sku: string;
  unitName: string;
  quantity: number;
  returnedQty: number;
  unitPrice: number;
  totalAmount: number;
  batchCode: string;
};

type ReturnRecord = {
  code: string;
  orderId: string;
  sourceOrderCode: string;
  rootOrderCode: string;
  createdAt: string;
  createdAtMs: number;
  cashierName: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  returnedAmount: number;
  newGoodsAmount: number;
  netAmount: number;
  returnedItems: ReturnReturnedItem[];
  reasonLabel: string | null;
  extraNote: string | null;
  newItems: ReturnNewItem[];
  canExchangeAgain: boolean;
  rawOrder: any;
};

const RETURN_REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Sản phẩm lỗi / hỏng',
  WRONG_ITEM: 'Nhầm sản phẩm / quy cách',
  CHANGE_MIND: 'Khách đổi ý',
  CUSTOMER_CHANGE_MIND: 'Khách đổi ý',
  EXPIRED_NEAR_DATE: 'Cận hạn / quá hạn sử dụng',
  EXPIRED: 'Gần hết hạn / hết hạn',
  OTHER: 'Lý do khác',
};

const formatReturnPaymentMethod = (method?: string): string => {
  const upper = (method || 'CASH').toUpperCase();
  if (upper === 'VIETQR' || upper === 'BANK' || upper === 'TRANSFER') return 'Chuyển khoản VietQR';
  if (upper === 'REDUCE_DEBT' || upper === 'DEBT') return 'Cấn trừ / Ghi công nợ';
  return 'Tiền mặt';
};

const parseReturnedItemLine = (line: string): ReturnReturnedItem => {
  // Format BE: "<Tên SP> x <SL> <ĐVT> (<Tình trạng>) - <Số tiền> đ"
  const m = line.match(/^(.+?)\s+x\s+([^\(]+?)\s*\(([^)]+)\)\s*-\s*(.+)$/i);
  if (m) {
    return {
      productName: m[1].trim(),
      qtyText: m[2].trim(),
      conditionLabel: m[3].trim(),
      amountText: m[4].trim(),
    };
  }
  return {
    productName: line,
    qtyText: '—',
    conditionLabel: '—',
    amountText: '—',
  };
};

const parseReturnOrderNote = (note?: string | null) => {
  const raw = (note || '').trim();
  const returnedMatch = raw.match(/\[HÀNG TRẢ:\s*([^\]]+)\]/i);
  const returnedItems = returnedMatch
    ? returnedMatch[1].split(';').map((s) => s.trim()).filter(Boolean).map(parseReturnedItemLine)
    : [];
  const reasonMatch = raw.match(/\[LÝ DO:\s*([^\]]+)\]/i);
  const rawReason = reasonMatch?.[1]?.trim() || null;
  const reasonLabel = rawReason ? (RETURN_REASON_LABELS[rawReason.toUpperCase()] || rawReason) : null;
  const returnedAmtMatch = raw.match(/Tiền hàng trả:\s*([\d.,]+)\s*đ/i);
  const noteReturnedAmount = returnedAmtMatch
    ? Number(returnedAmtMatch[1].replace(/[.,]/g, ''))
    : null;

  const extraNote = raw
    .replace(/Đổi\/Trả từ đơn '[^']+'\.\s*/i, '')
    .replace(/Tiền hàng trả:\s*[^.]+\.\s*/i, '')
    .replace(/Tiền hàng mới:\s*[^.]+\.\s*/i, '')
    .replace(/Chênh lệch:\s*[^.]+\.\s*/i, '')
    .replace(/\[HÀNG TRẢ:[^\]]+\]/gi, '')
    .replace(/\[LÝ DO:[^\]]+\]/gi, '')
    .replace(/\[ĐÃ VÀO KÉT SẮT\]/gi, '')
    .replace(/\[CHỐT CUỐI NGÀY:[^\]]+\]/gi, '')
    .trim();

  return {
    returnedItems,
    reasonLabel,
    noteReturnedAmount: noteReturnedAmount !== null && Number.isFinite(noteReturnedAmount) ? noteReturnedAmount : null,
    extraNote: extraNote.length > 0 ? extraNote : null,
  };
};

const resolveItemConversionRate = (allocations?: any[], orderQty?: number, explicitRate?: number): number => {
  const rate = Number(explicitRate || 0);
  if (rate > 0) return rate;
  if (Array.isArray(allocations) && allocations.length > 0 && Number(orderQty || 0) > 0) {
    const totalAllocatedBase = allocations.reduce(
      (sum, a) => sum + Number(a?.quantityBase ?? a?.QuantityBase ?? 0),
      0
    );
    if (totalAllocatedBase > 0) {
      const inferred = totalAllocatedBase / Number(orderQty);
      if (inferred > 0) return inferred;
    }
  }
  return 1;
};

const getAllocationsReturnedQty = (allocations?: any[], orderQty?: number, explicitRate?: number): number => {
  if (!Array.isArray(allocations) || allocations.length === 0) return 0;
  const totalReturnedBase = allocations.reduce((sum, a) => sum + Number(a?.returnedBase ?? a?.ReturnedBase ?? 0), 0);
  if (totalReturnedBase <= 0) return 0;
  const rate = resolveItemConversionRate(allocations, orderQty, explicitRate);
  return totalReturnedBase / rate;
};

const collectReturnRecords = (orders: any[]): Record<string, ReturnRecord[]> => {
  const records: Record<string, ReturnRecord[]> = {};
  const ordersByCode = new Map<string, any>();
  orders.forEach((o) => {
    if (o.orderCode) ordersByCode.set(o.orderCode, o);
  });

  const dtOrders = orders.filter((order) => order.orderCode?.startsWith('DT'));

  // Map mã phiếu DT -> mã đơn nguồn trực tiếp (hỗ trợ nối chuỗi HD -> DT1 -> DT2)
  const parentByDtCode = new Map<string, string>();
  const dtCountBySource = new Map<string, number>();
  dtOrders.forEach((order) => {
    const src = order.note?.match(/Đổi\/Trả từ đơn '([^']+)'/)?.[1];
    if (order.orderCode && src) {
      parentByDtCode.set(order.orderCode, src);
      dtCountBySource.set(src, (dtCountBySource.get(src) || 0) + 1);
    }
  });

  const resolveRootOrderCode = (directSource: string): string => {
    let curr = directSource;
    const visited = new Set<string>([curr]);
    while (parentByDtCode.has(curr)) {
      const next = parentByDtCode.get(curr)!;
      if (visited.has(next)) break;
      visited.add(next);
      curr = next;
    }
    return curr;
  };

  dtOrders.forEach((order) => {
    const sourceOrderCode = order.note?.match(/Đổi\/Trả từ đơn '([^']+)'/)?.[1];
    if (!sourceOrderCode) return;
    const rootOrderCode = resolveRootOrderCode(sourceOrderCode);
    const parsedNote = parseReturnOrderNote(order.note);
    const parsedDate = order.orderDate
      ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(order.orderDate) ? order.orderDate : `${order.orderDate}Z`)
      : null;
    const createdAtMs = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0;

    // Ưu tiên Tiền hàng trả ghi tại thời điểm lập phiếu trong Note để không bị sai lệch nếu phiếu DT cũ từng bị cộng dồn
    const returnedAmount =
      parsedNote.noteReturnedAmount !== null
        ? parsedNote.noteReturnedAmount
        : Number(order.returnedAmount || 0);

    // Fallback cho phiếu cũ chưa có [HÀNG TRẢ: ...]: chỉ lấy từ đơn nguồn khi duy nhất 1 phiếu DT hoặc tổng khớp tiền hàng trả của phiếu
    let returnedItems = parsedNote.returnedItems;
    if (returnedItems.length === 0) {
      const sourceOrder = ordersByCode.get(sourceOrderCode);
      const siblingCount = dtCountBySource.get(sourceOrderCode) || 0;
      if (sourceOrder?.items?.length) {
        let fallbackTotal = 0;
        const candidateItems = sourceOrder.items
          .map((it: any) => {
            const retQty = getAllocationsReturnedQty(
              it.stockAllocations || it.StockAllocations,
              Number(it.quantity || 0),
              Number(it.conversionRate || 0)
            );
            if (retQty <= 0) return null;
            const unitPrice = it.isGift ? 0 : Number(it.actualPrice ?? it.unitPrice ?? 0);
            const lineTotal = Math.round(retQty * unitPrice);
            fallbackTotal += lineTotal;
            return {
              productName: it.productName || 'Sản phẩm',
              qtyText: `${Number(retQty.toFixed(3))} ${it.unitName || 'Cái'}`,
              conditionLabel: 'Đã trả',
              amountText: `${lineTotal.toLocaleString('vi-VN')} đ`,
            } as ReturnReturnedItem;
          })
          .filter(Boolean) as ReturnReturnedItem[];

        if (siblingCount <= 1 || Math.abs(fallbackTotal - returnedAmount) <= 1) {
          returnedItems = candidateItems;
        }
      }
    }

    const newItems: ReturnNewItem[] = (order.items || []).map((it: any) => {
      const allocs = it.stockAllocations || it.StockAllocations || [];
      const orderQty = Number(it.quantity || 0);
      return {
        itemId: it.id,
        productName: it.productName || 'Sản phẩm',
        sku: it.barcode || '',
        unitName: it.unitName || 'Cái',
        quantity: orderQty,
        returnedQty: getAllocationsReturnedQty(allocs, orderQty, Number(it.conversionRate || 0)),
        unitPrice: it.isGift ? 0 : Number(it.actualPrice ?? it.unitPrice ?? 0),
        totalAmount: it.isGift ? 0 : Number(it.totalLineAmount ?? (it.quantity || 0) * (it.unitPrice || 0)),
        batchCode: it.batchCode || it.BatchCode || allocs?.[0]?.batchCode || allocs?.[0]?.BatchCode || '',
      };
    });

    const newGoodsAmount = Number(order.totalAmount || 0);
    const canExchangeAgain = newItems.some((it) => it.quantity - it.returnedQty > 0.0001);

    (records[rootOrderCode] ??= []).push({
      code: order.orderCode,
      orderId: order.id,
      sourceOrderCode,
      rootOrderCode,
      createdAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleString('vi-VN') : '',
      createdAtMs,
      cashierName: order.cashierName || 'Thu ngân POS',
      paymentMethod: order.paymentMethod || 'CASH',
      paymentMethodLabel: formatReturnPaymentMethod(order.paymentMethod),
      returnedAmount,
      newGoodsAmount,
      netAmount: newGoodsAmount - returnedAmount,
      returnedItems,
      reasonLabel: parsedNote.reasonLabel,
      extraNote: parsedNote.extraNote,
      newItems,
      canExchangeAgain,
      rawOrder: order,
    });
  });

  Object.keys(records).forEach((key) => {
    records[key].sort((a, b) => a.createdAtMs - b.createdAtMs);
  });

  return records;
};

export const InvoiceManagementPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || searchParams.get('orderId') || '';
  const urlTab = searchParams.get('tab');
  const showPendingPayments = searchParams.get('status') === 'PENDING_PAYMENT';
  const pendingBranchId = searchParams.get('branchId');

  // Route gốc quay lại POS
  const salesPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/employee')
      ? '/employee/pos'
      : '/pos';

  // Chế độ xem: 'invoices' (Hóa đơn bán lẻ) vs 'preorders' (Đơn đặt trước)
  const [activeTab, setActiveTab] = useState<'invoices' | 'preorders'>(() =>
    urlTab === 'preorders' ? 'preorders' : 'invoices'
  );

  // Bộ lọc (tách Mã đơn & Khách hàng/SĐT + Trạng thái đặt trước)
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [draftCustomerQuery, setDraftCustomerQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [timePreset, setTimePreset] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'VIETQR' | 'CASH' | 'DEBT' | 'CREDIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'PENDING_PAYMENT'>(showPendingPayments ? 'PENDING_PAYMENT' : 'ALL');
  const [preOrderStatusFilter, setPreOrderStatusFilter] = useState<'ALL' | 'RESERVED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [cancelTargetPreOrder, setCancelTargetPreOrder] = useState<PreOrderDTO | null>(null);
  const [returnRecordsByOrder, setReturnRecordsByOrder] = useState<Record<string, ReturnRecord[]>>({});
  const [detailReturnRecord, setDetailReturnRecord] = useState<ReturnRecord | null>(null);

  // Danh sách hóa đơn có thể hủy / cập nhật trạng thái (Phân lập theo Cửa Hàng / Tenant)
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId;

  // Quyền hạn tài khoản: Chỉ STORE_OWNER / ADMIN mới có quyền xem toàn chuỗi và hủy hóa đơn đã thanh toán
  const isStoreOwner = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';
  const isStoreOwnerOrManager = isStoreOwner;

  // Danh sách chi nhánh thực tế từ backend
  const [dbBranches, setDbBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    setDbBranches([]);
    employeeApi
      .getBranches()
      .then((list) => {
        if (isMounted && list && list.length > 0) {
          setDbBranches(list);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [currentTenantId]);

  // Chi nhánh được giao ca của nhân viên
  const assignedBranch = useMemo(() => {
    const id = user?.branchId || '';
    return dbBranches.find((branch) => branch.id === id) || { id, name: 'Chi nhánh được phân công' };
  }, [user?.branchId, dbBranches]);

  // Bộ lọc chi nhánh (Multi-Branch Filter): Nhân viên luôn cố định theo chi nhánh được giao ca
  const [branchFilter, setBranchFilter] = useState<string>(() => pendingBranchId || (isStoreOwner ? 'ALL' : assignedBranch.id));

  // Tự động đồng bộ bộ lọc: Chủ cửa hàng mặc định xem toàn chuỗi (ALL), Nhân viên theo chi nhánh được giao ca
  useEffect(() => {
    if (isStoreOwner) {
      setBranchFilter(pendingBranchId || 'ALL');
    } else {
      setBranchFilter(assignedBranch.id);
    }
  }, [isStoreOwner, assignedBranch.id, pendingBranchId]);

  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [preOrders, setPreOrders] = useState<PreOrderDTO[]>([]);
  const [activeShiftCash, setActiveShiftCash] = useState<number | undefined>(undefined);
  const [activeShiftId, setActiveShiftId] = useState<string | undefined>(undefined);
  const returnRequestRef = useRef<{ signature: string; key: string } | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogCustomers, setCatalogCustomers] = useState<Customer[]>([]);
  const [exchangeBranchProducts, setExchangeBranchProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    setCatalogCustomers([]);
    setCatalogProducts([]);
    if (branchFilter === 'ALL') {
      posOrderApi.getAllCustomers().then((custs) => {
        if (mounted && custs) setCatalogCustomers(custs);
      }).catch(() => { });
      return () => {
        mounted = false;
      };
    }

    const targetBranchId = branchFilter;

    if (!targetBranchId) {
      setCatalogProducts([]);
      return () => {
        mounted = false;
      };
    }

    Promise.all([
      posOrderApi.getAllProducts(targetBranchId),
      posOrderApi.getAllCustomers().catch(() => []),
    ]).then(([prods, custs]) => {
      if (!mounted) return;
      setCatalogProducts(prods || []);
      if (custs && custs.length > 0) setCatalogCustomers(custs);
    }).catch((err) => {
      if (!mounted) return;
      setCatalogProducts([]);
      console.error('Lỗi tải sản phẩm chi nhánh:', err);
    });

    return () => {
      mounted = false;
    };
  }, [branchFilter, currentTenantId]);

  const mapBackendOrderToInvoice = (o: any): InvoiceDTO => {
    const isPreOrderFlag = Boolean(
      o.orderCode?.startsWith('PO') ||
      o.orderCode?.startsWith('PRE-') ||
      o.note?.toLowerCase().includes('đặt trước') ||
      o.status === 'PreOrder' ||
      o.status === 'PendingPickup'
    );
    const isDebtMethod = o.paymentMethod === 'DEBT' || o.paymentMethod === 'CREDIT';
    return {
      orderUuid: o.id,
      invoiceId: o.orderCode || o.id,
      isOutsideShift: !isPreOrderFlag && o.shiftId === null,
      createdAt: o.orderDate ? (parseOrderDateToLocal(o.orderDate)?.toLocaleString('vi-VN') ?? '') : '',
      createdAtIso: o.orderDate || '',
      branchId: o.branchId || '',
      branchName: o.branchName || '—',
      cashierId: '',
      cashierName: o.cashierName || 'Thu ngân POS',
      customerId: o.customerId,
      customerName: o.customerName || 'Khách lẻ',
      customerPhone: o.customerPhone || '',
      note: o.note || '',
      paymentMethod: o.paymentMethod || 'CASH',
      paymentMethodLabel:
        o.paymentMethod === 'VIETQR' || o.paymentMethod === 'BANK'
          ? 'Chuyển khoản VietQR'
          : isDebtMethod
            ? 'Ghi nợ'
            : 'Tiền mặt',
      totalMerchandiseAmount: o.totalAmount || 0,
      totalDiscount: o.discountAmount || 0,
      finalPaidAmount: o.status === 'PendingPayment' ? 0 : isDebtMethod ? (o.depositAmount || 0) : (o.finalAmount || 0),
      appliedPromotionId: o.appliedPromotionId || null,
      appliedPromotionSummary: o.appliedPromotionSummary || null,
      promotionDiscountAmount: o.promotionDiscountAmount || 0,
      appliedVoucherCode: o.appliedVoucherCode || null,
      voucherDiscountAmount: o.voucherDiscountAmount || 0,
      pointsRedeemed: o.pointsRedeemed || 0,
      pointsDiscountAmount: o.pointsDiscountAmount || 0,
      debtAmount: isDebtMethod ? Math.max(0, (o.finalAmount || 0) - (o.depositAmount || 0)) : 0,
      paidDebtAmount: isDebtMethod ? (o.depositAmount || 0) : 0,
      debtPaymentRecords: [],
      status: o.status === 'Cancelled' ? 'CANCELLED' : o.status === 'PendingPayment' ? 'PENDING_PAYMENT' : 'COMPLETED',
      statusLabel: o.status === 'Cancelled' ? 'Đã hủy' : o.status === 'PendingPayment' ? 'Chờ chuyển khoản' : 'Hoàn thành',
      isPreOrder: isPreOrderFlag,
      orderOrigin: isPreOrderFlag ? 'PRE_ORDER' : 'RETAIL',
      items: (o.items || []).map((it: any) => ({
        itemId: it.id,
        batchId:
          it.batchCode ||
          it.BatchCode ||
          it.stockAllocations?.[0]?.batchCode ||
          it.StockAllocations?.[0]?.BatchCode ||
          it.batchId ||
          it.BatchId ||
          '',
        stockAllocations: it.stockAllocations || it.StockAllocations || [],
        conversionRate: Number(it.conversionRate || 0) || undefined,
        productId: it.productId,
        productName: it.productName,
        sku: it.barcode || '',
        unitName: it.unitName || 'Cái',
        quantity: it.quantity,
        unitPrice: it.isGift ? 0 : it.unitPrice,
        actualPrice: it.isGift ? 0 : (it.actualPrice ?? it.unitPrice),
        discountAmount: it.isGift ? 0 : (it.discountAmount || 0),
        totalAmount: it.isGift ? 0 : (it.totalLineAmount ?? it.quantity * it.unitPrice),
        isGift: Boolean(it.isGift),
        promotionId: it.promotionId || null,
      })),
    };
  };

  const mapPreOrderToInvoice = (pre: PreOrderDTO): InvoiceDTO => {
    const rawMethod = pre.paymentMethod || 'CASH';
    const isBankMethod = rawMethod === 'VIETQR' || rawMethod === 'BANK';
    const isDebtMethod = rawMethod === 'DEBT' || rawMethod === 'CREDIT';
    const resolvedMethodLabel =
      pre.paymentMethodLabel ||
      (isBankMethod ? 'Chuyển khoản VietQR' : isDebtMethod ? 'Ghi nợ' : 'Tiền mặt');

    return {
      orderUuid: pre.orderUuid,
      invoiceId: pre.preOrderId,
      createdAt: pre.createdAt,
      createdAtIso: pre.createdAtIso,
      branchId: pre.branchId,
      branchName: pre.branchName,
      cashierId: '',
      cashierName: pre.fulfilledByCashierName || pre.cashierName || 'Thu ngân POS',
      customerName: pre.customerName || 'Khách đặt trước',
      customerPhone: pre.customerPhone,
      note: pre.notes || '',
      totalMerchandiseAmount: pre.totalMerchandiseAmount || pre.totalOrderAmount,
      totalDiscount: pre.discountAmount || 0,
      finalPaidAmount: pre.totalOrderAmount,
      debtAmount: 0,
      paidDebtAmount: 0,
      debtPaymentRecords: [],
      paymentMethod: rawMethod,
      paymentMethodLabel: resolvedMethodLabel,
      status: pre.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
      statusLabel: pre.status === 'CANCELLED' ? 'Đã hủy' : 'Hoàn thành',
      isPreOrder: true,
      orderOrigin: 'PRE_ORDER',
      items: pre.items || [],
    };
  };

  // Nạp tiền mặt và shiftId trong két ca làm việc đang mở của chi nhánh
  useEffect(() => {
    const targetBranchId = branchFilter !== 'ALL' ? branchFilter : assignedBranch.id;
    setActiveShiftCash(undefined);
    setActiveShiftId(undefined);
    if (!targetBranchId || targetBranchId === 'ALL') return;
    posShiftApi.getCurrentShift(targetBranchId).then((s) => {
      setActiveShiftCash(s?.expectedCash);
      setActiveShiftId(s?.id);
    }).catch(() => { });
  }, [branchFilter, assignedBranch.id]);

  // Khi chuyển tài khoản hoặc đăng nhập chủ cửa hàng khác -> Reset danh sách hóa đơn

  // Nạp dữ liệu thực tế từ Backend API theo Tenant
  useEffect(() => {
    let isMounted = true;
    setIsLoadingOrders(true);
    setInvoices([]);
    setPreOrders([]);
    setReturnRecordsByOrder({});
    posOrderApi
      .getOrders(
        showPendingPayments
          ? { status: 'PendingPayment', branchId: pendingBranchId || undefined, pageSize: 100 }
          : { pageSize: 500 }
      )
      .then((res) => {
        if (!isMounted) return;
        if (!res || !res.items || res.items.length === 0) {
          setReturnRecordsByOrder({});
          return;
        }

        // 1. Phân loại và nạp danh sách Hóa đơn bán lẻ (tách biệt hoàn toàn, không lẫn đơn đặt trước PO/PRE)
        setReturnRecordsByOrder(collectReturnRecords(res.items));
        const invoiceOrders = res.items.filter(
          (o: any) =>
            !o.orderCode?.startsWith('DT') &&
            !o.orderCode?.startsWith('PO') &&
            !o.orderCode?.startsWith('PRE-') &&
            o.status !== 'PreOrder' &&
            o.status !== 'PendingPickup'
        );
        setInvoices(invoiceOrders.map(mapBackendOrderToInvoice));

        // 2. Phân loại và nạp danh sách Đơn đặt trước giữ kho
        const preOrderItems = res.items.filter(
          (o: any) =>
            o.status === 'PendingPickup' ||
            o.status === 'PreOrder' ||
            o.orderCode?.startsWith('PO') ||
            o.orderCode?.startsWith('PRE-')
        );
        if (preOrderItems.length > 0) {
          const mappedPreOrders: PreOrderDTO[] = preOrderItems.map((o: any) => {
            const totalOrderAmount = o.finalAmount ?? o.totalAmount ?? 0;
            const depositAmount = o.depositAmount || 0;
            const remainingAmount = Math.max(0, totalOrderAmount - depositAmount);
            const parsedNoteInfo = parsePreOrderPickupAndNotes(o.note, o.expectedPickupDate);
            const rawMethod = (o.paymentMethod || 'CASH') as PreOrderDTO['paymentMethod'];
            const isBankMethod = rawMethod === 'VIETQR' || rawMethod === 'BANK';
            const isDebtMethod = rawMethod === 'DEBT' || rawMethod === 'CREDIT';
            return {
              orderUuid: o.id,
              preOrderId: o.orderCode || o.id,
              createdAt: o.orderDate ? (parseOrderDateToLocal(o.orderDate)?.toLocaleString('vi-VN') ?? '') : '',
              createdAtIso: o.orderDate || '',
              branchId: o.branchId || '',
              branchName: o.branchName || '—',
              cashierName: o.cashierName || 'Thu ngân POS',
              fulfilledByCashierName: o.fulfilledByCashierName,
              fulfilledAt: o.fulfilledAtUtc ? (parseOrderDateToLocal(o.fulfilledAtUtc)?.toLocaleString('vi-VN') ?? undefined) : undefined,
              expectedPickupDate: o.expectedPickupDate || null,
              pickupAppointment: parsedNoteInfo.pickupAppointment,
              fulfillmentNote: parsedNoteInfo.fulfillmentNote,
              notes: parsedNoteInfo.notes,
              paymentMethod: rawMethod,
              paymentMethodLabel: isBankMethod ? 'Chuyển khoản VietQR' : isDebtMethod ? 'Ghi nợ' : 'Tiền mặt',
              customerName: o.customerName || 'Khách quen',
              customerPhone: o.customerPhone || '0987654321',
              totalMerchandiseAmount: o.totalAmount || totalOrderAmount,
              discountAmount: o.discountAmount || 0,
              appliedPromotionSummary: o.appliedPromotionSummary || null,
              totalOrderAmount,
              depositAmount,
              remainingAmount,
              stockAllocated: true,
              status:
                o.status === 'Completed'
                  ? 'COMPLETED'
                  : o.status === 'Cancelled'
                    ? 'CANCELLED'
                    : 'RESERVED',
              statusLabel:
                o.status === 'Completed'
                  ? 'Đã hoàn thành'
                  : o.status === 'Cancelled'
                    ? 'Đã hủy'
                    : 'Đang giữ kho',
              items: (o.items || []).map((it: any) => ({
                itemId: it.id,
                batchId:
                  it.batchCode ||
                  it.BatchCode ||
                  it.stockAllocations?.[0]?.batchCode ||
                  it.StockAllocations?.[0]?.BatchCode ||
                  it.batchId ||
                  it.BatchId ||
                  '',
                stockAllocations: it.stockAllocations || [],
                productId: it.productId,
                productName: it.productName,
                sku: it.barcode || '',
                unitName: it.unitName || 'Cái',
                quantity: it.quantity,
                unitPrice: it.isGift ? 0 : it.unitPrice,
                actualPrice: it.isGift ? 0 : (it.actualPrice ?? it.unitPrice),
                discountAmount: it.isGift ? 0 : (it.discountAmount || 0),
                totalAmount: it.isGift ? 0 : (it.totalLineAmount ?? it.quantity * it.unitPrice),
                isGift: Boolean(it.isGift),
                promotionId: it.promotionId || null,
              })),
            };
          });
          setPreOrders(mappedPreOrders);
        }
      })
      .catch((err) => console.warn('Fetch orders error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTenantId, showPendingPayments, pendingBranchId]);

  // Danh sách các chi nhánh có trong hệ thống (Tự động hợp nhất từ CSDL & cấu hình chuỗi, loại trừ trùng lặp)
  const availableBranches = useMemo(() => {
    if (!isStoreOwner) {
      // Nhân viên thu ngân chỉ thấy chi nhánh được phân công của mình
      return [assignedBranch];
    }

    const seenNames = new Set<string>();
    const list: Array<{ id: string; name: string }> = [];

    const addBranch = (id: string, name: string) => {
      if (!name) return;
      const norm = name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        list.push({ id, name: name.trim() });
      }
    };

    dbBranches.forEach((branch) => addBranch(branch.id, branch.name));
    return [{ id: 'ALL', name: 'Tất cả chi nhánh (Toàn chuỗi)' }, ...list];
  }, [isStoreOwner, assignedBranch, dbBranches]);

  // Modal Xác nhận hủy hóa đơn
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceDTO | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý trả lại hàng');
  const [cancelNote, setCancelNote] = useState('');

  // Modal Đổi / Trả hàng chuẩn KiotViet
  const [returnExchangeModalInvoice, setReturnExchangeModalInvoice] = useState<InvoiceDTO | null>(null);
  const returnCashFundSource: 'SHIFT' | 'SAFE' = useMemo(() => {
    if (!isStoreOwner) return 'SHIFT';
    const branchId = returnExchangeModalInvoice?.branchId;
    if (!branchId) return 'SAFE';
    return sessionStorage.getItem(`mtgrms_owner_shift_mode_${branchId}`) === 'attach'
      ? 'SHIFT'
      : 'SAFE';
  }, [isStoreOwner, returnExchangeModalInvoice?.branchId]);

  // Scoped danh mục cho modal Đổi/Trả hàng theo đúng chi nhánh của đơn gốc
  useEffect(() => {
    let mounted = true;
    if (returnExchangeModalInvoice?.branchId) {
      posOrderApi.getAllProducts(returnExchangeModalInvoice.branchId)
        .then((prods) => {
          if (mounted) setExchangeBranchProducts(prods || []);
        })
        .catch(() => {
          if (mounted) setExchangeBranchProducts([]);
        });
    } else {
      setExchangeBranchProducts(catalogProducts);
    }
    return () => {
      mounted = false;
    };
  }, [returnExchangeModalInvoice?.branchId, catalogProducts]);

  // Modal Tạo đơn đặt trước giữ kho
  const [isCreatePreOrderModalOpen, setIsCreatePreOrderModalOpen] = useState(false);
  const [fulfillModalPreOrder, setFulfillModalPreOrder] = useState<PreOrderDTO | null>(null);

  // Danh sách dòng mở rộng (Accordion detail)
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [expandedPreOrderId, setExpandedPreOrderId] = useState<string | null>(null);
  const toggleExpandPreOrder = (preOrderId: string) => {
    setExpandedPreOrderId((prev) => (prev === preOrderId ? null : preOrderId));
  };

  // Modal In bill nhiệt POS-58
  const [printingInvoice, setPrintingInvoice] = useState<InvoiceDTO | null>(null);

  const printReceiptData: ReceiptData | null = useMemo(() => {
    if (!printingInvoice) return null;
    const isPre = Boolean(
      printingInvoice.isPreOrder ||
      printingInvoice.invoiceId?.startsWith('DH') ||
      printingInvoice.invoiceId?.startsWith('PO') ||
      printingInvoice.orderOrigin === 'PRE_ORDER'
    );
    return {
      orderId: printingInvoice.orderUuid,
      storeName: printingInvoice.branchName || assignedBranch.name || 'SIÊU THỊ THỰC PHẨM',
      storeAddress: (assignedBranch as any).address || 'Hà Nội',
      storePhone: (assignedBranch as any).phone || '024 3822 9988',
      hotline: (assignedBranch as any).phone || '024 3822 9988',
      orderCode: printingInvoice.invoiceId,
      createdAt: printingInvoice.createdAt,
      cashierName: printingInvoice.cashierName,
      posMachine: 'Quầy #01',
      branchName: printingInvoice.branchName || assignedBranch.name || '',
      isPreOrder: isPre,
      customer: printingInvoice.customerName ? {
        name: printingInvoice.customerName,
        phone: printingInvoice.customerPhone || '',
        address: '',
        loyaltyPoints: 0,
      } : null,
      items: printingInvoice.items.map((it, idx) => ({
        stt: idx + 1,
        name: it.productName,
        quantity: it.quantity,
        unitPrice: it.isGift ? 0 : Math.round(it.unitPrice),
        totalPrice: it.isGift ? 0 : Math.round(it.totalAmount),
        totalAmount: it.isGift ? 0 : Math.round(it.totalAmount),
        isGift: Boolean(it.isGift),
      })),
      totalItemAmount: Math.round(printingInvoice.totalMerchandiseAmount),
      itemDiscountAmount: 0,
      orderDiscountAmount:
        printingInvoice.promotionDiscountAmount && printingInvoice.promotionDiscountAmount > 0
          ? Math.round(printingInvoice.promotionDiscountAmount)
          : Math.max(
              0,
              Math.round(
                printingInvoice.totalDiscount -
                  (printingInvoice.voucherDiscountAmount || 0) -
                  (printingInvoice.pointsDiscountAmount || 0)
              )
            ),
      voucherDiscountAmount: printingInvoice.voucherDiscountAmount || undefined,
      appliedVoucherCode: printingInvoice.appliedVoucherCode || undefined,
      appliedPromotionSummary: printingInvoice.appliedPromotionSummary || undefined,
      pointsDiscountAmount: printingInvoice.pointsDiscountAmount || 0,
      pointsRedeemed: printingInvoice.pointsRedeemed || undefined,
      vatAmount: 0,
      finalAmount: printingInvoice.finalPaidAmount,
      finalAmountInWords: '',
      paymentMethodText: printingInvoice.paymentMethodLabel || 'Tiền mặt',
      cashTendered: printingInvoice.finalPaidAmount,
      debtAmount: printingInvoice.debtAmount || undefined,
      earnedPoints: 0,
    };
  }, [printingInvoice, assignedBranch]);

  // Phân trang Hóa đơn (TablePagination)
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(15);

  // Phân trang Đơn đặt trước
  const [preOrderPage, setPreOrderPage] = useState(1);
  const [preOrderPageSize, setPreOrderPageSize] = useState(15);

  // Đồng bộ tab từ URL query param ?tab=preorders (DEF-SC71-003)
  useEffect(() => {
    if (urlTab === 'preorders') {
      setActiveTab('preorders');
      setPreOrderPage(1);
    } else if (urlTab === 'invoices') {
      setActiveTab('invoices');
      setInvoicePage(1);
    }
  }, [urlTab]);

  // Đồng bộ tham số tìm kiếm từ URL (khi điều hướng từ trang Khách nợ CRM hoặc Sổ quỹ sang)
  useEffect(() => {
    if (urlSearch) {
      setDraftSearchQuery(urlSearch);
      setSearchQuery(urlSearch);
      if (urlSearch.startsWith('PO') || urlSearch.startsWith('PRE-')) {
        setActiveTab('preorders');
        setPreOrderPage(1);
      } else {
        setActiveTab('invoices');
        setInvoicePage(1);
      }
      setStatusFilter('ALL');
      setPaymentMethodFilter('ALL');
    }
  }, [urlSearch]);

  // Toast feedback chuẩn AdminToast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: String(Date.now()), message: msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  // Xác nhận hủy hóa đơn (chặn Thu ngân với mã 403)
  const handleConfirmCancelInvoice = async () => {
    if (!cancelModalInvoice) return;
    if (!isStoreOwnerOrManager) {
      showToast('Thu ngân không có quyền hủy hóa đơn đã thanh toán. Vui lòng liên hệ Quản lý hoặc Chủ cửa hàng!', 'error');
      setCancelModalInvoice(null);
      return;
    }

    if (!cancelReason.trim() || cancelReason.trim().length > 300 || cancelNote.trim().length > 500) {
      showToast('Lý do hủy bắt buộc, tối đa 300 ký tự; ghi chú tối đa 500 ký tự.', 'warning');
      return;
    }
    try {
      await posOrderApi.cancelOrder(cancelModalInvoice.orderUuid || cancelModalInvoice.invoiceId, {
        reason: cancelReason,
        note: cancelNote,
        userRole: user?.role || 'CASHIER',
      });
    } catch (e: any) {
      console.warn('Backend cancelOrder error:', e);
      if (e?.response?.status === 403) {
        showToast(e?.response?.data?.message || 'Bạn không có quyền hủy hóa đơn này!', 'error');
        setCancelModalInvoice(null);
        return;
      }
      showToast(e?.response?.data?.message || 'Không thể hủy hóa đơn. Vui lòng thử lại.', 'error');
      return;
    }
    setInvoices((prev) =>
      prev.map((i) =>
        i.invoiceId === cancelModalInvoice.invoiceId
          ? { ...i, status: 'CANCELLED', statusLabel: 'Đã hủy' }
          : i
      )
    );
    showToast(`Đã hủy thành công hóa đơn ${cancelModalInvoice.invoiceId} (${cancelReason})!`, 'success');
    window.dispatchEvent(new Event('mtgrms:customer-debt-changed'));
    setCancelModalInvoice(null);
    setCancelNote('');
  };

  // Hủy đơn đặt trước và hoàn lại tồn kho giữ (Chủ cửa hàng được phép xác nhận hoàn cọc & hủy đơn - DEF-SC71-001)
  const handleCancelPreOrder = (pre: PreOrderDTO) => {
    if (pre.depositAmount > 0 && !isStoreOwner) {
      showToast('Chỉ Chủ cửa hàng mới có quyền xác nhận hoàn cọc và hủy đơn đặt trước đã nhận cọc.', 'error');
      return;
    }
    setCancelTargetPreOrder(pre);
  };

  const confirmCancelPreOrder = async () => {
    if (!cancelTargetPreOrder) return;
    const pre = cancelTargetPreOrder;
    setCancelTargetPreOrder(null);
    try {
      await posOrderApi.cancelOrder(pre.orderUuid || pre.preOrderId, {
        reason: pre.depositAmount > 0 ? 'Chủ cửa hàng xác nhận hoàn cọc và hủy đơn đặt trước' : 'Khách hàng hủy đơn đặt trước',
        note: pre.depositAmount > 0 ? `Hoàn cọc ${pre.depositAmount.toLocaleString('vi-VN')} đ` : 'Hủy đơn đặt trước từ màn hình Quản lý Đơn hàng',
        userRole: user?.role || 'CASHIER',
      });
      setPreOrders((prev) =>
        prev.map((p) =>
          p.preOrderId === pre.preOrderId
            ? { ...p, status: 'CANCELLED', statusLabel: 'Đã hủy' }
            : p
        )
      );
      showToast(`Đã hủy thành công đơn đặt trước ${pre.preOrderId} và giải phóng tồn kho giữ!`, 'success');
    } catch (e: any) {
      console.error('Cancel PreOrder failed:', e);
      showToast(`Lỗi khi hủy đơn đặt trước: ${e?.response?.data?.message || e?.message || 'Không thể kết nối máy chủ'}`, 'error');
    }
  };

  // Xác nhận Đổi / Trả hàng chuẩn KiotViet
  const handleConfirmReturnExchange = async (data: {
    returnedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitName?: string;
      condition?: 'Restock' | 'Damaged';
      orderDetailId?: string;
      batchId?: string;
      isGift?: boolean;
    }>;
    newItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitName?: string;
      unitId?: string;
      conversionRate?: number;
      discountAmount?: number;
    }>;
    settlementMethod: string;
    reason?: string;
    note?: string;
    cashFundSource?: 'SHIFT' | 'SAFE';
  }) => {
    if (!returnExchangeModalInvoice) return;
    try {
      const targetOrderId = returnExchangeModalInvoice.orderUuid || returnExchangeModalInvoice.invoiceId;
      const signature = JSON.stringify({ targetOrderId, data });
      if (returnRequestRef.current?.signature !== signature)
        returnRequestRef.current = { signature, key: generateUuidV7() };
      const res = await posOrderApi.returnExchangeOrder(targetOrderId, data, returnRequestRef.current.key);
      returnRequestRef.current = null;
      showToast(`Đã ghi nhận đổi/trả cho hóa đơn ${returnExchangeModalInvoice.invoiceId}. Mã phiếu đổi/trả: ${res?.orderCode || 'Đã ghi nhận'}`);

      // Nạp lại danh sách từ API (chỉ lấy hóa đơn bán lẻ)
      posOrderApi.getOrders({ pageSize: 500 }).then((orderRes) => {
        if (orderRes && orderRes.items) {
          setReturnRecordsByOrder(collectReturnRecords(orderRes.items));
          const invoiceOrders = orderRes.items.filter(
            (o: any) =>
              !o.orderCode?.startsWith('DT') &&
              !o.orderCode?.startsWith('PO') &&
              !o.orderCode?.startsWith('PRE-') &&
              o.status !== 'PreOrder' &&
              o.status !== 'PendingPickup'
          );
          setInvoices(invoiceOrders.map(mapBackendOrderToInvoice));
        }
      });

      // Tự động đồng bộ lại tiền mặt trong két quầy của ca hiện tại
      const targetBranchId = branchFilter !== 'ALL' ? branchFilter : assignedBranch.id;
      if (targetBranchId && targetBranchId !== 'ALL') {
        posShiftApi.getCurrentShift(targetBranchId).then((s) => {
          if (s) setActiveShiftCash(s.expectedCash);
        }).catch(() => { });
      }
    } catch (e: any) {
      throw e;
    }
  };

  // Xác nhận Tạo đơn đặt trước giữ kho (Cọc >= 10%)
  const handleConfirmCreatePreOrder = async (data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    expectedPickupDate: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      productName: string;
      unitId?: string;
      unitName?: string;
      isGift?: boolean;
      promotionId?: string | null;
    }>;
    depositAmount: number;
    paymentMethod: string;
    note?: string;
    discountAmount?: number;
    appliedPromotionId?: string | null;
    appliedPromotionSummary?: string | null;
  }) => {
    const creatorCashier = user?.role === 'STORE_OWNER' ? `Chủ cửa hàng: ${user?.fullName || 'Admin'}` : (user?.fullName || 'Thu ngân POS');
    const targetBranchId = branchFilter !== 'ALL'
      ? branchFilter
      : assignedBranch.id;

    if (!targetBranchId) {
      throw new Error('Vui lòng chọn một chi nhánh cụ thể trước khi tạo đơn đặt trước.');
    }
    try {
      let createdCode: string | null = null;
      let createdUuid: string | undefined;
      let backendRes: any = null;
      try {
        const res = await posOrderApi.createPreOrder({
          branchId: targetBranchId,
          customerId: data.customerId,
          cashierName: creatorCashier,
          items: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.isGift ? 0 : i.unitPrice,
            productName: i.productName,
            unitId: i.unitId,
            unitName: i.unitName,
            conversionRate: (i as any).conversionRate ?? 1,
            isGift: Boolean(i.isGift),
            promotionId: i.promotionId || null,
          })),
          depositAmount: data.depositAmount,
          expectedPickupDate: data.expectedPickupDate,
          paymentMethod: data.paymentMethod,
          note: data.note?.trim() || undefined,
          discountAmount: data.discountAmount || 0,
          appliedPromotionId: data.appliedPromotionId || null,
          appliedPromotionSummary: data.appliedPromotionSummary || null,
        });
        backendRes = res?.data || res;
        if (backendRes?.orderCode) createdCode = backendRes.orderCode;
        if (backendRes?.id) createdUuid = backendRes.id;
      } catch (apiErr: any) {
        console.error('Backend createPreOrder API error:', apiErr);
        const errMsg = apiErr?.response?.data?.message || apiErr?.message || 'Không thể tạo đơn đặt trước. Vui lòng kiểm tra lại tồn kho.';
        throw new Error(errMsg);
      }

      const merchandiseAmt = data.items
        .filter((it) => !it.isGift)
        .reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const promoDisc = data.discountAmount || 0;
      const merchandiseAmount = backendRes?.totalAmount ?? merchandiseAmt;
      const discountAmount = backendRes?.discountAmount ?? promoDisc;
      const totalAmt = backendRes?.finalAmount ?? Math.max(0, merchandiseAmt - promoDisc);
      const preOrderId = createdCode || createdUuid;
      if (!preOrderId) throw new Error('Backend chưa trả mã đơn đặt trước.');

      const newPreOrder: PreOrderDTO = {
        orderUuid: createdUuid,
        preOrderId,
        createdAt: new Date().toLocaleString('vi-VN'),
        createdAtIso: backendRes?.orderDate || new Date().toISOString(),
        branchId: branchFilter !== 'ALL' ? branchFilter : assignedBranch.id,
        branchName:
          branchFilter !== 'ALL'
            ? availableBranches.find((b) => b.id === branchFilter)?.name || assignedBranch.name
            : assignedBranch.name,
        cashierName: creatorCashier,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        expectedPickupDate: backendRes?.expectedPickupDate || data.expectedPickupDate,
        pickupAppointment: new Date(data.expectedPickupDate).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        paymentMethod: (backendRes?.paymentMethod || data.paymentMethod || 'CASH') as PreOrderDTO['paymentMethod'],
        paymentMethodLabel:
          (backendRes?.paymentMethod || data.paymentMethod) === 'BANK' || (backendRes?.paymentMethod || data.paymentMethod) === 'VIETQR'
            ? 'Chuyển khoản VietQR'
            : 'Tiền mặt',
        notes: data.note?.trim() || null,
        totalMerchandiseAmount: merchandiseAmount,
        discountAmount,
        appliedPromotionSummary: backendRes?.appliedPromotionSummary ?? data.appliedPromotionSummary ?? null,
        totalOrderAmount: totalAmt,
        depositAmount: data.depositAmount,
        remainingAmount: Math.max(0, totalAmt - data.depositAmount),
        status: 'RESERVED',
        statusLabel: 'Chờ nhận hàng',
        stockAllocated: true,
        items: (backendRes?.items || data.items).map((it: any) => ({
          itemId: it.id || it.productId,
          productId: it.productId,
          productName: it.productName,
          sku: it.barcode || '',
          unitName: it.unitName || 'Cái',
          quantity: it.quantity,
          unitPrice: it.isGift ? 0 : it.unitPrice,
          discountAmount: 0,
          totalAmount: it.isGift ? 0 : (it.totalLineAmount ?? it.quantity * it.unitPrice),
          isGift: Boolean(it.isGift),
        })),
      };

      setPreOrders((prev) => [newPreOrder, ...prev]);
      showToast(
        backendRes?.giftStockWarning
          ? `Đã tạo đơn đặt trước ${newPreOrder.preOrderId} (${backendRes.giftStockWarning})`
          : `Đã tạo thành công đơn đặt trước ${newPreOrder.preOrderId} (Cọc: ${data.depositAmount.toLocaleString('vi-VN')} đ)!`
      );
    } catch (e: any) {
      throw new Error(e?.response?.data?.message || e?.message || 'Không thể tạo đơn đặt trước.');
    }
  };

  const isBranchMatching = (filterId: string, itemBranchId?: string) =>
    filterId === 'ALL' || Boolean(itemBranchId && itemBranchId === filterId);

  // Lọc Hóa đơn
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isSearching = isStoreOwner && (searchQuery.trim().length > 0 || customerQuery.trim().length > 0);

      const matchBranch = !isStoreOwner
        ? isBranchMatching(branchFilter, inv.branchId)
        : (isSearching || branchFilter === 'ALL' || isBranchMatching(branchFilter, inv.branchId));

      const codeQ = searchQuery.trim().toLowerCase();
      const matchCode = !codeQ || inv.invoiceId.toLowerCase().includes(codeQ);

      const custQ = customerQuery.trim().toLowerCase();
      const custPhoneQ = custQ.replace(/\D/g, '');
      const matchCustomer =
        !custQ ||
        inv.customerName.toLowerCase().includes(custQ) ||
        (custPhoneQ.length > 0 && inv.customerPhone && inv.customerPhone.replace(/\D/g, '').includes(custPhoneQ));

      const matchMethod =
        paymentMethodFilter === 'ALL' ||
        (paymentMethodFilter === 'DEBT'
          ? inv.paymentMethod === 'DEBT' || inv.paymentMethod === 'CREDIT'
          : paymentMethodFilter === 'VIETQR'
            ? inv.paymentMethod === 'VIETQR' || inv.paymentMethod === 'BANK'
            : inv.paymentMethod === paymentMethodFilter);

      const matchTime = matchesTimePreset(inv.createdAtIso, timePreset);

      const hasReturn = (returnRecordsByOrder[inv.invoiceId]?.length ?? 0) > 0;
      const matchStatus = statusFilter === 'ALL' ||
        (statusFilter === 'RETURNED' ? inv.status !== 'CANCELLED' && hasReturn :
          statusFilter === 'COMPLETED' ? inv.status === 'COMPLETED' && !hasReturn : inv.status === statusFilter);

      return matchBranch && matchCode && matchCustomer && matchMethod && matchStatus && matchTime;
    });
  }, [invoices, searchQuery, customerQuery, paymentMethodFilter, statusFilter, timePreset, branchFilter, isStoreOwner, availableBranches, returnRecordsByOrder]);

  const { sort: invSort, handleSort: handleInvSort, sortedItems: sortedInvoices } = useTableSort(filteredInvoices, {
    invoiceId: (i) => i.invoiceId,
    branchName: (i) => i.branchName || '',
    createdAtIso: (i) => i.createdAtIso || i.createdAt,
    customerName: (i) => i.customerName,
    customerPhone: (i) => i.customerPhone || '',
    cashierName: (i) => i.cashierName || '',
    totalMerchandiseAmount: (i) => i.totalMerchandiseAmount,
    totalDiscount: (i) => i.totalDiscount,
    finalPaidAmount: (i) => i.finalPaidAmount,
    paymentMethodLabel: (i) => i.paymentMethodLabel,
    status: (i) => i.status,
  });

  // Phân trang dữ liệu Hóa đơn
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * invoicePageSize;
    return sortedInvoices.slice(start, start + invoicePageSize);
  }, [sortedInvoices, invoicePage, invoicePageSize]);

  // Lọc Đơn đặt trước
  const filteredPreOrders = useMemo(() => {
    return preOrders.filter((p) => {
      const isSearching = isStoreOwner && (searchQuery.trim().length > 0 || customerQuery.trim().length > 0);

      const matchBranch = !isStoreOwner
        ? isBranchMatching(branchFilter, p.branchId)
        : (isSearching || branchFilter === 'ALL' || isBranchMatching(branchFilter, p.branchId));

      const codeQ = searchQuery.trim().toLowerCase();
      const matchCode = !codeQ || p.preOrderId.toLowerCase().includes(codeQ);

      const custQ = customerQuery.trim().toLowerCase();
      const custPhoneQ = custQ.replace(/\D/g, '');
      const matchCustomer =
        !custQ ||
        p.customerName.toLowerCase().includes(custQ) ||
        (custPhoneQ.length > 0 && p.customerPhone.replace(/\D/g, '').includes(custPhoneQ));

      const matchPreStatus = preOrderStatusFilter === 'ALL' || p.status === preOrderStatusFilter;
      const matchTime = matchesTimePreset(p.createdAtIso, timePreset);

      return matchBranch && matchCode && matchCustomer && matchPreStatus && matchTime;
    });
  }, [preOrders, searchQuery, customerQuery, preOrderStatusFilter, timePreset, branchFilter, isStoreOwner, availableBranches]);

  const { sort: preSort, handleSort: handlePreSort, sortedItems: sortedPreOrders } = useTableSort(filteredPreOrders, {
    preOrderId: (p) => p.preOrderId,
    branchName: (p) => p.branchName || '',
    customerName: (p) => p.customerName,
    customerPhone: (p) => p.customerPhone,
    cashierName: (p) => p.cashierName || '',
    fulfilledByCashierName: (p) => p.fulfilledByCashierName || '',
    pickupAppointment: (p) => p.expectedPickupDate || p.pickupAppointment,
    totalOrderAmount: (p) => p.totalOrderAmount,
    depositAmount: (p) => p.depositAmount,
    remainingAmount: (p) => p.remainingAmount,
    status: (p) => p.status,
  });

  // Phân trang Đơn đặt trước
  const paginatedPreOrders = useMemo(() => {
    const start = (preOrderPage - 1) * preOrderPageSize;
    return sortedPreOrders.slice(start, start + preOrderPageSize);
  }, [sortedPreOrders, preOrderPage, preOrderPageSize]);

  // Đổi mở rộng Accordion
  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  };

  // Mở modal in bill K80
  const handleOpenPrintModal = (invoice: InvoiceDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPrintingInvoice(invoice);
  };

  // Hoàn tất đơn đặt trước
  // Hoàn tất đơn đặt trước sau khi thanh toán nốt phần còn lại
  const handleConfirmFulfillPreOrder = async (
    preOrderId: string,
    data: {
      paymentMethod: 'CASH' | 'VIETQR';
      amountPaid: number;
      cashTendered?: number;
      changeAmount?: number;
      note?: string;
    }
  ) => {
    const fulfillingCashier = user?.role === 'STORE_OWNER' ? `Chủ cửa hàng: ${user?.fullName || 'Admin'}` : (user?.fullName || 'Thu ngân POS');
    const targetPreOrder = preOrders.find((p) => p.preOrderId === preOrderId);
    try {
      await posOrderApi.fulfillPreOrder(targetPreOrder?.orderUuid || preOrderId, {
        paymentMethod: data.paymentMethod === 'VIETQR' ? 'BANK' : 'CASH',
        amountPaid: data.amountPaid,
        note: data.note,
        cashierName: fulfillingCashier,
        shiftId: activeShiftId,
      });
    } catch (e) {
      throw e;
    }

    setPreOrders((prev) =>
      prev.map((p) =>
        p.preOrderId === preOrderId
          ? {
            ...p,
            depositAmount: p.totalOrderAmount,
            remainingAmount: 0,
            paymentMethod: data.paymentMethod === 'VIETQR' ? 'BANK' : 'CASH',
            paymentMethodLabel: data.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt',
            status: 'COMPLETED',
            statusLabel: 'Đã hoàn thành',
            fulfilledByCashierName: fulfillingCashier,
            fulfilledAt: new Date().toLocaleString('vi-VN'),
          }
          : p
      )
    );
    showToast(`Đã thu ${data.amountPaid.toLocaleString('vi-VN')} đ (${data.paymentMethod === 'VIETQR' ? 'VietQR' : 'Tiền mặt'}) & bàn giao đơn ${preOrderId} thành công!`);
  };
  return (
    <div className="invoice-management pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* 1. UNIFIED SINGLE HEADER - ĐỒNG BỘ 100% VỚI SỔ QUỸ & CA THU NGÂN */}
      <header className="pos-shift-unified-header">
        {/* Khối trái: Nút quay lại bán hàng + Tên màn hình */}
        <div className="unified-header-left">
          <button
            type="button"
            className="pos-back-to-sales-btn"
            onClick={() => navigate(salesPath)}
            title="Quay lại quầy bán hàng POS"
          >
            <ArrowLeft size={15} />
            <span>Bán Hàng</span>
          </button>

          <div className="unified-header-divider" />

          <div className="unified-header-title-box">
            <h1 className="unified-header-title">Quản Lý Hóa Đơn &amp; Đơn Đặt Hàng</h1>
          </div>
        </div>

        {/* Khối giữa: Tabs chuyển đổi chế độ xem */}
        <div className="unified-header-center">
          <div className="unified-tabs-group">
            <button
              type="button"
              className={`unified-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <FileText size={14} />
              <span>Hóa Đơn Bán Lẻ</span>
            </button>
            <button
              type="button"
              className={`unified-tab-btn ${activeTab === 'preorders' ? 'active' : ''}`}
              onClick={() => setActiveTab('preorders')}
            >
              <PackageCheck size={14} />
              <span>Đơn Đặt Trước &amp; Giữ Kho ({filteredPreOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Khối phải: Bán hàng [F1] + Badge Thu ngân */}
        <div className="unified-header-right">
          {/* <button
            type="button"
            className="pos-btn-primary-pill"
            onClick={() => navigate(salesPath)}
            title="Trở về màn hình bán hàng POS"
          >
            <ShoppingCart size={14} />
            <span>Bán Hàng [F1]</span>
          </button> */}

          <div className="pos-cashier-badge">
            {isStoreOwner ? (
              <span>Chủ cửa hàng: <b>{user?.fullName || 'Chủ hệ thống'}</b></span>
            ) : (
              <span>NV: <b>{user?.fullName || 'Nhân viên thu ngân'}</b></span>
            )}
          </div>
        </div>
      </header>

      {/* TOAST THÔNG BÁO CHUẨN ADMINTOAST */}
      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(null);
          }}
        />
      )}

      {/* 2. BODY CONTAINER CUỘN CHÍNH - ĐỒNG BỘ LAYOUT SHIFT CONTENT */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto">
        <div className="shift-content-layout">
          {/* BỘ LỌC TÌM KIẾM - CHUẨN CARD VÀ PRESET BUTTONS CỦA POS */}
          <div className="so-list-filter">
            <div className="so-list-filter-row">
              {/* LỌC THEO CHI NHÁNH (MULTI-BRANCH FILTER) */}
              {!isStoreOwner ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 36,
                    padding: '0 14px',
                    backgroundColor: '#f0fdfa',
                    border: '1.5px solid #99f6e4',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f766e',
                    whiteSpace: 'nowrap',
                  }}
                  title="Chi nhánh được giao ca làm việc của bạn"
                >
                  <Building2 size={15} className="text-teal-700" />
                  <span>Chi nhánh: {assignedBranch.name}</span>
                </div>
              ) : (
                <div style={{ position: 'relative', minWidth: 260 }}>
                  <select
                    className="so-list-filter-select w-full"
                    style={{
                      height: 36,
                      paddingLeft: 32,
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                    value={branchFilter}
                    onChange={(e) => {
                      setBranchFilter(e.target.value);
                      setInvoicePage(1);
                      setPreOrderPage(1);
                    }}
                    title="Lọc hóa đơn theo chi nhánh hoặc xem toàn bộ để đổi trả hàng"
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <Building2
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#0f766e',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}

              {/* Ô TÌM KIẾM TÁCH RIÊNG: MÃ ĐƠN & KHÁCH HÀNG / SĐT */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '0 1 145px', minWidth: 125 }}>
                <input
                  type="text"
                  className="so-list-filter-input w-full"
                  style={{ height: 34 }}
                  placeholder={activeTab === 'invoices' ? 'Mã hóa đơn...' : 'Mã đơn đặt trước...'}
                  value={draftSearchQuery}
                  onChange={(e) => setDraftSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(draftSearchQuery);
                      setCustomerQuery(draftCustomerQuery);
                      setInvoicePage(1);
                      setPreOrderPage(1);
                    }
                  }}
                />
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 165px', minWidth: 150 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="so-list-filter-input w-full"
                  style={{ paddingLeft: 32, height: 34 }}
                  placeholder="Tên hoặc SĐT khách hàng..."
                  value={draftCustomerQuery}
                  onChange={(e) => setDraftCustomerQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(draftSearchQuery);
                      setCustomerQuery(draftCustomerQuery);
                      setInvoicePage(1);
                      setPreOrderPage(1);
                    }
                  }}
                />
              </div>

              {/* LỌC THỜI GIAN DẠNG DROPDOWN CHUẨN THIẾT KẾ */}
              <div className="so-list-filter-field">
                <label className="so-list-filter-label">Thời gian:</label>
                <select
                  className={`so-list-filter-select ${timePreset !== 'all' ? 'so-list-filter-select--active' : ''}`}
                  style={{ height: 34 }}
                  value={timePreset}
                  onChange={(e) => {
                    setTimePreset(e.target.value as 'all' | 'today' | 'yesterday' | 'week' | 'month');
                    setInvoicePage(1);
                    setPreOrderPage(1);
                  }}
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="yesterday">Hôm qua</option>
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                </select>
              </div>

              {/* LỌC PHƯƠNG THỨC & TRẠNG THÁI */}
              {activeTab === 'invoices' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="so-list-filter-select"
                    style={{ height: 34 }}
                    value={paymentMethodFilter}
                    onChange={(e) => { setPaymentMethodFilter(e.target.value as any); setInvoicePage(1); }}
                  >
                    <option value="ALL">Tất cả phương thức</option>
                    <option value="VIETQR">Chuyển khoản VietQR</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="DEBT">Đơn bán nợ</option>
                  </select>

                  <select
                    className="so-list-filter-select"
                    style={{ height: 34 }}
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as any); setInvoicePage(1); }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="PENDING_PAYMENT">Chờ chuyển khoản</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="RETURNED">Đã đổi/trả</option>
                  </select>
                </div>
              ) : (
                <select
                  className="so-list-filter-select"
                  style={{ height: 34 }}
                  value={preOrderStatusFilter}
                  onChange={(e) => { setPreOrderStatusFilter(e.target.value as any); setPreOrderPage(1); }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="RESERVED">Đang giữ kho</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              )}
              <button
                type="button"
                className="so-list-filter-search"
                onClick={() => {
                  setSearchQuery(draftSearchQuery);
                  setCustomerQuery(draftCustomerQuery);
                  setInvoicePage(1);
                  setPreOrderPage(1);
                }}
              >
                <Search size={13} /> Tìm kiếm
              </button>
              <button type="button" className="so-list-filter-reset" onClick={() => {
                setDraftSearchQuery('');
                setDraftCustomerQuery('');
                setSearchQuery('');
                setCustomerQuery('');
                setTimePreset('all');
                setPaymentMethodFilter('ALL');
                setStatusFilter('ALL');
                setPreOrderStatusFilter('ALL');
                if (isStoreOwner) setBranchFilter('ALL');
                setInvoicePage(1);
                setPreOrderPage(1);
              }}><RotateCcw size={14} /> Đặt lại</button>
            </div>
          </div>

          {/* BẢNG DỮ LIỆU - CHUẨN POS-SHIFT-CARD & POS-SHIFT-TABLE */}
          {activeTab === 'invoices' ? (
            /* TAB 1: HÓA ĐƠN BÁN LẺ */
            <div className="pos-shift-card so-list-table-card">
              <div className="pos-shift-card-header">
                <div>
                  <h3 className="pos-shift-card-title">
                    <FileText size={16} className="text-teal-700" />
                    <span>Danh Sách Hóa Đơn Bán Hàng</span>
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Hiển thị <b>{paginatedInvoices.length}</b> trên <b>{filteredInvoices.length}</b> hóa đơn &bull; Doanh thu: <b style={{ color: '#15803d' }}>{Math.round(filteredInvoices.reduce((s, i) => {
                      if (i.status !== 'COMPLETED') return s;
                      const returnedFromRecords = (returnRecordsByOrder[i.invoiceId] || []).reduce((rs, rec) => rs + (rec.returnedAmount || 0), 0);
                      return s + Math.max(0, i.finalPaidAmount + (i.debtAmount || 0) - returnedFromRecords);
                    }, 0)).toLocaleString('vi-VN')} đ</b>
                  </div>
                </div>

              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table so-list-table invoice-list-table" style={{ minWidth: 1220 }}>
                  <colgroup>
                    <col style={{ width: 172 }} />
                    <col style={{ width: 124 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 124 }} />
                    <col style={{ width: 92 }} />
                    <col style={{ width: 102 }} />
                    <col style={{ width: 92 }} />
                    <col style={{ width: 108 }} />
                    <col style={{ width: 104 }} />
                    <col style={{ width: 172 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Mã hóa đơn" active={invSort.key === 'invoiceId'} direction={invSort.direction} onClick={() => handleInvSort('invoiceId')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Chi nhánh" active={invSort.key === 'branchName'} direction={invSort.direction} onClick={() => handleInvSort('branchName')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Khách hàng" active={invSort.key === 'customerName'} direction={invSort.direction} onClick={() => handleInvSort('customerName')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Người tạo" active={invSort.key === 'cashierName'} direction={invSort.direction} onClick={() => handleInvSort('cashierName')} />
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <SortableHeader label="Tổng tiền" align="right" active={invSort.key === 'totalMerchandiseAmount'} direction={invSort.direction} onClick={() => handleInvSort('totalMerchandiseAmount')} />
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <SortableHeader label="Giảm giá" align="right" active={invSort.key === 'totalDiscount'} direction={invSort.direction} onClick={() => handleInvSort('totalDiscount')} />
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <SortableHeader label="Khách trả" align="right" active={invSort.key === 'finalPaidAmount'} direction={invSort.direction} onClick={() => handleInvSort('finalPaidAmount')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Phương thức" active={invSort.key === 'paymentMethodLabel'} direction={invSort.direction} onClick={() => handleInvSort('paymentMethodLabel')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Trạng thái" active={invSort.key === 'status'} direction={invSort.direction} onClick={() => handleInvSort('status')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>Thao tác</th>
                    </tr>
                  </thead>
                  {isLoadingOrders ? (
                    <tbody>
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <Loader2 size={18} className="animate-spin" color="#0f766e" />
                            <span>Đang tải danh sách hóa đơn...</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  ) : paginatedInvoices.length === 0 ? (
                    <tbody>
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                          Không tìm thấy hóa đơn nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    </tbody>
                  ) : paginatedInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceId === inv.invoiceId;
                    const isDebt = inv.status !== 'CANCELLED' && ((inv.debtAmount !== undefined && inv.debtAmount > 0) || (inv.status === 'DEBT' && (!inv.debtAmount || inv.debtAmount > 0)));
                    const isDebtMethod = inv.paymentMethod === 'DEBT' || inv.paymentMethod === 'CREDIT';
                    const isCompleted = inv.status === 'COMPLETED';

                    return (
                      <tbody key={inv.invoiceId}>
                        <tr
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? '#f0fdfa' : undefined,
                          }}
                          onClick={() => toggleExpand(inv.invoiceId)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <ChevronRight
                                size={15}
                                style={{
                                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                                  transition: 'transform 0.15s ease',
                                  color: '#0f766e',
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <b style={{ color: '#0f766e', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{inv.invoiceId}</b>
                                </div>
                                <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                                  {inv.createdAt}{inv.isOutsideShift ? ' · Ngoài ca' : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#334155' }}>
                            {inv.branchName || '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>{inv.customerName}</div>
                            {inv.customerPhone && (
                              <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}>{inv.customerPhone}</div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>
                              {inv.cashierName || '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                            {inv.totalMerchandiseAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ textAlign: 'right', color: inv.totalDiscount > 0 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono, monospace)' }}>
                            <div>{inv.totalDiscount.toLocaleString('vi-VN')} đ</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 3, marginTop: 2, fontFamily: 'inherit' }}>
                              {inv.appliedVoucherCode && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: '#eef2ff',
                                    color: '#4338ca',
                                    border: '1px solid #c7d2fe',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                  title={`Mã Voucher: ${inv.appliedVoucherCode}`}
                                >
                                  <Ticket size={10} color="#4338ca" /> {inv.appliedVoucherCode}
                                </span>
                              )}
                              {inv.appliedPromotionSummary && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: '#f0fdfa',
                                    color: '#0f766e',
                                    border: '1px solid #99f6e4',
                                    fontWeight: 600,
                                  }}
                                  title={inv.appliedPromotionSummary}
                                >
                                  KM
                                </span>
                              )}
                              {Boolean(inv.pointsRedeemed && inv.pointsRedeemed > 0) && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                >
                                  <Star size={10} color="#047857" /> {inv.pointsRedeemed} điểm
                                </span>
                              )}
                              {inv.items.some((x) => x.isGift) && !inv.appliedPromotionSummary && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: '#dcfce7',
                                    color: '#15803d',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                >
                                  <Gift size={10} color="#15803d" /> Quà tặng
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isCompleted && !isDebt ? '#15803d' : isDebt ? '#d97706' : '#dc2626',
                              fontVariantNumeric: 'tabular-nums',
                              fontFamily: 'var(--font-mono, monospace)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {(isDebt ? (inv.paidDebtAmount || 0) : inv.finalPaidAmount).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span
                              className={`pos-method-pill ${inv.paymentMethod === 'VIETQR' || inv.paymentMethod === 'BANK' ? 'vietqr' : isDebtMethod ? 'debt' : 'cash'
                                }`}
                              style={
                                isDebtMethod
                                  ? { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
                                  : undefined
                              }
                            >
                              {inv.paymentMethod === 'VIETQR' || inv.paymentMethod === 'BANK' ? (
                                <QrCode size={12} />
                              ) : isDebtMethod ? (
                                <CreditCard size={12} />
                              ) : (
                                <Banknote size={12} />
                              )}
                              <span>{inv.paymentMethodLabel}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span
                              className={`pos-status-pill ${isCompleted ? 'completed' : inv.status === 'PENDING_PAYMENT' ? 'debt' : 'cancelled'
                                }`}
                            >
                              {isCompleted ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={12} /> {(returnRecordsByOrder[inv.invoiceId]?.length ?? 0) > 0 ? 'Đã đổi/trả' : 'Hoàn thành'}
                                </span>
                              ) : inv.status === 'PENDING_PAYMENT' ? (
                                'Chờ chuyển khoản'
                              ) : isDebt ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <DollarSign size={12} /> Còn nợ {(inv.debtAmount || 0).toLocaleString('vi-VN')} đ
                                </span>
                              ) : (
                                'Đã hủy'
                              )}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-start' }}>
                              <button
                                type="button"
                                className="pos-btn-secondary-pill"
                                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                                onClick={() => toggleExpand(inv.invoiceId)}
                              >
                                {isExpanded ? 'Đóng' : 'Chi tiết'}
                              </button>
                              <button
                                type="button"
                                className="pos-btn-secondary-pill"
                                style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#0f766e', color: '#0f766e' }}
                                title="In bill"
                                onClick={(e) => handleOpenPrintModal(inv, e)}
                              >
                                <Printer size={12} />
                                <span>In bill</span>
                              </button>
                              {isCompleted && (
                                <button
                                  type="button"
                                  className="pos-btn-secondary-pill"
                                  style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#059669', color: '#059669' }}
                                  title="Đổi hoặc trả hàng theo chuẩn KiotViet"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReturnExchangeModalInvoice(inv);
                                  }}
                                >
                                  <RotateCcw size={12} />
                                  <span>Đổi/Trả</span>
                                </button>
                              )}
                              {isCompleted ? null : inv.status === 'PENDING_PAYMENT' ? (
                                <button type="button" className="pos-btn-secondary-pill" onClick={() => setCancelModalInvoice(inv)}>Hủy đơn chờ</button>
                              ) : isDebt ? null : (
                                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>
                                  Đã hủy
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ACCORDION CHI TIẾT */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} style={{ padding: 12, backgroundColor: '#f8fafc' }}>
                              <div
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 8,
                                  padding: 12,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f766e' }}>
                                    Chi tiết mặt hàng trong hóa đơn {inv.invoiceId} &bull; Thu ngân: <b>{inv.cashierName}{inv.cashierId ? ` (${inv.cashierId})` : ''}</b>
                                    {inv.referenceCode && (
                                      <span style={{ color: '#0284c7', marginLeft: 8 }}>
                                        | Mã GD: {inv.referenceCode}
                                      </span>
                                    )}
                                  </div>

                                </div>

                                {(returnRecordsByOrder[inv.invoiceId] || []).length > 0 && (
                                  <div style={{ marginBottom: 10, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', fontSize: 12 }}>
                                    <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                                      Lịch sử đổi/trả ({returnRecordsByOrder[inv.invoiceId].length} lần):
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {returnRecordsByOrder[inv.invoiceId].map((record, idx) => (
                                        <div
                                          key={record.code}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                            flexWrap: 'wrap',
                                            padding: '6px 8px',
                                            borderRadius: 6,
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #dbeafe',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: '#1e293b' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                                              Lần {idx + 1}
                                            </span>
                                            <b>Phiếu {record.code}</b>
                                            {record.sourceOrderCode !== inv.invoiceId && (
                                              <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                                                (đổi từ {record.sourceOrderCode})
                                              </span>
                                            )}
                                            <span style={{ color: '#64748b' }}>· {record.createdAt}</span>
                                            <span>· Hàng trả <b style={{ color: '#b91c1c' }}>{record.returnedAmount.toLocaleString('vi-VN')} đ</b></span>
                                            <span>· Hàng đổi mới <b style={{ color: '#0f766e' }}>{record.newGoodsAmount.toLocaleString('vi-VN')} đ</b></span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailReturnRecord(record);
                                              }}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '3px 9px',
                                                borderRadius: 5,
                                                border: '1px solid #93c5fd',
                                                backgroundColor: '#eff6ff',
                                                color: '#1d4ed8',
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              <Eye size={12} />
                                              <span>Xem chi tiết</span>
                                            </button>
                                            {record.canExchangeAgain && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setReturnExchangeModalInvoice(mapBackendOrderToInvoice(record.rawOrder));
                                                }}
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                  padding: '3px 9px',
                                                  borderRadius: 5,
                                                  border: '1px solid #fcd34d',
                                                  backgroundColor: '#fffbeb',
                                                  color: '#b45309',
                                                  fontSize: 11.5,
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                }}
                                                title="Đổi/trả tiếp các sản phẩm đổi mới trên phiếu này"
                                              >
                                                <RotateCcw size={12} />
                                                <span>Đổi/Trả tiếp</span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* CHI TIẾT KHUYẾN MÃI / MÃ VOUCHER / ĐIỂM THƯỞNG (REQ-ORD-PROMO-01) */}
                                {(inv.totalDiscount > 0 ||
                                  Boolean(inv.appliedPromotionSummary) ||
                                  Boolean(inv.appliedVoucherCode) ||
                                  Boolean(inv.pointsRedeemed && inv.pointsRedeemed > 0) ||
                                  inv.items.some((x) => x.isGift)) && (
                                    <div
                                      style={{
                                        marginBottom: 10,
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        backgroundColor: '#f0fdfa',
                                        border: '1px solid #ccfbf1',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 14,
                                        alignItems: 'center',
                                        fontSize: 12,
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Gift size={13} color="#0f766e" /> Ưu đãi áp dụng trên đơn:
                                      </span>
                                      {inv.appliedPromotionSummary && (
                                        <span style={{ color: '#115e59' }}>
                                          CTKM: <b>{inv.appliedPromotionSummary}</b>
                                          {inv.promotionDiscountAmount &&
                                          inv.promotionDiscountAmount > 0 &&
                                          !/\(-\s*[\d.,]+\s*đ\)/i.test(inv.appliedPromotionSummary)
                                            ? ` (-${inv.promotionDiscountAmount.toLocaleString('vi-VN')} đ)`
                                            : ''}
                                        </span>
                                      )}
                                      {inv.appliedVoucherCode && (
                                        <span style={{ color: '#4338ca', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                          <Ticket size={12} color="#4338ca" /> Voucher <b>{inv.appliedVoucherCode}</b>:{' '}
                                          <b>-{(inv.voucherDiscountAmount || 0).toLocaleString('vi-VN')} đ</b>
                                        </span>
                                      )}
                                      {Boolean(inv.pointsRedeemed && inv.pointsRedeemed > 0) && (
                                        <span style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                          <Star size={12} color="#047857" /> Đổi <b>{inv.pointsRedeemed} điểm</b>:{' '}
                                          <b>-{(inv.pointsDiscountAmount || 0).toLocaleString('vi-VN')} đ</b>
                                        </span>
                                      )}
                                      {!inv.appliedPromotionSummary &&
                                        !inv.appliedVoucherCode &&
                                        !(inv.pointsRedeemed && inv.pointsRedeemed > 0) &&
                                        inv.totalDiscount > 0 && (
                                          <span style={{ color: '#dc2626' }}>
                                            Chiết khấu trực tiếp: <b>-{inv.totalDiscount.toLocaleString('vi-VN')} đ</b>
                                          </span>
                                        )}
                                    </div>
                                  )}

                                <table className="pos-shift-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: 140, textAlign: 'left' }}>Mã SKU</th>
                                      <th style={{ textAlign: 'left' }}>Tên mặt hàng</th>
                                      <th style={{ width: 120, textAlign: 'left' }}>Mã Lô (FEFO)</th>
                                      <th style={{ width: 70, textAlign: 'left' }}>ĐVT</th>
                                      <th style={{ width: 80, textAlign: 'left' }}>Số lượng</th>
                                      <th style={{ width: 110, textAlign: 'left' }}>Đơn giá</th>
                                      <th style={{ width: 90, textAlign: 'left' }}>Giảm giá</th>
                                      <th style={{ width: 120, textAlign: 'left' }}>Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((item) => {
                                      const returnedQty = getAllocationsReturnedQty(
                                        item.stockAllocations,
                                        item.quantity,
                                        (item as any).conversionRate
                                      );
                                      return (
                                      <tr key={item.itemId} style={{ backgroundColor: item.isGift ? '#f0fdf4' : undefined }}>
                                        <td style={{ color: '#0f766e', fontWeight: 600, textAlign: 'left' }}>{item.sku}</td>
                                        <td style={{ textAlign: 'left' }}>
                                          <b>{item.productName}</b>
                                          {item.isGift && (
                                            <span
                                              style={{
                                                marginLeft: 6,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                backgroundColor: '#dcfce7',
                                                color: '#15803d',
                                                border: '1px solid #86efac',
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                              }}
                                            >
                                              <Gift size={10} color="#15803d" /> Quà tặng KM (0 đ)
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'left' }}>
                                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                            {item.batchId || 'LOT-AUTO'}
                                          </span>
                                        </td>
                                        <td style={{ textAlign: 'left' }}>{item.unitName}</td>
                                        <td style={{ textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                          <span>{item.quantity}</span>
                                          {returnedQty > 0 && (
                                            <span
                                              style={{
                                                display: 'inline-block',
                                                marginLeft: 6,
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                backgroundColor: '#fef2f2',
                                                color: '#b91c1c',
                                                border: '1px solid #fecaca',
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                              }}
                                            >
                                              Đã trả {Number(returnedQty.toFixed(3))}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
                                          {item.isGift ? '0 đ' : `${item.unitPrice.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'left', color: item.discountAmount > 0 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                                          {item.isGift ? '0 đ' : `${item.discountAmount.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'left', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                                          {item.isGift ? '0 đ' : `${Math.round(item.totalAmount).toLocaleString('vi-VN')} đ`}
                                        </td>
                                      </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  })}
                </table>
              </div>

              {/* TÁI SỬ DỤNG TABLEPAGINATION DÙNG CHUNG */}
              <TablePagination
                currentPage={invoicePage}
                pageSize={invoicePageSize}
                totalItems={filteredInvoices.length}
                pageSizeOptions={[15, 24, 36, 48]}
                onPageChange={(p) => setInvoicePage(p)}
                onPageSizeChange={(s) => {
                  setInvoicePageSize(s);
                  setInvoicePage(1);
                }}
                itemLabel="hóa đơn"
              />
            </div>
          ) : (
            /* TAB 2: ĐƠN ĐẶT TRƯỚC (PRE-ORDER) */
            <div className="pos-shift-card so-list-table-card">
              <div className="pos-shift-card-header">
                <div>
                  <h3 className="pos-shift-card-title">
                    <PackageCheck size={16} className="text-teal-700" />
                    <span>Đơn Đặt Trước &amp; Giữ Kho</span>
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Khách đặt hàng &amp; cọc tối thiểu 10% tại quầy &bull; Giữ kho theo lô FEFO &bull; Nhận hàng tại chi nhánh đã đăng ký
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="shift-status-badge on-duty">
                    <CheckCircle2 size={12} /> Đã trích giữ kho lô FEFO
                  </div>
                  <button
                    type="button"
                    className="pos-btn-primary-pill"
                    style={{ height: 28, padding: '0 12px', fontSize: 11.5, backgroundColor: '#0f766e' }}
                    onClick={() => {
                      if (branchFilter === 'ALL' && !assignedBranch.id) {
                        showToast('Vui lòng chọn một chi nhánh cụ thể từ bộ lọc trên thanh công cụ trước khi tạo đơn đặt trước.', 'warning');
                        return;
                      }
                      setIsCreatePreOrderModalOpen(true);
                    }}
                  >
                    + Tạo đơn đặt trước
                  </button>
                </div>
              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table so-list-table invoice-list-table" style={{ minWidth: 1220 }}>
                  <colgroup>
                    <col style={{ width: 172 }} />
                    <col style={{ width: 124 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 124 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 92 }} />
                    <col style={{ width: 84 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 104 }} />
                    <col style={{ width: 172 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Mã đơn" active={preSort.key === 'preOrderId'} direction={preSort.direction} onClick={() => handlePreSort('preOrderId')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Chi nhánh" active={preSort.key === 'branchName'} direction={preSort.direction} onClick={() => handlePreSort('branchName')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Khách hàng" active={preSort.key === 'customerName'} direction={preSort.direction} onClick={() => handlePreSort('customerName')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Nhân viên" active={preSort.key === 'cashierName'} direction={preSort.direction} onClick={() => handlePreSort('cashierName')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Hẹn nhận" active={preSort.key === 'pickupAppointment'} direction={preSort.direction} onClick={() => handlePreSort('pickupAppointment')} />
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <SortableHeader label="Tổng tiền" align="right" active={preSort.key === 'totalOrderAmount'} direction={preSort.direction} onClick={() => handlePreSort('totalOrderAmount')} />
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <SortableHeader label="Đã cọc" align="right" active={preSort.key === 'depositAmount'} direction={preSort.direction} onClick={() => handlePreSort('depositAmount')} />
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <SortableHeader label="Còn lại" align="right" active={preSort.key === 'remainingAmount'} direction={preSort.direction} onClick={() => handlePreSort('remainingAmount')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>
                        <SortableHeader label="Trạng thái" active={preSort.key === 'status'} direction={preSort.direction} onClick={() => handlePreSort('status')} />
                      </th>
                      <th style={{ textAlign: 'left' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingOrders ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <Loader2 size={18} className="animate-spin" color="#0f766e" />
                            <span>Đang tải danh sách đơn đặt trước...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedPreOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                          Không tìm thấy đơn đặt trước nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : paginatedPreOrders.map((pre) => {
                      const isExpanded = expandedPreOrderId === pre.preOrderId;
                      const merchandiseAmount = pre.totalMerchandiseAmount ?? pre.totalOrderAmount;
                      const discountAmount = pre.discountAmount ?? 0;
                      return (
                        <React.Fragment key={pre.preOrderId}>
                          <tr
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isExpanded ? '#f0fdfa' : undefined,
                            }}
                            onClick={() => toggleExpandPreOrder(pre.preOrderId)}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <ChevronRight
                                  size={15}
                                  style={{
                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.15s ease',
                                    color: '#0f766e',
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <b style={{ color: '#0f766e', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{pre.preOrderId}</b>
                                  <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>{pre.createdAt}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: '#334155' }}>
                              {pre.branchName || '—'}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>{pre.customerName}</div>
                              {pre.customerPhone && (
                                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>{pre.customerPhone}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>
                                {pre.cashierName || 'Thu ngân POS'}
                              </div>
                              {pre.fulfilledByCashierName ? (
                                <div style={{ fontSize: 11, color: '#166534' }}>Giao: {pre.fulfilledByCashierName}</div>
                              ) : (
                                <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Chưa giao</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#b45309', fontSize: 12, fontFamily: 'var(--font-mono, monospace)' }}>
                                {pre.pickupAppointment}
                              </div>
                              {pre.notes && (
                                <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pre.notes}>
                                  {pre.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                              <div style={{ color: '#0f172a' }}>{pre.totalOrderAmount.toLocaleString('vi-VN')} đ</div>
                              {discountAmount > 0 && (
                                <div style={{ fontSize: 10.5, color: '#dc2626', fontWeight: 600 }}>
                                  -{discountAmount.toLocaleString('vi-VN')} đ
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                              {pre.depositAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                              {pre.remainingAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                              <span className={`pos-status-pill ${pre.status === 'COMPLETED' ? 'completed' : pre.status === 'CANCELLED' ? 'cancelled' : 'reserved'}`}>
                                {pre.statusLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 5, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="pos-btn-secondary-pill"
                                  style={{ height: 26, padding: '0 8px', fontSize: 11, whiteSpace: 'nowrap' }}
                                  onClick={() => toggleExpandPreOrder(pre.preOrderId)}
                                >
                                  {isExpanded ? 'Đóng' : 'Chi tiết'}
                                </button>
                                {pre.status === 'CANCELLED' ? (
                                  <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                    Đã hủy
                                  </span>
                                ) : pre.status === 'COMPLETED' ? (
                                  <>
                                    <button
                                      type="button"
                                      className="pos-btn-secondary-pill"
                                      style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#0f766e', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                      title="In bill"
                                      onClick={(e) => handleOpenPrintModal(mapPreOrderToInvoice(pre), e)}
                                    >
                                      <Printer size={12} />
                                      <span>In bill</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="pos-btn-secondary-pill"
                                      style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#059669', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                      title="Đổi hoặc trả hàng đã giao"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReturnExchangeModalInvoice(mapPreOrderToInvoice(pre));
                                      }}
                                    >
                                      <RotateCcw size={12} />
                                      <span>Đổi/Trả</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="pos-btn-primary-pill"
                                      style={{ height: 26, padding: '0 8px', fontSize: 11, backgroundColor: '#0f766e', whiteSpace: 'nowrap' }}
                                      onClick={() => setFulfillModalPreOrder(pre)}
                                      title={`Thanh toán nốt ${pre.remainingAmount.toLocaleString('vi-VN')} đ và bàn giao hàng cho khách`}
                                    >
                                      <CreditCard size={12} />
                                      <span>Bàn giao</span>
                                    </button>
                                    <button
                                      type="button"
                                      style={{ height: 26, padding: '0 8px', fontSize: 11, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
                                      onClick={() => handleCancelPreOrder(pre)}
                                      title={pre.depositAmount > 0 ? 'Đơn có tiền cọc cần đối soát hoàn tiền trước khi hủy' : 'Hủy đơn đặt trước và hoàn lại tồn kho đã giữ'}
                                    >
                                      <XCircle size={12} />
                                      <span>Hủy</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* ACCORDION CHI TIẾT ĐƠN ĐẶT TRƯỚC VÀ GIỮ KHO */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} style={{ padding: 12, backgroundColor: '#f8fafc' }}>
                                <div
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    padding: 12,
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f766e' }}>
                                      Chi tiết đơn đặt trước & giữ kho {pre.preOrderId} &bull; Khách: <b>{pre.customerName}</b> ({pre.customerPhone})
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      {pre.status !== 'COMPLETED' && pre.status !== 'CANCELLED' && (
                                        <>
                                          <button
                                            type="button"
                                            className="pos-btn-primary-pill"
                                            style={{ height: 26, padding: '0 12px', fontSize: 11, backgroundColor: '#0f766e' }}
                                            onClick={() => setFulfillModalPreOrder(pre)}
                                          >
                                            <CreditCard size={12} />
                                            <span>Bàn giao & Thu nốt ({pre.remainingAmount.toLocaleString('vi-VN')} đ)</span>
                                          </button>
                                          <button
                                            type="button"
                                            style={{
                                              height: 26,
                                              padding: '0 10px',
                                              fontSize: 11,
                                              borderRadius: 6,
                                              border: '1px solid #fecaca',
                                              backgroundColor: '#fef2f2',
                                              color: '#b91c1c',
                                              cursor: 'pointer',
                                              fontWeight: 600,
                                            }}
                                            onClick={() => handleCancelPreOrder(pre)}
                                          >
                                            Hủy đơn
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Thông tin khuyến mãi nếu có */}
                                  {(Boolean(pre.appliedPromotionSummary) || Boolean(pre.discountAmount && pre.discountAmount > 0)) && (
                                    <div
                                      style={{
                                        marginBottom: 10,
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        backgroundColor: '#f0fdfa',
                                        border: '1px solid #ccfbf1',
                                        fontSize: 12,
                                        color: '#0f766e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                      }}
                                    >
                                      <Gift size={13} color="#0f766e" />
                                      <span>
                                        Ưu đãi áp dụng: <b>{pre.appliedPromotionSummary || 'Chiết khấu đơn'}</b> (-{(pre.discountAmount || 0).toLocaleString('vi-VN')} đ)
                                      </span>
                                    </div>
                                  )}

                                  {/* Bảng chi tiết từng mặt hàng giữ kho FEFO */}
                                  <table className="pos-shift-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: 130, textAlign: 'left' }}>Mã SKU</th>
                                        <th style={{ textAlign: 'left' }}>Tên mặt hàng giữ kho</th>
                                        <th style={{ width: 140, textAlign: 'left' }}>Lô giữ kho (FEFO)</th>
                                        <th style={{ width: 80, textAlign: 'left' }}>ĐVT</th>
                                        <th style={{ width: 90, textAlign: 'left' }}>Số lượng</th>
                                        <th style={{ width: 110, textAlign: 'left' }}>Đơn giá</th>
                                        <th style={{ width: 100, textAlign: 'left' }}>Giảm giá</th>
                                        <th style={{ width: 120, textAlign: 'left' }}>Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pre.items.map((item) => (
                                        <tr key={item.itemId || item.productId} style={{ backgroundColor: item.isGift ? '#f0fdf4' : undefined }}>
                                          <td style={{ color: '#0f766e', fontWeight: 600, textAlign: 'left' }}>{item.sku || 'SKU'}</td>
                                          <td style={{ textAlign: 'left' }}>
                                            <b>{item.productName}</b>
                                            {item.isGift && (
                                              <span
                                                style={{
                                                  marginLeft: 6,
                                                  fontSize: 10,
                                                  padding: '1px 5px',
                                                  borderRadius: 4,
                                                  backgroundColor: '#dcfce7',
                                                  color: '#15803d',
                                                  fontWeight: 600,
                                                }}
                                              >
                                                Quà tặng giữ kho
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ textAlign: 'left', color: '#0284c7', fontWeight: 600 }}>
                                            {item.batchId || 'Lô FEFO gần hạn'}
                                          </td>
                                          <td style={{ textAlign: 'left' }}>{item.unitName || 'Cái'}</td>
                                          <td style={{ textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                                          <td style={{ textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
                                            {item.isGift ? '0' : item.unitPrice.toLocaleString('vi-VN')}
                                          </td>
                                          <td style={{ textAlign: 'left', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                                            {item.discountAmount ? `-${item.discountAmount.toLocaleString('vi-VN')}` : '-'}
                                          </td>
                                          <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                            {item.isGift ? '0' : item.totalAmount.toLocaleString('vi-VN')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ fontWeight: 700, backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                        <td colSpan={4} style={{ textAlign: 'left' }}>Phải thanh toán sau khuyến mại:</td>
                                        <td style={{ textAlign: 'left', color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                                          {pre.items.reduce((sum, it) => sum + (it.quantity || 0), 0)}
                                        </td>
                                        <td colSpan={2}></td>
                                        <td style={{ textAlign: 'left', color: '#0f766e', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                          {pre.totalOrderAmount.toLocaleString('vi-VN')} đ
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>

                                  {/* Thanh tóm tắt tài chính và hẹn lấy hàng */}
                                  <div
                                    style={{
                                      marginTop: 10,
                                      padding: '10px 14px',
                                      borderRadius: 6,
                                      backgroundColor: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      fontSize: 12,
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                      <div>Hẹn lấy: <b style={{ color: '#b45309' }}>{pre.pickupAppointment}</b></div>
                                      <div>Giá trị hàng: <b>{merchandiseAmount.toLocaleString('vi-VN')} đ</b></div>
                                      {discountAmount > 0 && (
                                        <div>Khuyến mại: <b style={{ color: '#dc2626' }}>-{discountAmount.toLocaleString('vi-VN')} đ</b></div>
                                      )}
                                      <div>Tổng sau khuyến mại: <b>{pre.totalOrderAmount.toLocaleString('vi-VN')} đ</b></div>
                                      <div>Đã đặt cọc: <b style={{ color: '#15803d' }}>{pre.depositAmount.toLocaleString('vi-VN')} đ</b></div>
                                      <div>Còn phải thu: <b style={{ color: '#dc2626' }}>{pre.remainingAmount.toLocaleString('vi-VN')} đ</b></div>
                                      {pre.fulfillmentNote && (
                                        <div style={{ color: '#065f46' }}>
                                          Xuất hàng: <b>{pre.fulfillmentNote}</b>
                                        </div>
                                      )}
                                      {pre.notes && (
                                        <div style={{ color: '#475569' }}>
                                          Ghi chú: <b>{pre.notes}</b>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: 11.5 }}>
                                      Người tạo: <b>{pre.cashierName}</b> &bull; Chi nhánh: <b>{pre.branchName}</b>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TÁI SỬ DỤNG TABLEPAGINATION */}
              <TablePagination
                currentPage={preOrderPage}
                pageSize={preOrderPageSize}
                totalItems={filteredPreOrders.length}
                pageSizeOptions={[15, 24, 36, 48]}
                onPageChange={(p) => setPreOrderPage(p)}
                onPageSizeChange={(s) => {
                  setPreOrderPageSize(s);
                  setPreOrderPage(1);
                }}
                itemLabel="đơn đặt trước"
              />
            </div>
          )}
        </div>
      </main>

      {/* MODAL IN NHIỆT POS-58 ĐỒNG BỘ CHUẨN VỚI MÀN HÌNH BÁN HÀNG */}
      <PosReceiptModal
        isOpen={Boolean(printingInvoice)}
        receiptData={printReceiptData}
        onClose={() => setPrintingInvoice(null)}
      />

      {/* MODAL XÁC NHẬN HỦY HÓA ĐƠN & HOÀN TIỀN QUẦY */}
      {cancelModalInvoice && (
        <div className="pos-modal-overlay" onClick={() => setCancelModalInvoice(null)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '490px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-600" />
                <h2 className="pos-modal-title">Hủy Hóa Đơn &amp; Hoàn Tiền Khách</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setCancelModalInvoice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body flex flex-col gap-3">
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Mã hóa đơn: <b style={{ color: '#0f172a' }}>{cancelModalInvoice.invoiceId}</b></span>
                  <span style={{ color: '#64748b' }}>{cancelModalInvoice.createdAt}</span>
                </div>
                <div>
                  Khách hàng: <b>{cancelModalInvoice.customerName}</b>{' '}
                  {cancelModalInvoice.customerPhone && (
                    <span style={{ color: '#64748b' }}>({cancelModalInvoice.customerPhone})</span>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed #fca5a5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#991b1b' }}>Số tiền hoàn lại cho khách:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
                    {cancelModalInvoice.finalPaidAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: 11.5, marginTop: 4 }}>
                  Hình thức thanh toán gốc: <b>{cancelModalInvoice.paymentMethodLabel}</b>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lý do hủy hóa đơn: <span className="text-red-500">*</span>
                </label>
                <select
                  className="filter-select w-full"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  <option value="Khách đổi ý trả lại hàng">Khách đổi ý trả lại hàng</option>
                  <option value="Thu ngân tính nhầm số lượng / mặt hàng">Thu ngân tính nhầm số lượng / mặt hàng</option>
                  <option value="Áp dụng sai chương trình chiết khấu / voucher">Áp dụng sai chương trình chiết khấu / voucher</option>
                  <option value="Trùng lặp hóa đơn">Trùng lặp hóa đơn</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú giải trình (nếu có):
                </label>
                <input
                  type="text"
                  className="filter-select w-full"
                  placeholder="Nhập lý do chi tiết..."
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                />
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setCancelModalInvoice(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pos-btn-danger-pill"
                style={{ height: 34, fontSize: 12.5 }}
                onClick={handleConfirmCancelInvoice}
              >
                <XCircle size={14} />
                <span>Xác Nhận Hủy &amp; Hoàn Tiền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT PHIẾU ĐỔI / TRẢ */}
      {detailReturnRecord && (
        <div
          className="pos-modal-overlay"
          onClick={() => setDetailReturnRecord(null)}
        >
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: 640, width: '94%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>
                    {detailReturnRecord.newItems.length > 0 ? 'Phiếu Đổi Hàng' : 'Phiếu Trả Hàng'}
                  </h3>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: '#f1f5f9', color: '#334155' }}>
                    {detailReturnRecord.code}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Từ đơn <b>{detailReturnRecord.sourceOrderCode}</b> · {detailReturnRecord.createdAt || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailReturnRecord(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 4 }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Thông tin ngắn gọn 2 cột */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px',
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12.5,
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Người lập: </span>
                  <b style={{ color: '#0f172a' }}>{detailReturnRecord.cashierName}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Thanh toán: </span>
                  <b style={{ color: '#0f766e' }}>{detailReturnRecord.paymentMethodLabel}</b>
                </div>
                {(detailReturnRecord.reasonLabel || detailReturnRecord.extraNote) && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: 6, color: '#334155' }}>
                    {detailReturnRecord.reasonLabel && (
                      <span><b style={{ color: '#64748b' }}>Lý do:</b> {detailReturnRecord.reasonLabel}</span>
                    )}
                    {detailReturnRecord.reasonLabel && detailReturnRecord.extraNote && <span> · </span>}
                    {detailReturnRecord.extraNote && (
                      <span><b style={{ color: '#64748b' }}>Ghi chú:</b> {detailReturnRecord.extraNote}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Bảng 1: Sản phẩm trả lại */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Sản phẩm khách trả
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table className="pos-shift-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Sản phẩm</th>
                        <th style={{ textAlign: 'left', width: 115 }}>Tình trạng</th>
                        <th style={{ textAlign: 'left', width: 90 }}>SL trả</th>
                        <th style={{ textAlign: 'right', width: 110 }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailReturnRecord.returnedItems.length > 0 ? (
                        detailReturnRecord.returnedItems.map((it, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>{it.productName}</td>
                            <td style={{ textAlign: 'left' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  backgroundColor: it.conditionLabel.includes('lỗi') ? '#fef2f2' : '#f1f5f9',
                                  color: it.conditionLabel.includes('lỗi') ? '#b91c1c' : '#475569',
                                }}
                              >
                                {it.conditionLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{it.qtyText}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {it.amountText}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 12 }}>
                            Tổng giá trị hàng trả: <b>{detailReturnRecord.returnedAmount.toLocaleString('vi-VN')} đ</b>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bảng 2: Sản phẩm đổi mới (chỉ hiển thị khi có hàng đổi) */}
              {detailReturnRecord.newItems.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Sản phẩm đổi mới
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <table className="pos-shift-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Sản phẩm</th>
                          <th style={{ textAlign: 'left', width: 95 }}>Mã Lô</th>
                          <th style={{ textAlign: 'left', width: 95 }}>SL</th>
                          <th style={{ textAlign: 'right', width: 95 }}>Đơn giá</th>
                          <th style={{ textAlign: 'right', width: 105 }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailReturnRecord.newItems.map((it) => (
                          <tr key={it.itemId}>
                            <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>{it.productName}</td>
                            <td style={{ textAlign: 'left', fontSize: 11.5, color: '#475569' }}>{it.batchCode || '—'}</td>
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>
                              {it.quantity} {it.unitName}
                              {it.returnedQty > 0 && (
                                <span style={{ display: 'inline-block', marginLeft: 4, padding: '1px 5px', borderRadius: 4, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 10, fontWeight: 700 }}>
                                  Đã trả {Number(it.returnedQty.toFixed(3))}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{it.unitPrice.toLocaleString('vi-VN')} đ</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>{Math.round(it.totalAmount).toLocaleString('vi-VN')} đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tóm tắt tiền gọn như hóa đơn */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Tiền hàng trả</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{detailReturnRecord.returnedAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                {detailReturnRecord.newGoodsAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Tiền hàng đổi mới</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{detailReturnRecord.newGoodsAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px dashed #e2e8f0', fontSize: 14 }}>
                  <b style={{ color: '#0f172a' }}>
                    {detailReturnRecord.netAmount < 0
                      ? `Hoàn lại khách (${detailReturnRecord.paymentMethodLabel})`
                      : detailReturnRecord.netAmount > 0
                        ? `Khách trả thêm (${detailReturnRecord.paymentMethodLabel})`
                        : 'Chênh lệch'}
                  </b>
                  <b style={{ fontSize: 16, color: detailReturnRecord.netAmount < 0 ? '#dc2626' : '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.abs(detailReturnRecord.netAmount).toLocaleString('vi-VN')} đ
                  </b>
                </div>
              </div>
            </div>

            <div className="pos-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {detailReturnRecord.canExchangeAgain && (
                <button
                  type="button"
                  className="pos-btn-primary"
                  style={{ height: 34, fontSize: 12.5, backgroundColor: '#b45309' }}
                  onClick={() => {
                    const target = detailReturnRecord.rawOrder;
                    setDetailReturnRecord(null);
                    setReturnExchangeModalInvoice(mapBackendOrderToInvoice(target));
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Đổi/Trả hàng đổi này</span>
                </button>
              )}
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setDetailReturnRecord(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI / TRẢ HÀNG */}
      <ReturnExchangeModal
        isOpen={Boolean(returnExchangeModalInvoice)}
        invoice={returnExchangeModalInvoice}
        availableProducts={exchangeBranchProducts.length > 0 ? exchangeBranchProducts : catalogProducts}
        currentDrawerCash={returnCashFundSource === 'SHIFT' ? activeShiftCash : undefined}
        isStoreOwner={isStoreOwner}
        cashFundSource={returnCashFundSource}
        refundSourceLabel={returnCashFundSource === 'SHIFT' ? 'Két quầy của ca đang tham gia' : 'Két sắt của chi nhánh hóa đơn'}
        onClose={() => setReturnExchangeModalInvoice(null)}
        onConfirm={handleConfirmReturnExchange}
      />

      {/* MODAL TẠO ĐƠN ĐẶT TRƯỚC GIỮ KHO (CỌC >= 10%) */}
      <CreatePreOrderModal
        isOpen={isCreatePreOrderModalOpen}
        onClose={() => setIsCreatePreOrderModalOpen(false)}
        availableProducts={catalogProducts}
        customers={catalogCustomers}
        branchId={branchFilter !== 'ALL' ? branchFilter : assignedBranch.id}
        branchName={
          branchFilter !== 'ALL'
            ? availableBranches.find((b) => b.id === branchFilter)?.name || assignedBranch.name
            : assignedBranch.name
        }
        onConfirm={handleConfirmCreatePreOrder}
      />

      {/* MODAL THANH TOÁN TIỀN CÒN LẠI & GIAO HÀNG ĐẶT TRƯỚC */}
      <FulfillPreOrderModal
        isOpen={Boolean(fulfillModalPreOrder)}
        preOrder={fulfillModalPreOrder}
        onClose={() => setFulfillModalPreOrder(null)}
        onConfirmFulfill={handleConfirmFulfillPreOrder}
      />

      {/* CONFIRM DIALOG HỦY ĐƠN ĐẶT TRƯỚC */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetPreOrder)}
        title="Xác nhận hủy đơn đặt trước"
        message={
          cancelTargetPreOrder && cancelTargetPreOrder.depositAmount > 0
            ? `Xác nhận hoàn trả tiền cọc ${cancelTargetPreOrder.depositAmount.toLocaleString('vi-VN')} đ và hủy đơn đặt trước ${cancelTargetPreOrder.preOrderId}? Tồn kho giữ FEFO sẽ được giải phóng ngay.`
            : `Bạn có chắc chắn muốn hủy đơn đặt trước ${cancelTargetPreOrder?.preOrderId || ''}? Tồn kho đã giữ sẽ được tự động hoàn lại vào kho hàng.`
        }
        confirmLabel="Xác nhận hủy đơn"
        variant="danger"
        onConfirm={confirmCancelPreOrder}
        onCancel={() => setCancelTargetPreOrder(null)}
      />
    </div>
  );
};
