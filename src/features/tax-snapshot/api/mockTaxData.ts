import {
  TaxPeriodType,
  TaxCalculationMethod,
  HouseholdTaxGroup,
  AccountingBookType,
  type HouseholdTaxFilterDto,
  type HouseholdTaxSummaryDto,
  type AccountingBookEntryDto,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';

export const mockSnapshotsList: HouseholdTaxSnapshotDto[] = [
  {
    id: 'snap-2026-q2',
    branchId: undefined,
    periodType: TaxPeriodType.Quarter,
    year: 2026,
    periodNumber: 2,
    annualAccumulatedRevenue: 950_000_000,
    householdGroup: HouseholdTaxGroup.Group1_Under1B,
    calculationMethod: TaxCalculationMethod.RevenuePercentage,
    applyVatReduction2026: false,
    isTaxExempt: true,
    taxableRevenueInPeriod: 480_000_000,
    vatRate: 0,
    vatAmount: 0,
    pitRate: 0,
    pitAmount: 0,
    totalTaxAmount: 0,
    finalizedBy: 'Cô Ba (Chủ hộ kinh doanh)',
    finalizedAtUtc: '2026-07-15T09:30:00Z',
    notes: 'Chốt kỳ Quý 2/2026 - Doanh thu lũy kế 950tr chưa vượt ngưỡng 1 tỷ (Miễn thuế)',
  },
  {
    id: 'snap-2026-q1',
    branchId: undefined,
    periodType: TaxPeriodType.Quarter,
    year: 2026,
    periodNumber: 1,
    annualAccumulatedRevenue: 470_000_000,
    householdGroup: HouseholdTaxGroup.Group1_Under1B,
    calculationMethod: TaxCalculationMethod.RevenuePercentage,
    applyVatReduction2026: false,
    isTaxExempt: true,
    taxableRevenueInPeriod: 470_000_000,
    vatRate: 0,
    vatAmount: 0,
    pitRate: 0,
    pitAmount: 0,
    totalTaxAmount: 0,
    finalizedBy: 'Cô Ba (Chủ hộ kinh doanh)',
    finalizedAtUtc: '2026-04-12T14:15:00Z',
    notes: 'Chốt kỳ Quý 1/2026 - Miễn thuế theo quy định quản lý thuế HKD',
  },
];

/**
 * Generate standard summary response matching backend calculation & Single Source of Truth
 */
export function generateMockSummary(filter: HouseholdTaxFilterDto): HouseholdTaxSummaryDto {
  const isYearMode = filter.periodType === TaxPeriodType.Year;
  const isQuarter3 = filter.periodType === TaxPeriodType.Quarter && filter.periodNumber === 3;
  const isMonth10 = filter.periodType === TaxPeriodType.Month && filter.periodNumber === 10;

  // Lũy kế doanh thu đến hết kỳ đang xét
  let annualAccumulated = 1_417_500_000;
  let priorAccumulated = 950_000_000;
  let inPeriodGross = 467_500_000; // Quý 3 = 1.417.500.000 - 950.000.000

  // Chi phí hợp lý tính thuế theo từng kỳ (3 tháng x 79tr = 237tr)
  let deductibleExpensesInPeriod = 237_000_000;
  let ytdExpenses = 240_000_000;

  if (isYearMode) {
    annualAccumulated = 1_417_500_000;
    priorAccumulated = 0;
    inPeriodGross = 1_417_500_000;
    deductibleExpensesInPeriod = 711_000_000;
  } else if (isMonth10) {
    // Tháng 10: Khớp chính xác với P&L Master Benchmark (560.860.000đ, 1.968 đơn, 284.990đ/đơn)
    inPeriodGross = 560_860_000;
    priorAccumulated = 1_417_500_000; // Lũy kế 9 tháng Quý 1-3
    annualAccumulated = priorAccumulated + inPeriodGross; // 1.978.360.000đ
    deductibleExpensesInPeriod = 79_000_000; // 81.324.700đ P&L - 2.324.700đ không đủ chứng từ
    ytdExpenses = 319_000_000;
  } else if (!isQuarter3) {
    annualAccumulated = 950_000_000;
    priorAccumulated = 470_000_000;
    inPeriodGross = 480_000_000;
    deductibleExpensesInPeriod = 237_000_000;
  }

  const inPeriodTaxable = inPeriodGross;
  const isExempt = annualAccumulated <= 1_000_000_000;

  let group: HouseholdTaxGroup = HouseholdTaxGroup.Group1_Under1B;
  let groupName = 'Nhóm 1: Doanh thu ≤ 1 tỷ/năm (Miễn thuế GTGT & TNCN)';
  if (annualAccumulated > 50_000_000_000) {
    group = HouseholdTaxGroup.Group4_Over50B;
    groupName = 'Nhóm 4: Doanh thu > 50 tỷ/năm (Bắt buộc Kê khai quy mô lớn)';
  } else if (annualAccumulated > 3_000_000_000) {
    group = HouseholdTaxGroup.Group3_3BTo50B;
    groupName = 'Nhóm 3: Doanh thu 3 - 50 tỷ/năm (Kê khai quy mô lớn)';
  } else if (annualAccumulated > 1_000_000_000) {
    group = HouseholdTaxGroup.Group2_1BTo3B;
    groupName = 'Nhóm 2: Doanh thu 1 - 3 tỷ/năm (Chịu thuế phần vượt 1 tỷ)';
  }

  // Thuế suất GTGT: 1.0% hoặc 0.8% nếu giảm 20%
  const baseVatRate = filter.customVatRate ?? 1.0;
  const isVatReduced = Boolean(filter.applyVatReduction2026);
  const reductionPct = filter.vatReductionPercentage ?? 20;
  const vatRate = isVatReduced ? Math.round(baseVatRate * (1 - reductionPct / 100) * 10000) / 10000 : baseVatRate;
  
  const vatTaxableRevenue = isExempt ? 0 : inPeriodTaxable;
  const vatAmount = isExempt ? 0 : Math.round(vatTaxableRevenue * (vatRate / 100));

  // Thuế TNCN
  const pitRate = filter.calculationMethod === TaxCalculationMethod.DeclarationBased
    ? (filter.customPitRate ?? 15.0)
    : (filter.customPitRate ?? 0.5);
  let pitTaxableRevenue = 0;
  let pitAmount = 0;

  let taxableIncomeDeclaration = 0;
  let declarationPitAmount = 0;

  // taxDueYtd theo định nghĩa chuẩn backend: Thuế TNCN lũy kế tính trên phần vượt 1 tỷ từ đầu năm
  const currentExcess = Math.max(0, annualAccumulated - 1_000_000_000);
  const taxDueYtd = Math.round(currentExcess * (0.5 / 100));
  const priorDeclaredPitTax = filter.priorDeclaredPitTaxOverride ?? 0; // 0đ vì Q1, Q2 miễn thuế

  if (filter.calculationMethod === TaxCalculationMethod.DeclarationBased) {
    // Phương pháp Kê khai: Thu nhập tính thuế = Doanh thu - Chi phí hợp lý
    taxableIncomeDeclaration = Math.max(0, inPeriodTaxable - deductibleExpensesInPeriod);
    declarationPitAmount = Math.round(taxableIncomeDeclaration * (pitRate / 100));
    pitAmount = declarationPitAmount;
    pitTaxableRevenue = taxableIncomeDeclaration;
  } else {
    // Phương pháp Tỷ lệ %: TNCN tính trên phần vượt 1 tỷ lũy kế
    pitTaxableRevenue = currentExcess;
    pitAmount = isExempt ? 0 : Math.max(0, taxDueYtd - priorDeclaredPitTax);
  }

  const totalTaxAmount = vatAmount + pitAmount;

  const isThresholdCrossedMidYear = priorAccumulated <= 1_000_000_000 && annualAccumulated > 1_000_000_000;
  const thresholdExceededNote = isThresholdCrossedMidYear
    ? 'Doanh thu năm lũy kế đã vượt ngưỡng 1 tỷ VNĐ trong kỳ này. Hệ thống bắt đầu tính nghĩa vụ thuế GTGT và TNCN theo thuế suất ngành nghề đăng ký trên phần doanh thu vượt ngưỡng. Khuyến nghị chủ hộ tham vấn cơ quan thuế địa bàn về quy định kê khai và chính sách áp dụng cho trường hợp vượt ngưỡng giữa năm.'
    : undefined;

  return {
    year: filter.year,
    periodType: filter.periodType,
    periodNumber: filter.periodNumber,
    branchId: filter.branchId,
    branchName: 'Tiệm Tạp Hóa Cô Ba - Chi nhánh chính',

    annualAccumulatedRevenue: annualAccumulated,
    priorPeriodsAccumulatedRevenue: priorAccumulated,
    householdGroup: group,
    householdGroupName: groupName,
    calculationMethod: filter.calculationMethod,
    isTaxExempt: isExempt,
    taxExemptionThreshold: 1_000_000_000,
    isThresholdCrossedMidYear,
    thresholdExceededNote,

    grossRevenueInPeriod: inPeriodGross,
    discountAmountInPeriod: 0,
    returnAmountInPeriod: 0,
    taxableRevenueInPeriod: inPeriodTaxable,

    vatRate,
    isVatReduced,
    vatTaxableRevenue,
    vatAmount,

    pitRate,
    pitTaxableRevenue,
    pitAmount,

    deductibleExpensesInPeriod,
    ytdRevenue: annualAccumulated,
    ytdExpenses,
    taxableIncomeYtd: Math.max(0, annualAccumulated - ytdExpenses),
    taxDueYtd: isYearMode ? totalTaxAmount : taxDueYtd,
    priorDeclaredPitTax,
    overpaidTaxCarry: 0,
    taxableIncomeDeclaration,
    declarationPitAmount,

    totalTaxAmount,

    booksSummary: {
      primaryBookCode: group === HouseholdTaxGroup.Group1_Under1B ? 'S1a-HKD' : 'S2a-HKD',
      totalRecordedRevenue: inPeriodGross,
      totalRecordedExpenses: deductibleExpensesInPeriod,
      totalCashAndBankReceipts: inPeriodGross,
      totalCashAndBankDisbursements: deductibleExpensesInPeriod,
      totalTaxObligationsAccrued: totalTaxAmount,
      totalTaxPaidToState: 0,
    },

    isFinalized: false,
    snapshotId: undefined,
  };
}

/**
 * Mock detailed accounting vouchers
 * Reconciled to Master Financial Benchmark:
 * - Quý 3/2026: Doanh thu 467.500.000đ, Chi phí 237.000.000đ (3 tháng x 79tr), Thuế 6.762.500đ
 * - Tháng 10/2026: Doanh thu 560.860.000đ, Chi phí 79.000.000đ
 */
export const mockBookEntries: AccountingBookEntryDto[] = [
  // S1a: Doanh thu bán hàng hóa, dịch vụ HKD Nhóm 1 (Dưới 1 tỷ/năm)
  {
    voucherNumber: 'HD-2026Q3-01',
    voucherDate: '2026-07-31T17:00:00Z',
    description: 'Doanh thu bán lẻ quầy thu ngân tháng 07/2026 (Hóa đơn điện tử POS)',
    amount: 152_000_000,
    category: 'Doanh thu bán lẻ',
    bookType: AccountingBookType.S1a_RevenueGroup1,
    bookCode: 'S1a-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-THANG-07',
    sectionGroup: 'Doanh thu bán hàng hóa, dịch vụ',
  },
  {
    voucherNumber: 'HD-2026Q3-02',
    voucherDate: '2026-08-31T17:00:00Z',
    description: 'Doanh thu bán lẻ quầy thu ngân tháng 08/2026 (Hóa đơn điện tử POS)',
    amount: 158_000_000,
    category: 'Doanh thu bán lẻ',
    bookType: AccountingBookType.S1a_RevenueGroup1,
    bookCode: 'S1a-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-THANG-08',
    sectionGroup: 'Doanh thu bán hàng hóa, dịch vụ',
  },
  {
    voucherNumber: 'HD-2026Q3-03',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Doanh thu bán lẻ quầy thu ngân tháng 09/2026 (Hóa đơn điện tử POS)',
    amount: 157_500_000,
    category: 'Doanh thu bán lẻ',
    bookType: AccountingBookType.S1a_RevenueGroup1,
    bookCode: 'S1a-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-THANG-09',
    sectionGroup: 'Doanh thu bán hàng hóa, dịch vụ',
  },

  // S2a: Doanh thu bán lẻ Quý 3/2026 (Khớp 467.500.000đ)
  {
    voucherNumber: 'HD-2026Q3-01',
    voucherDate: '2026-07-31T17:00:00Z',
    description: 'Doanh thu bán lẻ quầy thu ngân tháng 07/2026 (Hóa đơn điện tử POS)',
    amount: 152_000_000,
    category: 'Bán lẻ hàng tiêu dùng',
    bookType: AccountingBookType.S2a_RevenueGroup2,
    bookCode: 'S2a-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-THANG-07',
    sectionGroup: '1. Phân phối, cung cấp hàng hóa (GTGT 1%, TNCN 0.5%)',
    taxRate: 1.0,
    taxAmount: 1_520_000,
  },
  {
    voucherNumber: 'HD-2026Q3-02',
    voucherDate: '2026-08-31T17:00:00Z',
    description: 'Doanh thu bán lẻ quầy thu ngân tháng 08/2026 (Hóa đơn điện tử POS)',
    amount: 158_000_000,
    category: 'Bán lẻ hàng tiêu dùng',
    bookType: AccountingBookType.S2a_RevenueGroup2,
    bookCode: 'S2a-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-THANG-08',
    sectionGroup: '1. Phân phối, cung cấp hàng hóa (GTGT 1%, TNCN 0.5%)',
    taxRate: 1.0,
    taxAmount: 1_580_000,
  },
  {
    voucherNumber: 'HD-2026Q3-03',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Doanh thu bán lẻ quầy thu ngân tháng 09/2026 (Hóa đơn điện tử POS)',
    amount: 157_500_000,
    category: 'Bán lẻ hàng tiêu dùng',
    bookType: AccountingBookType.S2a_RevenueGroup2,
    bookCode: 'S2a-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-THANG-09',
    sectionGroup: '1. Phân phối, cung cấp hàng hóa (GTGT 1%, TNCN 0.5%)',
    taxRate: 1.0,
    taxAmount: 1_575_000,
  },

  // S2b: Doanh thu bán hàng kê khai GTGT (Chỉ có thuế GTGT)
  {
    voucherNumber: 'HD-KK-2026Q3-01',
    voucherDate: '2026-07-31T17:00:00Z',
    description: 'Doanh thu bán hàng kê khai tháng 07/2026 (Hóa đơn điện tử)',
    amount: 152_000_000,
    category: 'Doanh thu bán hàng kê khai',
    bookType: AccountingBookType.S2b_RevenueDeclaration,
    bookCode: 'S2b-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-KK-07',
    sectionGroup: '1. Phân phối, cung cấp hàng hóa (Thuế GTGT 1%)',
    taxRate: 1.0,
    taxAmount: 1_520_000,
  },
  {
    voucherNumber: 'HD-KK-2026Q3-02',
    voucherDate: '2026-08-31T17:00:00Z',
    description: 'Doanh thu bán hàng kê khai tháng 08/2026 (Hóa đơn điện tử)',
    amount: 158_000_000,
    category: 'Doanh thu bán hàng kê khai',
    bookType: AccountingBookType.S2b_RevenueDeclaration,
    bookCode: 'S2b-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-KK-08',
    sectionGroup: '1. Phân phối, cung cấp hàng hóa (Thuế GTGT 1%)',
    taxRate: 1.0,
    taxAmount: 1_580_000,
  },
  {
    voucherNumber: 'HD-KK-2026Q3-03',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Doanh thu bán hàng kê khai tháng 09/2026 (Hóa đơn điện tử)',
    amount: 157_500_000,
    category: 'Doanh thu bán hàng kê khai',
    bookType: AccountingBookType.S2b_RevenueDeclaration,
    bookCode: 'S2b-HKD',
    beneficiaryName: 'Khách hàng bán lẻ',
    invoiceNumber: 'BK-KK-09',
    sectionGroup: '1. Phân phối, cung cấp hàng hóa (Thuế GTGT 1%)',
    taxRate: 1.0,
    taxAmount: 1_575_000,
  },

  // S2c: Chi phí sản xuất kinh doanh Quý 3/2026 (Khớp 237.000.000đ = 3 tháng x 79tr)
  {
    voucherNumber: 'PC-2026Q3-01',
    voucherDate: '2026-09-30T10:00:00Z',
    description: 'Chi phí tiền lương nhân viên bán hàng & thu ngân trọn Quý 3/2026 (3 tháng x 45tr)',
    amount: 135_000_000,
    category: 'Chi phí nhân công',
    bookType: AccountingBookType.S2c_RevenueAndExpense,
    bookCode: 'S2c-HKD',
    beneficiaryName: 'Nhân viên cửa hàng',
    invoiceNumber: 'BL-LUONG-Q3',
    sectionGroup: '2b. Chi phí nhân công (Tiền lương, tiền công)',
  },
  {
    voucherNumber: 'PC-2026Q3-02',
    voucherDate: '2026-09-30T11:00:00Z',
    description: 'Tiền thuê mặt bằng kinh doanh tiệm tạp hóa Quý 3/2026 (3 tháng x 18tr)',
    amount: 54_000_000,
    category: 'Chi phí thuê mặt bằng',
    bookType: AccountingBookType.S2c_RevenueAndExpense,
    bookCode: 'S2c-HKD',
    beneficiaryName: 'Chủ nhà mặt bằng',
    invoiceNumber: 'HD-MB-Q3',
    sectionGroup: '2c. Chi phí thuê mặt bằng kinh doanh',
  },
  {
    voucherNumber: 'PC-2026Q3-03',
    voucherDate: '2026-09-30T14:30:00Z',
    description: 'Chi phí điện nước, viễn thông POS và khấu hao thiết bị quầy kệ Quý 3/2026 (3 tháng x 16tr)',
    amount: 48_000_000,
    category: 'Điện nước & Dịch vụ mua ngoài',
    bookType: AccountingBookType.S2c_RevenueAndExpense,
    bookCode: 'S2c-HKD',
    beneficiaryName: 'EVN & FPT Telecom & Khấu hao',
    invoiceNumber: 'BK-DICHVU-Q3',
    sectionGroup: '2d. Chi phí điện, nước, viễn thông & dịch vụ mua ngoài',
  },

  // S2d: Vật tư, Hàng hóa (Nhập - Xuất - Tồn 12 cột Thông tư 152)
  {
    voucherNumber: 'PNK-2026Q3-01',
    voucherDate: '2026-07-15T09:00:00Z',
    description: 'Gạo sạch ST25 túi 5kg',
    amount: 35_000_000,
    category: 'Lương thực thực phẩm',
    bookType: AccountingBookType.S2d_MaterialsAndGoods,
    bookCode: 'S2d-HKD',
    beneficiaryName: 'Công ty Lương Thực Phương Nam',
    invoiceNumber: 'HD-PN-0012',
    unit: 'Túi 5kg',
    unitPrice: 175_000,
    inQuantity: 200,
    inAmount: 35_000_000,
    outQuantity: 150,
    outAmount: 26_250_000,
    balanceQuantity: 50,
    balanceAmount: 8_750_000,
  },
  {
    voucherNumber: 'PNK-2026Q3-02',
    voucherDate: '2026-07-20T10:30:00Z',
    description: 'Dầu ăn Neptune Gold chai 1L',
    amount: 22_500_000,
    category: 'Gia vị thực phẩm',
    bookType: AccountingBookType.S2d_MaterialsAndGoods,
    bookCode: 'S2d-HKD',
    beneficiaryName: 'Công ty Dầu thực vật Cái Lân',
    invoiceNumber: 'HD-CL-4412',
    unit: 'Chai 1L',
    unitPrice: 45_000,
    inQuantity: 500,
    inAmount: 22_500_000,
    outQuantity: 420,
    outAmount: 18_900_000,
    balanceQuantity: 80,
    balanceAmount: 3_600_000,
  },
  {
    voucherNumber: 'PNK-2026Q3-03',
    voucherDate: '2026-08-05T14:00:00Z',
    description: 'Mì tôm Hảo Hảo tôm chua cay (30 gói/thùng)',
    amount: 34_500_000,
    category: 'Mì ăn liền',
    bookType: AccountingBookType.S2d_MaterialsAndGoods,
    bookCode: 'S2d-HKD',
    beneficiaryName: 'Acecook Việt Nam',
    invoiceNumber: 'HD-AC-8890',
    unit: 'Thùng',
    unitPrice: 115_000,
    inQuantity: 300,
    inAmount: 34_500_000,
    outQuantity: 260,
    outAmount: 29_900_000,
    balanceQuantity: 40,
    balanceAmount: 4_600_000,
  },
  {
    voucherNumber: 'PNK-2026Q3-04',
    voucherDate: '2026-08-18T11:00:00Z',
    description: 'Nước mắm Nam Ngư Đệ Nhị chai 900ml',
    amount: 11_200_000,
    category: 'Gia vị thực phẩm',
    bookType: AccountingBookType.S2d_MaterialsAndGoods,
    bookCode: 'S2d-HKD',
    beneficiaryName: 'Masan Consumer',
    invoiceNumber: 'HD-MS-3120',
    unit: 'Chai 900ml',
    unitPrice: 28_000,
    inQuantity: 400,
    inAmount: 11_200_000,
    outQuantity: 350,
    outAmount: 9_800_000,
    balanceQuantity: 50,
    balanceAmount: 1_400_000,
  },
  {
    voucherNumber: 'PNK-2026Q3-05',
    voucherDate: '2026-09-02T15:20:00Z',
    description: 'Đường tinh luyện Biên Hòa gói 1kg',
    amount: 7_500_000,
    category: 'Gia vị thực phẩm',
    bookType: AccountingBookType.S2d_MaterialsAndGoods,
    bookCode: 'S2d-HKD',
    beneficiaryName: 'Đường Biên Hòa TTC Sugar',
    invoiceNumber: 'HD-BH-1092',
    unit: 'Gói 1kg',
    unitPrice: 25_000,
    inQuantity: 300,
    inAmount: 7_500_000,
    outQuantity: 270,
    outAmount: 6_750_000,
    balanceQuantity: 30,
    balanceAmount: 750_000,
  },
  {
    voucherNumber: 'PNK-2026Q3-06',
    voucherDate: '2026-09-12T09:40:00Z',
    description: 'Bột giặt OMO đỏ túi 3kg',
    amount: 20_250_000,
    category: 'Hóa mỹ phẩm tiêu dùng',
    bookType: AccountingBookType.S2d_MaterialsAndGoods,
    bookCode: 'S2d-HKD',
    beneficiaryName: 'Unilever Việt Nam',
    invoiceNumber: 'HD-UL-7621',
    unit: 'Túi 3kg',
    unitPrice: 135_000,
    inQuantity: 150,
    inAmount: 20_250_000,
    outQuantity: 120,
    outAmount: 16_200_000,
    balanceQuantity: 30,
    balanceAmount: 4_050_000,
  },

  // S2e: Sổ chi tiết tiền (Tiền mặt và Tiền gửi Ngân hàng - 2 khối Thông tư 152)
  // Khối I: Quỹ Tiền mặt (Cash / Till / Safe)
  {
    voucherNumber: 'PT-TM-01',
    voucherDate: '2026-07-31T17:00:00Z',
    description: 'Thu tiền mặt bán lẻ quầy thu ngân tháng 07/2026',
    amount: 120_000_000,
    inAmount: 120_000_000,
    outAmount: 0,
    category: 'Quỹ tiền mặt (Két quầy)',
    sectionGroup: 'Khối I: Quỹ Tiền mặt',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Két quầy thu ngân',
    invoiceNumber: 'BK-TM-07',
  },
  {
    voucherNumber: 'PC-TM-01',
    voucherDate: '2026-08-05T10:00:00Z',
    description: 'Chi tiền mặt thanh toán mua hàng hóa bánh kẹo nước giải khát',
    amount: 45_000_000,
    inAmount: 0,
    outAmount: 45_000_000,
    category: 'Quỹ tiền mặt (Két quầy)',
    sectionGroup: 'Khối I: Quỹ Tiền mặt',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Đại lý phân phối bánh kẹo',
    invoiceNumber: 'HD-NCC-812',
  },
  {
    voucherNumber: 'PT-TM-02',
    voucherDate: '2026-08-31T17:00:00Z',
    description: 'Thu tiền mặt bán lẻ quầy thu ngân tháng 08/2026',
    amount: 125_000_000,
    inAmount: 125_000_000,
    outAmount: 0,
    category: 'Quỹ tiền mặt (Két quầy)',
    sectionGroup: 'Khối I: Quỹ Tiền mặt',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Két quầy thu ngân',
    invoiceNumber: 'BK-TM-08',
  },
  {
    voucherNumber: 'PC-TM-02',
    voucherDate: '2026-09-05T11:00:00Z',
    description: 'Chi tiền mặt thanh toán tiền thuê mặt bằng kinh doanh tháng 08',
    amount: 18_000_000,
    inAmount: 0,
    outAmount: 18_000_000,
    category: 'Quỹ tiền mặt (Két quầy)',
    sectionGroup: 'Khối I: Quỹ Tiền mặt',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Chủ nhà mặt bằng',
    invoiceNumber: 'PC-MB-08',
  },
  {
    voucherNumber: 'PT-TM-03',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Thu tiền mặt bán lẻ quầy thu ngân tháng 09/2026',
    amount: 122_500_000,
    inAmount: 122_500_000,
    outAmount: 0,
    category: 'Quỹ tiền mặt (Két quầy)',
    sectionGroup: 'Khối I: Quỹ Tiền mặt',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Két quầy thu ngân',
    invoiceNumber: 'BK-TM-09',
  },

  // Khối II: Tiền gửi Ngân hàng (Bank Account)
  {
    voucherNumber: 'PT-NH-01',
    voucherDate: '2026-07-31T17:00:00Z',
    description: 'Thu chuyển khoản khách mua hàng quét mã VietQR tháng 07/2026',
    amount: 32_000_000,
    inAmount: 32_000_000,
    outAmount: 0,
    category: 'Tiền gửi ngân hàng',
    sectionGroup: 'Khối II: Tiền gửi Ngân hàng',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Vietcombank - TK 007100...',
    invoiceNumber: 'GD-VCB-07',
  },
  {
    voucherNumber: 'PC-NH-01',
    voucherDate: '2026-08-10T14:00:00Z',
    description: 'Chuyển khoản thanh toán tiền hàng nhập kho nhà cung cấp Masan',
    amount: 35_000_000,
    inAmount: 0,
    outAmount: 35_000_000,
    category: 'Tiền gửi ngân hàng',
    sectionGroup: 'Khối II: Tiền gửi Ngân hàng',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Công ty CP Hàng Tiêu Dùng Masan',
    invoiceNumber: 'UNC-VCB-8821',
  },
  {
    voucherNumber: 'PT-NH-02',
    voucherDate: '2026-08-31T17:00:00Z',
    description: 'Thu chuyển khoản khách mua hàng quét mã VietQR tháng 08/2026',
    amount: 33_000_000,
    inAmount: 33_000_000,
    outAmount: 0,
    category: 'Tiền gửi ngân hàng',
    sectionGroup: 'Khối II: Tiền gửi Ngân hàng',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Vietcombank - TK 007100...',
    invoiceNumber: 'GD-VCB-08',
  },
  {
    voucherNumber: 'PC-NH-02',
    voucherDate: '2026-09-15T09:30:00Z',
    description: 'Chuyển khoản thanh toán hóa đơn tiền điện EVN & viễn thông FPT Quý 3',
    amount: 16_000_000,
    inAmount: 0,
    outAmount: 16_000_000,
    category: 'Tiền gửi ngân hàng',
    sectionGroup: 'Khối II: Tiền gửi Ngân hàng',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'EVN HCMC & FPT Telecom',
    invoiceNumber: 'UNC-VCB-9102',
  },
  {
    voucherNumber: 'PT-NH-03',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Thu chuyển khoản khách mua hàng quét mã VietQR tháng 09/2026',
    amount: 35_000_000,
    inAmount: 35_000_000,
    outAmount: 0,
    category: 'Tiền gửi ngân hàng',
    sectionGroup: 'Khối II: Tiền gửi Ngân hàng',
    bookType: AccountingBookType.S2e_CashAndBank,
    bookCode: 'S2e-HKD',
    beneficiaryName: 'Vietcombank - TK 007100...',
    invoiceNumber: 'GD-VCB-09',
  },

  // S3a: Sổ theo dõi nghĩa vụ thuế với NSNN Quý 3/2026 (Khớp 6.762.500đ)
  {
    voucherNumber: 'CT-THUE-2026Q3-01',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Nghĩa vụ thuế Giá trị gia tăng (GTGT) phát sinh Quý 3/2026 (1% x 467.500.000đ)',
    amount: 4_675_000,
    category: 'Thuế GTGT phải nộp',
    bookType: AccountingBookType.S3a_TaxObligation,
    bookCode: 'S3a-HKD',
    beneficiaryName: 'Ngân sách Nhà nước (Kho bạc)',
    invoiceNumber: 'TK-GTGT-Q3',
    sectionGroup: 'Thuế Giá trị gia tăng (GTGT)',
    taxRate: 1.0,
    taxAmount: 4_675_000,
    inAmount: 4_675_000,
    outAmount: 0,
  },
  {
    voucherNumber: 'CT-THUE-2026Q3-02',
    voucherDate: '2026-09-30T17:00:00Z',
    description: 'Nghĩa vụ thuế Thu nhập cá nhân (TNCN) phát sinh Quý 3/2026 (0.5% x 417.500.000đ phần vượt trần)',
    amount: 2_087_500,
    category: 'Thuế TNCN phải nộp',
    bookType: AccountingBookType.S3a_TaxObligation,
    bookCode: 'S3a-HKD',
    beneficiaryName: 'Ngân sách Nhà nước (Kho bạc)',
    invoiceNumber: 'TK-TNCN-Q3',
    sectionGroup: 'Thuế Thu nhập cá nhân (TNCN)',
    taxRate: 0.5,
    taxAmount: 2_087_500,
    inAmount: 2_087_500,
    outAmount: 0,
  },
];

export const mockOrdersPool: any[] = [];
