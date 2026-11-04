import { useState, useRef, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Settings, History, Save } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { LoyaltyConfigForm } from '../components/loyalty/LoyaltyConfigForm';
import { LoyaltyLedgerTable } from '../components/loyalty/LoyaltyLedgerTable';
import { AdjustPointsModal } from '../components/loyalty/AdjustPointsModal';
import {
  INITIAL_LOYALTY_CONFIG,
  INITIAL_POINT_LEDGER,
} from '../mock/promotionMockData';
import type {
  LoyaltySystemConfig,
  PointLedgerItem,
} from '../types/promotion.types';
import '../promotion.css';

export const LoyaltyConfigPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState<LoyaltySystemConfig>(INITIAL_LOYALTY_CONFIG);
  const [ledger, setLedger] = useState<PointLedgerItem[]>(INITIAL_POINT_LEDGER);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Active Tab from query param or default to 'config'
  const tabParam = searchParams.get('tab');
  const viewParam = searchParams.get('view');
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

  // Scroll to membership tiers if ?view=tiers
  useEffect(() => {
    if (viewParam === 'tiers') {
      const el = document.getElementById('membership-tiers-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [viewParam, activeTab]);

  const handleSaveConfig = () => {
    showToast('Đã lưu thành công chính sách tích điểm & hạng thẻ!');
  };

  const handleSaveAdjustment = (entry: PointLedgerItem) => {
    setLedger((prev) => [entry, ...prev]);
    showToast(
      `Đã điều chỉnh ${entry.pointsChanged > 0 ? '+' : ''}${entry.pointsChanged} điểm cho khách hàng ${entry.customerName}!`
    );
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
            <h1>Thiết Lập Tích Điểm & Hạng Thẻ</h1>
            <p>Cấu hình tỷ lệ tích / tiêu điểm, chính sách nâng hạng thẻ và quản lý sổ cái điểm thưởng</p>
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
              <span>Cấu hình tích điểm & Hạng thẻ</span>
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
                disabled={!config.isEnabled}
              >
                <Save size={15} />
                <span>Lưu thiết lập</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area based on Tab */}
        {activeTab === 'config' ? (
          <LoyaltyConfigForm
            config={config}
            onChange={setConfig}
            onSave={handleSaveConfig}
          />
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
