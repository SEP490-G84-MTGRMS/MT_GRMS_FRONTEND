import React, { useState } from 'react';

type ChartTimeFilter = 'today' | '7days' | 'month' | 'last_month';

interface ColumnData {
  label: string;
  cash: number; // Triệu VND
  transfer: number; // Triệu VND
  total: number;
}

export const StoreRevenueChartCard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<ChartTimeFilter>('7days');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Dữ liệu theo từng cách chọn
  const dataMap: Record<
    ChartTimeFilter,
    {
      summaryTotal: string;
      cashTotal: string;
      transferTotal: string;
      cashPercent: number;
      transferPercent: number;
      columns: ColumnData[];
      maxScale: number;
    }
  > = {
    today: {
      summaryTotal: '18.650.000 đ',
      cashTotal: '8.200.000 đ',
      transferTotal: '10.450.000 đ',
      cashPercent: 44,
      transferPercent: 56,
      maxScale: 6.5,
      columns: [
        { label: '06h - 09h (Sáng sớm)', cash: 1.8, transfer: 1.4, total: 3.2 },
        { label: '09h - 12h (Trưa)', cash: 1.6, transfer: 2.1, total: 3.7 },
        { label: '12h - 15h (Đầu chiều)', cash: 1.1, transfer: 1.5, total: 2.6 },
        { label: '15h - 18h (Tan tầm)', cash: 2.2, transfer: 2.9, total: 5.1 },
        { label: '18h - 22h (Tối cao điểm)', cash: 1.5, transfer: 2.55, total: 4.05 },
      ],
    },
    '7days': {
      summaryTotal: '124.850.000 đ',
      cashTotal: '54.200.000 đ',
      transferTotal: '70.650.000 đ',
      cashPercent: 43.4,
      transferPercent: 56.6,
      maxScale: 25,
      columns: [
        { label: 'T2 (08/10)', cash: 6.4, transfer: 7.8, total: 14.2 },
        { label: 'T3 (09/10)', cash: 6.8, transfer: 9.0, total: 15.8 },
        { label: 'T4 (10/10)', cash: 6.1, transfer: 7.8, total: 13.9 },
        { label: 'T5 (11/10)', cash: 7.5, transfer: 9.6, total: 17.1 },
        { label: 'T6 (12/10)', cash: 8.2, transfer: 11.3, total: 19.5 },
        { label: 'T7 (13/10)', cash: 9.8, transfer: 13.0, total: 22.8 },
        { label: 'CN (14/10)', cash: 9.4, transfer: 12.15, total: 21.55 },
      ],
    },
    month: {
      summaryTotal: '512.400.000 đ',
      cashTotal: '215.000.000 đ',
      transferTotal: '297.400.000 đ',
      cashPercent: 42,
      transferPercent: 58,
      maxScale: 160,
      columns: [
        { label: 'Tuần 1 (01 - 07/10)', cash: 52.0, transfer: 71.5, total: 123.5 },
        { label: 'Tuần 2 (08 - 14/10)', cash: 54.2, transfer: 70.65, total: 124.85 },
        { label: 'Tuần 3 (15 - 21/10 - Dự kiến)', cash: 56.0, transfer: 76.5, total: 132.5 },
        { label: 'Tuần 4 (22 - 31/10 - Dự kiến)', cash: 52.8, transfer: 78.75, total: 131.55 },
      ],
    },
    last_month: {
      summaryTotal: '489.200.000 đ',
      cashTotal: '218.000.000 đ',
      transferTotal: '271.200.000 đ',
      cashPercent: 44.6,
      transferPercent: 55.4,
      maxScale: 150,
      columns: [
        { label: 'Tuần 1 (01 - 07/09)', cash: 51.5, transfer: 66.5, total: 118.0 },
        { label: 'Tuần 2 (08 - 14/09)', cash: 53.0, transfer: 68.2, total: 121.2 },
        { label: 'Tuần 3 (15 - 21/09)', cash: 55.5, transfer: 69.5, total: 125.0 },
        { label: 'Tuần 4 (22 - 30/09)', cash: 58.0, transfer: 67.0, total: 125.0 },
      ],
    },
  };

  const currentData = dataMap[timeFilter];

  const filterTabs: { key: ChartTimeFilter; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: '7days', label: '7 ngày qua' },
    { key: 'month', label: 'Tháng này' },
    { key: 'last_month', label: 'Tháng trước' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: '28px 32px',
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 4px 18px rgba(0, 30, 90, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Top Section: Tổng tiền kiếm được to ở đầu & Bộ lọc thời gian ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          borderBottom: '1px solid #EDF2F9',
          paddingBottom: 22,
        }}
      >
        {/* Khối con số to đầu tiên */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-muted, #64748B)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Tổng Doanh Thu Kiếm Được
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: '#E8F9EE',
                color: '#008738',
                border: '1px solid #BBF7D0',
              }}
            >
              +12.5% tăng trưởng
            </span>
          </div>

          {/* Con số tổng doanh thu to nổi bật */}
          <div
            style={{
              fontSize: '34px',
              fontWeight: 800,
              color: 'var(--text-main, #0F172A)',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.025em',
              marginTop: 4,
            }}
          >
            {currentData.summaryTotal}
          </div>

          {/* Chi tiết 2 dòng tiền: Tiền mặt & Chuyển khoản */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 24,
              marginTop: 10,
              fontSize: '13.5px',
            }}
          >
            {/* Thuộc tính 1: Tiền mặt */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: '#00C853',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#64748B' }}>Tiền mặt:</span>
              <strong
                style={{
                  color: '#0F172A',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {currentData.cashTotal}
              </strong>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#008738',
                  backgroundColor: '#E8F9EE',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                }}
              >
                {currentData.cashPercent}%
              </span>
            </div>

            {/* Thuộc tính 2: Chuyển khoản VietQR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: 'var(--blue-primary, #0066FF)',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#64748B' }}>Chuyển khoản (VietQR/Bank):</span>
              <strong
                style={{
                  color: 'var(--blue-primary, #0066FF)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {currentData.transferTotal}
              </strong>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#0052CC',
                  backgroundColor: '#F0F6FF',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                }}
              >
                {currentData.transferPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Bộ lọc thời gian Full Pill Button Tabs */}
        <div
          style={{
            display: 'inline-flex',
            padding: '4px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
          }}
        >
          {filterTabs.map((tab) => {
            const isActive = timeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTimeFilter(tab.key)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : '#64748B',
                  backgroundColor: isActive ? 'var(--blue-primary, #0066FF)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Middle Section: Stacked Bar Chart (1 cột có 2 thuộc tính: Tiền mặt + Chuyển khoản) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Khu vực các cột biểu đồ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            height: 260,
            paddingTop: 30,
            paddingBottom: 8,
            borderBottom: '1px solid #EDF2F9',
            position: 'relative',
          }}
        >
          {/* Đường lưới tham chiếu ngang 50% */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              borderTop: '1px dashed #E2E8F0',
              pointerEvents: 'none',
            }}
          />

          {currentData.columns.map((col, idx) => {
            const isHovered = hoveredIdx === idx;
            // Chiều cao theo tỷ lệ maxScale
            const colTotalHeightPct = Math.min(100, Math.max(14, (col.total / currentData.maxScale) * 100));
            // Tỷ lệ tiền mặt trong cột đó
            const cashRatio = col.cash / col.total;
            const transferRatio = col.transfer / col.total;

            return (
              <div
                key={col.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Tooltip khi Hover hoặc Nhãn tổng trên đỉnh cột */}
                <div
                  style={{
                    position: 'absolute',
                    top: isHovered ? -52 : `${100 - colTotalHeightPct - 12}%`,
                    backgroundColor: isHovered ? '#0F172A' : 'transparent',
                    color: isHovered ? '#ffffff' : '#334155',
                    padding: isHovered ? '6px 12px' : '0',
                    borderRadius: isHovered ? 8 : 0,
                    fontSize: isHovered ? '11.5px' : '11px',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', Consolas, monospace",
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    zIndex: isHovered ? 10 : 2,
                    boxShadow: isHovered ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
                    pointerEvents: 'none',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                >
                  {isHovered ? (
                    <div>
                      <div>Tổng: {col.total}M đ</div>
                      <div style={{ color: '#86EFAC', fontSize: '10.5px', marginTop: 2 }}>
                        Tiền mặt: {col.cash}M đ
                      </div>
                      <div style={{ color: '#93C5FD', fontSize: '10.5px' }}>
                        VietQR: {col.transfer}M đ
                      </div>
                    </div>
                  ) : (
                    `${col.total}M`
                  )}
                </div>

                {/* 1 Cột gồm 2 phần chồng nhau: Chuyển khoản (trên) + Tiền mặt (dưới) */}
                <div
                  style={{
                    width: '64%',
                    maxWidth: 58,
                    height: `${colTotalHeightPct}%`,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '8px 8px 3px 3px',
                    overflow: 'hidden',
                    boxShadow: isHovered ? '0 0 0 3px rgba(0, 102, 255, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Phần trên: Chuyển khoản (Xanh dương) */}
                  <div
                    style={{
                      flex: transferRatio,
                      backgroundColor: isHovered ? '#0052CC' : 'var(--blue-primary, #0066FF)',
                      transition: 'background-color 0.15s ease',
                    }}
                    title={`Chuyển khoản: ${col.transfer}M`}
                  />

                  {/* Phần dưới: Tiền mặt (Xanh lá) */}
                  <div
                    style={{
                      flex: cashRatio,
                      backgroundColor: isHovered ? '#009E42' : '#00C853',
                      transition: 'background-color 0.15s ease',
                    }}
                    title={`Tiền mặt: ${col.cash}M`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Nhãn ngày/thời gian bên dưới từng cột */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {currentData.columns.map((col, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={col.label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '12.5px',
                  fontWeight: isHovered ? 700 : 500,
                  color: isHovered ? 'var(--blue-primary)' : '#64748B',
                  transition: 'color 0.15s ease',
                  paddingTop: 6,
                }}
              >
                {col.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
