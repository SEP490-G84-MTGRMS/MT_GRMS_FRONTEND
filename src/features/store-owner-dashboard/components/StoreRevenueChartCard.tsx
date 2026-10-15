import React, { useState } from "react";

type ChartTimeFilter = "today" | "7days" | "month" | "year";

interface ColumnData {
  label: string;
  cash: number; // Triệu VND
  transfer: number; // Triệu VND
  total: number;
}

// Sinh danh sách 30 ngày theo tháng chuẩn KiotViet
const generateMonthDays = (): ColumnData[] => {
  const pattern = [
    { cash: 7.2, transfer: 9.3 }, // 01
    { cash: 7.5, transfer: 9.5 }, // 02
    { cash: 6.8, transfer: 8.4 }, // 03
    { cash: 6.4, transfer: 8.4 }, // 04
    { cash: 9.2, transfer: 12.3 }, // 05 (Chủ nhật cao điểm)
    { cash: 7.0, transfer: 8.8 }, // 06
    { cash: 6.6, transfer: 8.2 }, // 07
    { cash: 7.3, transfer: 9.1 }, // 08
    { cash: 7.8, transfer: 10.2 }, // 09
    { cash: 6.5, transfer: 8.0 }, // 10
    { cash: 6.4, transfer: 8.1 }, // 11
    { cash: 8.0, transfer: 10.5 }, // 12 (Chủ nhật)
    { cash: 7.1, transfer: 8.9 }, // 13
    { cash: 8.2, transfer: 10.8 }, // 14
    { cash: 7.6, transfer: 9.4 }, // 15
    { cash: 6.8, transfer: 8.2 }, // 16
    { cash: 8.5, transfer: 11.2 }, // 17 (Thứ 7)
    { cash: 7.9, transfer: 10.5 }, // 18
    { cash: 7.8, transfer: 10.4 }, // 19
    { cash: 7.2, transfer: 9.0 }, // 20
    { cash: 6.9, transfer: 8.8 }, // 21
    { cash: 6.5, transfer: 8.0 }, // 22
    { cash: 6.0, transfer: 7.5 }, // 23
    { cash: 7.0, transfer: 8.8 }, // 24
    { cash: 6.8, transfer: 8.7 }, // 25
    { cash: 7.7, transfer: 9.8 }, // 26 (Chủ nhật)
    { cash: 7.6, transfer: 9.6 }, // 27
    { cash: 7.0, transfer: 8.5 }, // 28
    { cash: 6.5, transfer: 8.0 }, // 29
    { cash: 7.2, transfer: 9.0 }, // 30
  ];

  return pattern.map((p, i) => {
    const dayStr = String(i + 1).padStart(2, "0");
    const total = Number((p.cash + p.transfer).toFixed(2));
    return {
      label: dayStr,
      cash: p.cash,
      transfer: p.transfer,
      total,
    };
  });
};

export const StoreRevenueChartCard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<ChartTimeFilter>("month");
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
      growthText: string;
      columns: ColumnData[];
      maxScale: number;
    }
  > = {
    today: {
      summaryTotal: "18.650.000 đ",
      cashTotal: "8.200.000 đ",
      transferTotal: "10.450.000 đ",
      cashPercent: 44,
      transferPercent: 56,
      growthText: "+12.5% so với hôm qua",
      maxScale: 6.5,
      columns: [
        { label: "06h - 09h (Sáng sớm)", cash: 1.8, transfer: 1.4, total: 3.2 },
        { label: "09h - 12h (Trưa)", cash: 1.6, transfer: 2.1, total: 3.7 },
        {
          label: "12h - 15h (Đầu chiều)",
          cash: 1.1,
          transfer: 1.5,
          total: 2.6,
        },
        { label: "15h - 18h (Tan tầm)", cash: 2.2, transfer: 2.9, total: 5.1 },
        {
          label: "18h - 22h (Tối cao điểm)",
          cash: 1.5,
          transfer: 2.55,
          total: 4.05,
        },
      ],
    },
    "7days": {
      summaryTotal: "124.850.000 đ",
      cashTotal: "54.200.000 đ",
      transferTotal: "70.650.000 đ",
      cashPercent: 43.4,
      transferPercent: 56.6,
      growthText: "+8.7% so với tuần trước",
      maxScale: 25,
      columns: [
        { label: "T2 (08/10)", cash: 6.4, transfer: 7.8, total: 14.2 },
        { label: "T3 (09/10)", cash: 6.8, transfer: 9.0, total: 15.8 },
        { label: "T4 (10/10)", cash: 6.1, transfer: 7.8, total: 13.9 },
        { label: "T5 (11/10)", cash: 7.5, transfer: 9.6, total: 17.1 },
        { label: "T6 (12/10)", cash: 8.2, transfer: 11.3, total: 19.5 },
        { label: "T7 (13/10)", cash: 9.8, transfer: 13.0, total: 22.8 },
        { label: "CN (14/10)", cash: 9.4, transfer: 12.15, total: 21.55 },
      ],
    },
    month: {
      summaryTotal: "512.400.000 đ",
      cashTotal: "215.000.000 đ",
      transferTotal: "297.400.000 đ",
      cashPercent: 42,
      transferPercent: 58,
      growthText: "+14.2% so với tháng trước",
      maxScale: 24, // Theo ngày trong tháng cao nhất ~21.5M
      columns: generateMonthDays(), // Đủ 30 cột từ ngày 01 đến 30
    },
    year: {
      summaryTotal: "4.862.000.000 đ",
      cashTotal: "2.065.000.000 đ",
      transferTotal: "2.797.000.000 đ",
      cashPercent: 42.5,
      transferPercent: 57.5,
      growthText: "+18.4% so với cùng kỳ 2025",
      maxScale: 620,
      columns: [
        { label: "Tháng 1", cash: 185, transfer: 245, total: 430 },
        { label: "Tháng 2 (Tết)", cash: 260, transfer: 310, total: 570 },
        { label: "Tháng 3", cash: 190, transfer: 250, total: 440 },
        { label: "Tháng 4", cash: 205, transfer: 275, total: 480 },
        { label: "Tháng 5", cash: 198, transfer: 262, total: 460 },
        { label: "Tháng 6", cash: 215, transfer: 285, total: 500 },
        { label: "Tháng 7", cash: 200, transfer: 280, total: 480 },
        { label: "Tháng 8", cash: 210, transfer: 290, total: 500 },
        { label: "Tháng 9", cash: 202, transfer: 288, total: 490 },
        { label: "Tháng 10", cash: 215, transfer: 297, total: 512 },
      ],
    },
  };

  const currentData = dataMap[timeFilter];

  const filterTabs: { key: ChartTimeFilter; label: string }[] = [
    { key: "today", label: "Hôm nay" },
    { key: "7days", label: "7 ngày qua" },
    { key: "month", label: "Tháng này" },
    { key: "year", label: "Năm này" },
  ];

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: "28px 32px",
        border: "1px solid var(--border-light, #EDF2F9)",
        boxShadow: "0 4px 18px rgba(0, 30, 90, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ── 1. Top Section: Tổng tiền kiếm được to ở đầu & Bộ lọc thời gian ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          borderBottom: "1px solid #EDF2F9",
          paddingBottom: 22,
        }}
      >
        {/* Khối con số to đầu tiên */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text-muted, #64748B)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Tổng Doanh Thu Kiếm Được
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: "var(--radius-pill, 9999px)",
                backgroundColor: "#E8F9EE",
                color: "#008738",
                border: "1px solid #BBF7D0",
              }}
            >
              {currentData.growthText}
            </span>
          </div>

          {/* Con số tổng doanh thu to nổi bật */}
          <div
            style={{
              fontSize: "38px",
              fontWeight: 800,
              color: "var(--text-main, #0F172A)",
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.025em",
              marginTop: 4,
            }}
          >
            {currentData.summaryTotal}
          </div>

          {/* Chi tiết 2 dòng tiền: Tiền mặt & Chuyển khoản */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 24,
              marginTop: 10,
              fontSize: "13.5px",
            }}
          >
            {/* Thuộc tính 1: Tiền mặt */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: "#00C853",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#64748B" }}>Tiền mặt:</span>
              <strong
                style={{
                  color: "#0F172A",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {currentData.cashTotal}
              </strong>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#008738",
                  backgroundColor: "#E8F9EE",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-pill, 9999px)",
                }}
              >
                {currentData.cashPercent}%
              </span>
            </div>

            {/* Thuộc tính 2: Chuyển khoản VietQR */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: "var(--blue-primary, #0066FF)",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#64748B" }}>
                Chuyển khoản (VietQR/Bank):
              </span>
              <strong
                style={{
                  color: "var(--blue-primary, #0066FF)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {currentData.transferTotal}
              </strong>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#0052CC",
                  backgroundColor: "#F0F6FF",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-pill, 9999px)",
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
            display: "inline-flex",
            padding: "4px",
            borderRadius: "var(--radius-pill, 9999px)",
            backgroundColor: "#F1F5F9",
            border: "1px solid #E2E8F0",
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
                  padding: "7px 18px",
                  borderRadius: "var(--radius-pill, 9999px)",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#ffffff" : "#64748B",
                  backgroundColor: isActive
                    ? "var(--blue-primary, #0066FF)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Middle Section: Stacked Bar Chart (1 cột có 2 thuộc tính: Tiền mặt + Chuyển khoản) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Khu vực các cột biểu đồ */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: timeFilter === "month" ? 4 : timeFilter === "year" ? 10 : 16,
            height: 380,
            paddingTop: 36,
            paddingBottom: 8,
            borderBottom: "1px solid #EDF2F9",
            position: "relative",
          }}
        >
          {/* Đường lưới tham chiếu ngang 50% */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              borderTop: "1px dashed #E2E8F0",
              pointerEvents: "none",
            }}
          />

          {currentData.columns.map((col, idx) => {
            const isHovered = hoveredIdx === idx;
            // Chiều cao theo tỷ lệ maxScale
            const colTotalHeightPct = Math.min(
              100,
              Math.max(10, (col.total / currentData.maxScale) * 100),
            );
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
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {/* Tooltip khi Hover hoặc Nhãn tổng trên đỉnh cột */}
                {(isHovered || timeFilter !== "month") && (
                  <div
                    style={{
                      position: "absolute",
                      top: isHovered ? -74 : `${100 - colTotalHeightPct - 12}%`,
                      backgroundColor: isHovered ? "#ffffff" : "transparent",
                      color: isHovered ? "var(--text-main, #0F172A)" : "#334155",
                      padding: isHovered ? "8px 12px" : "0",
                      borderRadius: isHovered ? 12 : 0,
                      border: isHovered ? "1px solid var(--blue-border, #DBE9FE)" : "none",
                      fontSize: isHovered ? "11.5px" : "11px",
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', Consolas, monospace",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                      zIndex: isHovered ? 25 : 2,
                      boxShadow: isHovered
                        ? "0 10px 28px rgba(0, 40, 140, 0.15)"
                        : "none",
                      pointerEvents: "none",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    {isHovered ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "var(--blue-primary, #0066FF)",
                            borderBottom: "1px solid #EDF2F9",
                            paddingBottom: 4,
                            marginBottom: 2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {timeFilter === "month"
                            ? `Ngày ${col.label}/10`
                            : col.label}
                          : {col.total}M đ
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "11px",
                            color: "#475569",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              backgroundColor: "#00C853",
                              display: "inline-block",
                            }}
                          />
                          <span>Tiền mặt:</span>
                          <strong style={{ color: "#00C853" }}>
                            {col.cash}M đ
                          </strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "11px",
                            color: "#475569",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              backgroundColor: "var(--blue-primary, #0066FF)",
                              display: "inline-block",
                            }}
                          />
                          <span>VietQR:</span>
                          <strong style={{ color: "var(--blue-primary, #0066FF)" }}>
                            {col.transfer}M đ
                          </strong>
                        </div>
                      </div>
                    ) : (
                      `${col.total}M`
                    )}
                  </div>
                )}

                {/* 1 Cột gồm 2 phần chồng nhau: Chuyển khoản (trên) + Tiền mặt (dưới) */}
                <div
                  style={{
                    width:
                      timeFilter === "month"
                        ? "85%"
                        : timeFilter === "year"
                          ? "75%"
                          : "60%",
                    maxWidth:
                      timeFilter === "month"
                        ? 24
                        : timeFilter === "year"
                          ? 44
                          : 58,
                    height: `${colTotalHeightPct}%`,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "6px 6px 2px 2px",
                    overflow: "hidden",
                    boxShadow: isHovered
                      ? "0 0 0 3px rgba(0, 102, 255, 0.35)"
                      : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Phần trên: Chuyển khoản (Xanh dương) */}
                  <div
                    style={{
                      flex: transferRatio,
                      backgroundColor: isHovered
                        ? "#0052CC"
                        : "var(--blue-primary, #0066FF)",
                      transition: "background-color 0.15s ease",
                    }}
                    title={`Chuyển khoản: ${col.transfer}M`}
                  />

                  {/* Phần dưới: Tiền mặt (Xanh lá) */}
                  <div
                    style={{
                      flex: cashRatio,
                      backgroundColor: isHovered ? "#009E42" : "#00C853",
                      transition: "background-color 0.15s ease",
                    }}
                    title={`Tiền mặt: ${col.cash}M`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Nhãn ngày/thời gian bên dưới từng cột */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: timeFilter === "month" ? 4 : timeFilter === "year" ? 10 : 16,
          }}
        >
          {currentData.columns.map((col, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={col.label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize:
                    timeFilter === "month"
                      ? "11px"
                      : timeFilter === "year"
                        ? "12px"
                        : "12.5px",
                  fontWeight: isHovered ? 700 : 500,
                  color: isHovered ? "var(--blue-primary)" : "#64748B",
                  fontFamily:
                    timeFilter === "month"
                      ? "'JetBrains Mono', Consolas, monospace"
                      : "inherit",
                  transition: "color 0.15s ease",
                  paddingTop: 6,
                  whiteSpace: "nowrap",
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
