import React, { useState, useEffect, useRef } from 'react';
import type { Product, Customer } from '../../types/pos.types';
import { Plus, Minus, Trash2, Search, Package, Phone, User, AlertTriangle, Gift } from 'lucide-react';
import { mockCustomers } from '../../mock/posMockData';
import { promotionApi, type CartGiftItemDto } from '../../../promotion/api/promotionApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableProducts: Product[];
  branchId?: string;
  branchName: string;
  customers?: Customer[];
  onConfirm: (data: {
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
  }) => Promise<void>;
}

export interface PreOrderCartItem {
  product: Product;
  quantity: number;
  unitId?: string;
  unitName: string;
  unitPrice: number;
  conversionRate: number;
}

export const CreatePreOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableProducts,
  branchId,
  branchName,
  customers,
  onConfirm,
}) => {
  const customerList = customers && customers.length > 0 ? customers : mockCustomers;

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('kh_retail');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerContainerRef = useRef<HTMLDivElement>(null);

  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 16);
  });

  const [orderItems, setOrderItems] = useState<PreOrderCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Khuyến mãi tự động cho Đơn đặt trước (KHÔNG áp dụng mã Voucher dùng 1 lần - REQ-ORD-PRE-01)
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null);
  const [appliedPromoLabels, setAppliedPromoLabels] = useState<string[]>([]);
  const [giftItems, setGiftItems] = useState<CartGiftItemDto[]>([]);

  // Tính tổng tiền hàng & tổng thanh toán sau khuyến mãi
  const totalMerchandiseAmount = orderItems.reduce(
    (sum, item) => sum + (item.quantity > 0 ? item.quantity * item.unitPrice : 0),
    0
  );
  const effectivePromoDiscount = Math.min(totalMerchandiseAmount, Math.max(0, promoDiscount));
  const totalAmount = Math.max(0, totalMerchandiseAmount - effectivePromoDiscount);
  const minDeposit = Math.round(totalAmount * 0.10);
  const isDepositValid = orderItems.length > 0 && depositAmount >= minDeposit && depositAmount <= totalAmount;

  // Thẩm định tự động các CTKM của cửa hàng khi mặt hàng/số lượng thay đổi
  useEffect(() => {
    if (!isOpen || orderItems.length === 0) {
      setPromoDiscount(0);
      setAppliedPromoId(null);
      setAppliedPromoLabels([]);
      setGiftItems([]);
      return;
    }

    const validItems = orderItems.filter((i) => i.quantity > 0);
    if (validItems.length === 0) {
      setPromoDiscount(0);
      setAppliedPromoId(null);
      setAppliedPromoLabels([]);
      setGiftItems([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      promotionApi
        .evaluateCart({
          items: validItems.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
          subTotal: totalMerchandiseAmount,
          branchId: branchId && !branchId.startsWith('BR-') ? branchId : undefined,
          customerId: selectedCustomerId && selectedCustomerId !== 'kh_retail' ? selectedCustomerId : undefined,
        })
        .then((res) => {
          if (cancelled || !res) return;
          setPromoDiscount(Math.max(0, Math.round(res.totalDiscountAmount || 0)));
          setAppliedPromoId(res.appliedPromotionId || null);
          setAppliedPromoLabels((res.appliedPromotions || []).filter((p) => !p.startsWith('Voucher [')));
          setGiftItems(res.giftItems || []);
        })
        .catch(() => {});
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, orderItems, totalMerchandiseAmount, branchId, selectedCustomerId]);

  // Tự động đồng bộ tiền cọc tối thiểu khi số lượng, mặt hàng hoặc khuyến mãi thay đổi
  useEffect(() => {
    if (totalAmount > 0) {
      const calculatedMin = Math.round(totalAmount * 0.10);
      setDepositAmount((prev) => {
        if (prev > totalAmount) return totalAmount;
        if (prev < calculatedMin || prev === 0) return calculatedMin;
        return prev;
      });
    } else {
      setDepositAmount(0);
    }
  }, [totalAmount]);

  // Click outside listener cho dropdown tìm kiếm sản phẩm và khách hàng
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Lọc sản phẩm theo từ khóa (hỗ trợ tìm kiếm theo tên, mã SKU, barcode)
  const filteredProducts = availableProducts.filter((p) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = p.name.toLowerCase().includes(q);
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
    return nameMatch || skuMatch || barcodeMatch;
  });

  // Tìm kiếm khách hàng thuần túy CHỈ BẰNG SĐT
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const filteredCustomers = customerList.filter((c) => {
    if (!phoneDigits) return false;
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    return cleanPhone.includes(phoneDigits);
  });

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerPhone(c.phone || '');
    setCustomerName(c.name || '');
    setIsCustomerDropdownOpen(false);
  };

  const handleSelectProduct = (prod: Product) => {
    const defaultUnit = prod.unitPrices?.find((u) => u.isBaseUnit) || prod.unitPrices?.[0];
    const unitName = defaultUnit?.unitName || prod.baseUnit || 'cái';
    const unitPrice = defaultUnit?.price ?? prod.basePrice;
    const conversionRate = defaultUnit?.conversionRate ?? 1;
    const unitId = defaultUnit?.unitId;

    setOrderItems((prev) => {
      const existIdx = prev.findIndex((i) => i.product.id === prod.id && i.unitName === unitName);
      if (existIdx >= 0) {
        const exist = prev[existIdx];
        const maxAvailable = Math.floor(prod.quantityOnHand / conversionRate);
        const nextQty = exist.quantity < maxAvailable ? exist.quantity + 1 : exist.quantity;
        return prev.map((item, idx) => (idx === existIdx ? { ...item, quantity: nextQty } : item));
      }
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          unitId,
          unitName,
          unitPrice,
          conversionRate,
        },
      ];
    });
    setSearchQuery('');
    setIsProductDropdownOpen(false);
  };

  const handleChangeUnit = (index: number, newUnitKey: string) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const matched = item.product.unitPrices?.find(
          (u) => (u.unitId && u.unitId === newUnitKey) || u.unitName === newUnitKey
        );
        if (!matched) return item;

        const maxAvailable = Math.floor(item.product.quantityOnHand / matched.conversionRate);
        const newQty = Math.min(item.quantity, Math.max(1, maxAvailable));

        return {
          ...item,
          unitId: matched.unitId,
          unitName: matched.unitName,
          unitPrice: matched.price,
          conversionRate: matched.conversionRate,
          quantity: newQty,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Cập nhật số lượng trực tiếp từ ô nhập
  const handleUpdateQty = (index: number, qtyStr: string) => {
    const parsed = qtyStr === '' ? 0 : parseInt(qtyStr, 10);
    const qty = isNaN(parsed) ? 0 : parsed;
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: qty } : item))
    );
  };

  // Tăng/giảm số lượng bằng nút bấm
  const handleStepQty = (index: number, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const maxAvailable = Math.floor(item.product.quantityOnHand / item.conversionRate);
        const target = item.quantity + delta;
        if (delta > 0 && target > maxAvailable) {
          return item;
        }
        if (delta < 0 && target < 1) {
          return item;
        }
        return { ...item, quantity: target };
      })
    );
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 mặt hàng cần đặt trước!');
      return;
    }

    // Kiểm tra số lượng từng mặt hàng và tổng tồn kho quy đổi theo từng sản phẩm
    const productBaseQtyMap = new Map<string, { totalBaseQty: number; name: string; quantityOnHand: number; baseUnit: string }>();
    for (const item of orderItems) {
      if (item.quantity <= 0) {
        alert(`Sản phẩm "${item.product.name}" (${item.unitName}) có số lượng không hợp lệ (phải > 0). Vui lòng nhập lại số lượng!`);
        return;
      }
      const existing = productBaseQtyMap.get(item.product.id) || {
        totalBaseQty: 0,
        name: item.product.name,
        quantityOnHand: item.product.quantityOnHand,
        baseUnit: item.product.baseUnit || 'sản phẩm',
      };
      existing.totalBaseQty += item.quantity * (item.conversionRate || 1);
      productBaseQtyMap.set(item.product.id, existing);
    }

    for (const [, info] of productBaseQtyMap) {
      if (info.totalBaseQty > info.quantityOnHand) {
        alert(
          `Tổng số lượng quy đổi của sản phẩm "${info.name}" (${info.totalBaseQty} ${info.baseUnit}) vượt quá tồn kho khả dụng (${info.quantityOnHand} ${info.baseUnit})! Vui lòng giảm số lượng.`
        );
        return;
      }
    }

    // Kiểm tra số điện thoại khách hàng
    if (!customerPhone.trim()) {
      alert('Vui lòng nhập số điện thoại khách hàng!');
      return;
    }

    if (depositAmount < minDeposit) {
      alert(`Tiền đặt cọc tối thiểu phải bằng 10% tổng tiền đơn hàng (${minDeposit.toLocaleString('vi-VN')} đ)!`);
      return;
    }

    if (depositAmount > totalAmount) {
      alert(`Tiền đặt cọc không được vượt quá tổng giá trị đơn hàng (${totalAmount.toLocaleString('vi-VN')} đ)!`);
      return;
    }

    try {
      setIsSubmitting(true);
      const paidPayloadItems = orderItems.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitId: i.unitId,
        unitName: i.unitName,
        conversionRate: i.conversionRate || 1,
        isGift: false,
      }));
      const giftPayloadItems = giftItems
        .filter((g) => g.productId && g.productId !== '00000000-0000-0000-0000-000000000000' && g.quantity > 0)
        .map((g) => ({
          productId: g.productId,
          productName: g.productName,
          quantity: g.quantity,
          unitPrice: 0,
          unitName: g.unitName || 'Cái',
          conversionRate: 1,
          isGift: true,
          promotionId: g.promotionId || appliedPromoId,
        }));

      await onConfirm({
        customerId: selectedCustomerId || '01a185f3-d197-72c1-b6e7-cdb5d5363467',
        customerName: customerName.trim() || 'Khách lẻ',
        customerPhone: customerPhone.trim(),
        expectedPickupDate: expectedDate,
        items: [...paidPayloadItems, ...giftPayloadItems],
        depositAmount,
        paymentMethod,
        note,
        discountAmount: effectivePromoDiscount,
        appliedPromotionId: appliedPromoId,
        appliedPromotionSummary: appliedPromoLabels.length > 0 ? appliedPromoLabels.join('; ') : null,
      });
      onClose();
    } catch (e: any) {
      alert(`Lỗi khi tạo đơn đặt trước: ${e?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 840, width: '94%' }}>
        <div className="pos-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <b>+ Tạo Đơn Đặt Trước</b>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="pos-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px' }}>
          {/* Thông tin chi nhánh hiển thị gọn gàng */}
          <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14 }}>
            Chi nhánh tiếp nhận: <b style={{ color: '#0f766e' }}>{branchName}</b>
          </div>

          {/* Thông tin khách hàng: Chỉ tìm bằng SĐT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ position: 'relative' }} ref={customerContainerRef}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Phone size={13} color="#0f766e" />
                <span>Số điện thoại (Chỉ tìm bằng SĐT):</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  placeholder="Nhập SĐT khách hàng..."
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d\s.-]/g, '');
                    setCustomerPhone(val);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (customerPhone.trim()) setIsCustomerDropdownOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Dropdown tìm kiếm khách hàng bằng SĐT */}
              {isCustomerDropdownOpen && customerPhone.trim() && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: 200,
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                    zIndex: 60,
                    marginTop: 4,
                  }}
                >
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff')}
                      >
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>{c.phone}</span>
                          <span style={{ fontSize: 12.5, color: '#334155', marginLeft: 8 }}>{c.name}</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 }}>
                          {c.code || 'Khách quen'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                      Không tìm thấy SĐT &quot;{customerPhone}&quot;. Nhập tên khách mới bên cạnh.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <User size={13} color="#0f766e" />
                <span>Tên khách hàng:</span>
              </label>
              <input
                type="text"
                placeholder="Họ tên khách hàng..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
              Thời gian hẹn nhận hàng:
            </label>
            <input
              type="datetime-local"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          {/* Bộ tìm kiếm sản phẩm */}
          <div style={{ marginBottom: 14, position: 'relative' }} ref={searchContainerRef}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={15} color="#0f766e" />
              <span>Chọn sản phẩm đặt trước:</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsProductDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredProducts.length > 0) {
                      handleSelectProduct(filteredProducts[0]);
                    }
                  } else if (e.key === 'Escape') {
                    setIsProductDropdownOpen(false);
                  }
                }}
                placeholder="Gõ tên sản phẩm hoặc mã barcode..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 6,
                  border: isProductDropdownOpen && filteredProducts.length > 0 ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  boxShadow: isProductDropdownOpen ? '0 0 0 2px rgba(15, 118, 110, 0.1)' : 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsProductDropdownOpen(false);
                  }}
                  style={{
                    position: 'absolute',
                    right: 10,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown danh sách gợi ý sản phẩm */}
            {isProductDropdownOpen && searchQuery.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: 220,
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  marginTop: 4,
                }}
              >
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#64748b', textAlign: 'center' }}>
                    Không tìm thấy sản phẩm phù hợp với từ khóa &quot;<b>{searchQuery}</b>&quot;
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const isAlreadyInCart = orderItems.some((it) => it.product.id === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          backgroundColor: isAlreadyInCart ? '#f0fdf4' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = isAlreadyInCart ? '#f0fdf4' : 'transparent';
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                            {p.barcode && <span>Mã: {p.barcode}</span>}
                            <span style={{ color: p.quantityOnHand > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                              Tồn kho: {p.quantityOnHand} {p.baseUnit || 'cái'}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <b style={{ color: '#0f766e', fontSize: 13.5 }}>{p.basePrice.toLocaleString('vi-VN')} đ</b>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Bảng sản phẩm có cột chọn Đơn vị quy đổi */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '8px 10px' }}>Sản phẩm</th>
                  <th style={{ padding: '8px 10px', width: 120 }}>Đơn vị</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 105 }}>Đơn giá</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 130 }}>Số lượng</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Thành tiền</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 45 }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8' }}>
                      Chưa có sản phẩm nào được chọn. Vui lòng tìm kiếm và chọn sản phẩm ở ô phía trên.
                    </td>
                  </tr>
                ) : (
                  orderItems.map((item, idx) => {
                    const maxAvailable = Math.floor(item.product.quantityOnHand / item.conversionRate);
                    const isNegativeOrZero = item.quantity <= 0;
                    const isOverStock = item.quantity > maxAvailable;
                    const hasQtyError = isNegativeOrZero || isOverStock;
                    const hasMultipleUnits = item.product.unitPrices && item.product.unitPrices.length > 1;

                    return (
                      <tr key={`${item.product.id}-${item.unitName}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Tồn kho: <b>{item.product.quantityOnHand}</b> {item.product.baseUnit || 'cái'}
                            {item.conversionRate > 1 && (
                              <span style={{ marginLeft: 6, color: '#0f766e', fontWeight: 600 }}>
                                (Tối đa: {maxAvailable} {item.unitName})
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {hasMultipleUnits ? (
                            <select
                              value={item.unitId || item.unitName}
                              onChange={(e) => handleChangeUnit(idx, e.target.value)}
                              style={{
                                padding: '4px 6px',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#0f766e',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                                outline: 'none',
                                width: '100%',
                              }}
                            >
                              {item.product.unitPrices!.map((u, uIdx) => (
                                <option key={u.unitId || `${u.unitName}-${uIdx}`} value={u.unitId || u.unitName}>
                                  {u.unitName} {u.conversionRate > 1 ? `(x${u.conversionRate})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 4,
                                background: '#f1f5f9',
                                fontWeight: 600,
                                fontSize: 12,
                                color: '#475569',
                              }}
                            >
                              {item.unitName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                border: hasQtyError ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                                borderRadius: 4,
                                overflow: 'hidden',
                                backgroundColor: hasQtyError ? '#fef2f2' : '#ffffff',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleStepQty(idx, -1)}
                                disabled={item.quantity <= 1}
                                style={{
                                  border: 'none',
                                  background: item.quantity <= 1 ? '#f8fafc' : '#f1f5f9',
                                  cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                                  padding: '5px 8px',
                                  color: item.quantity <= 1 ? '#cbd5e1' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Giảm 1"
                              >
                                <Minus size={12} />
                              </button>

                              <input
                                type="number"
                                value={item.quantity === 0 ? '' : item.quantity}
                                placeholder="0"
                                onChange={(e) => handleUpdateQty(idx, e.target.value)}
                                style={{
                                  width: 48,
                                  textAlign: 'center',
                                  border: 'none',
                                  borderLeft: '1px solid #cbd5e1',
                                  borderRight: '1px solid #cbd5e1',
                                  padding: '4px 2px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: hasQtyError ? '#dc2626' : '#0f172a',
                                  backgroundColor: 'transparent',
                                  outline: 'none',
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => handleStepQty(idx, 1)}
                                disabled={item.quantity >= maxAvailable}
                                style={{
                                  border: 'none',
                                  background: item.quantity >= maxAvailable ? '#f8fafc' : '#f1f5f9',
                                  cursor: item.quantity >= maxAvailable ? 'not-allowed' : 'pointer',
                                  padding: '5px 8px',
                                  color: item.quantity >= maxAvailable ? '#cbd5e1' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title={item.quantity >= maxAvailable ? 'Đã đạt tồn kho tối đa' : 'Tăng 1'}
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Cảnh báo số lượng nhập sai trực tiếp tại dòng */}
                            {isNegativeOrZero && (
                              <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={11} />
                                <span>Số lượng phải &gt; 0!</span>
                              </div>
                            )}
                            {!isNegativeOrZero && isOverStock && (
                              <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={11} />
                                <span>Tối đa {maxAvailable} {item.unitName}!</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {(item.quantity > 0 ? item.quantity * item.unitPrice : 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            title="Xóa mặt hàng"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tổng tiền, Khuyến mãi tự động & Tiền cọc */}
          <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: '#475569' }}>Tổng tiền hàng:</span>
              <b>{totalMerchandiseAmount.toLocaleString('vi-VN')} đ</b>
            </div>

            {(effectivePromoDiscount > 0 || appliedPromoLabels.length > 0) && (
              <div style={{ marginBottom: 6, padding: '6px 8px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#0f766e', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Gift size={13} color="#0f766e" /> Khuyến mãi cửa hàng (Tự động):
                  </span>
                  <span style={{ color: '#dc2626' }}>-{effectivePromoDiscount.toLocaleString('vi-VN')} đ</span>
                </div>
                {appliedPromoLabels.map((lbl, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: '#115e59', marginTop: 2 }}>
                    • {lbl}
                  </div>
                ))}
              </div>
            )}

            {giftItems.length > 0 && (
              <div style={{ marginBottom: 8, padding: '6px 8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Gift size={13} color="#15803d" /> Quà tặng giữ kho kèm đơn (0 đ):
                </div>
                {giftItems.map((g, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#166534' }}>
                    <span>✦ {g.productName} (x{g.quantity}{g.unitName ? ` ${g.unitName}` : ''})</span>
                    <b>0 đ</b>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
              <span><b>Tổng giá trị đơn hàng (sau KM):</b></span>
              <b style={{ color: '#0f766e', fontSize: 15 }}>{totalAmount.toLocaleString('vi-VN')} đ</b>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tiền đặt cọc của khách:</span>
                <div style={{ fontSize: 11, color: '#dc2626' }}>
                  (Bắt buộc tối thiểu 10%: <b>{minDeposit.toLocaleString('vi-VN')} đ</b>)
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button type="button" onClick={() => setDepositAmount(minDeposit)} style={{ padding: '2px 6px', fontSize: 10.5, border: '1px solid #cbd5e1', borderRadius: 4, background: '#f1f5f9', cursor: 'pointer' }}>10% (Tối thiểu)</button>
                  <button type="button" onClick={() => setDepositAmount(Math.round(totalAmount * 0.20))} style={{ padding: '2px 6px', fontSize: 10.5, border: '1px solid #cbd5e1', borderRadius: 4, background: '#f1f5f9', cursor: 'pointer' }}>20%</button>
                  <button type="button" onClick={() => setDepositAmount(Math.round(totalAmount * 0.50))} style={{ padding: '2px 6px', fontSize: 10.5, border: '1px solid #cbd5e1', borderRadius: 4, background: '#f1f5f9', cursor: 'pointer' }}>50%</button>
                  <button type="button" onClick={() => setDepositAmount(totalAmount)} style={{ padding: '2px 6px', fontSize: 10.5, border: '1px solid #cbd5e1', borderRadius: 4, background: '#f1f5f9', cursor: 'pointer' }}>100%</button>
                </div>
              </div>
              <input
                type="number"
                min={minDeposit}
                max={totalAmount}
                step={5000}
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                style={{
                  width: 150,
                  textAlign: 'right',
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: isDepositValid ? '1.5px solid #16a34a' : '1.5px solid #dc2626',
                  fontWeight: 700,
                  fontSize: 14,
                  color: isDepositValid ? '#15803d' : '#dc2626',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 8 }}>
              <span>Còn phải thu khi nhận hàng:</span>
              <b>{Math.max(0, totalAmount - depositAmount).toLocaleString('vi-VN')} đ</b>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Phương thức thu cọc:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="preOrderPayMethod"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                />
                Tiền mặt
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="preOrderPayMethod"
                  value="VIETQR"
                  checked={paymentMethod === 'VIETQR'}
                  onChange={() => setPaymentMethod('VIETQR')}
                />
                VietQR
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="Ghi chú đơn đặt trước (nếu có)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12 }}
              />
            </div>
          </div>
        </div>

        <div className="pos-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="pos-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="pos-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || orderItems.length === 0}
            style={{ padding: '8px 18px', fontSize: 13.5 }}
          >
            {isSubmitting ? 'Đang tạo đơn...' : '✓ Xác Nhận Tạo Đơn'}
          </button>
        </div>
      </div>
    </div>
  );
};
