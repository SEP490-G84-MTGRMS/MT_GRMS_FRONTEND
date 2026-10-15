import type {
  BranchOption,
  ExpenseCategoryBreakdown,
  KpiSummaryData,
  PnlFilterParams,
  PnlLineItem,
  PnlReportResponse,
  PnlTrendPoint,
  TopProductPerformance,
} from '../types/reportsPnl.types';

/**
 * Safely calculates percentage avoiding division by zero.
 * @param part - The numerator value.
 * @param total - The denominator value.
 * @returns Rounded percentage float number.
 */
export function calculateMarginPct(part: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.round(((part / total) * 100) * 10) / 10;
}

/**
 * Mock branches for tenant.
 */
export const MOCK_BRANCHES: BranchOption[] = [
  { id: 'ALL', code: 'ALL', name: 'Toàn hệ thống (Tất cả chi nhánh)', isMain: true },
  { id: 'b1-cauthuong', code: 'CN-01', name: 'Chi nhánh Cầu Giấy - Hà Nội', isMain: true },
  { id: 'b2-dongda', code: 'CN-02', name: 'Chi nhánh Đống Đa - Hà Nội' },
  { id: 'b3-haibatrung', code: 'CN-03', name: 'Chi nhánh Hai Bà Trưng - Hà Nội' },
];

/**
 * Generates mock P&L tree based on financial figures.
 */
function buildMockPnlTree(kpi: KpiSummaryData): PnlLineItem[] {
  const rev = kpi.netRevenue;
  return [
    {
      id: 'sec-1',
      code: 'I',
      title: 'I. DOANH THU BÁN HÀNG & CUNG CẤP DỊCH VỤ',
      level: 1,
      amount: kpi.grossSales,
      percentageOfNetRevenue: calculateMarginPct(kpi.grossSales, rev),
      isHeader: true,
      children: [
        {
          id: 'item-1-1',
          code: '1.1',
          title: 'Doanh thu bán lẻ gộp (Gross Sales)',
          level: 2,
          amount: kpi.grossSales,
          percentageOfNetRevenue: calculateMarginPct(kpi.grossSales, rev),
        },
        {
          id: 'item-1-2',
          code: '1.2',
          title: 'Các khoản giảm trừ doanh thu',
          level: 2,
          amount: kpi.discounts + kpi.returns,
          percentageOfNetRevenue: calculateMarginPct(kpi.discounts + kpi.returns, rev),
          isNegative: true,
          children: [
            {
              id: 'item-1-2-1',
              code: '1.2.a',
              title: 'Chiết khấu & Giảm giá khuyến mãi',
              level: 3,
              amount: kpi.discounts,
              percentageOfNetRevenue: calculateMarginPct(kpi.discounts, rev),
              isNegative: true,
            },
            {
              id: 'item-1-2-2',
              code: '1.2.b',
              title: 'Hàng bán bị trả lại & Hoàn tiền (FE-13)',
              level: 3,
              amount: kpi.returns,
              percentageOfNetRevenue: calculateMarginPct(kpi.returns, rev),
              isNegative: true,
            },
          ],
        },
      ],
    },
    {
      id: 'total-net-rev',
      code: 'REV-NET',
      title: 'DOANH THU THUẦN (1.1 - 1.2)',
      level: 1,
      amount: kpi.netRevenue,
      percentageOfNetRevenue: 100.0,
      isTotal: true,
    },
    {
      id: 'sec-2',
      code: 'II',
      title: 'II. GIÁ VỐN HÀNG BÁN (COGS)',
      level: 1,
      amount: kpi.cogs,
      percentageOfNetRevenue: calculateMarginPct(kpi.cogs, rev),
      isNegative: true,
      children: [
        {
          id: 'item-2-1',
          code: '2.1',
          title: 'Giá vốn xuất kho bán hàng (Tính theo FEFO)',
          level: 2,
          amount: kpi.cogs,
          percentageOfNetRevenue: calculateMarginPct(kpi.cogs, rev),
          isNegative: true,
        },
      ],
    },
    {
      id: 'total-gross-profit',
      code: 'GP',
      title: 'LỢI NHUẬN GỘP VỀ BÁN HÀNG (DOANH THU THUẦN - COGS)',
      level: 1,
      amount: kpi.grossProfit,
      percentageOfNetRevenue: kpi.grossMarginPct,
      isTotal: true,
    },
    {
      id: 'sec-3',
      code: 'III',
      title: 'III. CHI PHÍ VẬN HÀNH & HAO HỤT',
      level: 1,
      amount: kpi.operatingExpenses + kpi.shrinkageLoss,
      percentageOfNetRevenue: calculateMarginPct(kpi.operatingExpenses + kpi.shrinkageLoss, rev),
      isNegative: true,
      children: [
        {
          id: 'item-3-1',
          code: '3.1',
          title: 'Tổn thất hao hụt kho / Hủy hàng hết hạn (FE-06)',
          level: 2,
          amount: kpi.shrinkageLoss,
          percentageOfNetRevenue: calculateMarginPct(kpi.shrinkageLoss, rev),
          isNegative: true,
        },
        {
          id: 'item-3-2',
          code: '3.2',
          title: 'Chi phí dịch vụ vận hành ngoài (FE-07)',
          level: 2,
          amount: kpi.operatingExpenses,
          percentageOfNetRevenue: calculateMarginPct(kpi.operatingExpenses, rev),
          isNegative: true,
          children: [
            {
              id: 'item-3-2-1',
              code: '3.2.a',
              title: 'Tiền thuê mặt bằng & Điểm bán',
              level: 3,
              amount: Math.round(kpi.operatingExpenses * 0.42),
              percentageOfNetRevenue: calculateMarginPct(Math.round(kpi.operatingExpenses * 0.42), rev),
              isNegative: true,
            },
            {
              id: 'item-3-2-2',
              code: '3.2.b',
              title: 'Lương & Phụ cấp nhân sự bán hàng',
              level: 3,
              amount: Math.round(kpi.operatingExpenses * 0.31),
              percentageOfNetRevenue: calculateMarginPct(Math.round(kpi.operatingExpenses * 0.31), rev),
              isNegative: true,
            },
            {
              id: 'item-3-2-3',
              code: '3.2.c',
              title: 'Điện, nước, Internet & Dịch vụ tiện ích',
              level: 3,
              amount: Math.round(kpi.operatingExpenses * 0.15),
              percentageOfNetRevenue: calculateMarginPct(Math.round(kpi.operatingExpenses * 0.15), rev),
              isNegative: true,
            },
            {
              id: 'item-3-2-4',
              code: '3.2.d',
              title: 'Chi phí tiếp thị, bảo trì & Khác',
              level: 3,
              amount: Math.round(kpi.operatingExpenses * 0.12),
              percentageOfNetRevenue: calculateMarginPct(Math.round(kpi.operatingExpenses * 0.12), rev),
              isNegative: true,
            },
          ],
        },
      ],
    },
    {
      id: 'total-net-profit',
      code: 'EBT',
      title: 'III. LỢI NHUẬN VẬN HÀNH TRƯỚC THUẾ (LÃI GỘP - CHI PHÍ VẬN HÀNH)',
      level: 1,
      amount: kpi.netProfit,
      percentageOfNetRevenue: kpi.netMarginPct,
      isTotal: true,
    },
    {
      id: 'sec-4-tax',
      code: 'IV',
      title: 'IV. NGHĨA VỤ THUẾ HỘ KINH DOANH (THÔNG TƯ 40/2021/TT-BTC)',
      level: 1,
      amount: Math.round(rev * 0.015),
      percentageOfNetRevenue: 1.5,
      isNegative: true,
      children: [
        {
          id: 'item-4-1',
          code: '4.1',
          title: 'Thuế Giá trị gia tăng (VAT 1.0% phân phối hàng hóa)',
          level: 2,
          amount: Math.round(rev * 0.01),
          percentageOfNetRevenue: 1.0,
          isNegative: true,
        },
        {
          id: 'item-4-2',
          code: '4.2',
          title: 'Thuế Thu nhập cá nhân (PIT 0.5% hộ kinh doanh)',
          level: 2,
          amount: Math.round(rev * 0.005),
          percentageOfNetRevenue: 0.5,
          isNegative: true,
        },
      ],
    },
    {
      id: 'total-final-net-profit',
      code: 'NP-AT',
      title: 'V. LỢI NHUẬN RÒNG SAU THUẾ THỰC NHẬN CỦA CHỦ TIỆM',
      level: 1,
      amount: kpi.netProfit - Math.round(rev * 0.015),
      percentageOfNetRevenue: calculateMarginPct(kpi.netProfit - Math.round(rev * 0.015), rev),
      isTotal: true,
    },
  ];
}

/**
 * Generates mock expense categories breakdown.
 */
function buildMockExpenseBreakdown(operatingExpenses: number, shrinkageLoss: number): ExpenseCategoryBreakdown[] {
  const total = operatingExpenses + shrinkageLoss;
  const rent = Math.round(operatingExpenses * 0.42);
  const salary = Math.round(operatingExpenses * 0.31);
  const utilities = Math.round(operatingExpenses * 0.15);
  const other = operatingExpenses - rent - salary - utilities;

  return [
    {
      categoryCode: 'RENT',
      categoryName: 'Thuê mặt bằng',
      amount: rent,
      percentage: calculateMarginPct(rent, total),
      color: '#0F766E', // Teal 700
    },
    {
      categoryCode: 'SALARY',
      categoryName: 'Lương nhân sự',
      amount: salary,
      percentage: calculateMarginPct(salary, total),
      color: '#14B8A6', // Teal 500
    },
    {
      categoryCode: 'UTILITIES',
      categoryName: 'Điện nước & Mạng',
      amount: utilities,
      percentage: calculateMarginPct(utilities, total),
      color: '#F59E0B', // Amber 500
    },
    {
      categoryCode: 'SHRINKAGE',
      categoryName: 'Hao hụt & Hủy kho (FE-06)',
      amount: shrinkageLoss,
      percentage: calculateMarginPct(shrinkageLoss, total),
      color: '#EF4444', // Red 500
    },
    {
      categoryCode: 'OTHER',
      categoryName: 'Bảo trì & Khác',
      amount: other,
      percentage: calculateMarginPct(other, total),
      color: '#64748B', // Slate 500
    },
  ];
}

/**
 * Generates mock trend points.
 */
function buildMockTrendPoints(days: number): PnlTrendPoint[] {
  const points: PnlTrendPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    // Base figures with slight realistic fluctuations
    const revBase = 12500000 + Math.sin(i * 0.8) * 3500000 + (days - i) * 150000;
    const netRevenue = Math.round(revBase);
    const cogs = Math.round(netRevenue * 0.68);
    const expenses = Math.round(netRevenue * 0.14);
    const netProfit = netRevenue - cogs - expenses;

    points.push({
      dateLabel: dayStr,
      netRevenue,
      cogs,
      expenses,
      netProfit,
    });
  }

  return points;
}

/**
 * Generates top products performance list.
 */
function buildMockTopProducts(): TopProductPerformance[] {
  return [
    {
      productId: 'p-1',
      productCode: 'SP-SUA01',
      productName: 'Sữa tươi tiệt trùng Vinamilk 100% 1L',
      quantitySold: 480,
      revenue: 16800000,
      profit: 4200000,
      marginPct: 25.0,
    },
    {
      productId: 'p-2',
      productCode: 'SP-GAO02',
      productName: 'Gạo ST25 Ông Cua túi 5kg',
      quantitySold: 125,
      revenue: 23125000,
      profit: 5780000,
      marginPct: 25.0,
    },
    {
      productId: 'p-3',
      productCode: 'SP-BIA03',
      productName: 'Bia Heineken Sleek lon 330ml (Thùng 24)',
      quantitySold: 95,
      revenue: 41800000,
      profit: 7524000,
      marginPct: 18.0,
    },
    {
      productId: 'p-4',
      productCode: 'SP-DAU04',
      productName: 'Dầu ăn Simply đậu nành 2L',
      quantitySold: 190,
      revenue: 25650000,
      profit: 5643000,
      marginPct: 22.0,
    },
    {
      productId: 'p-5',
      productCode: 'SP-BANH05',
      productName: 'Bánh gạo One One vị ngọt dịu 150g',
      quantitySold: 310,
      revenue: 8990000,
      profit: 2697000,
      marginPct: 30.0,
    },
    {
      productId: 'p-6',
      productCode: 'SP-MI06',
      productName: 'Mì Hảo Hảo tôm chua cay 75g (Thùng 30 gói)',
      quantitySold: 220,
      revenue: 26400000,
      profit: 4752000,
      marginPct: 18.0,
    },
    {
      productId: 'p-7',
      productCode: 'SP-NUOC07',
      productName: 'Nước khoáng thiên nhiên La Vie 500ml (Thùng 24)',
      quantitySold: 180,
      revenue: 19800000,
      profit: 5940000,
      marginPct: 30.0,
    },
    {
      productId: 'p-8',
      productCode: 'SP-CAFE08',
      productName: 'Cà phê hòa tan G7 3in1 Trung Nguyên hộp 18 gói',
      quantitySold: 140,
      revenue: 9520000,
      profit: 2380000,
      marginPct: 25.0,
    },
    {
      productId: 'p-9',
      productCode: 'SP-TRA09',
      productName: 'Trà xanh không độ 455ml (Lốc 6 chai)',
      quantitySold: 165,
      revenue: 8250000,
      profit: 2062500,
      marginPct: 25.0,
    },
    {
      productId: 'p-10',
      productCode: 'SP-GIAVI10',
      productName: 'Hạt nêm Knorr thịt thăn xương ống 900g',
      quantitySold: 110,
      revenue: 9900000,
      profit: 1980000,
      marginPct: 20.0,
    },
    {
      productId: 'p-11',
      productCode: 'SP-NUOCGIAT11',
      productName: 'Nước giặt OMO Matic cửa trên túi 3.6kg',
      quantitySold: 85,
      revenue: 16575000,
      profit: 3315000,
      marginPct: 20.0,
    },
    {
      productId: 'p-12',
      productCode: 'SP-KEM12',
      productName: 'Kem đánh răng Colgate Total than hoạt tính 180g',
      quantitySold: 130,
      revenue: 6240000,
      profit: 1560000,
      marginPct: 25.0,
    },
  ];
}

/**
 * Service to fetch P&L financial reports and dashboard metrics.
 */
export const reportsPnlService = {
  /**
   * Retrieves list of accessible branches for the current user.
   */
  async getBranches(): Promise<BranchOption[]> {
    return Promise.resolve(MOCK_BRANCHES);
  },

  /**
   * Fetches full P&L and Dashboard report based on filter parameters.
   * @param params - Date range and branch filter.
   */
  async getPnlReportData(params: PnlFilterParams): Promise<PnlReportResponse> {
    // Determine scale based on branch
    const branchMultiplier = params.branchId === 'ALL' ? 1.0 : 0.42;

    // Base numbers for period
    let baseGross = 186500000 * branchMultiplier;
    let daysCount = 7;

    if (params.presetPeriod === 'TODAY') {
      baseGross = 18500000 * branchMultiplier;
      daysCount = 1;
    } else if (params.presetPeriod === 'THIS_MONTH' || params.presetPeriod === 'LAST_MONTH') {
      baseGross = 580000000 * branchMultiplier;
      daysCount = 30;
    } else if (params.presetPeriod === 'THIS_QUARTER') {
      baseGross = 1650000000 * branchMultiplier;
      daysCount = 12;
    }

    const grossSales = Math.round(baseGross);
    const discounts = Math.round(grossSales * 0.025);
    const returns = Math.round(grossSales * 0.008);
    const netRevenue = grossSales - discounts - returns;

    const cogs = Math.round(netRevenue * 0.69); // 69% COGS
    const grossProfit = netRevenue - cogs;
    const grossMarginPct = calculateMarginPct(grossProfit, netRevenue);

    const operatingExpenses = Math.round(netRevenue * 0.145);
    const shrinkageLoss = Math.round(netRevenue * 0.012);
    const netProfit = grossProfit - operatingExpenses - shrinkageLoss;
    const netMarginPct = calculateMarginPct(netProfit, netRevenue);

    const totalOrders = Math.round(netRevenue / 285000);
    const averageOrderValue = totalOrders > 0 ? Math.round(netRevenue / totalOrders) : 0;

        const estimatedTaxAmount = Math.round(netRevenue * 0.015);
    const netProfitAfterTax = netProfit - estimatedTaxAmount;
    const netProfitAfterTaxMarginPct = calculateMarginPct(netProfitAfterTax, netRevenue);

    const kpiSummary: KpiSummaryData = {
      grossSales,
      discounts,
      returns,
      netRevenue,
      cogs,
      grossProfit,
      grossMarginPct,
      operatingExpenses,
      shrinkageLoss,
      netProfit,
      netMarginPct,
      totalOrders,
      averageOrderValue,
      netRevenueGrowthPct: 12.8,
      grossProfitGrowthPct: 14.2,
      netProfitGrowthPct: 18.5,
      expensesGrowthPct: -3.4,
      ordersGrowthPct: 8.6,
      aovGrowthPct: 3.9,
      estimatedTaxAmount,
      netProfitAfterTax,
      netProfitAfterTaxMarginPct,
    };

    const pnlTree = buildMockPnlTree(kpiSummary);
    const expenseBreakdown = buildMockExpenseBreakdown(operatingExpenses, shrinkageLoss);
    const trendData = buildMockTrendPoints(daysCount === 1 ? 7 : Math.min(daysCount, 14));
    const topProducts = buildMockTopProducts();

    return Promise.resolve({
      filter: params,
      kpiSummary,
      pnlTree,
      trendData,
      expenseBreakdown,
      topProducts,
    });
  },
};
