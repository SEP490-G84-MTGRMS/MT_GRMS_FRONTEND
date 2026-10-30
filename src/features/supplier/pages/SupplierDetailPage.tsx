import { useState } from 'react';
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
import {
  INITIAL_SUPPLIERS,
  INITIAL_AP_LEDGERS,
  DEFAULT_DELIVERY_CONFIGS,
  MOCK_PURCHASE_ORDERS,
} from '../lib/mockData';
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

  // Resolved Supplier (from props or from params)
  const currentSupplier: SupplierSummary =
    propSupplier ||
    INITIAL_SUPPLIERS.find((s) => s.id === id || s.code === id) ||
    INITIAL_SUPPLIERS[0];

  // Dynamic delivery config state for this supplier
  const [deliveryConfigs, setDeliveryConfigs] = useState<Record<string, SupplierDeliveryConfig>>(
    DEFAULT_DELIVERY_CONFIGS
  );

  const deliveryConfig =
    deliveryConfigs[currentSupplier.id] ||
    DEFAULT_DELIVERY_CONFIGS['supp-001'];

  const apLedgers: APLedgerEntry[] =
    INITIAL_AP_LEDGERS[currentSupplier.id] || [];

  const purchaseOrders: PurchaseOrderItem[] =
    MOCK_PURCHASE_ORDERS[currentSupplier.id] ||
    MOCK_PURCHASE_ORDERS['supp-001'] ||
    [];

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else {
      navigate('/store-owner/suppliers');
    }
  };

  const handleEdit = (tab: 'basic' | 'terms' | 'bank' = 'basic') => {
    if (propOnEdit) {
      propOnEdit(currentSupplier, tab);
    } else {
      alert(`Mở hộp thoại chỉnh sửa NCC ${currentSupplier.name}`);
    }
  };

  const handleSaveDeliveryConfig = (newCfg: SupplierDeliveryConfig) => {
    setDeliveryConfigs((prev) => ({
      ...prev,
      [currentSupplier.id]: newCfg,
    }));
  };

  const handleLinkCustomer = (_supplierId: string, customerId: string) => {
    alert(`Đã liên kết thành công Hồ sơ Khách hàng ${customerId} cho NCC ${currentSupplier.name}!`);
  };

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
