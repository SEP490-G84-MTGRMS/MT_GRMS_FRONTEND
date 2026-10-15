import React, { useState } from 'react';
import type { TimeFilter } from '../types/dashboard.types';
import { StoreOwnerHeader } from '../components/StoreOwnerHeader';
import { StoreOwnerKpiRow } from '../components/StoreOwnerKpiRow';
import { StoreRevenueChartCard } from '../components/StoreRevenueChartCard';
import { FefoWarningCard } from '../components/FefoWarningCard';
import { LowStockWarningCard } from '../components/LowStockWarningCard';
import { TopSellingProductsCard } from '../components/TopSellingProductsCard';
import { StoreQuickActionsCard } from '../components/StoreQuickActionsCard';

export const StoreOwnerDashboardPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        paddingBottom: 40,
        maxWidth: 1600,
        margin: '0 auto',
      }}
    >
      {/* 1. Header & Bộ lọc thời gian */}
      <StoreOwnerHeader
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        storeName="Tạp Hóa Minh Đức"
        branchName="Chi nhánh 1 (Quận 9, TP.HCM)"
      />

      {/* 2. Hàng 4 thẻ KPI chỉ số bán lẻ */}
      <StoreOwnerKpiRow timeFilter={timeFilter} />

      {/* 3. BIỂU ĐỒ TO Ở GIỮA: Doanh số & 1 cột có 2 thuộc tính Tiền mặt + Chuyển khoản */}
      <div style={{ width: '100%' }}>
        <StoreRevenueChartCard />
      </div>

      {/* 4. Dải phím tắt thao tác nhanh tinh gọn */}
      <StoreQuickActionsCard />

      {/* 5. Hàng 3 cột cân đối: Cảnh báo FEFO | Cảnh báo Tồn tối thiểu | Top Hàng Bán Chạy */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        <FefoWarningCard />
        <LowStockWarningCard />
        <TopSellingProductsCard />
      </div>
    </div>
  );
};

export default StoreOwnerDashboardPage;
