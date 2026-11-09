import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import type {
  SupplierSummary,
  APLedgerEntry,
  SupplierDeliveryConfig,
  PurchaseOrderItem,
  UpdateBasicSupplierInput,
  UpdateSupplierBankInput,
  UpdateSupplierVatInput,
} from '../types/supplier.types';
import { SupplierDetailHeader } from '../components/detail/SupplierDetailHeader';
import { SupplierGeneralProfileTab } from '../components/detail/SupplierGeneralProfileTab';
import { SupplierDeliveryConfigTab } from '../components/detail/SupplierDeliveryConfigTab';
import { SupplierHolidaysTab } from '../components/detail/SupplierHolidaysTab';
import { SupplierPayablesTab } from '../components/detail/SupplierPayablesTab';
import { SupplierHistoryTab } from '../components/detail/SupplierHistoryTab';
import { EditSupplierModal } from '../components/EditSupplierModal';
import { SupplierBankModal } from '../components/detail/SupplierBankModal';
import { SupplierVatModal } from '../components/detail/SupplierVatModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierApi } from '../api/supplierApi';
import { Loader2, AlertCircle } from 'lucide-react';
import '../supplier.css';

interface Props {
  supplier?: SupplierSummary;
  onBack?: () => void;
  onEdit?: (supplier: SupplierSummary, initialTab?: 'basic' | 'terms' | 'bank') => void;
  onToggleStatus?: (supplier: SupplierSummary) => void;
  onDelete?: (supplier: SupplierSummary) => void;
  onLinkCustomer?: (supplierId: string, customerId: string) => void;
  onSupplierUpdated?: (supplier: SupplierSummary) => void;
}

type TabKey = 'profile' | 'delivery' | 'holidays' | 'payables' | 'history';

const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Hồ sơ chung' },
  { key: 'delivery', label: 'Giao hàng & Cutoff' },
  { key: 'holidays', label: 'Ngày nghỉ lễ' },
  { key: 'payables', label: 'Công nợ & thanh toán' },
  { key: 'history', label: 'Lịch sử giao dịch' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function mapDeliveryDaysToJs(days?: string[]): number[] {
  if (!days?.length) return [1, 2, 3, 4, 5, 6];
  return days
    .map((day) => DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]))
    .filter((index) => index >= 0);
}

function mapJsDaysToNames(days: number[]): string[] {
  return days.map((day) => DAY_NAMES[day]).filter(Boolean);
}

function mapApiToDeliveryConfig(data: any, fallback: SupplierDeliveryConfig): SupplierDeliveryConfig {
  const rawOffset = data.cutoffDayOffset;
  const cutoffDayOffset =
    typeof rawOffset === 'number' && rawOffset >= 0
      ? rawOffset
      : fallback.cutoffDayOffset ?? 1;

  return {
    ...fallback,
    minOrderQuantity: data.minOrderQuantity ?? 0,
    cutoffDayOffset,
    cutoffTime: data.orderCutoffTime || data.cutoffTime || fallback.cutoffTime,
    activeDeliveryDays: mapDeliveryDaysToJs(data.deliveryDays),
    holidays: Array.isArray(data.blackoutDates)
      ? data.blackoutDates.map((item: any) => ({
          id: String(item.id || `hol-${item.startDate}`),
          fromDate: String(item.startDate || '').slice(0, 10),
          toDate: String(item.endDate || '').slice(0, 10),
          reason: item.reason || '',
        }))
      : fallback.holidays,
  };
}

function mapDeliveryConfigToApi(cfg: SupplierDeliveryConfig) {
  return {
    cutoffDayOffset: Math.max(0, Number(cfg.cutoffDayOffset) || 0),
    cutoffTime: cfg.cutoffTime,
    orderCutoffTime: cfg.cutoffTime,
    deliveryDays: mapJsDaysToNames(cfg.activeDeliveryDays),
    minOrderQuantity: cfg.minOrderQuantity,
    blackoutDates: cfg.holidays.map((holiday) => ({
      startDate: holiday.fromDate,
      endDate: holiday.toDate,
      reason: holiday.reason,
      isRecurringAnnual: false,
    })),
  };
}

export const SupplierDetailPage: FC<Props> = ({
  supplier: propSupplier,
  onBack: propOnBack,
  onEdit: propOnEdit,
  onToggleStatus: _propOnToggleStatus,
  onDelete: _propOnDelete,
  onLinkCustomer: propOnLinkCustomer,
  onSupplierUpdated,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;
  const tabs = isStoreOwner ? ALL_TABS : ALL_TABS.filter((t) => t.key !== 'payables');

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Modals state
  const [isEditGeneralModalOpen, setIsEditGeneralModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isVatModalOpen, setIsVatModalOpen] = useState(false);

  // Supplier state from API
  const [currentSupplier, setCurrentSupplier] = useState<SupplierSummary | null>(propSupplier || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propSupplier);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Dynamic delivery config state
  const [deliveryConfig, setDeliveryConfig] = useState<SupplierDeliveryConfig>({
    minOrderQuantity: 0,
    activeDeliveryDays: [1, 2, 3, 4, 5, 6],
    cutoffDayOffset: 1,
    cutoffTime: '17:00',
    allowStoreEdit: true,
    editWindowType: 'BEFORE_CUTOFF',
    hoursBeforeDelivery: 24,
    hoursAfterOrder: 2,
    holidays: [],
  });

  const [apLedgers] = useState<APLedgerEntry[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);

  // Load real supplier from API if not provided in props
  useEffect(() => {
    let isMounted = true;
    const targetId = propSupplier?.id || id;

    if (!targetId) {
      setErrorMessage('Không tìm thấy thông tin định danh nhà cung cấp.');
      setIsLoading(false);
      return;
    }

    if (propSupplier) {
      setCurrentSupplier(propSupplier);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    supplierApi
      .getSupplierById(targetId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setCurrentSupplier(data);
        } else if (!propSupplier) {
          setErrorMessage(`Không tìm thấy nhà cung cấp với mã: ${targetId}`);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        if (!propSupplier) {
          setErrorMessage(err.message || 'Không thể tải thông tin nhà cung cấp.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    if (targetId) {
      // Also load transactions
      supplierApi
        .getSupplierTransactions(targetId)
        .then((res: any) => {
          if (!isMounted) return;
          if (res?.items) {
            setPurchaseOrders(res.items);
          }
        })
        .catch(() => {
          // empty history
        });

      supplierApi
        .getDeliveryConfig(targetId)
        .then((data) => {
          if (!isMounted || !data) return;
          setDeliveryConfig((prev) => mapApiToDeliveryConfig(data, prev));
        })
        .catch(() => {
          // keep local defaults
        });
    }

    return () => {
      isMounted = false;
    };
  }, [id, propSupplier]);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else {
      navigate('/store-owner/suppliers');
    }
  };

  const handleSaveGeneralInfo = async (input: UpdateBasicSupplierInput) => {
    try {
      const updated = await supplierApi.updateBasicSupplier(input.id, input);
      setCurrentSupplier((prev) => (prev ? { ...prev, ...updated } : updated));
      onSupplierUpdated?.(updated);
      showToast(`Đã cập nhật thông tin chung nhà cung cấp ${updated.name} thành công!`, 'success');
      setIsEditGeneralModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleSaveBank = async (input: UpdateSupplierBankInput) => {
    if (!currentSupplier) return;
    try {
      const updated = await supplierApi.updateSupplierBank(currentSupplier.id, input);
      setCurrentSupplier((prev) => (prev ? { ...prev, ...updated } : updated));
      onSupplierUpdated?.(updated);
      showToast(`Đã lưu tài khoản ngân hàng ${updated.bankName || ''} thành công!`, 'success');
      setIsBankModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleDeleteBank = async () => {
    if (!currentSupplier) return;
    try {
      const updated = await supplierApi.updateSupplierBank(currentSupplier.id, {
        bankName: '',
        bankAccount: '',
        accountHolder: '',
      });
      setCurrentSupplier((prev) => (prev ? { ...prev, ...updated, bankName: undefined, bankAccount: undefined, accountHolder: undefined } : updated));
      onSupplierUpdated?.(updated);
      showToast('Đã xóa thông tin tài khoản ngân hàng thành công!', 'success');
      setIsBankModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleSaveVat = async (input: UpdateSupplierVatInput) => {
    if (!currentSupplier) return;
    try {
      const updated = await supplierApi.updateSupplierVat(currentSupplier.id, input);
      setCurrentSupplier((prev) => (prev ? { ...prev, ...updated } : updated));
      onSupplierUpdated?.(updated);
      showToast('Đã lưu thông tin hóa đơn VAT thành công!', 'success');
      setIsVatModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleDeleteVat = async () => {
    if (!currentSupplier) return;
    try {
      const updated = await supplierApi.updateSupplierVat(currentSupplier.id, {
        companyName: '',
        taxCode: currentSupplier.taxCode,
        invoiceAddress: '',
      });
      setCurrentSupplier((prev) => (prev ? { ...prev, ...updated, companyName: undefined, invoiceAddress: undefined } : updated));
      onSupplierUpdated?.(updated);
      showToast('Đã gỡ bỏ thông tin hóa đơn VAT thành công!', 'success');
      setIsVatModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleSaveDeliveryConfig = async (newCfg: SupplierDeliveryConfig) => {
    const supplierId = currentSupplier?.id;
    if (!supplierId) {
      throw new Error('Không xác định được nhà cung cấp.');
    }
    await supplierApi.updateDeliveryConfig(supplierId, mapDeliveryConfigToApi(newCfg));
    setDeliveryConfig(newCfg);
    showToast(
      `Đã lưu cấu hình lịch giao hàng và thời gian Cutoff thành công cho ${currentSupplier?.name || 'nhà cung cấp'}!`,
      'success',
    );
  };

  const handleLinkCustomer = (_supplierId: string, customerId: string) => {
    if (currentSupplier) {
      showToast(`Đã liên kết thành công Hồ sơ Khách hàng ${customerId} cho NCC ${currentSupplier.name}!`, 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="supplier-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#0066FF' }}>
          <Loader2 size={32} className="animate-spin" />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Đang tải thông tin nhà cung cấp...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !currentSupplier) {
    return (
      <div className="supplier-detail-page" style={{ padding: 24 }}>
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#b91c1c',
          }}
        >
          <AlertCircle size={22} />
          <div>
            <div style={{ fontWeight: 600 }}>Thông báo lỗi</div>
            <div style={{ fontSize: 13 }}>{errorMessage || 'Không tìm thấy hồ sơ nhà cung cấp.'}</div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #f87171',
              backgroundColor: '#ffffff',
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-detail-page">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <div className="supplier-detail-container">
        {/* Header with back button, avatar, name (R2 & R3: Status badge & Edit button removed from shared header) */}
        <SupplierDetailHeader
          supplier={currentSupplier}
          onBack={handleBack}
        />

        {/* Section Header */}
        <div className="supplier-detail-section-label">
          THÔNG TIN NHÀ CUNG CẤP
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="supplier-detail-tabs-bar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              data-testid={`tab-btn-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`supplier-detail-tab-pill ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="supplier-detail-tab-content">
          {activeTab === 'profile' && (
            <SupplierGeneralProfileTab
              supplier={currentSupplier}
              canEdit={isStoreOwner}
              onLinkCustomer={propOnLinkCustomer || handleLinkCustomer}
              onEditGeneral={() => {
                if (propOnEdit) {
                  propOnEdit(currentSupplier, 'basic');
                } else {
                  setIsEditGeneralModalOpen(true);
                }
              }}
              onEditBank={() => setIsBankModalOpen(true)}
            />
          )}

          {activeTab === 'delivery' && (
            <SupplierDeliveryConfigTab
              supplier={currentSupplier}
              initialConfig={deliveryConfig}
              onSaveConfig={handleSaveDeliveryConfig}
            />
          )}

          {activeTab === 'holidays' && (
            <SupplierHolidaysTab
              supplier={currentSupplier}
              initialConfig={deliveryConfig}
              onSaveConfig={handleSaveDeliveryConfig}
            />
          )}

          {activeTab === 'payables' && isStoreOwner && (
            <SupplierPayablesTab
              supplier={currentSupplier}
              apLedgers={apLedgers}
            />
          )}

          {activeTab === 'history' && (
            <SupplierHistoryTab
              supplier={currentSupplier}
              purchaseOrders={purchaseOrders}
            />
          )}
        </div>
      </div>

      {/* Modals for General Profile, Bank Account, and VAT Invoice */}
      {isStoreOwner && currentSupplier && (
        <>
          <EditSupplierModal
            isOpen={isEditGeneralModalOpen}
            supplier={currentSupplier}
            onClose={() => setIsEditGeneralModalOpen(false)}
            onSubmit={handleSaveGeneralInfo}
          />

          <SupplierBankModal
            isOpen={isBankModalOpen}
            initialBankName={currentSupplier.bankName}
            initialAccountNumber={currentSupplier.bankAccount || (currentSupplier as any).bankAccountNumber}
            initialAccountHolder={currentSupplier.accountHolder || (currentSupplier as any).bankAccountHolder || currentSupplier.name}
            onClose={() => setIsBankModalOpen(false)}
            onSubmit={handleSaveBank}
            onDelete={handleDeleteBank}
          />

          <SupplierVatModal
            isOpen={isVatModalOpen}
            initialCompanyName={currentSupplier.companyName}
            initialTaxCode={currentSupplier.taxCode}
            initialInvoiceAddress={currentSupplier.invoiceAddress || currentSupplier.address}
            onClose={() => setIsVatModalOpen(false)}
            onSubmit={handleSaveVat}
            onDelete={handleDeleteVat}
          />
        </>
      )}
    </div>
  );
};

export default SupplierDetailPage;
