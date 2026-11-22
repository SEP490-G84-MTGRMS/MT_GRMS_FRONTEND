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
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  XCircle,
  CheckCircle2,
  User,
  Phone,
  FileText,
  DollarSign,
  CreditCard,
  RotateCcw,
  Building2,
  Ticket,
  Star,
  Gift,
} from 'lucide-react';
import { TablePagination } from '../../../components/common';
import {
  mockInvoicesList,
  mockPreOrdersList,
  mockInvoicesAnNhien,
  mockPreOrdersAnNhien,
} from '../mock/inventoryMockData';
import type { InvoiceDTO, PreOrderDTO } from '../types/inventory.types';
import { ReturnExchangeModal } from '../components/modals/ReturnExchangeModal';
import { CreatePreOrderModal } from '../components/modals/CreatePreOrderModal';
import { FulfillPreOrderModal } from '../components/modals/FulfillPreOrderModal';
import { PosReceiptModal } from '../components/PosReceiptModal';
import { AN_NHIEN_BRANCHES } from '../mock/posMockData';
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
const parsePreOrderPickupAndNotes = (rawNote?: string | null) => {
  if (!rawNote || !rawNote.trim()) {
    return {
      pickupAppointment: '17:30 - Hôm nay',
      fulfillmentNote: null as string | null,
      notes: null as string | null,
    };
  }

  // 1. Trích xuất thời gian hẹn nhận (VD: "Hẹn nhận: 12/11/2026 15:40" hoặc "12/11/2026 15:40")
  let pickupAppointment = '';
  const matchAppt = rawNote.match(/Hẹn nhận:\s*([^.|]+)/i);
  if (matchAppt && matchAppt[1]) {
    pickupAppointment = matchAppt[1].trim();
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
    .replace(/[|]/g, '')
    .trim();

  if (!pickupAppointment) {
    const firstPart = rawNote.split(/[|.]/)[0]?.trim();
    pickupAppointment = firstPart || '17:30 - Hôm nay';
  }

  return {
    pickupAppointment,
    fulfillmentNote,
    notes: cleanNote.length > 0 ? cleanNote : null,
  };
};

type ReturnRecord = { code: string; createdAt: string; returnedAmount: number; newGoodsAmount: number };

const collectReturnRecords = (orders: any[]): Record<string, ReturnRecord[]> => {
  const records: Record<string, ReturnRecord[]> = {};
  orders.filter((order) => order.orderCode?.startsWith('DT')).forEach((order) => {
    const originalCode = order.note?.match(/Đổi\/Trả từ đơn '([^']+)'/)?.[1];
    if (!originalCode) return;
    (records[originalCode] ??= []).push({
      code: order.orderCode,
      createdAt: order.orderDate ? new Date(order.orderDate).toLocaleString('vi-VN') : '',
      returnedAmount: order.returnedAmount || 0,
      newGoodsAmount: order.totalAmount || 0,
    });
  });
  return records;
};

export const InvoiceManagementPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || searchParams.get('orderId') || '';
  const showPendingPayments = searchParams.get('status') === 'PENDING_PAYMENT';
  const pendingBranchId = searchParams.get('branchId');

  // Route gốc quay lại POS
  const salesPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/employee')
      ? '/employee/pos'
      : '/pos';

  // Chế độ xem: 'invoices' (Hóa đơn bán lẻ) vs 'preorders' (Đơn đặt trước)
  const [activeTab, setActiveTab] = useState<'invoices' | 'preorders'>('invoices');

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [timePreset, setTimePreset] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'VIETQR' | 'CASH' | 'DEBT' | 'CREDIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'PENDING_PAYMENT'>(showPendingPayments ? 'PENDING_PAYMENT' : 'ALL');
  const [returnRecordsByOrder, setReturnRecordsByOrder] = useState<Record<string, ReturnRecord[]>>({});

  // Danh sách hóa đơn có thể hủy / cập nhật trạng thái (Phân lập theo Cửa Hàng / Tenant)
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_mt_mart_01';
  const isDefaultDemoStore = currentTenantId === 'tenant_mt_mart_01';
  const isAnNhienStore = currentTenantId === 'tenant_an_nhien_02';

  // Quyền hạn tài khoản: Chỉ STORE_OWNER / ADMIN mới có quyền xem toàn chuỗi và hủy hóa đơn đã thanh toán
  const isStoreOwner = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';
  const isStoreOwnerOrManager = isStoreOwner;

  // Danh sách chi nhánh thực tế từ backend
  const [dbBranches, setDbBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let isMounted = true;
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
  }, []);

  // Chi nhánh được giao ca của nhân viên
  const assignedBranch = useMemo(() => {
    if (user?.branchId) {
      const dbFound = dbBranches.find((b) => b.id === user.branchId);
      if (dbFound) return dbFound;

      if (isAnNhienStore) {
        const found = AN_NHIEN_BRANCHES.find((b) => b.id === user.branchId || b.code === user.branchId);
        if (found) return found;
      }
      return { id: user.branchId, name: isAnNhienStore ? 'An Nhiên Mart - Chi nhánh Ba Đình' : 'Chi nhánh chính' };
    }
    if (isAnNhienStore) {
      if (user?.fullName?.includes('Nam') || user?.fullName?.includes('Cầu Giấy')) {
        return AN_NHIEN_BRANCHES[1] || { id: 'BR-AN-02', name: 'An Nhiên Mart - Chi nhánh Cầu Giấy' };
      }
      return AN_NHIEN_BRANCHES[0] || { id: 'BR-AN-01', name: 'An Nhiên Mart - Chi nhánh Ba Đình' };
    }
    return { id: 'BR-01', name: 'Chi nhánh Cầu Giấy (Trung tâm)' };
  }, [user, isAnNhienStore, dbBranches]);

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

  const getInitialInvoices = () => {
    if (isDefaultDemoStore) return mockInvoicesList;
    if (isAnNhienStore) return mockInvoicesAnNhien;
    return [];
  };

  const getInitialPreOrders = () => {
    if (isDefaultDemoStore) return mockPreOrdersList;
    if (isAnNhienStore) return mockPreOrdersAnNhien;
    return [];
  };

  const [invoices, setInvoices] = useState<InvoiceDTO[]>(getInitialInvoices);
  const [preOrders, setPreOrders] = useState<PreOrderDTO[]>(getInitialPreOrders);
  const [activeShiftCash, setActiveShiftCash] = useState<number | undefined>(undefined);
  const returnRequestRef = useRef<{ signature: string; key: string } | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogCustomers, setCatalogCustomers] = useState<Customer[]>([]);
  const [exchangeBranchProducts, setExchangeBranchProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    if (branchFilter === 'ALL') {
      setCatalogProducts([]);
      posOrderApi.getAllCustomers().then((custs) => {
        if (mounted && custs) setCatalogCustomers(custs);
      }).catch(() => { });
      return () => {
        mounted = false;
      };
    }

    const targetBranchId =
      !branchFilter.startsWith('BR-')
        ? branchFilter
        : (!assignedBranch.id.startsWith('BR-') ? assignedBranch.id : undefined);

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
  }, [branchFilter, assignedBranch.id, currentTenantId]);

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
      createdAt: o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '',
      branchId: o.branchId || dbBranches[0]?.id || assignedBranch.id,
      branchName: o.branchName || dbBranches[0]?.name || 'Chi nhánh mặc định',
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
        batchId: it.batchId || it.BatchId || '',
        stockAllocations: it.stockAllocations || it.StockAllocations || [],
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
    return {
      orderUuid: pre.orderUuid,
      invoiceId: pre.preOrderId,
      createdAt: pre.createdAt,
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
      paymentMethod: 'CASH',
      paymentMethodLabel: 'Tiền mặt',
      status: pre.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
      statusLabel: pre.status === 'CANCELLED' ? 'Đã hủy' : 'Hoàn thành',
      isPreOrder: true,
      orderOrigin: 'PRE_ORDER',
      items: pre.items || [],
    };
  };

  // Nạp tiền mặt trong két ca làm việc đang mở của chi nhánh
  useEffect(() => {
    const targetBranchId = branchFilter !== 'ALL' ? branchFilter : (assignedBranch.id.startsWith('BR-') ? (dbBranches[0]?.id || assignedBranch.id) : assignedBranch.id);
    setActiveShiftCash(undefined);
    posShiftApi.getCurrentShift(targetBranchId).then((s) => {
      setActiveShiftCash(s?.expectedCash);
    }).catch(() => { });
  }, [branchFilter, assignedBranch.id]);

  // Khi chuyển tài khoản hoặc đăng nhập chủ cửa hàng khác -> Reset danh sách hóa đơn
  useEffect(() => {
    setInvoices(showPendingPayments ? [] : getInitialInvoices());
    setPreOrders(getInitialPreOrders());
  }, [currentTenantId, isDefaultDemoStore, showPendingPayments]);

  // Nạp dữ liệu thực tế từ Backend API theo Tenant
  useEffect(() => {
    let isMounted = true;
    posOrderApi
      .getOrders(showPendingPayments ? { status: 'PendingPayment', branchId: pendingBranchId || undefined, pageSize: 100 } : undefined)
      .then((res) => {
        if (!isMounted) return;
        if (!res || !res.items || res.items.length === 0) {
          setReturnRecordsByOrder({});
          setInvoices(showPendingPayments ? [] : getInitialInvoices());
          setPreOrders(getInitialPreOrders());
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
        const mappedInvoices: InvoiceDTO[] = invoiceOrders.map(mapBackendOrderToInvoice);

        // Hợp nhất đơn hàng Backend với danh sách hóa đơn lịch sử chi nhánh (ca trước) để luôn có dữ liệu đổi trả
        const combinedInvoices = [...mappedInvoices];
        const existingCodes = new Set(mappedInvoices.map((i) => i.invoiceId));
        if (!showPendingPayments) getInitialInvoices().forEach((initInv) => {
          if (!existingCodes.has(initInv.invoiceId) && !initInv.invoiceId.startsWith('DT') && !initInv.invoiceId.startsWith('PO') && !initInv.invoiceId.startsWith('PRE-')) {
            combinedInvoices.push(initInv);
          }
        });
        setInvoices(combinedInvoices);

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
            const parsedNoteInfo = parsePreOrderPickupAndNotes(o.note);
            return {
              orderUuid: o.id,
              preOrderId: o.orderCode || o.id,
              createdAt: o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '',
              branchId: o.branchId || '',
              branchName: o.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)',
              cashierName: o.cashierName || 'Thu ngân POS',
              fulfilledByCashierName: o.fulfilledByCashierName,
              fulfilledAt: o.fulfilledAtUtc ? new Date(o.fulfilledAtUtc).toLocaleString('vi-VN') : undefined,
              pickupAppointment: parsedNoteInfo.pickupAppointment,
              fulfillmentNote: parsedNoteInfo.fulfillmentNote,
              notes: parsedNoteInfo.notes,
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
                batchId: it.batchId || '',
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
      .catch((err) => console.warn('Fetch orders error:', err));

    return () => {
      isMounted = false;
    };
  }, [currentTenantId, isDefaultDemoStore, showPendingPayments, pendingBranchId]);

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

    // Chỉ dùng danh sách chi nhánh từ Database Backend (ưu tiên tuyệt đối)
    if (dbBranches && dbBranches.length > 0) {
      dbBranches.forEach((b) => addBranch(b.id, b.name));
    } else if (isAnNhienStore) {
      AN_NHIEN_BRANCHES.forEach((b) => addBranch(b.id, b.name));
    } else {
      addBranch('BR-01', 'Chi nhánh Cầu Giấy (Trung tâm)');
      addBranch('BR-02', 'Chi nhánh Thanh Xuân');
      addBranch('BR-03', 'Chi nhánh Quận 1');
    }

    return [{ id: 'ALL', name: 'Tất cả chi nhánh (Toàn chuỗi)' }, ...list];
  }, [isAnNhienStore, isStoreOwner, assignedBranch, dbBranches]);

  // Modal Xác nhận hủy hóa đơn
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceDTO | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý trả lại hàng');
  const [cancelNote, setCancelNote] = useState('');

  // Modal Đổi / Trả hàng chuẩn KiotViet
  const [returnExchangeModalInvoice, setReturnExchangeModalInvoice] = useState<InvoiceDTO | null>(null);

  // Scoped danh mục cho modal Đổi/Trả hàng theo đúng chi nhánh của đơn gốc
  useEffect(() => {
    let mounted = true;
    if (returnExchangeModalInvoice?.branchId && !returnExchangeModalInvoice.branchId.startsWith('BR-')) {
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
        unitPrice: it.isGift ? 0 : it.unitPrice,
        totalPrice: it.isGift ? 0 : it.totalAmount,
        totalAmount: it.isGift ? 0 : it.totalAmount,
        isGift: Boolean(it.isGift),
      })),
      totalItemAmount: printingInvoice.totalMerchandiseAmount,
      itemDiscountAmount: 0,
      orderDiscountAmount: printingInvoice.totalDiscount,
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

  // Đồng bộ tham số tìm kiếm từ URL (khi điều hướng từ trang Khách nợ CRM hoặc Sổ quỹ sang)
  useEffect(() => {
    if (urlSearch) {
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

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Xác nhận hủy hóa đơn (chặn Thu ngân với mã 403)
  const handleConfirmCancelInvoice = async () => {
    if (!cancelModalInvoice) return;
    if (!isStoreOwnerOrManager) {
      alert('Thu ngân không có quyền hủy hóa đơn đã thanh toán. Vui lòng liên hệ Quản lý hoặc Chủ cửa hàng!');
      setCancelModalInvoice(null);
      return;
    }

    if (!cancelReason.trim() || cancelReason.trim().length > 300 || cancelNote.trim().length > 500) {
      alert('Lý do hủy bắt buộc, tối đa 300 ký tự; ghi chú tối đa 500 ký tự.');
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
        alert(e?.response?.data?.message || 'Bạn không có quyền hủy hóa đơn này!');
        setCancelModalInvoice(null);
        return;
      }
      alert(e?.response?.data?.message || 'Không thể hủy hóa đơn. Vui lòng thử lại.');
      return;
    }
    setInvoices((prev) =>
      prev.map((i) =>
        i.invoiceId === cancelModalInvoice.invoiceId
          ? { ...i, status: 'CANCELLED', statusLabel: 'Đã hủy / Đổi trả' }
          : i
      )
    );
    showToast(`Đã hủy thành công hóa đơn ${cancelModalInvoice.invoiceId} (${cancelReason})!`);
    window.dispatchEvent(new Event('mtgrms:customer-debt-changed'));
    setCancelModalInvoice(null);
    setCancelNote('');
  };

  // Hủy đơn đặt trước và hoàn lại tồn kho giữ
  const handleCancelPreOrder = async (pre: PreOrderDTO) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn đặt trước ${pre.preOrderId}? Tồn kho đã giữ sẽ được tự động hoàn lại vào kho hàng.`)) {
      return;
    }
    try {
      await posOrderApi.cancelOrder(pre.orderUuid || pre.preOrderId, {
        reason: 'Khách hàng hủy đơn đặt trước',
        note: 'Hủy đơn đặt trước từ màn hình Quản lý Đơn hàng',
        userRole: user?.role || 'CASHIER',
      });
      setPreOrders((prev) =>
        prev.map((p) =>
          p.preOrderId === pre.preOrderId
            ? { ...p, status: 'CANCELLED', statusLabel: 'Đã hủy' }
            : p
        )
      );
      showToast(`Đã hủy thành công đơn đặt trước ${pre.preOrderId}!`);
    } catch (e: any) {
      console.error('Cancel PreOrder failed:', e);
      alert(`Lỗi khi hủy đơn đặt trước: ${e?.response?.data?.message || e?.message || 'Không thể kết nối máy chủ'}`);
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
      posOrderApi.getOrders().then((orderRes) => {
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
      const targetBranchId = branchFilter !== 'ALL' ? branchFilter : (assignedBranch.id.startsWith('BR-') ? (dbBranches[0]?.id || assignedBranch.id) : assignedBranch.id);
      posShiftApi.getCurrentShift(targetBranchId).then((s) => {
        if (s) setActiveShiftCash(s.expectedCash);
      }).catch(() => { });
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
      : (!assignedBranch.id.startsWith('BR-') ? assignedBranch.id : undefined);

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
      const newPreOrder: PreOrderDTO = {
        orderUuid: createdUuid,
        preOrderId: createdCode || `PO${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toLocaleString('vi-VN'),
        branchId: branchFilter !== 'ALL' ? branchFilter : assignedBranch.id,
        branchName:
          branchFilter !== 'ALL'
            ? availableBranches.find((b) => b.id === branchFilter)?.name || assignedBranch.name
            : assignedBranch.name,
        cashierName: creatorCashier,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        pickupAppointment: new Date(data.expectedPickupDate).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
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

  // Kiểm tra chi nhánh khớp nhau (hỗ trợ cả GUID DB, mã BR-AN-*, và tên chi nhánh)
  const isBranchMatching = (filterId: string, itemBranchId?: string, itemBranchName?: string) => {
    if (filterId === 'ALL') return true;
    if (itemBranchId && itemBranchId === filterId) return true;
    const filterBranch = availableBranches.find((b) => b.id === filterId);
    const normStr = (s: string) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
    const filterName = normStr(filterBranch?.name || '');
    const targetName = normStr(itemBranchName || '');
    if (targetName && filterName && (targetName === filterName || targetName.includes(filterName) || filterName.includes(targetName))) {
      return true;
    }
    if (filterName.includes('ba đình') && (targetName.includes('ba đình') || itemBranchId === 'BR-AN-01' || itemBranchId === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52')) return true;
    if (filterName.includes('cầu giấy') && (targetName.includes('cầu giấy') || itemBranchId === 'BR-01' || itemBranchId === 'BR-AN-02')) return true;
    if (filterName.includes('đống đa') && (targetName.includes('đống đa') || itemBranchId === 'BR-AN-03')) return true;
    if (filterName.includes('thanh xuân') && (targetName.includes('thanh xuân') || itemBranchId === 'BR-02')) return true;
    if (filterName.includes('quận 1') && (targetName.includes('quận 1') || itemBranchId === 'BR-03')) return true;
    return false;
  };

  // Lọc Hóa đơn
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Khi là Chủ cửa hàng đang gõ tìm kiếm -> Cho phép tìm toàn chuỗi
      // Nhưng nếu là Nhân viên -> BẮT BUỘC chỉ tìm trong chi nhánh của mình
      const isSearching = isStoreOwner && searchQuery.trim().length > 0;

      const matchBranch = !isStoreOwner
        ? isBranchMatching(branchFilter, inv.branchId, inv.branchName)
        : (isSearching || branchFilter === 'ALL' || isBranchMatching(branchFilter, inv.branchId, inv.branchName));

      const cleanQuery = searchQuery.trim().toLowerCase();
      const phoneQuery = cleanQuery.replace(/\D/g, '');
      const matchSearch =
        !searchQuery.trim() ||
        inv.invoiceId.toLowerCase().includes(cleanQuery) ||
        inv.customerName.toLowerCase().includes(cleanQuery) ||
        (phoneQuery.length > 0 && inv.customerPhone && inv.customerPhone.replace(/\D/g, '').includes(phoneQuery));

      const matchMethod =
        paymentMethodFilter === 'ALL' ||
        (paymentMethodFilter === 'DEBT'
          ? inv.paymentMethod === 'DEBT' || inv.paymentMethod === 'CREDIT'
          : inv.paymentMethod === paymentMethodFilter);

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchBranch && matchSearch && matchMethod && matchStatus;
    });
  }, [invoices, searchQuery, paymentMethodFilter, statusFilter, branchFilter, isStoreOwner, availableBranches]);

  // Phân trang dữ liệu Hóa đơn
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * invoicePageSize;
    return filteredInvoices.slice(start, start + invoicePageSize);
  }, [filteredInvoices, invoicePage, invoicePageSize]);

  // Lọc Đơn đặt trước
  const filteredPreOrders = useMemo(() => {
    return preOrders.filter((p) => {
      const isSearching = isStoreOwner && searchQuery.trim().length > 0;

      const matchBranch = !isStoreOwner
        ? isBranchMatching(branchFilter, p.branchId, p.branchName)
        : (isSearching || branchFilter === 'ALL' || isBranchMatching(branchFilter, p.branchId, p.branchName));

      const matchSearch =
        !searchQuery.trim() ||
        p.preOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerPhone.includes(searchQuery.trim());

      return matchBranch && matchSearch;
    });
  }, [preOrders, searchQuery, branchFilter, isStoreOwner, availableBranches]);

  // Phân trang Đơn đặt trước
  const paginatedPreOrders = useMemo(() => {
    const start = (preOrderPage - 1) * preOrderPageSize;
    return filteredPreOrders.slice(start, start + preOrderPageSize);
  }, [filteredPreOrders, preOrderPage, preOrderPageSize]);

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
        paymentMethod: data.paymentMethod,
        amountPaid: data.amountPaid,
        note: data.note,
        cashierName: fulfillingCashier,
      });
    } catch (e) {
      throw e;
    }

    setPreOrders((prev) =>
      prev.map((p) =>
        p.preOrderId === preOrderId
          ? {
            ...p,
            remainingAmount: 0,
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
            <div className="unified-header-subtitle">
              {branchFilter === 'ALL'
                ? 'Toàn chuỗi cửa hàng (3 Chi nhánh)'
                : availableBranches.find((b) => b.id === branchFilter)?.name || 'Chi nhánh Cầu Giấy (Trung tâm)'}{' '}
              &bull; Bán lẻ &bull; Đơn đặt trước giữ kho
            </div>
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

      {/* TOAST THÔNG BÁO TẠI QUẦY */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            right: 20,
            zIndex: 99999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 9999,
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
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

              {/* Ô TÌM KIẾM TỪ KHÓA */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="so-list-filter-input w-full"
                  style={{ paddingLeft: 34, height: 36 }}
                  placeholder={
                    activeTab === 'invoices'
                      ? 'Tìm theo mã hóa đơn, tên hoặc SĐT khách...'
                      : 'Tìm theo mã đơn đặt trước, khách hàng...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* PRESETS THỜI GIAN CHUẨN PILL CỦA POS */}
              <div className="time-preset-buttons">
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'today' ? 'active' : ''}`}
                  onClick={() => setTimePreset('today')}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'yesterday' ? 'active' : ''}`}
                  onClick={() => setTimePreset('yesterday')}
                >
                  Hôm qua
                </button>
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'week' ? 'active' : ''}`}
                  onClick={() => setTimePreset('week')}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'month' ? 'active' : ''}`}
                  onClick={() => setTimePreset('month')}
                >
                  Tháng này
                </button>
              </div>

              {/* LỌC PHƯƠNG THỨC & TRẠNG THÁI */}
              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="so-list-filter-select"
                    style={{ height: 34 }}
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
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
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="PENDING_PAYMENT">Chờ chuyển khoản</option>
                    <option value="CANCELLED">Đã hủy / Đổi trả</option>
                  </select>
                </div>
              )}
              <button type="button" className="so-list-filter-reset" onClick={() => {
                setSearchQuery('');
                setTimePreset('today');
                setPaymentMethodFilter('ALL');
                setStatusFilter('ALL');
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
                    Hiển thị <b>{paginatedInvoices.length}</b> trên <b>{filteredInvoices.length}</b> hóa đơn &bull; Doanh thu: <b style={{ color: '#15803d' }}>{filteredInvoices.reduce((s, i) => s + (i.status === 'COMPLETED' ? i.finalPaidAmount + (i.debtAmount || 0) : 0), 0).toLocaleString('vi-VN')} đ</b>
                  </div>
                </div>

              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table so-list-table invoice-list-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '13%' }}>Mã hóa đơn</th>
                      <th style={{ textAlign: 'left', width: '8%' }}>Thời gian lập</th>
                      <th style={{ textAlign: 'left', width: '8%' }}>Khách hàng</th>
                      <th style={{ textAlign: 'left', width: '11%' }}>Người tạo</th>
                      <th style={{ textAlign: 'left', width: '9%' }}>Tổng tiền hàng</th>
                      <th style={{ textAlign: 'left', width: '7%' }}>Giảm giá</th>
                      <th style={{ textAlign: 'left', width: '9%' }}>Khách đã trả</th>
                      <th style={{ textAlign: 'left', width: '10%' }}>Phương thức TT</th>
                      <th style={{ textAlign: 'left', width: '10%' }}>Trạng thái</th>
                      <th style={{ textAlign: 'left', width: '15%' }}>Thao tác</th>
                    </tr>
                  </thead>
                  {paginatedInvoices.map((inv) => {
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
                            <span style={{ fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'flex-start', gap: 4, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                              <span>{inv.invoiceId}</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                            <div style={{ display: 'block', marginTop: 5 }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontWeight: 500,
                                  display: 'block',
                                  width: 'fit-content',
                                  maxWidth: '100%',
                                  whiteSpace: 'normal',
                                  overflowWrap: 'anywhere',
                                  lineHeight: 1.35,
                                }}
                              >
                                {inv.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)'}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: '#64748b', lineHeight: 1.45 }}>
                            {String(inv.createdAt).split(/\s+/).map((part, index) => (
                              <div key={`${part}-${index}`}>{part}</div>
                            ))}
                          </td>
                          <td>
                            <b style={{ color: '#0f172a' }}>{inv.customerName}</b>
                            {inv.customerPhone && (
                              <div style={{ color: '#64748b', fontSize: 11 }}>
                                {inv.customerPhone}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: 12, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                              {inv.cashierName || 'Phạm Thị Yến'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {inv.totalMerchandiseAmount.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'left', color: inv.totalDiscount > 0 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            <div>{inv.totalDiscount.toLocaleString('vi-VN')}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 3, marginTop: 2 }}>
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
                                  <Star size={10} color="#047857" /> {inv.pointsRedeemed}đ
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
                              textAlign: 'left',
                              fontWeight: 700,
                              color: isCompleted && !isDebt ? '#15803d' : isDebt ? '#d97706' : '#dc2626',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {(isDebt ? (inv.paidDebtAmount || 0) : inv.finalPaidAmount).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span
                              className={`pos-method-pill ${inv.paymentMethod === 'VIETQR' ? 'vietqr' : isDebtMethod ? 'debt' : 'cash'
                                }`}
                              style={
                                isDebtMethod
                                  ? { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
                                  : undefined
                              }
                            >
                              {inv.paymentMethod === 'VIETQR' ? (
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
                                  <CheckCircle2 size={12} /> Hoàn thành
                                </span>
                              ) : inv.status === 'PENDING_PAYMENT' ? (
                                'Chờ chuyển khoản'
                              ) : isDebt ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <DollarSign size={12} /> Còn nợ {(inv.debtAmount || 0).toLocaleString('vi-VN')} đ
                                </span>
                              ) : (
                                'Đã hủy / Đổi trả'
                              )}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start', maxWidth: 175 }}>
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
                                title="In lại hóa đơn K80"
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
                              {isCompleted ? (
                                <button
                                  type="button"
                                  className="pos-btn-secondary-pill"
                                  style={{
                                    height: 26,
                                    padding: '0 8px',
                                    fontSize: 11,
                                    borderColor: isStoreOwnerOrManager ? '#fca5a5' : '#cbd5e1',
                                    color: isStoreOwnerOrManager ? '#dc2626' : '#94a3b8',
                                    opacity: isStoreOwnerOrManager ? 1 : 0.6,
                                  }}
                                  title={isStoreOwnerOrManager ? 'Hủy hóa đơn này' : 'Chỉ Quản lý / Chủ cửa hàng mới được hủy hóa đơn'}
                                  onClick={() => {
                                    if (!isStoreOwnerOrManager) {
                                      alert('Thu ngân không có quyền hủy hóa đơn đã thanh toán. Vui lòng liên hệ Quản lý hoặc Chủ cửa hàng!');
                                      return;
                                    }
                                    setCancelModalInvoice(inv);
                                  }}
                                >
                                  <XCircle size={12} />
                                  <span>Hủy đơn</span>
                                </button>
                              ) : inv.status === 'PENDING_PAYMENT' ? (
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
                                    <b>Lịch sử đổi/trả:</b>
                                    {returnRecordsByOrder[inv.invoiceId].map((record) => (
                                      <div key={record.code} style={{ marginTop: 4 }}>
                                        Phiếu {record.code} · {record.createdAt} · Hàng trả {record.returnedAmount.toLocaleString('vi-VN')} đ · Hàng đổi mới {record.newGoodsAmount.toLocaleString('vi-VN')} đ
                                      </div>
                                    ))}
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
                                          {inv.promotionDiscountAmount && inv.promotionDiscountAmount > 0
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
                                    {inv.items.map((item) => (
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
                                        <td style={{ textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
                                          {item.isGift ? '0 đ' : `${item.unitPrice.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'left', color: item.discountAmount > 0 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                                          {item.isGift ? '0 đ' : `${item.discountAmount.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'left', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                                          {item.isGift ? '0 đ' : `${item.totalAmount.toLocaleString('vi-VN')} đ`}
                                        </td>
                                      </tr>
                                    ))}
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
                      if (branchFilter === 'ALL' && (!assignedBranch.id || assignedBranch.id.startsWith('BR-'))) {
                        alert('Vui lòng chọn một chi nhánh cụ thể từ bộ lọc trên thanh công cụ trước khi tạo đơn đặt trước.');
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
                <table className="pos-shift-table so-list-table invoice-list-table">
                  <thead>
                    <tr>
                      <th style={{ width: 145, textAlign: 'left' }}>Mã đơn đặt trước</th>
                      <th style={{ width: 112, textAlign: 'left' }}>Khách hàng</th>
                      <th style={{ width: 105, textAlign: 'left' }}>Người tạo</th>
                      <th style={{ width: 115, textAlign: 'left' }}>Thời gian hẹn nhận</th>
                      <th style={{ width: 120, textAlign: 'left', lineHeight: 1.35 }}>
                        Tổng sau<br />khuyến mại
                      </th>
                      <th style={{ width: 85, textAlign: 'left' }}>Tiền cọc</th>
                      <th style={{ width: 95, textAlign: 'left' }}>Còn phải thu</th>
                      <th style={{ width: 110, textAlign: 'left' }}>Giữ kho</th>
                      <th style={{ width: 108, textAlign: 'left' }}>Trạng thái</th>
                      <th style={{ width: 280, minWidth: 280, textAlign: 'left' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreOrders.map((pre) => {
                      const isExpanded = expandedPreOrderId === pre.preOrderId;
                      const giftItems = pre.items.filter((item) => item.isGift);
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ChevronRight
                                  size={15}
                                  style={{
                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.15s ease',
                                    color: '#0f766e',
                                    flexShrink: 0,
                                  }}
                                />
                                <div>
                                  <b style={{ color: '#0f766e', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{pre.preOrderId}</b>
                                  <div style={{ color: '#64748b', fontSize: 11 }}>Tạo: {pre.createdAt}</div>
                                </div>
                              </div>
                              <div style={{ display: 'block', marginTop: 5 }}>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: '#f0fdf4',
                                    color: '#166534',
                                    fontWeight: 500,
                                    display: 'block',
                                    width: 'fit-content',
                                    maxWidth: '100%',
                                    whiteSpace: 'normal',
                                    overflowWrap: 'anywhere',
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {pre.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={13} className="text-slate-500" />
                                <b>{pre.customerName}</b>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 11 }}>
                                <Phone size={11} />
                                <span>{pre.customerPhone}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0f766e', fontSize: 12, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                                {pre.cashierName || 'Thu ngân POS'}
                              </span>
                              {pre.fulfilledByCashierName ? (
                                <div style={{ fontSize: 11, color: '#166534', marginTop: 3 }}>
                                  Bàn giao: <b>{pre.fulfilledByCashierName}</b>
                                </div>
                              ) : (
                                <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 3 }}>
                                  Chờ khách đến nhận
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#b45309' }}>
                                {pre.pickupAppointment}
                              </span>
                              {pre.notes && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }} title={pre.notes}>
                                  Ghi chú: {pre.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'left', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 800 }}>
                                {pre.totalOrderAmount.toLocaleString('vi-VN')} đ
                              </div>
                              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500 }}>
                                Số tiền phải thanh toán cho toàn đơn
                              </div>
                              <div style={{ fontSize: 10.5, color: '#475569', fontWeight: 500 }}>
                                Giá trị hàng: {merchandiseAmount.toLocaleString('vi-VN')} đ
                              </div>
                              {discountAmount > 0 && (
                                <div style={{ fontSize: 10.5, color: '#dc2626', fontWeight: 600 }}>
                                  Khuyến mại: -{discountAmount.toLocaleString('vi-VN')} đ
                                </div>
                              )}
                              {pre.appliedPromotionSummary && (
                                <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-start' }} title={pre.appliedPromotionSummary}>
                                  <Gift size={10} color="#0f766e" /> {pre.appliedPromotionSummary}
                                </div>
                              )}
                              {giftItems.length > 0 && (
                                <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <Gift size={10} color="#15803d" /> Quà tặng 0 đ · đã giữ kho
                                  </span>
                                  {giftItems.map((gift, giftIndex) => (
                                    <span key={`${gift.productId}-${giftIndex}`}>
                                      {gift.quantity} {gift.unitName} {gift.productName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'left', color: '#15803d', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {pre.depositAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'left', color: '#dc2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {pre.remainingAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'left' }}>
                              <span className="shift-status-badge on-duty">
                                <CheckCircle2 size={12} /> Đã giữ kho Lô FEFO
                              </span>
                            </td>
                            <td style={{ textAlign: 'left' }}>
                              <span className="pos-status-pill reserved">
                                {pre.statusLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'left', minWidth: 280, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, flexWrap: 'nowrap' }}>
                                <button
                                  type="button"
                                  className="pos-btn-secondary-pill"
                                  style={{ height: 26, padding: '0 8px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}
                                  onClick={() => toggleExpandPreOrder(pre.preOrderId)}
                                >
                                  {isExpanded ? 'Đóng' : 'Chi tiết'}
                                </button>
                                {pre.status === 'CANCELLED' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <XCircle size={12} /> Đã hủy
                                  </span>
                                ) : pre.status === 'COMPLETED' ? (
                                  <>
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, backgroundColor: '#ecfdf5', color: '#047857', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <CheckCircle2 size={12} /> Đã giao
                                  </span>
                                  <button
                                    type="button"
                                    className="pos-btn-secondary-pill"
                                    style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#0f766e', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
                                    title="In lại hóa đơn giao hàng K80"
                                    onClick={(e) => handleOpenPrintModal(mapPreOrderToInvoice(pre), e)}
                                  >
                                    <Printer size={12} />
                                    <span>In bill</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="pos-btn-secondary-pill"
                                    style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#059669', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
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
                                      style={{ height: 26, padding: '0 8px', fontSize: 11, backgroundColor: '#0f766e', whiteSpace: 'nowrap', flexShrink: 0 }}
                                      onClick={() => setFulfillModalPreOrder(pre)}
                                      title="Thanh toán nốt số tiền còn lại và bàn giao hàng cho khách tại quầy"
                                    >
                                      <CreditCard size={12} />
                                      <span>Bàn giao ({pre.remainingAmount.toLocaleString('vi-VN')} đ)</span>
                                    </button>
                                    <button
                                      type="button"
                                      style={{ height: 26, padding: '0 8px', fontSize: 11, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}
                                      onClick={() => handleCancelPreOrder(pre)}
                                      title="Hủy đơn đặt trước và hoàn lại tồn kho đã giữ"
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

      {/* MODAL ĐỔI / TRẢ HÀNG */}
      <ReturnExchangeModal
        isOpen={Boolean(returnExchangeModalInvoice)}
        invoice={returnExchangeModalInvoice}
        availableProducts={exchangeBranchProducts.length > 0 ? exchangeBranchProducts : catalogProducts}
        currentDrawerCash={activeShiftCash}
        isStoreOwner={isStoreOwner}
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
    </div>
  );
};
