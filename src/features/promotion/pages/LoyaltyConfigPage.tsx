import { useState, useRef, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Settings, History, Save } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { LoyaltyConfigForm } from '../components/loyalty/LoyaltyConfigForm';
import { LoyaltyLedgerTable } from '../components/loyalty/LoyaltyLedgerTable';
import { AdjustPointsModal, type AdjustPointsFormData } from '../components/loyalty/AdjustPointsModal';
import { promotionApi } from '../api/promotionApi';
import {
  INITIAL_LOYALTY_CONFIG,
} from '../mock/promotionMockData';
import type {
  LoyaltySystemConfig,
  PointLedgerItem,
} from '../types/promotion.types';
import '../promotion.css';

export const LoyaltyConfigPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState<LoyaltySystemConfig>(INITIAL_LOYALTY_CONFIG);
  const [ledger, setLedger] = useState<PointLedgerItem[]>([]);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    promotionApi.getLoyaltyConfig()
      .then((data) => {
        if (data) {
          setConfig((prev) => ({
            ...prev,
            isEnabled: data.isEnabled,
            earningRateAmount: data.earningRateAmount,
            earningPoints: data.earningPoints,
            redemptionRatePoints: data.redemptionRatePoints,
            redemptionRateAmount: data.redemptionRateAmount,
            minRedemptionPoints: data.minRedemptionPoints,
            allowPointsWithPromotions: data.allowPointsWithPromotions,
          }));
        }
      })
      .catch(() => {
        // Fallback to default initial config
      });
  }, []);

  useEffect(() => {
    promotionApi.getLoyaltyLedger()
      .then((items) => setLedger(items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt).toLocaleString('vi-VN'),
      }))))
      .catch(() => {
        setLedger([]);
        showToast('Không thể tải sổ cái điểm từ máy chủ', 'error');
      });
  }, []);

  // Active Tab from query param or default to 'config'
  const tabParam = searchParams.get('tab');
  const activeTab: 'config' | 'ledger' = tabParam === 'ledger' ? 'ledger' : 'config';

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleTabChange = (tab: 'config' | 'ledger') => {
    setSearchParams({ tab });
  };

  const handleToggleEnable = () => {
    const nextState = !config.isEnabled;
    setConfig((prev) => ({ ...prev, isEnabled: nextState }));
    showToast(
      nextState
        ? 'Đã kích hoạt hệ thống tích điểm & đổi thưởng!'
        : 'Đã tạm ngưng tích điểm tại toàn bộ chuỗi!',
      nextState ? 'success' : 'info'
    );
  };

  const handleSaveConfig = async () => {
    const errors: string[] = [];
    if (config.earningRateAmount <= 0) errors.push('Số tiền tích điểm phải lớn hơn 0');
    if (!Number.isInteger(config.earningPoints) || config.earningPoints <= 0) errors.push('Điểm được cộng phải là số nguyên dương');
    if (!Number.isInteger(config.redemptionRatePoints) || config.redemptionRatePoints <= 0) errors.push('Điểm quy đổi phải là số nguyên dương');
    if (config.redemptionRateAmount <= 0) errors.push('Giá trị quy đổi phải lớn hơn 0');
    if (!Number.isInteger(config.minRedemptionPoints) || config.minRedemptionPoints < 0) errors.push('Điểm đổi tối thiểu phải là số nguyên không âm');
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    try {
      setIsSaving(true);
      await promotionApi.updateLoyaltyConfig({
        isEnabled: config.isEnabled,
        earningRateAmount: config.earningRateAmount,
        earningPoints: config.earningPoints,
        redemptionRatePoints: config.redemptionRatePoints,
        redemptionRateAmount: config.redemptionRateAmount,
        minRedemptionPoints: config.minRedemptionPoints,
        allowPointsWithPromotions: config.allowPointsWithPromotions,
      });
      showToast('Đã lưu thành công chính sách tích điểm & đổi thưởng!');
    } catch {
      showToast('Lỗi khi lưu cấu hình tích điểm', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdjustment = async (form: AdjustPointsFormData) => {
    try {
      const entry = await promotionApi.adjustLoyaltyPoints(form);
      if (!entry) throw new Error('Máy chủ không trả về giao dịch vừa tạo');
      setLedger((prev) => [{
        ...entry,
        createdAt: new Date(entry.createdAt).toLocaleString('vi-VN'),
      }, ...prev]);
      showToast('Điều chỉnh điểm và cập nhật sổ cái thành công!');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error?.message || 'Không thể điều chỉnh điểm. Vui lòng kiểm tra khách hàng và số dư điểm.';
      showToast(message, 'error');
      throw error;
    }
  };

  return (
    <div className="promotion-page">
      {/* Shared AdminToast */}
      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(null);
          }}
        />
      )}

      {/* Top Header */}
      <div className="promotion-topbar">
        <div className="promotion-topbar-title">
          <div className="promotion-topbar-icon">
            <Award className="w-6 h-6" />
          </div>
          <div className="promotion-topbar-text">
            <h1>Thiết Lập Tích Điểm & Đổi Thưởng</h1>
            <p>Cấu hình tỷ lệ tích / tiêu điểm và quản lý sổ cái điểm thưởng cho toàn hệ thống</p>
          </div>
        </div>
      </div>

      {/* Centered Page Wrapper */}
      <div className="loyalty-page-wrapper">
        {/* Navigation & Action Bar on a Single Row to Prevent Overflow */}
        <div className="loyalty-header-action-bar">
          <div className="loyalty-nav-tabs">
            <button
              onClick={() => handleTabChange('config')}
              className={`loyalty-nav-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            >
              <Settings className="w-4 h-4" />
              <span>Cấu hình chính sách tích điểm</span>
            </button>

            <button
              onClick={() => handleTabChange('ledger')}
              className={`loyalty-nav-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            >
              <History className="w-4 h-4" />
              <span>Sổ cái lịch sử biến động điểm</span>
              <span className="loyalty-tab-count">{ledger.length}</span>
            </button>
          </div>

          {/* Quick Controls in Header (Zero Scroll Needed) */}
          {activeTab === 'config' && (
            <div className="loyalty-header-right-actions">
              <div
                className={`loyalty-switch-pill ${config.isEnabled ? 'active' : 'inactive'}`}
                onClick={handleToggleEnable}
                title={config.isEnabled ? 'Nhấp để tạm ngưng tích điểm' : 'Nhấp để kích hoạt tích điểm'}
              >
                <span className="loyalty-switch-status-text">
                  {config.isEnabled ? '● Tích điểm: Đang bật' : '⏸ Tích điểm: Tắt'}
                </span>
                <div className={`switch-track switch-track-sm ${config.isEnabled ? 'switch-active' : ''}`}>
                  <div className="switch-thumb switch-thumb-sm" />
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                className="btn-primary-pill loyalty-save-btn-top"
                disabled={!config.isEnabled || isSaving}
              >
                <Save size={15} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thiết lập'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area based on Tab */}
        {activeTab === 'config' ? (
          <>
            {validationErrors.length > 0 && (
              <div role="alert" className="promo-validation-summary">
                <strong>Vui lòng kiểm tra lại thiết lập tích điểm:</strong>
                <ul>
                  {validationErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
            <LoyaltyConfigForm
              config={config}
              onChange={(nextConfig) => {
                setConfig(nextConfig);
                if (validationErrors.length) setValidationErrors([]);
              }}
              onSave={handleSaveConfig}
            />
          </>
        ) : (
          <LoyaltyLedgerTable
            ledger={ledger}
            onOpenAdjustModal={() => setIsAdjustModalOpen(true)}
          />
        )}
      </div>

      {/* Adjust Points Modal */}
      <AdjustPointsModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSave={handleSaveAdjustment}
      />
    </div>
  );
};
