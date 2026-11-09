import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { OrderTab, CartItem, Product, Customer, ReceiptData } from '../types/pos.types';
import {
  initialCategories,
  createInitialCartItem,
} from '../mock/posMockData';
import { PosHeader } from '../components/PosHeader';
import { PosCartTable } from '../components/PosCartTable';
import { PosPaymentPanel } from '../components/PosPaymentPanel';
import { PosCatalogModal } from '../components/modals/PosCatalogModal';
import { AddCustomerModal } from '../components/modals/AddCustomerModal';
import { VietQrModal } from '../components/modals/VietQrModal';
import { BelowCostWarningModal } from '../components/modals/BelowCostWarningModal';
import { DebtLimitWarningModal } from '../components/modals/DebtLimitWarningModal';
import { OrderDiscountModal } from '../components/modals/OrderDiscountModal';
import { PosReceiptModal } from '../components/PosReceiptModal';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';
import { posOrderApi } from '../api/posOrderApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';

const getInitialTabs = (tenantId: string): OrderTab[] => {
  try {
    const key = `mtgrms_pos_tabs_${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load saved tabs from localStorage:', err);
  }
  return [
    {
      id: 1,
      name: 'Hóa đơn 1',
      cart: [],
      customer: null,
      orderDiscountPercent: 0,
      couponCode: '',
      couponDiscount: 0,
      usePoints: false,
      note: '',
      paymentMethod: 'cash',
      cashTendered: 0,
      createdAt: new Date().toISOString(),
    },
  ];
};

const getInitialActiveTabId = (tenantId: string, initialTabs: OrderTab[]): number => {
  try {
    const key = `mtgrms_pos_active_tab_${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (initialTabs.some((t) => t.id === parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return initialTabs[0]?.id || 1;
};

export const PosCheckoutPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_mt_mart_01';

  // Kho sản phẩm & danh sách khách hàng (Cách ly theo từng Cửa Hàng / Tenant)
  // Kho sản phẩm & danh sách khách hàng thực tế từ Backend CSDL (PostgreSQL)
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingBackendData, setIsLoadingBackendData] = useState<boolean>(true);
  const [backendLoadError, setBackendLoadError] = useState<string | null>(null);

  // Tab Đa đơn hàng (Multi-tab orders) được lưu trữ riêng biệt theo từng TenantId
  const [tabs, setTabs] = useState<OrderTab[]>(() => getInitialTabs(currentTenantId));
  const [activeTabId, setActiveTabId] = useState<number>(() => getInitialActiveTabId(currentTenantId, tabs));
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Khi chuyển đổi tài khoản (TenantId thay đổi) -> reset tabs
  useEffect(() => {
    const freshTabs = getInitialTabs(currentTenantId);
    setTabs(freshTabs);
    setActiveTabId(getInitialActiveTabId(currentTenantId, freshTabs));
  }, [currentTenantId]);

  // Tự động đồng bộ giỏ hàng và các hóa đơn vào localStorage theo TenantId
  useEffect(() => {
    try {
      localStorage.setItem(`mtgrms_pos_tabs_${currentTenantId}`, JSON.stringify(tabs));
    } catch (e) {
      console.warn('Failed to save POS tabs state:', e);
    }
  }, [tabs, currentTenantId]);

  useEffect(() => {
    try {
      localStorage.setItem(`mtgrms_pos_active_tab_${currentTenantId}`, activeTabId.toString());
    } catch (e) {
      console.warn('Failed to save POS active tab state:', e);
    }
  }, [activeTabId, currentTenantId]);

  // Chế độ bán hàng (fast vs normal) & Modal danh mục sản phẩm cảm ứng (F3)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isVietQrOpen, setIsVietQrOpen] = useState(false);
  const [belowCostWarningItem, setBelowCostWarningItem] = useState<CartItem | null>(null);
  const [isDebtWarningOpen, setIsDebtWarningOpen] = useState(false);
  const [isOrderDiscountOpen, setIsOrderDiscountOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Tab hiện tại
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Nạp dữ liệu thực tế 100% từ Backend CSDL (PostgreSQL) theo Tenant hiện tại
  useEffect(() => {
    let isMounted = true;
    const fetchBackendData = async () => {
      setIsLoadingBackendData(true);
      setBackendLoadError(null);
      try {
        const [apiProducts, apiCustomers] = await Promise.all([
          posOrderApi.getAllProducts(),
          posOrderApi.getAllCustomers(),
        ]);

        if (isMounted) {
          setProducts(apiProducts || []);
          setCustomers(apiCustomers || []);
        }
      } catch (err) {
        console.warn('Backend load failed:', err);
        if (isMounted) {
          setBackendLoadError('Không thể kết nối đến máy chủ Backend để nạp danh mục hàng hóa.');
          showToast('Không thể kết nối máy chủ để nạp hàng hóa POS', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingBackendData(false);
        }
      }
    };

    fetchBackendData();
    return () => {
      isMounted = false;
    };
  }, [currentTenantId]);

  // Helper cập nhật Tab hiện tại
  const updateCurrentTab = (updater: Partial<OrderTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updater } : tab))
    );
  };

  // Keyboard Shortcuts: F1, F2, F3, F4, F8, ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleAddTab();
      } else if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('product_search');
        searchInput?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsCatalogModalOpen((prev) => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        const custSearch = document.getElementById('customer_search');
        custSearch?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        updateCurrentTab({ paymentMethod: 'cash' });
      } else if (e.key === 'Escape') {
        setIsCatalogModalOpen(false);
        setIsAddCustomerOpen(false);
        setIsVietQrOpen(false);
        setBelowCostWarningItem(null);
        setIsOrderDiscountOpen(false);
        setIsReceiptModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId]);

  // Hook lắng nghe máy quét mã vạch USB HID phần cứng
  useBarcodeScanner({
    onScan: async (barcode) => {
      const code = barcode.trim().toLowerCase();
      // 1. Tìm trong danh sách sản phẩm hiện tại
      const found = products.find(
        (p) =>
          p.barcode?.toLowerCase() === code ||
          p.sku?.toLowerCase() === code
      );

      if (found) {
        handleAddToCart(found);
      } else {
        // 2. Tra cứu API backend
        try {
          const apiProduct = await posOrderApi.getProductByBarcode(barcode);
          if (apiProduct) {
            const newProd: Product = {
              id: apiProduct.id,
              sku: apiProduct.sku || apiProduct.productCode || barcode,
              barcode: apiProduct.barcode || barcode,
              name: apiProduct.productName || apiProduct.name,
              category: 'Tạp hóa / Siêu thị',
              baseUnit: apiProduct.unitName || apiProduct.baseUnit || 'Cái',
              basePrice: apiProduct.basePrice || apiProduct.sellingPrice || 0,
              costPrice: apiProduct.costPrice || 0,
              quantityOnHand: 999,
              batchCode: 'LÔ-FEFO',
            };
            setProducts((prev) => [...prev, newProd]);
            handleAddToCart(newProd);
          }
        } catch {
          alert(`Không tìm thấy sản phẩm với mã vạch "${barcode}". Vui lòng kiểm tra lại danh mục hàng hóa!`);
        }
      }
    },
  });

  // Tab management
  const handleAddTab = () => {
    const newId = (tabs[tabs.length - 1]?.id || 0) + 1;
    const newTab: OrderTab = {
      id: newId,
      name: `Hóa đơn ${newId}`,
      cart: [],
      customer: null,
      orderDiscountPercent: 0,
      couponCode: '',
      couponDiscount: 0,
      usePoints: false,
      note: '',
      paymentMethod: 'cash',
      cashTendered: 0,
      createdAt: new Date().toISOString(),
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: number) => {
    if (tabs.length <= 1) {
      if (currentTab.cart.length > 0) {
        if (confirm('Bạn có muốn làm mới và xóa toàn bộ mặt hàng trong đơn này không?')) {
          updateCurrentTab({
            cart: [],
            customer: null,
            orderDiscountPercent: 0,
            couponCode: '',
            note: '',
            cashTendered: 0,
          });
        }
      }
      return;
    }
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    const existingIndex = currentTab.cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updatedCart = [...currentTab.cart];
      const target = updatedCart[existingIndex];
      const newQty = target.quantity + 1;
      updatedCart[existingIndex] = {
        ...target,
        quantity: newQty,
        totalAmount: target.actualPrice * newQty,
      };
      updateCurrentTab({ cart: updatedCart });
    } else {
      const newItem = createInitialCartItem(product, 1, 0);
      updateCurrentTab({ cart: [...currentTab.cart, newItem] });
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    const updatedCart = currentTab.cart.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          totalAmount: item.actualPrice * quantity,
        };
      }
      return item;
    });
    updateCurrentTab({ cart: updatedCart });
  };

  const handleRemoveItem = (id: string) => {
    const updatedCart = currentTab.cart.filter((item) => item.id !== id);
    updateCurrentTab({ cart: updatedCart });
  };

  const handleUpdateItemDiscount = (id: string, discount: number, type: 'vnd' | 'percent') => {
    const updatedCart = currentTab.cart.map((item) => {
      if (item.id === id) {
        const discountVnd =
          type === 'vnd' ? discount : Math.round((item.unitPrice * discount) / 100);
        const actualPrice = Math.max(0, item.unitPrice - discountVnd);
        return {
          ...item,
          discountPerItem: discount,
          discountType: type,
          actualPrice,
          totalAmount: actualPrice * item.quantity,
        };
      }
      return item;
    });
    updateCurrentTab({ cart: updatedCart });
  };

  // Barcode search submit
  const handleBarcodeSubmit = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toLowerCase();

    // 1. Kiểm tra chính xác Barcode hoặc SKU
    const exactMatch = products.find(
      (p) => p.barcode.toLowerCase() === query || p.sku.toLowerCase() === query
    );
    if (exactMatch) {
      handleAddToCart(exactMatch);
      setSearchQuery('');
      return;
    }

    // 2. Tìm danh sách sản phẩm khớp tên
    const matches = products.filter((p) => p.name.toLowerCase().includes(query));
    if (matches.length === 1) {
      handleAddToCart(matches[0]);
      setSearchQuery('');
      return;
    }

    // 3. Nếu có nhiều hơn 1 sản phẩm khớp (như gõ 'nước mắm'), KHÔNG tự tiện chọn món đầu,
    // giữ nguyên để người dùng chọn từ dropdown gợi ý
    if (matches.length > 1) {
      return;
    }

    // 4. Nếu không tìm thấy
    alert(`Không tìm thấy sản phẩm nào khớp với từ khóa "${searchQuery}". Vui lòng thử lại với tên hoặc mã vạch khác!`);
  };

  // Tổng hợp tiền
  const totalItemAmount = currentTab.cart.reduce((sum, item) => sum + item.totalAmount, 0);
  const orderDiscountAmount = Math.round((totalItemAmount * currentTab.orderDiscountPercent) / 100);
  const couponDiscountAmount = currentTab.couponCode.trim().toUpperCase() === 'VIP10' ? 20000 : 0;
  const subTotalBeforePoints = Math.max(0, totalItemAmount - orderDiscountAmount - couponDiscountAmount);
  const maxPointAmount = currentTab.customer
    ? Math.min(currentTab.customer.loyaltyPoints * 100, subTotalBeforePoints)
    : 0;
  const pointsDeduction = currentTab.usePoints && currentTab.customer ? maxPointAmount : 0;
  const finalAmount = Math.max(0, subTotalBeforePoints - pointsDeduction);

  // Tạo dữ liệu hóa đơn in POS-58
  const buildReceiptData = (debtNote?: string): ReceiptData => {
    const vat = Math.round(finalAmount * 0.01); // VAT 1% siêu thị mini / tạp hóa
    const totalWithVat = finalAmount + vat;

    let paymentMethodText = 'Tiền mặt';
    if (currentTab.paymentMethod === 'vietqr') {
      paymentMethodText = 'Chuyển khoản VietQR';
    } else if (currentTab.paymentMethod === 'debt') {
      paymentMethodText = 'Ghi nợ (Bán nợ)';
    }

    return {
      storeName: user?.tenantName ? user.tenantName.toUpperCase() : 'SIÊU THỊ MINI MT-GROCERY',
      storeAddress: '123 Xuân Thủy, Cầu Giấy, Hà Nội',
      storePhone: '0987.654.321',
      hotline: '1900 6868',
      orderCode: `HD${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toLocaleString('vi-VN'),
      cashierName: user?.fullName || 'Thu ngân POS',
      posMachine: 'POS#01',
      branchName: 'Chi nhánh Cầu Giấy',
      customer: currentTab.customer
        ? {
            name: currentTab.customer.name,
            phone: currentTab.customer.phone,
            address: currentTab.customer.address,
          }
        : null,
      items: currentTab.cart.map((c, i) => ({
        stt: i + 1,
        name: c.product.name,
        unitPrice: c.actualPrice,
        batchCode: c.product.batchCode || 'LÔ-FEFO',
        quantity: c.quantity,
        totalAmount: c.totalAmount,
      })),
      totalItemAmount,
      orderDiscountAmount,
      pointsDiscountAmount: pointsDeduction,
      vatAmount: vat,
      finalAmount: totalWithVat,
      finalAmountInWords: '',
      paymentMethodText,
      debtAmount: currentTab.paymentMethod === 'debt' ? totalWithVat : undefined,
      debtNote,
      earnedPoints: Math.floor(finalAmount / 10000), // 10k = 1 điểm
    };
  };

  const executeCompleteCheckout = async (debtNote?: string, managerBypass = false) => {
    let createdOrderId: string | undefined;
    let createdOrderCode: string | undefined;

    try {
      const isDebt = currentTab.paymentMethod === 'debt';
      const isBank = currentTab.paymentMethod === 'vietqr';
      const paymentMethod = isDebt ? 'CREDIT' : isBank ? 'BANK' : 'CASH';

      const branchId = '01a185f3-d197-72c1-b6e7-cdb5d5363467';
      const items = currentTab.cart.map((c) => ({
        productId: c.product.id || 'aaaaaaaa-1111-1111-1111-111111111111',
        productName: c.product.name,
        unitPrice: c.actualPrice,
        quantity: c.quantity,
        discountAmount: Math.max(0, (c.unitPrice - c.actualPrice) * c.quantity),
      }));

      const backendOrder = await posOrderApi.createOrder({
        branchId,
        customerId: currentTab.customer?.id || null,
        paymentMethod,
        cashTendered: currentTab.paymentMethod === 'cash' ? currentTab.cashTendered : undefined,
        discountAmount: orderDiscountAmount + couponDiscountAmount + pointsDeduction,
        items,
        managerBypassCode: managerBypass ? 'MGR-BYPASS-2026' : undefined,
        note: currentTab.note || debtNote || undefined,
        creatorRole: user?.role,
      });

      createdOrderId = backendOrder.id;
      createdOrderCode = backendOrder.orderCode;

      if (isDebt && currentTab.customer) {
        const addedDebt = backendOrder.finalAmount;
        const updatedDebt = currentTab.customer.currentDebt + addedDebt;
        const updatedCustomer = { ...currentTab.customer, currentDebt: updatedDebt };

        setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
        updateCurrentTab({ customer: updatedCustomer });
      }

      const receipt = buildReceiptData(debtNote);
      if (createdOrderId) {
        receipt.orderId = createdOrderId;
      }
      if (createdOrderCode) {
        receipt.orderCode = createdOrderCode;
      }
      setReceiptData(receipt);

      // In trực tiếp 1-click tới máy in POS-58
      posOrderApi.printDirect(receipt).then((res) => {
        if (res.success) {
          showToast(`✅ Đã thanh toán đơn ${receipt.orderCode} & in trực tiếp ra máy in POS-58!`);
        } else {
          showToast(`⚠️ ${res.message}`, 'error');
        }
      });

      setIsReceiptModalOpen(true);
    } catch (apiErr: unknown) {
      console.warn('Backend createOrder error:', apiErr);
      const axiosErr = apiErr as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const errMsg = axiosErr.response?.data?.message || axiosErr.message || String(apiErr);
      if (
        errMsg.includes('CREDIT_LIMIT_EXCEEDED') ||
        errMsg.includes('DEBT_OVERDUE_BLOCKED') ||
        errMsg.includes('hạn mức tín dụng') ||
        errMsg.includes('quá hạn')
      ) {
        setIsDebtWarningOpen(true);
      } else if (errMsg && errMsg.includes('tồn kho')) {
        alert(`Cảnh báo kho: ${errMsg}`);
      } else {
        alert('Lỗi tạo đơn hàng: ' + errMsg);
      }
    }
  };

  const handleCheckoutSubmit = () => {
    if (currentTab.cart.length === 0) {
      alert('Giỏ hàng đang trống! Vui lòng thêm sản phẩm trước khi thanh toán.');
      return;
    }

    if (currentTab.paymentMethod === 'cash' && currentTab.cashTendered < finalAmount) {
      alert(
        `Tiền khách đưa (${currentTab.cashTendered.toLocaleString(
          'vi-VN'
        )} đ) không đủ để thanh toán số tiền cần trả (${finalAmount.toLocaleString('vi-VN')} đ)!`
      );
      return;
    }

    if (currentTab.paymentMethod === 'debt') {
      if (!currentTab.customer) {
        alert('⚠️ Vui lòng tìm và chọn khách hàng định danh trước khi thực hiện bán nợ!');
        return;
      }
    }

    executeCompleteCheckout();
  };

  const handleHoldOrder = () => {
    if (currentTab.cart.length === 0) {
      alert('Không có món hàng nào trong đơn để giữ!');
      return;
    }
    alert(`Đơn hàng "${currentTab.name}" đã được lưu vào bộ nhớ tạm (Recall).`);
  };

  const handlePrintRecent = () => {
    if (receiptData) {
      setIsReceiptModalOpen(true);
    } else {
      const demoReceipt = buildReceiptData();
      setReceiptData(demoReceipt);
      setIsReceiptModalOpen(true);
    }
  };

  return (
    <div className="pos-page-wrapper">
      {/* 1. Header Toolbar */}
      <PosHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBarcodeSubmit={handleBarcodeSubmit}
        products={products}
        onSelectProduct={handleAddToCart}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
        salesMode={isCatalogModalOpen ? 'normal' : 'fast'}
        onToggleSalesMode={(mode) => setIsCatalogModalOpen(mode === 'normal')}
        onHoldOrder={handleHoldOrder}
        onPrintRecent={handlePrintRecent}
        onCloseShift={() => {
          const isEmployee = location.pathname.startsWith('/employee/pos');
          navigate(isEmployee ? '/employee/pos/shift' : '/pos/shift');
        }}
      />

      {/* Trạng thái lỗi kết nối Backend */}
      {backendLoadError && (
        <div style={{
          margin: '8px 16px 0 16px',
          padding: '10px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          fontSize: 13,
          color: '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>⚠️ {backendLoadError}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            Tải lại
          </button>
        </div>
      )}

      {/* Trạng thái kho hàng rỗng (Empty state) */}
      {!isLoadingBackendData && !backendLoadError && products.length === 0 && (
        <div style={{
          margin: '8px 16px 0 16px',
          padding: '8px 14px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 6,
          fontSize: 12.5,
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>
            🏪 <b>{user?.tenantName || 'Cửa hàng của bạn'}</b>: Kho hàng thực tế từ hệ thống hiện chưa có sản phẩm nào. Vui lòng vào mục Quản lý Hàng hóa để nhập sản phẩm.
          </span>
          <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 600 }}>
            🔒 Dữ liệu thực từ CSDL Backend
          </span>
        </div>
      )}

      {/* 2. Main Body Split */}
      <div className="pos-main-body">
        {/* Cột trái: Giỏ hàng + Catalog */}
        <div className="pos-left-column">
          <PosCartTable
            cart={currentTab.cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onOpenBelowCostWarning={(item) => setBelowCostWarningItem(item)}
            onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
            orderNote={currentTab.note}
            onOrderNoteChange={(note) => updateCurrentTab({ note })}
          />
        </div>

        {/* Cột phải: Khách hàng & Thanh toán */}
        <div className="pos-right-column">
          <PosPaymentPanel
            customer={currentTab.customer}
            onSelectCustomer={(cust) => updateCurrentTab({ customer: cust })}
            onOpenAddCustomerModal={() => setIsAddCustomerOpen(true)}
            totalItemAmount={totalItemAmount}
            orderDiscountPercent={currentTab.orderDiscountPercent}
            onOpenOrderDiscountModal={() => setIsOrderDiscountOpen(true)}
            couponCode={currentTab.couponCode}
            onCouponCodeChange={(code) => updateCurrentTab({ couponCode: code })}
            usePoints={currentTab.usePoints}
            onToggleUsePoints={(use) => updateCurrentTab({ usePoints: use })}
            paymentMethod={currentTab.paymentMethod}
            onPaymentMethodChange={(pm) => updateCurrentTab({ paymentMethod: pm })}
            cashTendered={currentTab.cashTendered}
            onCashTenderedChange={(val) => updateCurrentTab({ cashTendered: val })}
            onOpenVietQrModal={() => setIsVietQrOpen(true)}
            onSubmitCheckout={handleCheckoutSubmit}
            customerSearchList={customers}
          />
        </div>
      </div>

      {/* 3. Các Modals Nghiệp Vụ */}
      <PosCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        products={products}
        categories={initialCategories}
        onAddToCart={handleAddToCart}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSave={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          updateCurrentTab({ customer: newCust });
        }}
      />

      <VietQrModal
        isOpen={isVietQrOpen}
        orderCode={`HD${Math.floor(100000 + Math.random() * 900000)}`}
        amount={finalAmount}
        onClose={() => setIsVietQrOpen(false)}
        onConfirmAndPrint={() => {
          setIsVietQrOpen(false);
          executeCompleteCheckout();
        }}
      />

      
      <BelowCostWarningModal
        isOpen={Boolean(belowCostWarningItem)}
        item={belowCostWarningItem}
        onClose={() => setBelowCostWarningItem(null)}
        onApprove={(itemId) => {
          const updated = currentTab.cart.map((item) =>
            item.id === itemId ? { ...item, isBelowCostApproved: true } : item
          );
          updateCurrentTab({ cart: updated });
          alert('Quản lý đã phê duyệt thành công xuất đơn dưới giá vốn!');
        }}
      />

      <OrderDiscountModal
        isOpen={isOrderDiscountOpen}
        totalItemAmount={totalItemAmount}
        currentDiscountPercent={currentTab.orderDiscountPercent}
        onClose={() => setIsOrderDiscountOpen(false)}
        onApply={(percent) => updateCurrentTab({ orderDiscountPercent: percent })}
      />

      <DebtLimitWarningModal
        isOpen={isDebtWarningOpen}
        customer={currentTab.customer}
        orderAmount={finalAmount + Math.round(finalAmount * 0.01)}
        onClose={() => setIsDebtWarningOpen(false)}
        onApprove={(note) => {
setIsDebtWarningOpen(false);
          executeCompleteCheckout(note, true);
        }}
      />

      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        receiptData={receiptData}
        onClose={() => {
          setIsReceiptModalOpen(false);
          // Tự động làm mới giỏ hàng để phục vụ đơn hàng tiếp theo
          updateCurrentTab({
            cart: [],
            customer: null,
            orderDiscountPercent: 0,
            couponCode: '',
            usePoints: false,
            note: '',
            cashTendered: 0,
          });
        }}
      />

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 500,
            background:
              toastMessage.type === 'success'
                ? '#0f766e'
                : toastMessage.type === 'error'
                ? '#b91c1c'
                : '#1e293b',
            color: '#fff',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
