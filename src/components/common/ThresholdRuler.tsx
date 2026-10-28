import React from 'react';
import { ShieldAlert, AlertCircle, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';
import { formatMoney } from '../../features/finance/utils/formatters';
import { HouseholdTaxGroup } from '../../features/tax-snapshot/types/taxSnapshot';

interface ThresholdRulerProps {
  currentYtdRevenue: number;
  threshold?: number;
  warningThreshold?: number;
  year?: number;
  quarter?: number;
  householdGroup?: HouseholdTaxGroup;
  onHelpClick?: () => void;
}

export const ThresholdRuler: React.FC<ThresholdRulerProps> = ({
  currentYtdRevenue,
  threshold = 1000000000,
  warningThreshold = 850000000,
  year = 2026,
  quarter = 3,
  householdGroup,
  onHelpClick,
}) => {
  // If the business is in Group 3 (> 3B) or Group 4 (> 50B)
  if (
    householdGroup === HouseholdTaxGroup.Group3_3BTo50B ||
    householdGroup === HouseholdTaxGroup.Group4_Over50B ||
    currentYtdRevenue > 3000000000
  ) {
    return (
      <div
        style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 1px 4px rgba(217, 119, 6, 0.06)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#D97706',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#92400E', display: 'block' }}>
              Hộ kinh doanh quy mô lớn (Doanh thu lũy kế: {formatMoney(currentYtdRevenue)})
            </span>
            <span style={{ fontSize: '0.8rem', color: '#B45309', marginTop: '2px', display: 'block' }}>
              Quy mô thuộc nhóm kê khai theo chế độ kế toán chi tiết (Doanh thu - Chi phí).
            </span>
          </div>
        </div>
      </div>
    );
  }

  const percentage = Math.min(100, Math.max(0, (currentYtdRevenue / threshold) * 100));
  const excessAmount = Math.max(0, currentYtdRevenue - threshold);
  const remainingAmount = Math.max(0, threshold - currentYtdRevenue);

  let statusBadgeBg = '#ECFDF5';
  let statusBadgeText = '#065F46';
  let statusLabel = 'Đang trong hạn mức miễn thuế 100%';
  let icon = <CheckCircle2 size={16} color="#059669" />;

  if (currentYtdRevenue > threshold) {
    statusBadgeBg = '#FEF2F2';
    statusBadgeText = '#991B1B';
    statusLabel = `Đã vượt hạn mức ${formatMoney(excessAmount)} (Phần vượt chịu thuế TNCN)`;
    icon = <AlertCircle size={16} color="#DC2626" />;
  } else if (currentYtdRevenue >= warningThreshold) {
    statusBadgeBg = '#FFFBEB';
    statusBadgeText = '#92400E';
    statusLabel = `Vùng cảnh báo: Còn ${formatMoney(remainingAmount)} sẽ chạm ngưỡng tính thuế`;
    icon = <TrendingUp size={16} color="#D97706" />;
  }

  const greenPct = (warningThreshold / threshold) * 100; // 85%
  const yellowPct = ((threshold - warningThreshold) / threshold) * 100; // 15%

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: '20px',
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: statusBadgeBg,
              color: statusBadgeText,
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {icon}
            <span>{statusLabel}</span>
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>
            (Theo quy định quản lý thuế hộ kinh doanh cá thể hiện hành)
          </span>
        </div>

        {onHelpClick && (
          <button
            onClick={onHelpClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.76rem',
              color: '#0F766E',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <HelpCircle size={14} />
            <span>Cách tính lũy kế theo năm</span>
          </button>
        )}
      </div>

      {/* Progress Bar Container */}
      <div style={{ position: 'relative', margin: '22px 0 14px 0' }}>
        <div
          style={{
            height: '14px',
            borderRadius: '9999px',
            backgroundColor: '#E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            width: '100%',
          }}
        >
          <div
            title="Vùng 1: Miễn thuế 100% (0 - 850M)"
            style={{
              width: `${greenPct}%`,
              backgroundColor: '#10B981',
              height: '100%',
            }}
          />
          <div
            title="Vùng 2: Cảnh báo (850M - 1 Tỷ)"
            style={{
              width: `${yellowPct}%`,
              backgroundColor: '#F59E0B',
              height: '100%',
            }}
          />
        </div>

        {/* Current Pin Marker */}
        <div
          style={{
            position: 'absolute',
            left: `${percentage}%`,
            top: '-5px',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '12px',
              height: '24px',
              backgroundColor: '#0F172A',
              borderRadius: '6px',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: '28px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#0F172A',
              whiteSpace: 'nowrap',
              background: '#F1F5F9',
              padding: '2px 6px',
              borderRadius: '5px',
              border: '1px solid #CBD5E1',
            }}
          >
            Hiện tại: {formatMoney(currentYtdRevenue)}
          </span>
        </div>

        {/* 1 Billion Threshold Milestone Flag */}
        <div
          style={{
            position: 'absolute',
            left: '100%',
            top: '-20px',
            transform: 'translateX(-100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#DC2626',
              background: '#FEE2E2',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #FECACA',
              whiteSpace: 'nowrap',
            }}
          >
            Ngưỡng 1.000.000.000 VND
          </span>
        </div>
      </div>

      {/* Detail explanation footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '36px',
          paddingTop: '10px',
          borderTop: '1px dashed #E2E8F0',
          fontSize: '0.76rem',
          color: '#64748B',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <span>Lũy kế YTD (Quý 1 đến Quý {quarter}/{year}): </span>
          <strong style={{ color: '#0F172A' }}>{formatMoney(currentYtdRevenue)}</strong>
        </div>
        <div>
          <span>Phần doanh thu vượt ngưỡng chịu thuế TNCN: </span>
          <strong style={{ color: currentYtdRevenue > threshold ? '#DC2626' : '#10B981' }}>
            {currentYtdRevenue > threshold
              ? formatMoney(excessAmount)
              : '0 VND (Chưa vượt 1 tỷ)'}
          </strong>
        </div>
      </div>
    </div>
  );
};
export default ThresholdRuler;

