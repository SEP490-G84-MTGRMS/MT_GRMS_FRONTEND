import type { FC } from 'react';
import { Zap, Clock, Calendar, CheckCircle2 } from 'lucide-react';

interface DispatchUrgencyBarProps {
  totalSuppliers: number;
  totalSkuCount: number;
  totalAmount: number;
  criticalCount: number;
  todayCount: number;
  laterCount: number;
  completedCount: number;
  onQuickDispatchToday: () => void;
}

export const DispatchUrgencyBar: FC<DispatchUrgencyBarProps> = ({
  totalSuppliers,
  totalSkuCount,
  totalAmount,
  criticalCount,
  todayCount,
  laterCount,
  completedCount,
  onQuickDispatchToday,
}) => {
  const todayDueCount = criticalCount + todayCount;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* ── Left: Summary Metrics ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tổng đơn nháp chờ chốt
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {totalSuppliers} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Nhà cung cấp</span>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              {totalSkuCount} SKU
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0d9488' }}>
              {totalAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 38, background: '#e2e8f0' }} />

        {/* ── Center: Urgency Deadline Badges ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Critical Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontSize: 12,
              fontWeight: 700,
              color: '#b91c1c',
            }}
            title="Các NCC có giờ Cutoff trong vòng 2 giờ tới"
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#dc2626',
                display: 'inline-block',
                boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)',
              }}
            />
            <span>Sắp hết hạn (&lt; 2h):</span>
            <strong style={{ fontSize: 13 }}>{criticalCount} NCC</strong>
          </div>

          {/* Today Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              fontSize: 12,
              fontWeight: 600,
              color: '#b45309',
            }}
          >
            <Clock size={14} color="#d97706" />
            <span>Trong hôm nay:</span>
            <strong style={{ fontSize: 13 }}>{todayCount} NCC</strong>
          </div>

          {/* Later in week Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: 12,
              fontWeight: 500,
              color: '#475569',
            }}
          >
            <Calendar size={14} color="#64748b" />
            <span>Đợt tới:</span>
            <strong style={{ fontSize: 13 }}>{laterCount} NCC</strong>
          </div>

          {completedCount > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                fontSize: 12,
                fontWeight: 600,
                color: '#15803d',
              }}
            >
              <CheckCircle2 size={14} color="#16a34a" />
              <span>Đã phát hành:</span>
              <strong style={{ fontSize: 13 }}>{completedCount} PO</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Quick Action Button ── */}
      <div>
        <button
          type="button"
          onClick={onQuickDispatchToday}
          disabled={todayDueCount === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 6,
            background: todayDueCount > 0 ? '#dc2626' : '#94a3b8',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: todayDueCount > 0 ? 'pointer' : 'not-allowed',
            boxShadow: todayDueCount > 0 ? '0 2px 6px rgba(220, 38, 38, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title={
            todayDueCount > 0
              ? `Chốt nhanh ${todayDueCount} nhà cung cấp có hạn cutoff trong hôm nay`
              : 'Không còn đơn nào cần chốt trong hôm nay'
          }
        >
          <Zap size={16} fill="#ffffff" />
          <span>Chốt nhanh các đơn hết hạn hôm nay ({todayDueCount})</span>
        </button>
      </div>
    </div>
  );
};
