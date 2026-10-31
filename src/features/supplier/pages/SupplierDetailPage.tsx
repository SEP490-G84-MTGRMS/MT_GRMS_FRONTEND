import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import type {
  SupplierSummary,
  APLedgerEntry,
  SupplierDeliveryConfig,
  PurchaseOrderItem,
} from '../types/supplier.types';
import { SupplierDetailHeader } from '../components/detail/SupplierDetailHeader';
import { SupplierGeneralProfileTab } from '../components/detail/SupplierGeneralProfileTab';
import { SupplierDeliveryConfigTab } from '../components/detail/SupplierDeliveryConfigTab';
import { SupplierHolidaysTab } from '../components/detail/SupplierHolidaysTab';
import { SupplierPayablesTab } from '../components/detail/SupplierPayablesTab';
import { SupplierHistoryTab } from '../components/detail/SupplierHistoryTab';
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
  return {
    ...fallback,
    leadTimeDays: data.leadTimeDays ?? fallback.leadTimeDays,
    minOrderQuantity: data.minOrderQuantity ?? 0,
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
    leadTimeHours: Math.max(0, cfg.leadTimeDays * 24),
    leadTimeDays: cfg.leadTimeDays,
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
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;
  const tabs = isStoreOwner ? ALL_TABS : ALL_TABS.filter((t) => t.key !== 'payables');

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Supplier state from API
  const [currentSupplier, setCurrentSupplier] = useState<SupplierSummary | null>(propSupplier || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propSupplier);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic delivery config state
  const [deliveryConfig, setDeliveryConfig] = useState<SupplierDeliveryConfig>({
    leadTimeDays: 1,
    leadTimeUnit: 'BUSINESS_DAYS',
    minOrderQuantity: 0,
    activeDeliveryDays: [1, 2, 3, 4, 5, 6],
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

    if (propSupplier) {
      setCurrentSupplier(propSupplier);
      setIsLoading(false);
    } else if (id) {
      setIsLoading(true);
      setErrorMessage(null);

      supplierApi
        .getSupplierById(id)
        .then((data) => {
          if (!isMounted) return;
          if (data) {
            setCurrentSupplier(data);
          } else {
            setErrorMessage(`Không tìm thấy nhà cung cấp với mã: ${id}`);
          }
        })
        .catch((err: any) => {
          if (!isMounted) return;
          setErrorMessage(err.message || 'Không thể tải thông tin nhà cung cấp.');
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setErrorMessage('Không tìm thấy thông tin định danh nhà cung cấp.');
      setIsLoading(false);
      return;
    }

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

  const handleEdit = (tab: 'basic' | 'terms' | 'bank' = 'basic') => {
    if (currentSupplier && propOnEdit) {
      propOnEdit(currentSupplier, tab);
    } else if (currentSupplier) {
      alert(`Mở hộp thoại chỉnh sửa NCC ${currentSupplier.name}`);
    }
  };

  const handleSaveDeliveryConfig = async (newCfg: SupplierDeliveryConfig) => {
    const supplierId = currentSupplier?.id;
    if (!supplierId) {
      throw new Error('Không xác định được nhà cung cấp.');
    }
    await supplierApi.updateDeliveryConfig(supplierId, mapDeliveryConfigToApi(newCfg));
    setDeliveryConfig(newCfg);
  };

  const handleLinkCustomer = (_supplierId: string, customerId: string) => {
    if (currentSupplier) {
      alert(`Đã liên kết thành công Hồ sơ Khách hàng ${customerId} cho NCC ${currentSupplier.name}!`);
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
      <div className="supplier-detail-container">
        {/* Header with back button, avatar, name, and edit button */}
        <SupplierDetailHeader
          supplier={currentSupplier}
          onBack={handleBack}
          onEdit={() => handleEdit('basic')}
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
              onLinkCustomer={propOnLinkCustomer || handleLinkCustomer}
              onEdit={propOnEdit ? handleEdit : undefined}
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
    </div>
  );
};

export default SupplierDetailPage;
