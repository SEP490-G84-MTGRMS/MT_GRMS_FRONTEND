import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  QrCode,
  Banknote,
  PackageCheck,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  XCircle,
  CheckCircle2,
  User,
  UserCheck,
  Phone,
  FileText,
  DollarSign,
  CreditCard,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { TablePagination } from '../../../components/common';
import {
  mockInvoicesList,
  mockPreOrdersList,
  mockInvoicesAnNhien,
  mockPreOrdersAnNhien,
} from '../mock/inventoryMockData';
import type { InvoiceDTO, PreOrderDTO, DebtPaymentRecordDTO } from '../types/inventory.types';
import { CollectDebtModal } from '../components/modals/CollectDebtModal';
import { ReturnExchangeModal } from '../components/modals/ReturnExchangeModal';
import { CreatePreOrderModal } from '../components/modals/CreatePreOrderModal';
import { FulfillPreOrderModal } from '../components/modals/FulfillPreOrderModal';
import { AN_NHIEN_BRANCHES } from '../mock/posMockData';
import type { Product, Customer } from '../types/pos.types';
import { posOrderApi } from '../api/posOrderApi';
import { posShiftApi } from '../api/posShiftApi';
import { employeeApi } from '../../employee/api/employeeApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';

export const InvoiceManagementPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'DEBT'>('ALL');

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
  const [branchFilter, setBranchFilter] = useState<string>(() => (isStoreOwner ? 'ALL' : assignedBranch.id));

  // Tự động đồng bộ bộ lọc: Chủ cửa hàng mặc định xem toàn chuỗi (ALL), Nhân viên theo chi nhánh được giao ca
  useEffect(() => {
    if (isStoreOwner) {
      setBranchFilter('ALL');
    } else {
      setBranchFilter(assignedBranch.id);
    }
  }, [isStoreOwner, assignedBranch.id]);

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
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogCustomers, setCatalogCustomers] = useState<Customer[]>([]);
  const [exchangeBranchProducts, setExchangeBranchProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    if (branchFilter === 'ALL') {
      setCatalogProducts([]);
      posOrderApi.getAllCustomers().then((custs) => {
        if (mounted && custs) setCatalogCustomers(custs);
      }).catch(() => {});
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
      finalPaidAmount: isDebtMethod ? (o.depositAmount || 0) : (o.finalAmount || 0),
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
      status: o.status === 'Cancelled' ? 'CANCELLED' : isDebtMethod ? 'DEBT' : 'COMPLETED',
      statusLabel: o.status === 'Cancelled' ? 'Đã hủy' : isDebtMethod ? 'Ghi nợ' : 'Hoàn thành',
      isPreOrder: isPreOrderFlag,
      orderOrigin: isPreOrderFlag ? 'PRE_ORDER' : 'RETAIL',
      items: (o.items || []).map((it: any) => ({
        itemId: it.id,
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

  // Nạp tiền mặt trong két ca làm việc đang mở của chi nhánh
  useEffect(() => {
    const targetBranchId = branchFilter !== 'ALL' ? branchFilter : (assignedBranch.id.startsWith('BR-') ? (dbBranches[0]?.id || assignedBranch.id) : assignedBranch.id);
    posShiftApi.getCurrentShift(targetBranchId).then((s) => {
      if (s) setActiveShiftCash(s.expectedCash);
    }).catch(() => { });
  }, [branchFilter, assignedBranch.id]);

  // Khi chuyển tài khoản hoặc đăng nhập chủ cửa hàng khác -> Reset danh sách hóa đơn
  useEffect(() => {
    setInvoices(getInitialInvoices());
    setPreOrders(getInitialPreOrders());
  }, [currentTenantId, isDefaultDemoStore]);

  // Nạp dữ liệu thực tế từ Backend API theo Tenant
  useEffect(() => {
    let isMounted = true;
    posOrderApi
      .getOrders()
      .then((res) => {
        if (!isMounted) return;
        if (!res || !res.items || res.items.length === 0) {
          setInvoices(getInitialInvoices());
          setPreOrders(getInitialPreOrders());
          return;
        }

        // 1. Phân loại và nạp danh sách Hóa đơn bán lẻ (không đẩy đơn đang chờ nhận PendingPickup vào tab bán lẻ)
        const invoiceOrders = res.items.filter(
          (o: any) => o.status !== 'PreOrder' && o.status !== 'PendingPickup'
        );
        const mappedInvoices: InvoiceDTO[] = invoiceOrders.map(mapBackendOrderToInvoice);

        // Hợp nhất đơn hàng Backend với danh sách hóa đơn lịch sử chi nhánh (ca trước) để luôn có dữ liệu đổi trả
        const combinedInvoices = [...mappedInvoices];
        const existingCodes = new Set(mappedInvoices.map((i) => i.invoiceId));
        getInitialInvoices().forEach((initInv) => {
          if (!existingCodes.has(initInv.invoiceId)) {
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
            return {
              orderUuid: o.id,
              preOrderId: o.orderCode || o.id,
              createdAt: o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '',
              branchId: o.branchId || '',
              branchName: o.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)',
              cashierName: o.cashierName || 'Thu ngân POS',
              fulfilledByCashierName: o.fulfilledByCashierName,
              fulfilledAt: o.fulfilledAtUtc ? new Date(o.fulfilledAtUtc).toLocaleString('vi-VN') : undefined,
              pickupAppointment: o.note || '17:30 - Hôm nay',
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
  }, [currentTenantId, isDefaultDemoStore]);

  // Danh sách các chi nhánh có trong hệ thống (Tự động hợp nhất từ CSDL & cấu hình chuỗi)
  const availableBranches = useMemo(() => {
    if (!isStoreOwner) {
      // Nhân viên thu ngân chỉ thấy chi nhánh được phân công của mình
      return [assignedBranch];
    }

    const map = new Map<string, string>();
    dbBranches.forEach((b) => map.set(b.id, b.name));

    if (isAnNhienStore) {
      AN_NHIEN_BRANCHES.forEach((b) => map.set(b.id, b.name));
    } else {
      map.set('BR-01', 'Chi nhánh Cầu Giấy (Trung tâm)');
      map.set('BR-02', 'Chi nhánh Thanh Xuân');
      map.set('BR-03', 'Chi nhánh Quận 1');
    }

    invoices.forEach((inv) => {
      if (inv.branchId && inv.branchName) {
        map.set(inv.branchId, inv.branchName);
      }
    });
    preOrders.forEach((pre) => {
      if (pre.branchId && pre.branchName) {
        map.set(pre.branchId, pre.branchName);
      }
    });

    const list = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    return [{ id: 'ALL', name: 'Tất cả chi nhánh (Toàn chuỗi)' }, ...list];
  }, [invoices, preOrders, isAnNhienStore, isStoreOwner, assignedBranch, dbBranches]);

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

  // Modal Thu nợ hóa đơn
  const [collectDebtModalInvoice, setCollectDebtModalInvoice] = useState<InvoiceDTO | null>(null);

  // Danh sách dòng mở rộng (Accordion detail)
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Modal In bill nhiệt K80
  const [printingInvoice, setPrintingInvoice] = useState<InvoiceDTO | null>(null);

  // Phân trang Hóa đơn (TablePagination)
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

  // Phân trang Đơn đặt trước
  const [preOrderPage, setPreOrderPage] = useState(1);
  const [preOrderPageSize, setPreOrderPageSize] = useState(10);

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
    }
    setInvoices((prev) =>
      prev.map((i) =>
        i.invoiceId === cancelModalInvoice.invoiceId
          ? { ...i, status: 'CANCELLED', statusLabel: 'Đã hủy / Đổi trả' }
          : i
      )
    );
    showToast(`Đã hủy thành công hóa đơn ${cancelModalInvoice.invoiceId} (${cancelReason})!`);
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
  }) => {
    if (!returnExchangeModalInvoice) return;
    try {
      const targetOrderId = returnExchangeModalInvoice.orderUuid || returnExchangeModalInvoice.invoiceId;
      const res = await posOrderApi.returnExchangeOrder(targetOrderId, data);
      showToast(`Đã xử lý đổi/trả hàng thành công cho hóa đơn ${returnExchangeModalInvoice.invoiceId}! (Mã đơn mới: ${res?.orderCode || 'Đã ghi nhận'})`);

      // Nạp lại danh sách từ API
      posOrderApi.getOrders().then((orderRes) => {
        if (orderRes && orderRes.items) {
          const invoiceOrders = orderRes.items.filter(
            (o: any) => o.status !== 'PreOrder' && o.status !== 'PendingPickup'
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
      alert(`Lỗi khi xử lý đổi trả: ${e?.message || 'Không thể kết nối máy chủ'}`);
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
      alert('Vui lòng chọn một chi nhánh cụ thể từ bộ lọc trước khi tạo đơn đặt trước.');
      return;
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
          note: `Khách: ${data.customerName} (${data.customerPhone}). ${data.note || ''}`,
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
        alert(`Lỗi tạo đơn đặt trước: ${errMsg}`);
        return;
      }

      const merchandiseAmt = data.items
        .filter((it) => !it.isGift)
        .reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const promoDisc = data.discountAmount || 0;
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
        pickupAppointment: new Date(data.expectedPickupDate).toLocaleString('vi-VN'),
        totalMerchandiseAmount: merchandiseAmt,
        discountAmount: promoDisc,
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
          ? `⚠️ Đã tạo đơn đặt trước ${newPreOrder.preOrderId} (${backendRes.giftStockWarning})`
          : `Đã tạo thành công đơn đặt trước ${newPreOrder.preOrderId} (Cọc: ${data.depositAmount.toLocaleString('vi-VN')} đ)!`
      );
    } catch (e: any) {
      alert(`Lỗi khi tạo đơn đặt trước: ${e?.response?.data?.message || e?.message || 'Không thể kết nối máy chủ'}`);
    }
  };

  // Thu tiền nợ hóa đơn
  const handleCollectDebt = async (
    invoiceId: string,
    payment: { amount: number; method: 'CASH' | 'VIETQR'; note: string; cashierName: string }
  ) => {
    // Nếu thu bằng tiền mặt, tự động ghi nhận phiếu thu vào ca mở của thu ngân đang trực quầy
    if (payment.method === 'CASH') {
      try {
        const targetBranchId = branchFilter !== 'ALL' ? branchFilter : (assignedBranch.id.startsWith('BR-') ? (dbBranches[0]?.id || assignedBranch.id) : assignedBranch.id);
        const activeShift = await posShiftApi.getCurrentShift(targetBranchId);
        if (activeShift) {
          await posShiftApi.addCashMovement(activeShift.id, {
            movementType: 1, // IN
            category: 3,
            amount: payment.amount,
            reason: `Thu nợ hóa đơn ${invoiceId}: ${payment.note}`,
            createdByName: payment.cashierName,
          });
        }
      } catch (shiftErr) {
        console.warn('Không thể tự động ghi nhận phiếu thu nợ vào ca mở:', shiftErr);
      }
    }

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.invoiceId !== invoiceId) return inv;

        const currentDebt = inv.debtAmount || 0;
        const currentPaidDebt = inv.paidDebtAmount || 0;
        const newDebt = Math.max(0, currentDebt - payment.amount);
        const newPaidDebt = currentPaidDebt + payment.amount;
        const isFullyPaid = newDebt === 0;

        const newRecord: DebtPaymentRecordDTO = {
          paymentId: `DPR-${Date.now()}`,
          paidAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          amount: payment.amount,
          paymentMethod: payment.method,
          paymentMethodLabel: payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VietQR',
          note: payment.note,
          cashierName: payment.cashierName,
        };

        return {
          ...inv,
          debtAmount: newDebt,
          paidDebtAmount: newPaidDebt,
          finalPaidAmount: inv.finalPaidAmount + payment.amount,
          status: isFullyPaid ? 'COMPLETED' : 'DEBT',
          statusLabel: isFullyPaid ? 'Hoàn thành' : `Còn nợ ${newDebt.toLocaleString('vi-VN')} đ`,
          debtPaymentRecords: [...(inv.debtPaymentRecords || []), newRecord],
        };
      })
    );

    showToast(`Đã thu ${payment.amount.toLocaleString('vi-VN')} đ cho hóa đơn ${invoiceId} thành công!`);
  };

  // Lọc Hóa đơn
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Khi là Chủ cửa hàng đang gõ tìm kiếm -> Cho phép tìm toàn chuỗi
      // Nhưng nếu là Nhân viên -> BẮT BUỘC chỉ tìm trong chi nhánh của mình
      const isSearching = isStoreOwner && searchQuery.trim().length > 0;

      const matchBranch = !isStoreOwner
        ? // Nhân viên: BẮT BUỘC chỉ khớp chi nhánh được giao ca
        (inv.branchId === branchFilter ||
          ((branchFilter === 'BR-AN-01' || branchFilter === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52') &&
            (inv.branchId === 'BR-AN-01' || inv.branchId === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52' || inv.branchName?.includes('Ba Đình'))) ||
          ((branchFilter === 'BR-01' || branchFilter === 'BR-AN-02') &&
            (inv.branchId === 'BR-01' || inv.branchId === 'BR-AN-02' || inv.branchName?.includes('Cầu Giấy'))) ||
          (branchFilter === 'BR-02' && (inv.branchId === 'BR-02' || inv.branchName?.includes('Thanh Xuân'))) ||
          (branchFilter === 'BR-AN-03' && (inv.branchId === 'BR-AN-03' || inv.branchName?.includes('Đống Đa'))) ||
          (branchFilter === 'BR-03' && (inv.branchId === 'BR-03' || inv.branchName?.includes('Quận 1'))))
        : // Chủ cửa hàng:
        (isSearching ||
          branchFilter === 'ALL' ||
          inv.branchId === branchFilter ||
          ((branchFilter === 'BR-AN-01' || branchFilter === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52') &&
            (inv.branchId === 'BR-AN-01' || inv.branchId === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52' || inv.branchName?.includes('Ba Đình'))) ||
          ((branchFilter === 'BR-01' || branchFilter === 'BR-AN-02') &&
            (inv.branchId === 'BR-01' || inv.branchId === 'BR-AN-02' || inv.branchName?.includes('Cầu Giấy'))) ||
          (branchFilter === 'BR-02' && (inv.branchId === 'BR-02' || inv.branchName?.includes('Thanh Xuân'))) ||
          (branchFilter === 'BR-AN-03' && (inv.branchId === 'BR-AN-03' || inv.branchName?.includes('Đống Đa'))) ||
          (branchFilter === 'BR-03' && (inv.branchId === 'BR-03' || inv.branchName?.includes('Quận 1'))));

      const cleanQuery = searchQuery.trim().toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        inv.invoiceId.toLowerCase().includes(cleanQuery) ||
        inv.customerName.toLowerCase().includes(cleanQuery) ||
        (inv.customerPhone && inv.customerPhone.replace(/\D/g, '').includes(cleanQuery.replace(/\D/g, '')));

      const matchMethod =
        paymentMethodFilter === 'ALL' ||
        (paymentMethodFilter === 'DEBT'
          ? inv.paymentMethod === 'DEBT' || inv.paymentMethod === 'CREDIT'
          : inv.paymentMethod === paymentMethodFilter);

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchBranch && matchSearch && matchMethod && matchStatus;
    });
  }, [invoices, searchQuery, paymentMethodFilter, statusFilter, branchFilter, isStoreOwner]);

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
        ? // Nhân viên: BẮT BUỘC chỉ hiển thị đơn đặt trước của chi nhánh mình
        (p.branchId === branchFilter ||
          ((branchFilter === 'BR-AN-01' || branchFilter === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52') &&
            (p.branchId === 'BR-AN-01' || p.branchId === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52' || p.branchName?.includes('Ba Đình'))) ||
          ((branchFilter === 'BR-01' || branchFilter === 'BR-AN-02') &&
            (p.branchId === 'BR-01' || p.branchId === 'BR-AN-02' || p.branchName?.includes('Cầu Giấy'))) ||
          (branchFilter === 'BR-02' && (p.branchId === 'BR-02' || p.branchName?.includes('Thanh Xuân'))) ||
          (branchFilter === 'BR-AN-03' && (p.branchId === 'BR-AN-03' || p.branchName?.includes('Đống Đa'))) ||
          (branchFilter === 'BR-03' && (p.branchId === 'BR-03' || p.branchName?.includes('Quận 1'))))
        : (isSearching ||
          branchFilter === 'ALL' ||
          p.branchId === branchFilter ||
          ((branchFilter === 'BR-AN-01' || branchFilter === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52') &&
            (p.branchId === 'BR-AN-01' || p.branchId === 'cd5e8d1b-b08b-448d-beff-b85ea5873d52' || p.branchName?.includes('Ba Đình'))) ||
          ((branchFilter === 'BR-01' || branchFilter === 'BR-AN-02') &&
            (p.branchId === 'BR-01' || p.branchId === 'BR-AN-02' || p.branchName?.includes('Cầu Giấy'))) ||
          (branchFilter === 'BR-02' && (p.branchId === 'BR-02' || p.branchName?.includes('Thanh Xuân'))) ||
          (branchFilter === 'BR-AN-03' && (p.branchId === 'BR-AN-03' || p.branchName?.includes('Đống Đa'))) ||
          (branchFilter === 'BR-03' && (p.branchId === 'BR-03' || p.branchName?.includes('Quận 1'))));

      const matchSearch =
        !searchQuery.trim() ||
        p.preOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerPhone.includes(searchQuery.trim());

      return matchBranch && matchSearch;
    });
  }, [preOrders, searchQuery, branchFilter, isStoreOwner]);

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
      console.warn('Backend fulfill pre-order error (using fallback local update):', e);
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
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
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
          <div className="pos-shift-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
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
                    className="filter-select w-full"
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
                  className="filter-select w-full"
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
                    className="filter-select"
                    style={{ height: 34 }}
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                  >
                    <option value="ALL">Tất cả phương thức</option>
                    <option value="VIETQR">Chuyển khoản VietQR</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="DEBT">Ghi nợ (Còn nợ)</option>
                  </select>

                  <select
                    className="filter-select"
                    style={{ height: 34 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="COMPLETED">Đã thanh toán 100%</option>
                    <option value="DEBT">Đang ghi nợ (Chưa tất toán)</option>
                    <option value="CANCELLED">Đã hủy / Đổi trả</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* BẢNG DỮ LIỆU - CHUẨN POS-SHIFT-CARD & POS-SHIFT-TABLE */}
          {activeTab === 'invoices' ? (
            /* TAB 1: HÓA ĐƠN BÁN LẺ */
            <div className="pos-shift-card">
              <div className="pos-shift-card-header">
                <div>
                  <h3 className="pos-shift-card-title">
                    <FileText size={16} className="text-teal-700" />
                    <span>Danh Sách Hóa Đơn Bán Hàng</span>
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Hiển thị <b>{paginatedInvoices.length}</b> trên <b>{filteredInvoices.length}</b> hóa đơn &bull; Tổng tiền: <b style={{ color: '#15803d' }}>{filteredInvoices.reduce((s, i) => s + (i.status === 'COMPLETED' ? i.finalPaidAmount : 0), 0).toLocaleString('vi-VN')} đ</b>
                  </div>
                </div>

                <div className="shift-status-badge on-duty">
                  <CheckCircle2 size={12} /> Đồng bộ bán hàng POS
                </div>
              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}>
                        <input type="checkbox" />
                      </th>
                      <th style={{ width: 175 }}>Mã hóa đơn</th>
                      <th style={{ width: 130 }}>Thời gian lập</th>
                      <th style={{ minWidth: 140 }}>Khách hàng</th>
                      <th style={{ minWidth: 130 }}>Người tạo</th>
                      <th style={{ textAlign: 'right', width: 105 }}>Tổng tiền hàng</th>
                      <th style={{ textAlign: 'right', width: 80 }}>Giảm giá</th>
                      <th style={{ textAlign: 'right', width: 105 }}>Khách đã trả</th>
                      <th style={{ textAlign: 'center', width: 125 }}>Phương thức TT</th>
                      <th style={{ textAlign: 'center', width: 135 }}>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: 210 }}>Thao tác</th>
                    </tr>
                  </thead>
                  {paginatedInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceId === inv.invoiceId;
                    const isDebt = (inv.debtAmount !== undefined && inv.debtAmount > 0) || (inv.status === 'DEBT' && (!inv.debtAmount || inv.debtAmount > 0));
                    const isDebtMethod = inv.paymentMethod === 'DEBT' || inv.paymentMethod === 'CREDIT';
                    const isCompleted = !isDebt && (inv.status === 'COMPLETED' || (isDebtMethod && (inv.debtAmount || 0) <= 0));

                    return (
                      <tbody key={inv.invoiceId}>
                        <tr
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? '#f0fdfa' : undefined,
                          }}
                          onClick={() => toggleExpand(inv.invoiceId)}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" />
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {inv.invoiceId}
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontWeight: 500,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                {inv.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)'}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: '#64748b' }}>{inv.createdAt}</td>
                          <td>
                            <b style={{ color: '#0f172a' }}>{inv.customerName}</b>
                            {inv.customerPhone && (
                              <div style={{ color: '#64748b', fontSize: 11 }}>
                                {inv.customerPhone}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <User size={13} className="text-teal-700" style={{ flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>
                                {inv.cashierName || 'Phạm Thị Yến'}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {inv.totalMerchandiseAmount.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'right', color: inv.totalDiscount > 0 ? '#dc2626' : '#94a3b8' }}>
                            <div>{inv.totalDiscount.toLocaleString('vi-VN')}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
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
                                  }}
                                  title={`Mã Voucher: ${inv.appliedVoucherCode}`}
                                >
                                  🎟️ {inv.appliedVoucherCode}
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
                                  🎁 KM
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
                                  }}
                                >
                                  ⭐ {inv.pointsRedeemed}đ
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
                                  }}
                                >
                                  🎁 Quà tặng
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isCompleted ? '#15803d' : isDebt ? '#d97706' : '#dc2626',
                            }}
                          >
                            {(isDebt ? (inv.paidDebtAmount || 0) : inv.finalPaidAmount).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
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
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`pos-status-pill ${isCompleted ? 'completed' : isDebt ? 'debt' : 'cancelled'
                                }`}
                              style={
                                isDebt
                                  ? { backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
                                  : undefined
                              }
                            >
                              {isCompleted ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={12} /> Hoàn thành
                                </span>
                              ) : isDebt ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <DollarSign size={12} /> Còn nợ {(inv.debtAmount || 0).toLocaleString('vi-VN')} đ
                                </span>
                              ) : (
                                'Đã hủy / Đổi trả'
                              )}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              {isDebt && (
                                <button
                                  type="button"
                                  className="pos-btn-primary-pill"
                                  style={{
                                    height: 26,
                                    padding: '0 9px',
                                    fontSize: 11,
                                    backgroundColor: '#16a34a',
                                    borderColor: '#15803d',
                                  }}
                                  title="Thu tiền nợ của hóa đơn này"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCollectDebtModalInvoice(inv);
                                  }}
                                >
                                  <DollarSign size={12} />
                                  <span>Thu nợ</span>
                                </button>
                              )}
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
                            <td colSpan={11} style={{ padding: 12, backgroundColor: '#f8fafc' }}>
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

                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {isDebt && (
                                      <button
                                        type="button"
                                        className="pos-btn-primary-pill"
                                        style={{ height: 26, padding: '0 12px', fontSize: 11, backgroundColor: '#16a34a' }}
                                        onClick={() => setCollectDebtModalInvoice(inv)}
                                      >
                                        <DollarSign size={12} />
                                        <span>Thu Nợ Hóa Đơn ({(inv.debtAmount || 0).toLocaleString('vi-VN')} đ)</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

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
                                    <span style={{ fontWeight: 700, color: '#0f766e' }}>🎁 Ưu đãi áp dụng trên đơn:</span>
                                    {inv.appliedPromotionSummary && (
                                      <span style={{ color: '#115e59' }}>
                                        CTKM: <b>{inv.appliedPromotionSummary}</b>
                                        {inv.promotionDiscountAmount && inv.promotionDiscountAmount > 0
                                          ? ` (-${inv.promotionDiscountAmount.toLocaleString('vi-VN')} đ)`
                                          : ''}
                                      </span>
                                    )}
                                    {inv.appliedVoucherCode && (
                                      <span style={{ color: '#4338ca' }}>
                                        🎟️ Voucher <b>{inv.appliedVoucherCode}</b>:{' '}
                                        <b>-{(inv.voucherDiscountAmount || 0).toLocaleString('vi-VN')} đ</b>
                                      </span>
                                    )}
                                    {Boolean(inv.pointsRedeemed && inv.pointsRedeemed > 0) && (
                                      <span style={{ color: '#047857' }}>
                                        ⭐ Đổi <b>{inv.pointsRedeemed} điểm</b>:{' '}
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
                                      <th style={{ width: 140 }}>Mã SKU</th>
                                      <th>Tên mặt hàng</th>
                                      <th style={{ width: 120, textAlign: 'center' }}>Mã Lô (FEFO)</th>
                                      <th style={{ width: 70, textAlign: 'center' }}>ĐVT</th>
                                      <th style={{ width: 80, textAlign: 'right' }}>Số lượng</th>
                                      <th style={{ width: 110, textAlign: 'right' }}>Đơn giá</th>
                                      <th style={{ width: 90, textAlign: 'right' }}>Giảm giá</th>
                                      <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((item) => (
                                      <tr key={item.itemId} style={{ backgroundColor: item.isGift ? '#f0fdf4' : undefined }}>
                                        <td style={{ color: '#0f766e', fontWeight: 600 }}>{item.sku}</td>
                                        <td>
                                          <b>{item.productName}</b>
                                          {item.isGift && (
                                            <span
                                              style={{
                                                marginLeft: 6,
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                backgroundColor: '#dcfce7',
                                                color: '#15803d',
                                                border: '1px solid #86efac',
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                              }}
                                            >
                                              🎁 Quà tặng KM (0 đ)
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                            {item.batchId || 'LOT-AUTO'}
                                          </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{item.unitName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>
                                          {item.isGift ? '0 đ' : `${item.unitPrice.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'right', color: item.discountAmount > 0 ? '#dc2626' : '#94a3b8' }}>
                                          {item.isGift ? '0 đ' : `${item.discountAmount.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                          {item.isGift ? '0 đ' : `${item.totalAmount.toLocaleString('vi-VN')} đ`}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                {/* THEO DÕI CÔNG NỢ & LỊCH SỬ THU NỢ CỦA HÓA ĐƠN */}
                                {(isDebt || (inv.debtAmount !== undefined && inv.debtAmount > 0) || (inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0)) && (
                                  <div style={{ marginTop: 12, padding: 10, borderRadius: 6, backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0 ? 8 : 0 }}>
                                      <div>
                                        <span style={{ fontWeight: 700, color: '#854d0e', fontSize: 12 }}>Theo dõi thanh toán công nợ: </span>
                                        <span style={{ fontSize: 12, color: '#475569' }}>
                                          Đã thanh toán: <strong style={{ color: '#16a34a' }}>{(inv.paidDebtAmount || 0).toLocaleString('vi-VN')} đ</strong> &bull;{' '}
                                          Còn nợ lại: <strong style={{ color: (inv.debtAmount || 0) > 0 ? '#dc2626' : '#16a34a' }}>{(inv.debtAmount || 0).toLocaleString('vi-VN')} đ</strong>
                                        </span>
                                      </div>
                                      {(inv.debtAmount || 0) > 0 && (
                                        <button
                                          type="button"
                                          className="pos-btn-primary-pill"
                                          style={{ height: 24, padding: '0 10px', fontSize: 11, backgroundColor: '#16a34a' }}
                                          onClick={() => setCollectDebtModalInvoice(inv)}
                                        >
                                          <DollarSign size={12} />
                                          <span>Thu Nợ Ngay</span>
                                        </button>
                                      )}
                                    </div>

                                    {inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0 && (
                                      <div style={{ marginTop: 6, borderTop: '1px dashed #fde047', paddingTop: 6 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#713f12', marginBottom: 4 }}>
                                          Lịch sử các đợt trả tiền ({inv.debtPaymentRecords.length} lần):
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                          <thead>
                                            <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #fef08a' }}>
                                              <th style={{ padding: '3px 6px' }}>Thời gian</th>
                                              <th style={{ padding: '3px 6px', textAlign: 'right' }}>Số tiền</th>
                                              <th style={{ padding: '3px 6px', textAlign: 'center' }}>Hình thức</th>
                                              <th style={{ padding: '3px 6px' }}>Thu ngân</th>
                                              <th style={{ padding: '3px 6px' }}>Ghi chú</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {inv.debtPaymentRecords.map((r) => (
                                              <tr key={r.paymentId}>
                                                <td style={{ padding: '3px 6px' }}>{r.paidAt}</td>
                                                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                                                  {r.amount.toLocaleString('vi-VN')} đ
                                                </td>
                                                <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                                                  {r.paymentMethod === 'CASH' ? 'Tiền mặt' : 'VietQR'}
                                                </td>
                                                <td style={{ padding: '3px 6px' }}>{r.cashierName}</td>
                                                <td style={{ padding: '3px 6px', color: '#64748b' }}>{r.note}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
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
                pageSizeOptions={[5, 10, 20]}
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
            <div className="pos-shift-card">
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
                <table className="pos-shift-table">
                  <thead>
                    <tr>
                      <th style={{ width: 170 }}>Mã đơn đặt trước</th>
                      <th style={{ minWidth: 140 }}>Khách hàng</th>
                      <th style={{ minWidth: 150 }}>Người tạo</th>
                      <th style={{ width: 140 }}>Thời gian hẹn nhận hàng</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Tổng tiền đơn</th>
                      <th style={{ width: 90, textAlign: 'right' }}>Tiền cọc</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Còn phải thu</th>
                      <th style={{ width: 120 }}>Phân bổ giữ kho</th>
                      <th style={{ width: 130, textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ width: 180, textAlign: 'center' }}>Thao tác quầy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreOrders.map((pre) => (
                      <tr key={pre.preOrderId}>
                        <td>
                          <b style={{ color: '#0f766e' }}>{pre.preOrderId}</b>
                          <div style={{ color: '#64748b', fontSize: 11 }}>Tạo: {pre.createdAt}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              {pre.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)'}
                            </span>
                          </div>
                          {pre.items && pre.items.length > 0 && (
                            <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                              {pre.items.map((it, idx) => (
                                <div key={idx}>• {it.productName} (x{it.quantity} {it.unitName || 'Cái'})</div>
                              ))}
                            </div>
                          )}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <UserCheck size={13} className="text-teal-700" />
                            <span style={{ fontWeight: 600, color: '#0f766e', fontSize: 12 }}>
                              {pre.cashierName || 'Thu ngân POS'}
                            </span>
                          </div>
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
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          <div>{pre.totalOrderAmount.toLocaleString('vi-VN')} đ</div>
                          {Boolean(pre.discountAmount && pre.discountAmount > 0) && (
                            <div style={{ fontSize: 10.5, color: '#dc2626', fontWeight: 600 }}>
                              -{(pre.discountAmount || 0).toLocaleString('vi-VN')} đ KM
                            </div>
                          )}
                          {pre.appliedPromotionSummary && (
                            <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 600 }} title={pre.appliedPromotionSummary}>
                              🎁 {pre.appliedPromotionSummary}
                            </div>
                          )}
                          {pre.items.some((x) => x.isGift) && (
                            <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                              🎁 Kèm quà giữ kho
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                          {pre.depositAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                          {pre.remainingAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          <span className="shift-status-badge on-duty">
                            <CheckCircle2 size={12} /> Đã giữ kho Lô FEFO
                          </span>
                        </td>
                        <td>
                          <span className="pos-status-pill reserved">
                            {pre.statusLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {pre.status === 'CANCELLED' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 11.5, fontWeight: 600 }}>
                              <XCircle size={12} /> Đã hủy đơn
                            </span>
                          ) : pre.status === 'COMPLETED' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, backgroundColor: '#ecfdf5', color: '#047857', fontSize: 11.5, fontWeight: 600 }}>
                              <CheckCircle2 size={12} /> Đã bàn giao
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <button
                                type="button"
                                className="pos-btn-primary-pill"
                                style={{ height: 28, padding: '0 10px', fontSize: 11, backgroundColor: '#0f766e' }}
                                onClick={() => setFulfillModalPreOrder(pre)}
                                title="Thanh toán nốt số tiền còn lại và bàn giao hàng cho khách tại quầy"
                              >
                                <CreditCard size={12} />
                                <span>Bàn giao ({pre.remainingAmount.toLocaleString('vi-VN')} đ)</span>
                              </button>
                              <button
                                type="button"
                                style={{ height: 28, padding: '0 8px', fontSize: 11, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 500 }}
                                onClick={() => handleCancelPreOrder(pre)}
                                title="Hủy đơn đặt trước và hoàn lại tồn kho đã giữ"
                              >
                                <XCircle size={12} />
                                <span>Hủy</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TÁI SỬ DỤNG TABLEPAGINATION */}
              <TablePagination
                currentPage={preOrderPage}
                pageSize={preOrderPageSize}
                totalItems={filteredPreOrders.length}
                pageSizeOptions={[5, 10, 20]}
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

      {/* MODAL IN HÓA ĐƠN NHIỆT KHỔ K80 - CHUẨN POS MODAL */}
      {printingInvoice && (
        <div className="pos-modal-overlay" onClick={() => setPrintingInvoice(null)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-teal-700" />
                <h2 className="pos-modal-title">Xem Trước Hóa Đơn Khổ K80</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setPrintingInvoice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body">
              {/* KHỔ GIẤY IN NHIỆT K80 ĐỒNG BỘ Z-REPORT-PAPER */}
              <div className="pos-k80-paper">
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>
                  SIÊU THỊ TIỆN LỢI MT-GRMS
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                  18 Tràng Tiền, Hoàn Kiếm, Hà Nội<br />
                  Hotline: 1900 8888 &bull; MST: 0109988776
                </div>

                <div className="z-report-divider" />

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, margin: '4px 0' }}>
                  HÓA ĐƠN THANH TOÁN BÁN LẺ
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span>Số HD: <b>{printingInvoice.invoiceId}</b></span>
                  <span>{printingInvoice.createdAt}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span>Thu ngân: {printingInvoice.cashierName}</span>
                  <span>Quầy #01</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>Khách: {printingInvoice.customerName}</span>
                  <span>{printingInvoice.customerPhone || 'Khách lẻ'}</span>
                </div>

                <div className="z-report-divider" />

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '3px 0' }}>Mặt hàng</th>
                      <th style={{ textAlign: 'center', padding: '3px 0' }}>SL</th>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>Đ.Giá</th>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingInvoice.items.map((it) => (
                      <tr key={it.itemId}>
                        <td style={{ padding: '3px 0' }}>
                          {it.isGift ? `[Quà KM] ${it.productName}` : it.productName}
                        </td>
                        <td style={{ textAlign: 'center', padding: '3px 0' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '3px 0' }}>
                          {it.isGift ? '0' : it.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>
                          {it.isGift ? '0' : it.totalAmount.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="z-report-divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Tổng tiền hàng:</span>
                  <span>{printingInvoice.totalMerchandiseAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                {printingInvoice.appliedPromotionSummary && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#0f766e' }}>
                    <span>CTKM ({printingInvoice.appliedPromotionSummary}):</span>
                    <span>-{(printingInvoice.promotionDiscountAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {printingInvoice.appliedVoucherCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#4338ca' }}>
                    <span>Voucher ({printingInvoice.appliedVoucherCode}):</span>
                    <span>-{(printingInvoice.voucherDiscountAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {Boolean(printingInvoice.pointsRedeemed && printingInvoice.pointsRedeemed > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#047857' }}>
                    <span>Đổi điểm ({printingInvoice.pointsRedeemed} điểm):</span>
                    <span>-{(printingInvoice.pointsDiscountAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Tổng giảm giá:</span>
                  <span>-{printingInvoice.totalDiscount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>
                  <span>KHÁCH ĐÃ TRẢ:</span>
                  <span style={{ color: '#15803d' }}>{printingInvoice.finalPaidAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                {printingInvoice.debtAmount !== undefined && (
                  <div style={{ padding: '6px 8px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 4, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>Tiền nợ còn lại:</span>
                      <strong style={{ color: printingInvoice.debtAmount > 0 ? '#dc2626' : '#16a34a' }}>
                        {printingInvoice.debtAmount.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                      <span style={{ color: '#64748b' }}>Đã trả trước đó:</span>
                      <strong style={{ color: '#16a34a' }}>
                        {(printingInvoice.paidDebtAmount || 0).toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <span>Phương thức:</span>
                  <span>{printingInvoice.paymentMethodLabel}</span>
                </div>
                {printingInvoice.referenceCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span>Mã GD:</span>
                    <span>{printingInvoice.referenceCode}</span>
                  </div>
                )}

                <div className="z-report-divider" />

                <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 10 }}>
                  Cảm ơn Quý khách &amp; Hẹn gặp lại!<br />
                  (Hóa đơn điện tử khởi tạo từ máy tính tiền)
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setPrintingInvoice(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pos-btn-primary-pill"
                onClick={() => {
                  if (printingInvoice) {
                    posOrderApi.printDirect({
                      storeName: 'SIÊU THỊ MINI MT-GROCERY',
                      storeAddress: '123 Xuân Thủy, Cầu Giấy, Hà Nội',
                      storePhone: '0987.654.321',
                      orderCode: printingInvoice.invoiceId,
                      cashierName: printingInvoice.cashierName,
                      customer: { name: printingInvoice.customerName, phone: printingInvoice.customerPhone },
                      createdAt: printingInvoice.createdAt,
                      items: printingInvoice.items.map((it) => ({
                        name: it.productName,
                        quantity: it.quantity,
                        unitPrice: it.isGift ? 0 : it.unitPrice,
                        totalPrice: it.isGift ? 0 : it.totalAmount,
                        isGift: Boolean(it.isGift),
                      })),
                      totalItemAmount: printingInvoice.totalMerchandiseAmount,
                      orderDiscountAmount: printingInvoice.totalDiscount,
                      vatAmount: 0,
                      finalAmount: printingInvoice.finalPaidAmount,
                      cashTendered: printingInvoice.finalPaidAmount,
                    });
                  }
                  showToast('Đang gửi lệnh in hóa đơn K80 ra máy in nhiệt quầy...');
                }}
              >
                <Printer size={14} />
                <span>In Hóa Đơn (POS-58)</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL THU NỢ HÓA ĐƠN BÁN LẺ */}
      <CollectDebtModal
        isOpen={Boolean(collectDebtModalInvoice)}
        invoice={collectDebtModalInvoice}
        onClose={() => setCollectDebtModalInvoice(null)}
        onCollectDebt={handleCollectDebt}
      />

      {/* MODAL ĐỔI / TRẢ HÀNG */}
      <ReturnExchangeModal
        isOpen={Boolean(returnExchangeModalInvoice)}
        invoice={returnExchangeModalInvoice}
        availableProducts={exchangeBranchProducts.length > 0 ? exchangeBranchProducts : catalogProducts}
        currentDrawerCash={activeShiftCash}
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
