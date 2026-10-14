import { useState, useMemo, useRef, type FC } from 'react';
import { Award, Coins, Sparkles, TrendingUp, Users } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { PromotionKpiCards, type KpiCardItem } from '../components/common/PromotionKpiCards';
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
  const [config, setConfig] = useState<LoyaltySystemConfig>(INITIAL_LOYALTY_CONFIG);
  const [ledger, setLedger] = useState<PointLedgerItem[]>(INITIAL_POINT_LEDGER);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

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

  // KPI calculations
  const kpiCards: KpiCardItem[] = useMemo(() => {
    const totalCirculating = 8450; // Mock total points in system
    const redeemedThisMonth = 1250;
    const activeMembers = 342;

    return [
      {
        id: 'kpi-l1',
        title: 'Điểm đang lưu hành',
        value: totalCirculating.toLocaleString('vi-VN'),
        subText: 'Quy đổi ~ 8,450,000 đ quỹ thưởng',
        icon: <Coins className="w-5 h-5" />,
        colorClass: 'kpi-icon-teal',
      },
      {
        id: 'kpi-l2',
        title: 'Đã tiêu trong tháng',
        value: redeemedThisMonth.toLocaleString('vi-VN'),
        subText: 'Trừ tương ứng 1.25M đ vào hóa đơn',
        icon: <TrendingUp className="w-5 h-5" />,
        colorClass: 'kpi-icon-blue',
      },
      {
        id: 'kpi-l3',
        title: 'Khách hàng có điểm',
        value: activeMembers,
        subText: 'Đã tham gia tích lũy thành công',
        icon: <Users className="w-5 h-5" />,
        colorClass: 'kpi-icon-amber',
      },
      {
        id: 'kpi-l4',
        title: 'Trạng thái tích điểm',
        value: config.isEnabled ? 'Đang kích hoạt' : 'Tạm tắt',
        subText: `10k đ = 1đ | 1đ = ${config.redemptionRateAmount} đ`,
        icon: <Sparkles className="w-5 h-5" />,
        colorClass: 'kpi-icon-purple',
      },
    ];
  }, [config]);

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

      {/* KPI Cards */}
      <PromotionKpiCards cards={kpiCards} />

      {/* 2-Column Split: Config on Left, Ledger Table on Right */}
      <div className="loyalty-grid-layout">
        <LoyaltyConfigForm
          config={config}
          onChange={setConfig}
          onSave={handleSaveConfig}
        />

        <LoyaltyLedgerTable
          ledger={ledger}
          onOpenAdjustModal={() => setIsAdjustModalOpen(true)}
        />
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
