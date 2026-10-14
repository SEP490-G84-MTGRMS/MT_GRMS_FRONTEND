import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { OrderTab, CartItem, Product, Customer, ReceiptData } from '../types/pos.types';
import {
  mockProducts,
  initialCategories,
  mockCustomers,
  createInitialCartItem,
} from '../mock/posMockData';
import { PosHeader } from '../components/PosHeader';
import { PosCartTable } from '../components/PosCartTable';
import { PosCatalogGrid } from '../components/PosCatalogGrid';
import { PosPaymentPanel } from '../components/PosPaymentPanel';
import { AddCustomerModal } from '../components/modals/AddCustomerModal';
import { VietQrModal } from '../components/modals/VietQrModal';
import { QuickAddProductModal } from '../components/modals/QuickAddProductModal';
import { BelowCostWarningModal } from '../components/modals/BelowCostWarningModal';
import { DebtLimitWarningModal } from '../components/modals/DebtLimitWarningModal';
import { OrderDiscountModal } from '../components/modals/OrderDiscountModal';
import { PosReceiptModal } from '../components/PosReceiptModal';
import '../pos.css';

export const PosCheckoutPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Kho sản phẩm & danh sách khách hàng
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);

  // Tab Đa đơn hàng (Multi-tab orders)
  const [tabs, setTabs] = useState<OrderTab[]>([
    {
      id: 1,
      name: 'Hóa đơn 1',
      cart: [createInitialCartItem(mockProducts[0], 1, 10000)], // default Áo thun polo nam sọc ngang
      customer: mockCustomers[0], // default Hoàng Sơn (0912.345.678)
      orderDiscountPercent: 7, // 7% tự động
      couponCode: '',
      couponDiscount: 0,
      usePoints: true,
      note: '',
      paymentMethod: 'cash',
      cashTendered: 400000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Hóa đơn 2',
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
  ]);
  const [activeTabId, setActiveTabId] = useState<number>(1);

  // Chế độ bán hàng (fast vs normal)
  const [salesMode, setSalesMode] = useState<'fast' | 'normal'>('fast');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isVietQrOpen, setIsVietQrOpen] = useState(false);
  const [isQuickAddProductOpen, setIsQuickAddProductOpen] = useState(false);
  const [belowCostWarningItem, setBelowCostWarningItem] = useState<CartItem | null>(null);
  const [isDebtWarningOpen, setIsDebtWarningOpen] = useState(false);
  const [isOrderDiscountOpen, setIsOrderDiscountOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Tab hiện tại
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

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
        setSalesMode((prev) => (prev === 'fast' ? 'normal' : 'fast'));
      } else if (e.key === 'F4') {
        e.preventDefault();
        const custSearch = document.getElementById('customer_search');
        custSearch?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        updateCurrentTab({ paymentMethod: 'cash' });
      } else if (e.key === 'Escape') {
        setIsAddCustomerOpen(false);
        setIsVietQrOpen(false);
        setIsQuickAddProductOpen(false);
        setBelowCostWarningItem(null);
        setIsOrderDiscountOpen(false);
        setIsReceiptModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId]);

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
    if (tabs.length <= 1) return;
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
      // Đã có -> tăng số lượng
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
      // Thêm mới
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

  // Barcode scan submit
  const handleBarcodeSubmit = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toLowerCase();
    const found = products.find(
      (p) =>
        p.barcode.toLowerCase() === query ||
        p.sku.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );

    if (found) {
      handleAddToCart(found);
      setSearchQuery('');
    } else {
      if (confirm(`Không tìm thấy sản phẩm "${searchQuery}". Bạn có muốn thêm nhanh hàng hóa này không?`)) {
        setIsQuickAddProductOpen(true);
      }
    }
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

  // Tạo dữ liệu hóa đơn in K80
  const buildReceiptData = (debtNote?: string): ReceiptData => {
    const vat = Math.round(finalAmount * 0.08); // VAT 8%
    const totalWithVat = finalAmount + vat;

    let paymentMethodText = 'Tiền mặt';
    if (currentTab.paymentMethod === 'vietqr') {
      paymentMethodText = 'Chuyển khoản VietQR';
    } else if (currentTab.paymentMethod === 'debt') {
      paymentMethodText = 'Ghi nợ (Bán nợ)';
    }

    return {
      storeName: 'MT-GROCERY STORE',
      storeAddress: '18 Tràng Tiền, Hoàn Kiếm, Hà Nội',
      storePhone: '0974.742.130',
      hotline: '1900 6522',
      orderCode: `HD${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toLocaleString('vi-VN'),
      cashierName: 'Nguyễn Bá Sơn',
      posMachine: 'POS#01',
      branchName: 'Chi nhánh trung tâm',
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
        batchCode: c.product.batchCode || 'LOT-2026',
        quantity: c.quantity,
        totalAmount: c.totalAmount,
      })),
      totalItemAmount,
      orderDiscountAmount,
      pointsDiscountAmount: pointsDeduction,
      vatAmount: vat,
      finalAmount: totalWithVat,
      finalAmountInWords: 'Năm trăm ba mươi tư nghìn sáu trăm đồng chẵn',
      paymentMethodText,
      debtAmount: currentTab.paymentMethod === 'debt' ? totalWithVat : undefined,
      debtNote,
      earnedPoints: Math.floor(finalAmount / 10000), // 10k = 1 điểm
    };
  };

  const executeCompleteCheckout = (debtNote?: string) => {
    if (currentTab.paymentMethod === 'debt' && currentTab.customer) {
      const vat = Math.round(finalAmount * 0.08);
      const totalOrderDebt = finalAmount + vat;
      const updatedDebt = currentTab.customer.currentDebt + totalOrderDebt;
      const updatedCustomer = { ...currentTab.customer, currentDebt: updatedDebt };

      setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
      updateCurrentTab({ customer: updatedCustomer });
    }

    const receipt = buildReceiptData(debtNote);
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
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

      const debtLimit = currentTab.customer.debtLimit || 0;
      const vat = Math.round(finalAmount * 0.08);
      const totalOrderDebt = finalAmount + vat;
      const nextDebt = currentTab.customer.currentDebt + totalOrderDebt;

      // Cảnh báo nếu khách chưa được cấu hình allowDebt hoặc nợ vượt hạn mức
      if (!currentTab.customer.allowDebt || nextDebt > debtLimit) {
        setIsDebtWarningOpen(true);
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
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
        salesMode={salesMode}
        onToggleSalesMode={setSalesMode}
        onHoldOrder={handleHoldOrder}
        onPrintRecent={handlePrintRecent}
        onCloseShift={() => {
          const isEmployee = location.pathname.startsWith('/employee/pos');
          navigate(isEmployee ? '/employee/pos/shift' : '/pos/shift');
        }}
      />

      {/* 2. Main Body Split */}
      <div className="pos-main-body">
        {/* Cột trái: Giỏ hàng + Catalog chế độ bán thường */}
        <div className="pos-left-column">
          <PosCartTable
            cart={currentTab.cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onOpenQuickAddProduct={() => setIsQuickAddProductOpen(true)}
            onOpenBelowCostWarning={(item) => setBelowCostWarningItem(item)}
            orderNote={currentTab.note}
            onOrderNoteChange={(note) => updateCurrentTab({ note })}
          />

          {/* Catalog sản phẩm cảm ứng khi ở chế độ Bán thường */}
          {salesMode === 'normal' && (
            <PosCatalogGrid
              products={products}
              categories={initialCategories}
              onAddToCart={handleAddToCart}
            />
          )}
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
          const receipt = buildReceiptData();
          setReceiptData(receipt);
          setIsReceiptModalOpen(true);
        }}
      />

      <QuickAddProductModal
        isOpen={isQuickAddProductOpen}
        onClose={() => setIsQuickAddProductOpen(false)}
        onSaveAndAddToCart={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          handleAddToCart(newProd);
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
        orderAmount={finalAmount + Math.round(finalAmount * 0.08)}
        onClose={() => setIsDebtWarningOpen(false)}
        onApprove={(note) => {
          executeCompleteCheckout(note);
        }}
      />

      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        receiptData={receiptData}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};
