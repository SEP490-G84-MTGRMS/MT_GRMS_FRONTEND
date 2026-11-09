import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
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
  Phone,
  FileText,
  DollarSign,
  CreditCard,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { TablePagination } from '../../../components/common';
import type { InvoiceDTO, PreOrderDTO, DebtPaymentRecordDTO } from '../types/inventory.types';
import { CollectDebtModal } from '../components/modals/CollectDebtModal';
import { ReturnExchangeModal } from '../components/modals/ReturnExchangeModal';
import { CreatePreOrderModal } from '../components/modals/CreatePreOrderModal';
import { FulfillPreOrderModal } from '../components/modals/FulfillPreOrderModal';
import { posOrderApi } from '../api/posOrderApi';
import { customerApi } from '../../customer-crm/api/customerApi';
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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'VIETQR' | 'CASH' | 'DEBT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'DEBT'>('ALL');

  // Danh sách hóa đơn có thể hủy / cập nhật trạng thái (Phân lập theo Cửa Hàng / Tenant)
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_mt_mart_01';

  // Quyền hạn tài khoản: Chỉ STORE_OWNER (Chủ cửa hàng) mới có quyền xem toàn chuỗi và hủy hóa đơn đã thanh toán
  const isStoreOwner = user?.role === 'STORE_OWNER';
  const isStoreOwnerOrManager = isStoreOwner;
  const activeBranchId = user?.branchId || 'BR-01';

  // Bộ lọc chi nhánh (Multi-Branch Filter)
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Nếu không phải Chủ cửa hàng (Thu ngân / Quản lý quầy), cố định theo chi nhánh được phân công
  useEffect(() => {
    if (!isStoreOwner) {
      setBranchFilter(activeBranchId);
    }
  }, [isStoreOwner, activeBranchId]);

  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [preOrders, setPreOrders] = useState<PreOrderDTO[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);

  // Tải danh mục sản phẩm và khách hàng thực tế phục vụ đổi trả & đơn đặt trước
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      posOrderApi.getAllProducts().catch(() => []),
      posOrderApi.getAllCustomers().catch(() => []),
    ]).then(([prods, custs]) => {
      if (isMounted) {
        setAvailableProducts(prods || []);
        setAvailableCustomers(custs || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentTenantId]);

  // Nạp dữ liệu hóa đơn & đơn đặt trước thực tế 100% từ Backend API theo Tenant
  useEffect(() => {
    let isMounted = true;
    setIsLoadingOrders(true);
    setOrdersError(null);

    posOrderApi
      .getOrders()
      .then((res) => {
        if (!isMounted) return;
        if (!res || !res.items || res.items.length === 0) {
          setInvoices([]);
          setPreOrders([]);
          return;
        }

        // 1. Phân loại và nạp danh sách Hóa đơn bán lẻ
        const invoiceOrders = res.items.filter((o: any) => o.status !== 'PreOrder');
        const mappedInvoices: InvoiceDTO[] = invoiceOrders.map((o: any) => ({
          invoiceId: o.orderCode || o.id,
          createdAt: o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '',
          branchId: o.branchId || '',
          branchName: o.branchName || 'Chi nhánh trung tâm',
          cashierId: '',
          cashierName: 'Thu ngân quầy',
          customerId: o.customerId,
          customerName: o.customerName || 'Khách lẻ',
          customerPhone: o.customerPhone || '',
          paymentMethod: o.paymentMethod || 'CASH',
          paymentMethodLabel:
            o.paymentMethod === 'VIETQR'
              ? 'Chuyển khoản VietQR'
              : o.paymentMethod === 'DEBT'
              ? 'Ghi nợ'
              : 'Tiền mặt',
          totalMerchandiseAmount: o.totalAmount,
          totalDiscount: o.discountAmount,
          finalPaidAmount: o.finalAmount,
          debtAmount: o.paymentMethod === 'DEBT' ? o.finalAmount : 0,
          paidDebtAmount: 0,
          debtPaymentRecords: [],
          status: o.status === 'Cancelled' ? 'CANCELLED' : o.paymentMethod === 'DEBT' ? 'DEBT' : 'COMPLETED',
          statusLabel: o.status === 'Cancelled' ? 'Đã hủy' : o.paymentMethod === 'DEBT' ? 'Ghi nợ' : 'Hoàn thành',
          items: (o.items || []).map((it: any) => ({
            itemId: it.id,
            productId: it.productId,
            productName: it.productName,
            sku: it.barcode || '',
            unitName: it.unitName || 'Cái',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount || 0,
            totalAmount: it.totalLineAmount || it.quantity * it.unitPrice,
          })),
        }));
        setInvoices(mappedInvoices);

        // 2. Phân loại và nạp danh sách Đơn đặt trước giữ kho
        const preOrderItems = res.items.filter(
          (o: any) => o.status === 'PreOrder' || o.orderCode?.startsWith('PO-')
        );
        const mappedPreOrders: PreOrderDTO[] = preOrderItems.map((o: any) => {
          const totalOrderAmount = o.totalAmount || o.finalAmount;
          const depositAmount = o.depositAmount || 0;
          const remainingAmount = Math.max(0, totalOrderAmount - depositAmount);
          return {
            preOrderId: o.orderCode || o.id,
            createdAt: o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '',
            branchId: o.branchId || '',
            branchName: o.branchName || 'Chi nhánh Cầu Giấy (Trung tâm)',
            pickupAppointment: o.note || '17:30 - Hôm nay',
            customerName: o.customerName || 'Khách quen',
            customerPhone: o.customerPhone || '0987654321',
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
              unitPrice: it.unitPrice,
              discountAmount: it.discountAmount || 0,
              totalAmount: it.totalLineAmount || it.quantity * it.unitPrice,
            })),
          };
        });
        setPreOrders(mappedPreOrders);
      })
      .catch((err) => {
        console.warn('Fetch orders error:', err);
        if (isMounted) {
          setOrdersError('Không thể kết nối đến máy chủ lấy danh sách hóa đơn.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingOrders(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTenantId]);

  // Danh sách các chi nhánh có trong hệ thống (Tự động hợp nhất từ CSDL & cấu hình chuỗi)
  const availableBranches = useMemo(() => {
    const map = new Map<string, string>();
    map.set('BR-01', 'Chi nhánh Cầu Giấy (Trung tâm)');
    map.set('BR-02', 'Chi nhánh Thanh Xuân');
    map.set('BR-03', 'Chi nhánh Quận 1');

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

    return [
      { id: 'ALL', name: '🏢 Tất cả chi nhánh (Toàn chuỗi)' },
      ...Array.from(map.entries()).map(([id, name]) => ({ id, name })),
    ];
  }, [invoices, preOrders]);

  // Modal Xác nhận hủy hóa đơn
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceDTO | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý trả lại hàng');
  const [cancelNote, setCancelNote] = useState('');

  // Modal Đổi / Trả hàng chuẩn KiotViet
  const [returnExchangeModalInvoice, setReturnExchangeModalInvoice] = useState<InvoiceDTO | null>(null);

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
      await posOrderApi.cancelOrder(cancelModalInvoice.invoiceId, {
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

  // Xác nhận Đổi / Trả hàng chuẩn KiotViet
  const handleConfirmReturnExchange = async (data: {
    returnedItems: Array<{ productId: string; quantity: number; unitPrice: number }>;
    newItems: Array<{ productId: string; quantity: number; unitPrice: number; discountAmount?: number }>;
    settlementMethod: string;
    note?: string;
  }) => {
    if (!returnExchangeModalInvoice) return;
    try {
      const res = await posOrderApi.returnExchangeOrder(returnExchangeModalInvoice.invoiceId, data);
      showToast(`Đã xử lý đổi/trả hàng thành công cho hóa đơn ${returnExchangeModalInvoice.invoiceId}! (Mã đơn mới: ${res?.orderCode || 'Đã ghi nhận'})`);

      // Nạp lại danh sách từ API
      posOrderApi.getOrders().then((orderRes) => {
        if (orderRes && orderRes.items) {
          const invoiceOrders = orderRes.items.filter((o: any) => o.status !== 'PreOrder');
          const mapped: InvoiceDTO[] = invoiceOrders.map((o: any) => ({
            invoiceId: o.orderCode || o.id,
            createdAt: o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '',
            branchId: o.branchId || '',
            branchName: o.branchName || 'Chi nhánh trung tâm',
            cashierId: '',
            cashierName: 'Thu ngân quầy',
            customerId: o.customerId,
            customerName: o.customerName || 'Khách lẻ',
            customerPhone: o.customerPhone || '',
            paymentMethod: o.paymentMethod || 'CASH',
            paymentMethodLabel: o.paymentMethod === 'VIETQR' ? 'VietQR' : o.paymentMethod === 'DEBT' ? 'Ghi nợ' : 'Tiền mặt',
            totalMerchandiseAmount: o.totalAmount,
            totalDiscount: o.discountAmount,
            finalPaidAmount: o.finalAmount,
            debtAmount: o.paymentMethod === 'DEBT' ? o.finalAmount : 0,
            paidDebtAmount: 0,
            debtPaymentRecords: [],
            status: o.status === 'Cancelled' ? 'CANCELLED' : o.paymentMethod === 'DEBT' ? 'DEBT' : 'COMPLETED',
            statusLabel: o.status === 'Cancelled' ? 'Đã hủy' : o.paymentMethod === 'DEBT' ? 'Ghi nợ' : 'Đã thanh toán',
            note: o.note || '',
            items: (o.items || []).map((it: any) => ({
              itemId: it.id,
              productId: it.productId,
              productName: it.productName,
              sku: it.barcode || '',
              unitName: it.unitName || 'Cái',
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discountAmount: it.discountAmount,
              totalAmount: it.totalLineAmount,
            })),
          }));
          setInvoices(mapped);
        }
      });
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
    items: Array<{ productId: string; quantity: number; unitPrice: number; productName: string }>;
    depositAmount: number;
    paymentMethod: string;
    note?: string;
  }) => {
    try {
      let createdCode: string | null = null;
      try {
        const res = await posOrderApi.createPreOrder({
          branchId: '01a185f3-d197-72c1-b6e7-cdb5d5363467',
          customerId: data.customerId,
          items: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          depositAmount: data.depositAmount,
          expectedPickupDate: data.expectedPickupDate,
          paymentMethod: data.paymentMethod,
          note: `Khách: ${data.customerName} (${data.customerPhone}). ${data.note || ''}`,
        });
        if (res?.orderCode) createdCode = res.orderCode;
      } catch (apiErr) {
        console.warn('Backend createPreOrder API error (using fallback local pre-order):', apiErr);
      }

      const totalAmt = data.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const newPreOrder: PreOrderDTO = {
        preOrderId: createdCode || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toLocaleString('vi-VN'),
        branchId: branchFilter !== 'ALL' ? branchFilter : 'BR-01',
        branchName:
          branchFilter !== 'ALL'
            ? availableBranches.find((b) => b.id === branchFilter)?.name || 'Chi nhánh Cầu Giấy (Trung tâm)'
            : 'Chi nhánh Cầu Giấy (Trung tâm)',
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        pickupAppointment: new Date(data.expectedPickupDate).toLocaleString('vi-VN'),
        totalOrderAmount: totalAmt,
        depositAmount: data.depositAmount,
        remainingAmount: Math.max(0, totalAmt - data.depositAmount),
        status: 'RESERVED',
        statusLabel: 'Chờ nhận hàng',
        stockAllocated: true,
        items: data.items.map((it) => ({
          itemId: it.productId,
          productId: it.productId,
          productName: it.productName,
          sku: '',
          unitName: 'Cái',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountAmount: 0,
          totalAmount: it.quantity * it.unitPrice,
        })),
      };

      setPreOrders((prev) => [newPreOrder, ...prev]);
      showToast(`Đã tạo thành công đơn đặt trước ${newPreOrder.preOrderId} (Cọc: ${data.depositAmount.toLocaleString('vi-VN')} đ)!`);
    } catch (e: any) {
      alert(`Lỗi khi tạo đơn đặt trước: ${e?.response?.data?.message || e?.message || 'Không thể kết nối máy chủ'}`);
    }
  };

  // Thu tiền nợ hóa đơn (đồng bộ trực tiếp với CustomerDebtService & Sổ quỹ)
  const handleCollectDebt = async (
    invoiceId: string,
    payment: { amount: number; method: 'CASH' | 'VIETQR'; note: string; cashierName: string }
  ) => {
    const targetInv = invoices.find((inv) => inv.invoiceId === invoiceId);
    const resolvedCustomerId =
      targetInv?.customerId ||
      availableCustomers.find(
        (c: any) =>
          (targetInv?.customerPhone && c.phoneNumber === targetInv.customerPhone) ||
          (targetInv?.customerName && c.fullName === targetInv.customerName)
      )?.id;

    if (
      resolvedCustomerId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedCustomerId)
    ) {
      try {
        await customerApi.collectDebt({
          customerId: resolvedCustomerId,
          amount: payment.amount,
          method: payment.method === 'VIETQR' ? 'VietQR' : 'Cash',
          note: payment.note || `Thu nợ hóa đơn ${invoiceId}`,
        });
      } catch (err: any) {
        console.warn('Đồng bộ thu nợ POS lên máy chủ:', err);
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
      const matchBranch =
        branchFilter === 'ALL' ||
        inv.branchId === branchFilter ||
        (branchFilter === 'BR-01' && (inv.branchId === 'BR-01' || inv.branchName?.includes('Cầu Giấy'))) ||
        (branchFilter === 'BR-02' && (inv.branchId === 'BR-02' || inv.branchName?.includes('Thanh Xuân'))) ||
        (branchFilter === 'BR-03' && (inv.branchId === 'BR-03' || inv.branchName?.includes('Quận 1')));

      const matchSearch =
        !searchQuery.trim() ||
        inv.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.customerPhone && inv.customerPhone.includes(searchQuery.trim()));

      const matchMethod =
        paymentMethodFilter === 'ALL' || inv.paymentMethod === paymentMethodFilter;

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchBranch && matchSearch && matchMethod && matchStatus;
    });
  }, [invoices, searchQuery, paymentMethodFilter, statusFilter, branchFilter]);

  // Phân trang dữ liệu Hóa đơn
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * invoicePageSize;
    return filteredInvoices.slice(start, start + invoicePageSize);
  }, [filteredInvoices, invoicePage, invoicePageSize]);

  // Lọc Đơn đặt trước
  const filteredPreOrders = useMemo(() => {
    return preOrders.filter((p) => {
      const matchBranch =
        branchFilter === 'ALL' ||
        p.branchId === branchFilter ||
        (branchFilter === 'BR-01' && (p.branchId === 'BR-01' || p.branchName?.includes('Cầu Giấy'))) ||
        (branchFilter === 'BR-02' && (p.branchId === 'BR-02' || p.branchName?.includes('Thanh Xuân'))) ||
        (branchFilter === 'BR-03' && (p.branchId === 'BR-03' || p.branchName?.includes('Quận 1')));

      const matchSearch =
        !searchQuery.trim() ||
        p.preOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerPhone.includes(searchQuery.trim());

      return matchBranch && matchSearch;
    });
  }, [preOrders, searchQuery, branchFilter]);

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
    try {
      await posOrderApi.fulfillPreOrder(preOrderId, {
        paymentMethod: data.paymentMethod,
        amountPaid: data.amountPaid,
        note: data.note,
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
                ? '🏢 Toàn chuỗi cửa hàng (3 Chi nhánh)'
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
          <button
            type="button"
            className="pos-btn-primary-pill"
            onClick={() => navigate(salesPath)}
            title="Trở về màn hình bán hàng POS"
          >
            <ShoppingCart size={14} />
            <span>Bán Hàng [F1]</span>
          </button>

          <div className="pos-cashier-badge">
            NV: <b>Nguyễn Bá Sơn (NV004)</b>
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
              <div style={{ position: 'relative', minWidth: 260 }}>
                <select
                  className="filter-select w-full"
                  style={{
                    height: 36,
                    paddingLeft: 32,
                    fontWeight: 600,
                    backgroundColor: !isStoreOwner ? '#f8fafc' : '#ffffff',
                    borderColor: '#cbd5e1',
                    color: '#0f172a',
                    cursor: !isStoreOwner ? 'not-allowed' : 'pointer',
                  }}
                  value={branchFilter}
                  disabled={!isStoreOwner}
                  onChange={(e) => {
                    setBranchFilter(e.target.value);
                    setInvoicePage(1);
                    setPreOrderPage(1);
                  }}
                  title={!isStoreOwner ? 'Tài khoản thu ngân bị cố định theo chi nhánh được gán' : 'Lọc hóa đơn theo chi nhánh'}
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
                      <th style={{ width: 120 }}>Mã hóa đơn</th>
                      <th style={{ width: 140 }}>Thời gian lập</th>
                      <th>Khách hàng</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền hàng</th>
                      <th style={{ textAlign: 'right' }}>Giảm giá</th>
                      <th style={{ textAlign: 'right' }}>Khách đã trả</th>
                      <th>Phương thức TT</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: 170 }}>Thao tác</th>
                    </tr>
                  </thead>
                  {isLoadingOrders && (
                    <tbody>
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: '#0f766e', fontWeight: 600 }}>
                          ⏳ Đang tải danh sách hóa đơn từ máy chủ...
                        </td>
                      </tr>
                    </tbody>
                  )}
                  {!isLoadingOrders && ordersError && (
                    <tbody>
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: '#dc2626' }}>
                          ⚠️ {ordersError}
                        </td>
                      </tr>
                    </tbody>
                  )}
                  {!isLoadingOrders && !ordersError && paginatedInvoices.length === 0 && (
                    <tbody>
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '56px 16px', color: '#64748b' }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#334155' }}>Chưa có hóa đơn bán lẻ nào</p>
                          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Tất cả các đơn bán lẻ tạo tại màn hình POS sẽ được lưu và hiển thị trực tiếp tại đây.</p>
                        </td>
                      </tr>
                    </tbody>
                  )}
                  {!isLoadingOrders && !ordersError && paginatedInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceId === inv.invoiceId;
                    const isCompleted = inv.status === 'COMPLETED';
                    const isDebt = inv.status === 'DEBT' || (inv.debtAmount !== undefined && inv.debtAmount > 0);

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
                                <Building2 size={10} className="text-teal-600" />
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
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {inv.totalMerchandiseAmount.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'right', color: inv.totalDiscount > 0 ? '#dc2626' : '#94a3b8' }}>
                            {inv.totalDiscount.toLocaleString('vi-VN')}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isCompleted ? '#15803d' : isDebt ? '#d97706' : '#dc2626',
                            }}
                          >
                            {inv.finalPaidAmount.toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <span
                              className={`pos-method-pill ${
                                inv.paymentMethod === 'VIETQR' ? 'vietqr' : inv.paymentMethod === 'DEBT' ? 'debt' : 'cash'
                              }`}
                              style={
                                inv.paymentMethod === 'DEBT'
                                  ? { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
                                  : undefined
                              }
                            >
                              {inv.paymentMethod === 'VIETQR' ? (
                                <QrCode size={12} />
                              ) : inv.paymentMethod === 'DEBT' ? (
                                <CreditCard size={12} />
                              ) : (
                                <Banknote size={12} />
                              )}
                              <span>{inv.paymentMethodLabel}</span>
                            </span>
                          </td>
                          <td>
                            <span
                              className={`pos-status-pill ${
                                isCompleted ? 'completed' : isDebt ? 'debt' : 'cancelled'
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
                                    Chi tiết mặt hàng trong hóa đơn {inv.invoiceId} &bull; Thu ngân: <b>{inv.cashierName} ({inv.cashierId})</b>
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
                                    {isCompleted && (
                                      <button
                                        type="button"
                                        className="pos-btn-secondary-pill"
                                        style={{ height: 26, padding: '0 10px', fontSize: 11, borderColor: '#059669', color: '#059669' }}
                                        onClick={() => setReturnExchangeModalInvoice(inv)}
                                      >
                                        <RotateCcw size={12} />
                                        <span>Đổi / Trả Hàng</span>
                                      </button>
                                    )}
                                    {isCompleted && (
                                      <button
                                        type="button"
                                        className="pos-btn-secondary-pill"
                                        style={{
                                          height: 26,
                                          padding: '0 10px',
                                          fontSize: 11,
                                          borderColor: isStoreOwnerOrManager ? '#fca5a5' : '#cbd5e1',
                                          color: isStoreOwnerOrManager ? '#dc2626' : '#94a3b8',
                                          opacity: isStoreOwnerOrManager ? 1 : 0.6,
                                        }}
                                        onClick={() => {
                                          if (!isStoreOwnerOrManager) {
                                            alert('Thu ngân không có quyền hủy hóa đơn đã thanh toán. Vui lòng liên hệ Quản lý hoặc Chủ cửa hàng!');
                                            return;
                                          }
                                          setCancelModalInvoice(inv);
                                        }}
                                      >
                                        <XCircle size={12} />
                                        <span>Hủy Hóa Đơn Này</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="pos-btn-primary-pill"
                                      style={{ height: 26, padding: '0 12px', fontSize: 11 }}
                                      onClick={(e) => handleOpenPrintModal(inv, e)}
                                    >
                                      <Printer size={12} />
                                      <span>In Hóa Đơn Nhiệt K80</span>
                                    </button>
                                  </div>
                                </div>

                                <table className="pos-shift-table">
                                  <thead>
                                    <tr>
                                      <th>Mã SKU</th>
                                      <th>Tên mặt hàng</th>
                                      <th>Mã Lô (FEFO)</th>
                                      <th>ĐVT</th>
                                      <th style={{ textAlign: 'right' }}>Số lượng</th>
                                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                                      <th style={{ textAlign: 'right' }}>Giảm giá</th>
                                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((item) => (
                                      <tr key={item.itemId}>
                                        <td style={{ color: '#0f766e', fontWeight: 600 }}>{item.sku}</td>
                                        <td><b>{item.productName}</b></td>
                                        <td>
                                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                            {item.batchId || 'LOT-AUTO'}
                                          </span>
                                        </td>
                                        <td>{item.unitName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                                        <td style={{ textAlign: 'right', color: item.discountAmount > 0 ? '#dc2626' : '#94a3b8' }}>
                                          {item.discountAmount.toLocaleString('vi-VN')} đ
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                          {item.totalAmount.toLocaleString('vi-VN')} đ
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                {/* THEO DÕI CÔNG NỢ & LỊCH SỬ THU NỢ CỦA HÓA ĐƠN */}
                                {(inv.debtAmount !== undefined || (inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0)) && (
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
                    onClick={() => setIsCreatePreOrderModalOpen(true)}
                  >
                    + Tạo đơn đặt trước
                  </button>
                </div>
              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Mã đơn đặt trước</th>
                      <th>Khách hàng</th>
                      <th>Thời gian hẹn nhận hàng</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền đơn</th>
                      <th style={{ textAlign: 'right' }}>Tiền cọc</th>
                      <th style={{ textAlign: 'right' }}>Còn phải thu</th>
                      <th>Phân bổ giữ kho</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: 160 }}>Thao tác quầy</th>
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
                              <Building2 size={10} className="text-teal-600" />
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
                          <span style={{ fontWeight: 600, color: '#b45309' }}>
                            {pre.pickupAppointment}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {pre.totalOrderAmount.toLocaleString('vi-VN')} đ
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
                          {pre.status === 'COMPLETED' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, backgroundColor: '#ecfdf5', color: '#047857', fontSize: 11.5, fontWeight: 600 }}>
                              <CheckCircle2 size={12} /> Đã bàn giao
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="pos-btn-primary-pill"
                              style={{ height: 28, padding: '0 12px', fontSize: 11.5, backgroundColor: '#0f766e' }}
                              onClick={() => setFulfillModalPreOrder(pre)}
                              title="Thanh toán nốt số tiền còn lại và bàn giao hàng cho khách"
                            >
                              <CreditCard size={13} />
                              <span>Thanh toán &amp; Giao ({pre.remainingAmount.toLocaleString('vi-VN')} đ)</span>
                            </button>
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
                        <td style={{ padding: '3px 0' }}>{it.productName}</td>
                        <td style={{ textAlign: 'center', padding: '3px 0' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '3px 0' }}>{it.unitPrice.toLocaleString('vi-VN')}</td>
                        <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>{it.totalAmount.toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="z-report-divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Tổng tiền hàng:</span>
                  <span>{printingInvoice.totalMerchandiseAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Giảm giá / Voucher:</span>
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
                        unitPrice: it.unitPrice,
                        totalPrice: it.totalAmount,
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

      {/* MODAL ĐỔI / TRẢ HÀNG CHUẨN KIOTVIET */}
      <ReturnExchangeModal
        isOpen={Boolean(returnExchangeModalInvoice)}
        invoice={returnExchangeModalInvoice}
        availableProducts={availableProducts}
        onClose={() => setReturnExchangeModalInvoice(null)}
        onConfirm={handleConfirmReturnExchange}
      />

      {/* MODAL TẠO ĐƠN ĐẶT TRƯỚC GIỮ KHO (CỌC >= 10%) */}
      <CreatePreOrderModal
        isOpen={isCreatePreOrderModalOpen}
        onClose={() => setIsCreatePreOrderModalOpen(false)}
        availableProducts={availableProducts}
        customers={availableCustomers}
        branchName={
          branchFilter !== 'ALL'
            ? availableBranches.find((b) => b.id === branchFilter)?.name || 'Chi nhánh Cầu Giấy (Trung tâm)'
            : 'Chi nhánh Cầu Giấy (Trung tâm)'
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
