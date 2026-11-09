import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { OrderTab, CartItem, Product, Customer, ReceiptData } from '../types/pos.types';
import {
  mockProducts,
  initialCategories,
  mockCustomers,
  mockProductsAnNhien,
  mockCustomersAnNhien,
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
import { PosInventoryLookupModal } from '../components/modals/PosInventoryLookupModal';
import { AN_NHIEN_BRANCHES } from '../mock/posMockData';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';
import { posOrderApi } from '../api/posOrderApi';
import { posShiftApi } from '../api/posShiftApi';
import type { ShiftDetailResponse, CashierShiftEligibilityDto } from '../types/posShift.types';
import { OpenShiftModal } from '../components/modals/OpenShiftModal';
import { CashMovementModal } from '../components/modals/CashMovementModal';
import { CloseShiftModal } from '../components/modals/CloseShiftModal';
import { storeProductApi } from '../../product/api/storeProductApi';
import { promotionApi, type LoyaltyConfigDto, type CartGiftItemDto } from '../../promotion/api/promotionApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';

const getInitialTabs = (tenantId: string): OrderTab[] => {
  try {
    const key = `mtgrms_pos_tabs_${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((tab: any) => ({
          ...tab,
          cart: (tab.cart || []).map((c: any) => ({
            ...c,
            product: {
              ...(c.product || {}),
              spec: '',
            },
          })),
        }));
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

const DEFAULT_GROCERY_BRANCH_ID = 'cd5e8d1b-b08b-448d-beff-b85ea5873d52';

export const PosCheckoutPage: FC = () => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_mt_mart_01';
  const isDefaultDemoStore = currentTenantId === 'tenant_mt_mart_01';
  const isAnNhienStore = currentTenantId === 'tenant_an_nhien_02';

  const getInitialProducts = () => {
    if (isDefaultDemoStore) return mockProducts;
    if (isAnNhienStore) return mockProductsAnNhien;
    return [];
  };

  const getInitialCustomers = () => {
    if (isDefaultDemoStore) return mockCustomers;
    if (isAnNhienStore) return mockCustomersAnNhien;
    return [];
  };

  // Kho sản phẩm & danh sách khách hàng (Cách ly theo từng Cửa Hàng / Tenant)
  const [products, setProducts] = useState<Product[]>(getInitialProducts);
  const [customers, setCustomers] = useState<Customer[]>(getInitialCustomers);

  const isStoreOwner = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';
  const [currentShift, setCurrentShift] = useState<ShiftDetailResponse | null>(null);
  const [cashierEligibility, setCashierEligibility] = useState<CashierShiftEligibilityDto | null>(null);
  const isShiftClosing = currentShift?.status === 'Closing' || currentShift?.status === 2 || currentShift?.status === 3;
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  // Tab Đa đơn hàng (Multi-tab orders) được lưu trữ riêng biệt theo từng TenantId
  const [tabs, setTabs] = useState<OrderTab[]>(() => getInitialTabs(currentTenantId));
  const [activeTabId, setActiveTabId] = useState<number>(() => getInitialActiveTabId(currentTenantId, tabs));
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isInventoryLookupOpen, setIsInventoryLookupOpen] = useState(false);

  // Danh sách các chi nhánh có sẵn theo cửa hàng
  const availableBranches = useMemo(() => {
    if (isAnNhienStore) return AN_NHIEN_BRANCHES;
    return [
      { id: DEFAULT_GROCERY_BRANCH_ID, code: 'BR-01', name: 'Chi nhánh Cầu Giấy (Trung tâm)', address: 'Hà Nội', phone: '0901234567' },
      { id: 'BR-02', code: 'BR-02', name: 'Chi nhánh Ba Đình', address: 'Hà Nội', phone: '0907654321' },
      { id: 'BR-03', code: 'BR-03', name: 'Chi nhánh Đống Đa', address: 'Hà Nội', phone: '0908889999' },
    ];
  }, [isAnNhienStore]);

  // Khởi tạo chi nhánh theo phân công vai trò
  const [activeBranch, setActiveBranch] = useState<{ id: string; name: string; address?: string; phone?: string }>(() => {
    if (isAnNhienStore) {
      if (user?.role === 'STAFF' && (user?.phone === '0916667777' || user?.fullName?.includes('Cầu Giấy'))) {
        return AN_NHIEN_BRANCHES[1] || AN_NHIEN_BRANCHES[0];
      }
      return AN_NHIEN_BRANCHES[0];
    }
    return {
      id: DEFAULT_GROCERY_BRANCH_ID,
      name: 'Chi nhánh Cầu Giấy (Trung tâm)',
    };
  });

  const handleSelectBranch = (branchId: string) => {
    const target = availableBranches.find((b: { id: string; name: string }) => b.id === branchId);
    if (target) {
      setActiveBranch(target);
      showToast(`Đã chuyển điểm bán sang: ${target.name}`, 'info');
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Kiểm tra ca làm việc & số lượng phê duyệt theo vai trò & quyền trực ca (REQ-STRICT-SCHEDULE-VALIDATION)
  const checkShiftStatus = useCallback(async () => {
    if (!activeBranch?.id) return;
    try {
      // 1. Kiểm tra tính đủ điều kiện trực ca của thu ngân
      let eligibility: CashierShiftEligibilityDto | null = null;
      try {
        eligibility = await posShiftApi.checkCashierEligibility(activeBranch.id);
        setCashierEligibility(eligibility);
      } catch (e) {
        console.warn('Lỗi kiểm tra lịch trực thu ngân:', e);
      }

      const shift = await posShiftApi.getCurrentShift(activeBranch.id);
      setCurrentShift(shift);

      if (!isStoreOwner) {
        // Thu ngân / Nhân viên: nếu chưa có ca mở thì bắt buộc mở ca (nếu đủ điều kiện trực ca)
        if (!shift) {
          if (eligibility && !eligibility.isAllowed) {
            setIsOpenShiftModalOpen(false);
          } else {
            setIsOpenShiftModalOpen(true);
          }
        } else {
          setIsOpenShiftModalOpen(false);
        }
      }
    } catch {
      // fallback
    }
  }, [activeBranch?.id, isStoreOwner]);

  useEffect(() => {
    checkShiftStatus();
  }, [checkShiftStatus]);

  // Khi chuyển đổi tài khoản (TenantId thay đổi) -> reset và nạp dữ liệu riêng của Tenant đó
  useEffect(() => {
    const freshTabs = getInitialTabs(currentTenantId);
    setTabs(freshTabs);
    setActiveTabId(getInitialActiveTabId(currentTenantId, freshTabs));
    setProducts(getInitialProducts());
    setCustomers(getInitialCustomers());
  }, [currentTenantId, isDefaultDemoStore]);

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
  const autoPrint = typeof window !== 'undefined' && localStorage.getItem('mtgrms_pos_auto_print') === 'true';

  // Khuyến mãi, Voucher & Tích điểm state
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfigDto | null>(null);
  const [appliedPromotions, setAppliedPromotions] = useState<string[]>([]);
  const [giftItems, setGiftItems] = useState<CartGiftItemDto[]>([]);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [couponStatusText, setCouponStatusText] = useState<string>('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);

  // Tab hiện tại
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Nạp dữ liệu thực tế từ Backend CSDL (PostgreSQL) theo Tenant & Chi nhánh hiện tại (BranchProducts)
  useEffect(() => {
    let isMounted = true;
    const fetchBackendData = async () => {
      try {
        let currentBranchId = user?.branchId || DEFAULT_GROCERY_BRANCH_ID;
        try {
          const summaries = await storeProductApi.getStoreSummaries();
          if (summaries && summaries.length > 0) {
            const matched = user?.branchId
              ? summaries.find((s) => s.id === user.branchId) || summaries[0]
              : summaries[0];
            currentBranchId = matched.id;
            if (isMounted) {
              setActiveBranch({
                id: matched.id,
                name: matched.name || matched.code,
                address: matched.address,
                phone: matched.phone,
              });
            }
          }
        } catch {
          // Fallback to default grocery branch
        }

        const [apiProducts, apiCustomers] = await Promise.all([
          posOrderApi.getAllProducts(currentBranchId).catch(() => null),
          posOrderApi.getAllCustomers().catch(() => null),
        ]);

        if (isMounted) {
          if (apiProducts && apiProducts.length > 0) {
            setProducts(apiProducts);
            setTabs((prevTabs) =>
              prevTabs.map((tab) => ({
                ...tab,
                cart: tab.cart.map((cartItem) => {
                  const fresh = apiProducts.find(
                    (p) => p.id === cartItem.product.id || (p.barcode && p.barcode === cartItem.product.barcode)
                  );
                  if (!fresh) return cartItem;
                  const matchedUnit =
                    fresh.unitPrices?.find(
                      (u) => (cartItem.unitId && u.unitId === cartItem.unitId) || u.unitName === cartItem.unit
                    ) || fresh.unitPrices?.find((u) => u.isBaseUnit);
                  return {
                    ...cartItem,
                    product: { ...fresh, spec: '' },
                    unit: matchedUnit ? matchedUnit.unitName : fresh.baseUnit,
                    unitId: matchedUnit?.unitId ?? cartItem.unitId,
                  };
                }),
              }))
            );
          } else {
            setProducts(getInitialProducts());
          }
          if (apiCustomers && apiCustomers.length > 0) {
            setCustomers(apiCustomers);
          } else {
            setCustomers(getInitialCustomers());
          }
        }
      } catch (err) {
        console.warn('Backend load failed, fallback to local cache:', err);
      }
    };

    fetchBackendData();
    return () => {
      isMounted = false;
    };
  }, [currentTenantId, isDefaultDemoStore, user?.branchId]);

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
  const handleAddToCart = (product: Product, batchCode?: string, expiryDate?: string) => {
    if (!currentShift) {
      alert('⛔ Quầy bán hàng hiện chưa có ca làm việc nào đang mở. Vui lòng mở ca làm việc và kiểm đếm tiền đầu ca trước khi bán hàng!');
      setIsOpenShiftModalOpen(true);
      return;
    }
    const targetBatch = batchCode || product.batchCode;
    const existingIndex = currentTab.cart.findIndex(
      (item) => item.product.id === product.id && (targetBatch ? (item.batchCode || item.product.batchCode) === targetBatch : true)
    );
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
      const prodToInsert: Product = targetBatch
        ? { ...product, batchCode: targetBatch, expiryDate: expiryDate || product.expiryDate }
        : product;
      const newItem = {
        ...createInitialCartItem(prodToInsert, 1, 0),
        batchCode: targetBatch,
        expiryDate: expiryDate || product.expiryDate,
      };
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

  const handleUpdateItemUnit = (id: string, unitName: string, price: number, unitId?: string) => {
    const updatedCart = currentTab.cart.map((item) => {
      if (item.id === id) {
        const discountVnd =
          item.discountType === 'vnd'
            ? item.discountPerItem
            : Math.round((price * item.discountPerItem) / 100);
        const actualPrice = Math.max(0, price - discountVnd);
        return {
          ...item,
          unit: unitName,
          unitId,
          unitPrice: price,
          actualPrice,
          totalAmount: actualPrice * item.quantity,
        };
      }
      return item;
    });
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

  // Tải cấu hình tích điểm thành viên từ Backend
  useEffect(() => {
    promotionApi.getLoyaltyConfig()
      .then((cfg) => {
        if (cfg) setLoyaltyConfig(cfg);
      })
      .catch(() => {});
  }, []);

  // Tổng hợp tiền & Chiết khấu
  const totalItemAmount = currentTab.cart.reduce((sum, item) => sum + item.totalAmount, 0);
  const orderDiscountAmount = Math.round((totalItemAmount * currentTab.orderDiscountPercent) / 100);
  const couponDiscountAmount = voucherDiscount;
  const subTotalBeforePoints = Math.max(0, totalItemAmount - orderDiscountAmount - couponDiscountAmount);

  // Tính điểm thưởng theo cấu hình hệ thống
  const redemptionRateAmount = loyaltyConfig?.redemptionRateAmount || 1000;
  const minPointsRequired = loyaltyConfig?.minRedemptionPoints || 20;
  const maxPointsCanUse = currentTab.customer && currentTab.customer.loyaltyPoints >= minPointsRequired
    ? Math.min(currentTab.customer.loyaltyPoints, Math.floor(subTotalBeforePoints / redemptionRateAmount))
    : 0;
  const pointsDeduction = currentTab.usePoints && currentTab.customer
    ? maxPointsCanUse * redemptionRateAmount
    : 0;
  const finalAmount = Math.max(0, subTotalBeforePoints - pointsDeduction);

  // Thẩm định giỏ hàng tự động (Khuyến mãi % đơn, mua X tặng Y, chiết khấu sản phẩm)
  useEffect(() => {
    if (!currentTab.cart || currentTab.cart.length === 0) {
      setAppliedPromotions([]);
      setGiftItems([]);
      return;
    }

    const timer = setTimeout(() => {
      const items = currentTab.cart.map((c) => ({
        productId: c.product.id || 'aaaaaaaa-1111-1111-1111-111111111111',
        productName: c.product.name,
        unitPrice: c.unitPrice,
        quantity: c.quantity,
      }));

      promotionApi
        .evaluateCart({
          items,
          subTotal: totalItemAmount,
          couponCode: currentTab.couponCode?.trim() || undefined,
          branchId: activeBranch.id || undefined,
          customerId: currentTab.customer?.id || undefined,
        })
        .then((res) => {
          if (res) {
            setAppliedPromotions(res.appliedPromotions || []);
            setGiftItems(res.giftItems || []);
            if (res.voucherResult) {
              if (res.voucherResult.isValid) {
                setVoucherDiscount(res.voucherResult.discountAmount);
                setCouponStatusText(`✓ ${res.voucherResult.message || 'Mã hợp lệ'}`);
              }
            }
          }
        })
        .catch(() => {});
    }, 350);

    return () => clearTimeout(timer);
  }, [currentTab.cart, currentTab.couponCode, currentTab.customer?.id, totalItemAmount, activeBranch.id]);

  // Handler thẩm định mã Voucher độc lập
  const handleValidateCoupon = async () => {
    if (!currentTab.couponCode.trim()) return;
    try {
      setIsValidatingCoupon(true);
      const res = await promotionApi.validateVoucher(
        currentTab.couponCode.trim(),
        subTotalBeforePoints,
        currentTab.customer?.id
      );
      if (res?.isValid) {
        setVoucherDiscount(res.discountAmount);
        setCouponStatusText(`✓ ${res.message || 'Mã hợp lệ'}`);
        showToast(`Áp dụng voucher ${res.code} thành công (-${res.discountAmount.toLocaleString('vi-VN')} đ)`);
      } else {
        setVoucherDiscount(0);
        setCouponStatusText(`✗ ${res?.message || 'Mã không hợp lệ'}`);
        showToast(res?.message || 'Mã không hợp lệ', 'error');
      }
    } catch {
      setVoucherDiscount(0);
      setCouponStatusText('✗ Lỗi khi kiểm tra mã voucher');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Tạo dữ liệu hóa đơn in POS-58 (Loại bỏ VAT, nạp động Tenant/Chi nhánh)
  const buildReceiptData = (debtNote?: string): ReceiptData => {
    let paymentMethodText = 'Tiền mặt';
    if (currentTab.paymentMethod === 'vietqr') {
      paymentMethodText = 'Chuyển khoản VietQR';
    } else if (currentTab.paymentMethod === 'debt') {
      paymentMethodText = 'Ghi nợ (Bán nợ)';
    }

    const tenantOrStoreName = user?.tenantName ? user.tenantName.toUpperCase() : (activeBranch.name || 'SIÊU THỊ MINI');
    const storeAddress = activeBranch.address || (isAnNhienStore ? '120 Hoàng Hoa Thám, Ba Đình, Hà Nội' : '123 Xuân Thủy, Cầu Giấy, Hà Nội');
    const storePhone = activeBranch.phone || (isAnNhienStore ? '024 3822 9988' : '0987.654.321');
    const hotline = activeBranch.phone || (user as any)?.tenantHotline || storePhone;

    const cashierDisplayName = user?.role === 'STORE_OWNER'
      ? `Chủ cửa hàng: ${user.fullName || 'Admin'}`
      : (user?.fullName || 'Thu ngân POS');

    return {
      storeName: tenantOrStoreName,
      storeAddress,
      storePhone,
      hotline,
      orderCode: `HD${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toLocaleString('vi-VN'),
      cashierName: cashierDisplayName,
      posMachine: 'POS#01',
      branchName: activeBranch.name,
      customer: currentTab.customer
        ? {
            name: currentTab.customer.name,
            phone: currentTab.customer.phone,
            address: currentTab.customer.address,
            loyaltyPoints: currentTab.customer.loyaltyPoints,
          }
        : null,
      items: currentTab.cart.map((c, i) => ({
        stt: i + 1,
        name: c.product.name,
        unitPrice: c.actualPrice,
        batchCode: c.batchCode || c.product.batchCode || undefined,
        quantity: c.quantity,
        totalAmount: c.totalAmount,
      })),
      totalItemAmount,
      orderDiscountAmount,
      pointsDiscountAmount: pointsDeduction,
      vatAmount: 0,
      finalAmount,
      finalAmountInWords: '',
      paymentMethodText,
      cashTendered: currentTab.cashTendered || finalAmount,
      debtAmount: currentTab.paymentMethod === 'debt' ? finalAmount : undefined,
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

      const branchId = activeBranch.id || DEFAULT_GROCERY_BRANCH_ID;
      const items = currentTab.cart.map((c) => ({
        productId: c.product.id || 'aaaaaaaa-1111-1111-1111-111111111111',
        productName: c.product.name,
        unitPrice: c.actualPrice,
        quantity: c.quantity,
        discountAmount: Math.max(0, (c.unitPrice - c.actualPrice) * c.quantity),
        unitId: c.unitId,
        unitName: c.unit,
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
        cashierName: user?.role === 'STORE_OWNER' ? `Chủ cửa hàng: ${user.fullName || 'Admin'}` : (user?.fullName || 'Thu ngân POS'),
        shiftId: currentShift?.id || undefined,
        pointsRedeemed: currentTab.usePoints && currentTab.customer ? maxPointsCanUse : undefined,
        voucherCode: currentTab.couponCode?.trim() || undefined,
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

      // Chỉ tự động gửi lệnh in trực tiếp nếu người dùng bật tùy chọn autoPrint
      if (autoPrint) {
        posOrderApi.printDirect(receipt).then((res) => {
          if (res.success) {
            showToast(`✅ Đã thanh toán đơn ${receipt.orderCode} & in trực tiếp ra máy in POS-58!`);
          } else {
            showToast(`⚠️ ${res.message}`, 'error');
          }
        });
      } else {
        showToast(`✅ Đã thanh toán thành công đơn hàng ${receipt.orderCode}!`);
      }

      // Lưu đơn vào danh sách ca làm việc để tổng hợp doanh thu chốt ca
      if (currentShift?.id) {
        try {
          const shiftKey = `mtgrms_shift_orders_${currentShift.id}`;
          const currentList = JSON.parse(localStorage.getItem(shiftKey) || '[]');
          currentList.push({
            orderCode: receipt.orderCode,
            finalAmount: receipt.finalAmount,
            paymentMethod: paymentMethod,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem(shiftKey, JSON.stringify(currentList));
        } catch {}
      }

      // Đồng bộ lại trạng thái ca và tiền lý thuyết
      checkShiftStatus();

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
    if (!currentShift) {
      alert('⛔ Quầy hiện chưa có ca làm việc nào đang mở. Vui lòng mở ca làm việc và kiểm đếm tiền đầu ca trước khi thanh toán đơn hàng!');
      setIsOpenShiftModalOpen(true);
      return;
    }

    if (cashierEligibility && !cashierEligibility.isAllowed) {
      alert(`⛔ ${cashierEligibility.reason || 'Bạn không có lịch làm việc trong ca hiện tại của chi nhánh.'}`);
      return;
    }

    if (isShiftClosing) {
      alert('⚠️ Ca bán hàng của chi nhánh đang trong trạng thái kiểm đếm chốt ca (Closing). Hệ thống tạm thời khóa thanh toán đơn hàng trên mọi máy quầy.');
      return;
    }

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

  return (
    <div className="pos-page-wrapper">
      {/* 1. Header Toolbar */}
      <PosHeader
        branchName={activeBranch.name}
        branches={availableBranches}
        selectedBranchId={activeBranch.id}
        onSelectBranch={handleSelectBranch}
        onOpenInventoryLookup={() => setIsInventoryLookupOpen(true)}
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
        currentShift={currentShift}
        onOpenCashMovement={() => setIsCashMovementModalOpen(true)}
        onCloseShift={() => setIsCloseShiftModalOpen(true)}
        onOpenShift={() => {
          if (!isStoreOwner && cashierEligibility && !cashierEligibility.isAllowed) {
            alert(`⛔ ${cashierEligibility.reason || 'Bạn không có lịch làm việc trong ca hiện tại của chi nhánh.'}`);
            return;
          }
          setIsOpenShiftModalOpen(true);
        }}
      />

      {/* Cảnh báo chưa mở ca làm việc (Shift Guard) */}
      {!currentShift && (
        <div
          style={{
            backgroundColor: '#fffbe6',
            border: '1px solid #ffe58f',
            color: '#d46b08',
            padding: '10px 16px',
            borderRadius: '8px',
            margin: '10px 16px 0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(212, 107, 8, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <strong style={{ display: 'block' }}>Quầy bán hàng hiện chưa có ca làm việc nào đang mở</strong>
              <span style={{ fontSize: '12px', color: '#873800' }}>
                Bắt buộc phải mở ca làm việc và kiểm đếm tiền đầu ca trước khi thực hiện bán hàng hoặc thanh toán.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="pos-btn-primary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setIsOpenShiftModalOpen(true)}
          >
            + Mở ca làm việc ngay
          </button>
        </div>
      )}

      {/* Cảnh báo nếu thu ngân không có lịch trực ca hợp lệ (REQ-POS-UI-SCHEDULE-ALERT) */}
      {cashierEligibility && !cashierEligibility.isAllowed && (
        <div
          style={{
            backgroundColor: '#fff1f0',
            border: '1px solid #ffa39e',
            color: '#cf1322',
            padding: '10px 16px',
            borderRadius: '8px',
            margin: '10px 16px 0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(207, 19, 34, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⛔</span>
            <div>
              <strong style={{ display: 'block' }}>Không đủ điều kiện bán hàng trong ca hiện tại</strong>
              <span style={{ fontSize: '12px', color: '#a8071a' }}>
                {cashierEligibility.reason || 'Bạn không có lịch làm việc trong ca hiện tại của chi nhánh.'}
              </span>
            </div>
          </div>
          <span
            style={{
              backgroundColor: '#ffccc7',
              color: '#820014',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '4px',
            }}
          >
            Khóa thanh toán POS
          </span>
        </div>
      )}

      {/* Cảnh báo khóa chốt ca bán hàng (Closing Lockdown) */}
      {isShiftClosing && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderBottom: '2px solid #ef4444',
            color: '#991b1b',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 500,
            fontSize: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>
              <strong>Ca bán hàng đang được kiểm đếm chốt ca (Closing).</strong> Hệ thống tạm thời khóa thanh toán đơn hàng trên mọi máy quầy để bảo toàn số liệu tiền két.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCloseShiftModalOpen(true)}
            style={{
              padding: '6px 14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            Xem bảng kiểm đếm &amp; Chốt ca
          </button>
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
            onUpdateItemUnit={handleUpdateItemUnit}
            onOpenBelowCostWarning={(item) => setBelowCostWarningItem(item)}
            onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
            orderNote={currentTab.note}
            onOrderNoteChange={(note) => updateCurrentTab({ note })}
            appliedPromotions={appliedPromotions}
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
            onCouponCodeChange={(code) => {
              updateCurrentTab({ couponCode: code });
              setVoucherDiscount(0);
              setCouponStatusText('');
            }}
            couponDiscountAmount={couponDiscountAmount}
            onValidateCoupon={handleValidateCoupon}
            isValidatingCoupon={isValidatingCoupon}
            couponStatusText={couponStatusText}
            usePoints={currentTab.usePoints}
            onToggleUsePoints={(use) => updateCurrentTab({ usePoints: use })}
            pointsDeduction={pointsDeduction}
            pointsToRedeem={maxPointsCanUse}
            minPointsRequired={minPointsRequired}
            appliedPromotions={appliedPromotions}
            giftItems={giftItems}
            paymentMethod={currentTab.paymentMethod}
            onPaymentMethodChange={(pm) => updateCurrentTab({ paymentMethod: pm })}
            cashTendered={currentTab.cashTendered}
            onCashTenderedChange={(val) => updateCurrentTab({ cashTendered: val })}
            onOpenVietQrModal={() => setIsVietQrOpen(true)}
            onSubmitCheckout={handleCheckoutSubmit}
            customerSearchList={customers}
            isCheckoutDisabled={isShiftClosing || (cashierEligibility !== null && !cashierEligibility.isAllowed)}
            disabledReason={
              isShiftClosing
                ? 'Ca đang kiểm đếm chốt ca (Closing)'
                : (cashierEligibility && !cashierEligibility.isAllowed
                    ? (cashierEligibility.reason || 'Bạn không có lịch làm việc trong ca hiện tại của chi nhánh.')
                    : undefined)
            }
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
          setCustomers((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id && c.phone !== newCust.phone)]);
          updateCurrentTab({ customer: newCust });
          showToast(`✅ Đã lưu khách hàng "${newCust.name}" vào CSDL thành công!`);
          posOrderApi.getAllCustomers().then((apiCusts) => {
            if (apiCusts && apiCusts.length > 0) {
              setCustomers(apiCusts);
            }
          }).catch(() => {});
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

            <PosInventoryLookupModal
        isOpen={isInventoryLookupOpen}
        onClose={() => setIsInventoryLookupOpen(false)}
        currentBranchName={activeBranch.name}
        products={products}
        onSelectBatchToCart={(prod, batchCode, expDate) => {
          handleAddToCart(prod, batchCode, expDate);
          setIsInventoryLookupOpen(false);
          showToast(`Đã thêm sản phẩm "${prod.name}" (Lô: ${batchCode}) vào giỏ hàng`, 'success');
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

      {/* 4. Modals Quản lý Ca POS & Phân Quyền */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        branchId={activeBranch.id}
        branchName={activeBranch.name}
        canCancel={true}
        onCancel={() => setIsOpenShiftModalOpen(false)}
        onShiftOpened={(newShift) => {
          setCurrentShift(newShift);
          setIsOpenShiftModalOpen(false);
          showToast(`✅ Đã mở ${newShift.shiftName} (${newShift.shiftCode}) thành công!`);
        }}
      />

      {currentShift && (
        <CashMovementModal
          isOpen={isCashMovementModalOpen}
          shift={currentShift}
          onClose={() => setIsCashMovementModalOpen(false)}
          onMovementAdded={() => {
            showToast('✅ Đã ghi nhận phiếu thu/chi két!');
            checkShiftStatus();
          }}
        />
      )}

      {currentShift && (
        <CloseShiftModal
          isOpen={isCloseShiftModalOpen}
          shift={currentShift}
          onClose={() => setIsCloseShiftModalOpen(false)}
          onShiftClosed={(_closed) => {
            setCurrentShift(null);
            setIsCloseShiftModalOpen(false);
            showToast('✅ Đã chốt ca làm việc và kết toán thành công!');
            checkShiftStatus();
          }}
        />
      )}

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
