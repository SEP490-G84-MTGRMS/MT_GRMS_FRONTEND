import type { FC } from 'react';
import { Skull, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { BatchKpiSummary, BatchStatus } from '../types/batch.types';

interface BatchKpiCardsProps {
  summary: BatchKpiSummary;
  activeStatus: 'ALL' | BatchStatus;
  onStatusClick: (status: BatchStatus) => void;
}

export const BatchKpiCards: FC<BatchKpiCardsProps> = ({
  summary,
  activeStatus,
  onStatusClick,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12,
        marginBottom: 12,
      }}
    >
      {/* 1. Expired (<= 0 Days) */}
      <div
        onClick={() => onStatusClick('Expired')}
        style={{
          backgroundColor: activeStatus === 'Expired' ? '#ffe4e6' : '#fff1f2',
          border: activeStatus === 'Expired' ? '2px solid #e11d48' : '1px solid #fecdd3',
          borderRadius: 8,
          padding: '12px 14px',
          cursor: 'pointer',
          boxShadow:
            activeStatus === 'Expired'
              ? '0 0 0 2px rgba(225, 29, 72, 0.2), 0 2px 4px rgba(0,0,0,0.05)'
              : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        title="Nhấp để lọc danh sách lô đã quá hạn sử dụng"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#9f1239',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Skull size={14} color="#e11d48" />
            <span>Quá hạn (≤ 0 ngày)</span>
          </span>
          {activeStatus === 'Expired' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: '#e11d48',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              Đang lọc
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#881337', fontFamily: 'monospace' }}>
            {summary.expiredCount}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#9f1239' }}>Lô hàng</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#be123c', fontWeight: 500 }}>
          ⚠️ Bắt buộc xuất hủy / Tiêu hủy (Write-off)
        </div>
      </div>

      {/* 2. Critical (1 - 3 Days) */}
      <div
        onClick={() => onStatusClick('Critical')}
        style={{
          backgroundColor: activeStatus === 'Critical' ? '#fef3c7' : '#fffbeb',
          border: activeStatus === 'Critical' ? '2px solid #d97706' : '1px solid #fde68a',
          borderRadius: 8,
          padding: '12px 14px',
          cursor: 'pointer',
          boxShadow:
            activeStatus === 'Critical'
              ? '0 0 0 2px rgba(217, 119, 6, 0.2), 0 2px 4px rgba(0,0,0,0.05)'
              : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        title="Nhấp để lọc danh sách lô cực kỳ cận date (1 - 3 ngày)"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#92400e',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <AlertTriangle size={14} color="#d97706" />
            <span>Khẩn cấp (1 - 3 ngày)</span>
          </span>
          {activeStatus === 'Critical' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              Đang lọc
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#78350f', fontFamily: 'monospace' }}>
            {summary.criticalCount}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Lô hàng</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#b45309', fontWeight: 500 }}>
          🚨 Nguy cơ cao — Xả hàng hoặc xuất hủy
        </div>
      </div>

      {/* 3. Warning (4 - 30 Days) */}
      <div
        onClick={() => onStatusClick('Warning')}
        style={{
          backgroundColor: activeStatus === 'Warning' ? '#dbeafe' : '#eff6ff',
          border: activeStatus === 'Warning' ? '2px solid #2563eb' : '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '12px 14px',
          cursor: 'pointer',
          boxShadow:
            activeStatus === 'Warning'
              ? '0 0 0 2px rgba(37, 99, 235, 0.2), 0 2px 4px rgba(0,0,0,0.05)'
              : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        title="Nhấp để lọc danh sách lô cảnh báo cận date (4 - 30 ngày)"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#1e40af',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <AlertCircle size={14} color="#2563eb" />
            <span>Cảnh báo (4 - 30 ngày)</span>
          </span>
          {activeStatus === 'Warning' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              Đang lọc
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', fontFamily: 'monospace' }}>
            {summary.warningCount}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>Lô hàng</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 500 }}>
          🏷️ Đề xuất áp dụng giảm giá FEFO Markdown
        </div>
      </div>

      {/* 4. Normal (> 30 Days) */}
      <div
        onClick={() => onStatusClick('Normal')}
        style={{
          backgroundColor: activeStatus === 'Normal' ? '#dcfce7' : '#f0fdf4',
          border: activeStatus === 'Normal' ? '2px solid #16a34a' : '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '12px 14px',
          cursor: 'pointer',
          boxShadow:
            activeStatus === 'Normal'
              ? '0 0 0 2px rgba(22, 163, 74, 0.2), 0 2px 4px rgba(0,0,0,0.05)'
              : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        title="Nhấp để lọc danh sách lô hạn an toàn (> 30 ngày)"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <CheckCircle2 size={14} color="#16a34a" />
            <span>An toàn (&gt; 30 ngày)</span>
          </span>
          {activeStatus === 'Normal' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              Đang lọc
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#14532d', fontFamily: 'monospace' }}>
            {summary.normalCount}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Lô hàng</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 500 }}>
          ✅ Hạn sử dụng an toàn, xuất bán bình thường
        </div>
      </div>
    </div>
  );
};
