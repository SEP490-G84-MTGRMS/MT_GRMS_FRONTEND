import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCw,
  PackageOpen,
  TrendingUp,
} from 'lucide-react';
import {
  AccountingBookType,
  HouseholdTaxGroup,
  TaxPeriodType,
  formatTaxPeriodLabel,
  type HouseholdTaxSummaryDto,
  type AccountingBookEntryDto,
} from '../types/taxSnapshot';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { formatMoney } from '../../finance/utils/formatters';
import { TaxBookPrintModal } from './TaxBookPrintModal';

interface Props {
  summary?: HouseholdTaxSummaryDto;
  year: number;
  periodType?: TaxPeriodType;
  periodNumber: number;
}

interface BookTabMetadata {
  type: AccountingBookType;
  code: string;
  name: string;
  templateCode: string;
  label: string;
  desc: string;
  badge?: string;
}

/**
 * Phân loại chứng từ kế toán có phải là Phiếu Thu (receipt) hay không theo Thông tư 152/2025/TT-BTC.
 * Ưu tiên phát sinh inAmount/outAmount, phân loại chuỗi chuẩn xác, không dùng .includes('thu') trực tiếp trên description.
 */
export const isReceiptEntry = (entry: AccountingBookEntryDto): boolean => {
  // 1. Ưu tiên số tiền phát sinh rõ ràng
  if (entry.inAmount != null && entry.inAmount > 0) {
    return true;
  }
  if (entry.outAmount != null && entry.outAmount > 0) {
    return false;
  }

  // 2. Phân loại theo mã chứng từ chuẩn
  const vNum = entry.voucherNumber?.trim().toUpperCase() || '';
  if (vNum.startsWith('PT') || vNum.startsWith('CB-IN')) {
    return true;
  }
  if (vNum.startsWith('PC') || vNum.startsWith('CB-OUT')) {
    return false;
  }

  // 3. Phân loại theo danh mục nghiệp vụ
  const cat = entry.category?.trim().toLowerCase() || '';
  if (
    cat === 'thu' ||
    cat.startsWith('thu ') ||
    cat.includes('phiếu thu')
  ) {
    return true;
  }
  if (
    cat === 'chi' ||
    cat.startsWith('chi ') ||
    cat.includes('phiếu chi')
  ) {
    return false;
  }

  // 4. Phân loại theo nội dung diễn giải (description)
  const desc = entry.description?.trim() || '';
  const descLower = desc.toLowerCase();

  // Loại trừ các trường hợp chi phí hoặc nộp thuế có chứa "thuê" hoặc "thuế"
  if (descLower.includes('thuê') || descLower.includes('thuế') || descLower.startsWith('chi ') || descLower.includes('[chi ')) {
    return false;
  }

  if (
    descLower.startsWith('[thu') ||
    descLower.startsWith('thu ') ||
    /\bthu\b/i.test(desc) ||
    /(?:^|[^\p{L}\p{N}])thu(?:$|[^\p{L}\p{N}])/iu.test(desc)
  ) {
    return true;
  }

  return false;
};

/**
 * Trích xuất chuẩn xác số tiền Thu (inAmt) và Chi (outAmt) cho dòng chứng từ quỹ S2e.
 */
export const getEntryFundAmounts = (
  entry: AccountingBookEntryDto
): { isReceipt: boolean; inAmt: number; outAmt: number } => {
  const isReceipt = isReceiptEntry(entry);

  let inAmt = 0;
  let outAmt = 0;

  if (entry.inAmount != null && entry.inAmount > 0) {
    inAmt = entry.inAmount;
    outAmt = entry.outAmount != null && entry.outAmount > 0 ? entry.outAmount : 0;
  } else if (entry.outAmount != null && entry.outAmount > 0) {
    outAmt = entry.outAmount;
    inAmt = 0;
  } else if (entry.amount > 0) {
    if (isReceipt) {
      inAmt = entry.amount;
      outAmt = 0;
    } else {
      outAmt = entry.amount;
      inAmt = 0;
    }
  }

  return { isReceipt, inAmt, outAmt };
};

export const AccountingBooksView: FC<Props> = ({ summary, year, periodType, periodNumber }) => {
  // Determine if business is under declaration method
  const isDeclaration =
    summary?.householdGroup === HouseholdTaxGroup.Group3_3BTo50B ||
    summary?.householdGroup === HouseholdTaxGroup.Group4_Over50B ||
    summary?.calculationMethod === 2;

  // Determine initial revenue book type based on household group
  const defaultRevenueBookType =
    summary?.householdGroup === HouseholdTaxGroup.Group1_Under1B
      ? AccountingBookType.S1a_RevenueGroup1
      : isDeclaration
        ? AccountingBookType.S2b_RevenueDeclaration
        : AccountingBookType.S2a_RevenueGroup2;

  const [activeBookTab, setActiveBookTab] = useState<AccountingBookType>(defaultRevenueBookType);
  const [filterPeriodType, setFilterPeriodType] = useState<'quarter' | 'month' | 'year'>(
    periodType === TaxPeriodType.Month
      ? 'month'
      : periodType === TaxPeriodType.Year
        ? 'year'
        : 'quarter'
  );
  const [filterNumber, setFilterNumber] = useState<number>(periodNumber);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Book entries state
  const [bookEntries, setBookEntries] = useState<AccountingBookEntryDto[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Synchronize period from parent props
  useEffect(() => {
    setFilterPeriodType(
      periodType === TaxPeriodType.Month
        ? 'month'
        : periodType === TaxPeriodType.Year
          ? 'year'
          : 'quarter'
    );
    setFilterNumber(periodNumber);
  }, [periodType, periodNumber]);

  // Tab definitions for all 7 books under Circular 152/2025/TT-BTC
  const bookTabs: BookTabMetadata[] = useMemo(() => [
    {
      type: AccountingBookType.S1a_RevenueGroup1,
      code: 'S1a',
      name: 'Sổ chi tiết doanh thu bán hàng hóa, dịch vụ',
      templateCode: 'Mẫu số S1a-HKD',
      label: 'S1a (Nhóm 1)',
      desc: 'Dành cho hộ kinh doanh Nhóm 1 (Doanh thu ≤ 1 tỷ/năm)',
      badge: summary?.householdGroup === HouseholdTaxGroup.Group1_Under1B ? 'Đề xuất' : undefined,
    },
    {
      type: AccountingBookType.S2a_RevenueGroup2,
      code: 'S2a',
      name: 'Sổ chi tiết doanh thu bán hàng hóa, dịch vụ',
      templateCode: 'Mẫu số S2a-HKD',
      label: 'S2a (Nhóm 2)',
      desc: 'Dành cho HKD nộp thuế theo tỷ lệ % doanh thu (Nhóm 2: 1 - 3 tỷ/năm)',
      badge: summary?.householdGroup === HouseholdTaxGroup.Group2_1BTo3B && !isDeclaration ? 'Đề xuất' : undefined,
    },
    {
      type: AccountingBookType.S2b_RevenueDeclaration,
      code: 'S2b',
      name: 'Sổ chi tiết doanh thu bán hàng hóa, dịch vụ kê khai',
      templateCode: 'Mẫu số S2b-HKD',
      label: 'S2b (Kê khai GTGT)',
      desc: 'Dành cho HKD nộp thuế GTGT theo phương pháp kê khai (Nhóm 3, 4)',
      badge: isDeclaration ? 'Đề xuất' : undefined,
    },
    {
      type: AccountingBookType.S2c_RevenueAndExpense,
      code: 'S2c',
      name: 'Sổ chi phí sản xuất, kinh doanh',
      templateCode: 'Mẫu số S2c-HKD',
      label: 'S2c (Chi phí)',
      desc: 'Theo dõi doanh thu, chi phí hợp lý và thu nhập tính thuế TNCN',
    },
    {
      type: AccountingBookType.S2d_MaterialsAndGoods,
      code: 'S2d',
      name: 'Sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hóa',
      templateCode: 'Mẫu số S2d-HKD',
      label: 'S2d (Nhập - Xuất - Tồn)',
      desc: 'Theo dõi tình hình nhập, xuất, tồn kho vật tư, hàng hóa (12 cột)',
    },
    {
      type: AccountingBookType.S2e_CashAndBank,
      code: 'S2e',
      name: 'Sổ chi tiết tiền (Tiền mặt và Tiền gửi ngân hàng)',
      templateCode: 'Mẫu số S2e-HKD',
      label: 'S2e (Tiền mặt & NH)',
      desc: 'Theo dõi dòng tiền: Khối I - Quỹ Tiền mặt và Khối II - Tiền gửi Ngân hàng',
    },
    {
      type: AccountingBookType.S3a_TaxObligation,
      code: 'S3a',
      name: 'Sổ theo dõi tình hình thực hiện nghĩa vụ thuế với NSNN',
      templateCode: 'Mẫu số S3a-HKD',
      label: 'S3a (Thuế khác)',
      desc: 'Theo dõi phát sinh và nộp các loại thuế (GTGT, TNCN, TTĐB, BVMT, Môn bài)',
    },
  ], [summary?.householdGroup, isDeclaration]);

  const activeTabMetadata = useMemo(() => {
    return bookTabs.find((t) => t.type === activeBookTab) || bookTabs[0];
  }, [bookTabs, activeBookTab]);

  const resolvedPeriodType =
    filterPeriodType === 'month'
      ? TaxPeriodType.Month
      : filterPeriodType === 'year'
        ? TaxPeriodType.Year
        : TaxPeriodType.Quarter;

  // Load accounting book data from API
  const loadBookData = useCallback(async () => {
    setIsLoadingBooks(true);
    setBookError(null);
    try {
      const data = await taxSnapshotApi.getBookDetails({
        year,
        periodType: resolvedPeriodType,
        periodNumber: filterPeriodType === 'year' ? 1 : filterNumber,
        branchId: summary?.branchId,
        bookType: activeBookTab,
      });
      setBookEntries(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err: unknown) {
      setBookError(err instanceof Error ? err.message : 'Không thể kết nối máy chủ để lấy dữ liệu sổ kế toán.');
      setBookEntries([]);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [year, resolvedPeriodType, filterPeriodType, filterNumber, summary?.branchId, activeBookTab]);

  useEffect(() => {
    loadBookData();
  }, [loadBookData]);

  // Search filter
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) {
      return bookEntries;
    }
    const q = searchTerm.toLowerCase();
    return bookEntries.filter(
      (v) =>
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.voucherNumber && v.voucherNumber.toLowerCase().includes(q)) ||
        (v.beneficiaryName && v.beneficiaryName.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.sectionGroup && v.sectionGroup.toLowerCase().includes(q))
    );
  }, [bookEntries, searchTerm]);

  // Overall totals
  const totalAmount = useMemo(() => {
    return filteredEntries.reduce((sum, v) => sum + (v.amount || 0), 0);
  }, [filteredEntries]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // S2e Fund Ledger calculations (Cash & Bank)
  const fundMetrics = useMemo(() => {
    let cIn = 0;
    let cOut = 0;
    let bIn = 0;
    let bOut = 0;

    // Tìm số dư đầu kỳ từ bookEntries để không bị mất khi filter/search
    const dkCashEntry = bookEntries.find(
      (e) =>
        e.voucherNumber === 'DK-CASH' ||
        e.voucherNumber === 'DK_CASH' ||
        (e.isSummaryRow &&
          (e.sectionGroup?.includes('Khối I') || !e.sectionGroup?.includes('Khối II')) &&
          e.description?.toLowerCase().includes('đầu kỳ'))
    );
    const dkBankEntry = bookEntries.find(
      (e) =>
        e.voucherNumber === 'DK-BANK' ||
        e.voucherNumber === 'DK_BANK' ||
        (e.isSummaryRow &&
          e.sectionGroup?.includes('Khối II') &&
          e.description?.toLowerCase().includes('đầu kỳ'))
    );

    let openingCash = dkCashEntry?.balanceAmount ?? dkCashEntry?.amount ?? 0;
    let openingBank = dkBankEntry?.balanceAmount ?? dkBankEntry?.amount ?? 0;

    filteredEntries.forEach((entry) => {
      // Cập nhật lại nếu gặp dòng DK trong filteredEntries
      if (
        entry.voucherNumber === 'DK-CASH' ||
        entry.voucherNumber === 'DK_CASH' ||
        (entry.isSummaryRow &&
          (entry.sectionGroup?.includes('Khối I') || !entry.sectionGroup?.includes('Khối II')) &&
          entry.description?.toLowerCase().includes('đầu kỳ'))
      ) {
        if (entry.balanceAmount != null || entry.amount != null) {
          openingCash = entry.balanceAmount ?? entry.amount ?? 0;
        }
        return;
      }

      if (
        entry.voucherNumber === 'DK-BANK' ||
        entry.voucherNumber === 'DK_BANK' ||
        (entry.isSummaryRow &&
          entry.sectionGroup?.includes('Khối II') &&
          entry.description?.toLowerCase().includes('đầu kỳ'))
      ) {
        if (entry.balanceAmount != null || entry.amount != null) {
          openingBank = entry.balanceAmount ?? entry.amount ?? 0;
        }
        return;
      }

      if (entry.isSummaryRow) {
        return;
      }

      const isBank =
        !entry.sectionGroup?.includes('Khối I') &&
        !entry.sectionGroup?.includes('I.') &&
        (entry.category?.toLowerCase().includes('ngân hàng') ||
          entry.category?.toLowerCase().includes('bank') ||
          entry.sectionGroup?.includes('Khối II') ||
          entry.sectionGroup?.includes('II.') ||
          entry.beneficiaryName?.toLowerCase().includes('vietcombank') ||
          entry.beneficiaryName?.toLowerCase().includes('bank'));

      const { inAmt, outAmt } = getEntryFundAmounts(entry);

      if (isBank) {
        bIn += inAmt;
        bOut += outAmt;
      } else {
        cIn += inAmt;
        cOut += outAmt;
      }
    });

    const totalIn = cIn + bIn;
    const totalOut = cOut + bOut;
    const netCashFlow = totalIn - totalOut;
    const openingBalance = openingCash + openingBank;
    const finalClosing = openingBalance + netCashFlow;

    return {
      openingCash,
      openingBank,
      openingBalance,
      closingBalance: finalClosing,
      cashIn: cIn,
      cashOut: cOut,
      cashClosing: openingCash + cIn - cOut,
      bankIn: bIn,
      bankOut: bOut,
      bankClosing: openingBank + bIn - bOut,
      totalIn,
      totalOut,
    };
  }, [bookEntries, filteredEntries]);

  // Export excel (single active book or full 7-book workbook)
  const handleExportExcel = async (onlyActiveBook = false) => {
    try {
      setIsExporting(true);
      setExportError(null);
      const targetBookType = onlyActiveBook ? activeBookTab : undefined;
      const blob = await taxSnapshotApi.exportTaxExcel(
        {
          year,
          periodType: resolvedPeriodType,
          periodNumber: filterPeriodType === 'year' ? 1 : filterNumber,
          branchId: summary?.branchId,
          bookType: targetBookType,
          calculationMethod: summary?.calculationMethod ?? 1,
          tier2Method: summary?.tier2Method,
          applyVatReduction2026: summary?.isVatReduced ?? false,
          vatReductionPercentage: summary?.vatReductionPercentage,
        },
        targetBookType
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const periodLabel =
        filterPeriodType === 'month'
          ? `Thang_${filterNumber}`
          : filterPeriodType === 'year'
            ? `Ca_Nam`
            : `Quy_${filterNumber}`;
      a.download = onlyActiveBook
        ? `So_${activeTabMetadata.code}_HKD_Nam_${year}_${periodLabel}.xlsx`
        : `Bo_7_So_Ke_Toan_TT152_Nam_${year}_${periodLabel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Không thể xuất file sổ kế toán Excel từ máy chủ.');
    } finally {
      setIsExporting(false);
    }
  };

  // Professional print handler
  const handlePrint = () => {
    window.print();
  };

  const periodDisplayName = formatTaxPeriodLabel(
    resolvedPeriodType,
    filterPeriodType === 'year' ? 1 : filterNumber,
    year
  );

  return (
    <div style={{ marginTop: 20 }}>
      {/* Print CSS Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 9pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .tax-print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table.tax-data-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8pt !important;
          }
          table.tax-data-table th, table.tax-data-table td {
            border: 1px solid #000000 !important;
            padding: 4px 6px !important;
            color: #000000 !important;
          }
          table.tax-data-table thead {
            display: table-header-group !important;
          }
          .print-signature-section {
            page-break-inside: avoid;
            margin-top: 24px;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      {/* Compliance Information Banner */}
      <div
        className="no-print"
        style={{
          padding: '12px 18px',
          borderRadius: 12,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <BookOpen size={20} style={{ color: '#15803D', flexShrink: 0 }} />
        <div style={{ fontSize: '0.84rem', color: '#166534', lineHeight: 1.55 }}>
          <strong>Hệ thống 7 sổ kế toán chuẩn Thông tư 152/2025/TT-BTC</strong> (Áp dụng từ ngày 01/01/2026).
          Dữ liệu đối soát tự động theo thời gian thực từ giao dịch bán hàng POS, chứng từ chi phí và sổ cái dòng tiền cửa hàng.
        </div>
      </div>

      {/* 7 Accounting Book Tabs Navigation */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 18,
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: 12,
        }}
      >
        {bookTabs.map((tab) => {
          const isActive = activeBookTab === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => {
                setActiveBookTab(tab.type);
                setCurrentPage(1);
              }}
              style={{
                padding: '9px 15px',
                borderRadius: 10,
                border: isActive ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                background: isActive ? '#F0FDFA' : '#ffffff',
                color: isActive ? '#0F766E' : '#475569',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <BookOpen size={15} style={{ color: isActive ? '#0F766E' : '#64748B' }} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: isActive ? '#0F766E' : '#E2E8F0',
                    color: isActive ? '#ffffff' : '#475569',
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Description Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: '#0F766E',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.76rem',
            }}
          >
            {activeTabMetadata.templateCode}
          </span>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
            {activeTabMetadata.name}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>• {activeTabMetadata.desc}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', color: '#0F766E', fontWeight: 600 }}>
            Căn cứ Thông tư 152/2025/TT-BTC
          </span>
        </div>
      </div>

      {/* S2e KPI CARDS: Opening & Closing Fund Balance */}
      {activeBookTab === AccountingBookType.S2e_CashAndBank && (
        <div
          className="no-print"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}
        >
          {/* Card 1: Số dư đầu kỳ */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Số Dư Đầu Kỳ (Quỹ Tiền & NH)
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                {formatMoney(fundMetrics.openingBalance)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                Số dư lũy kế từ kỳ trước chuyển sang
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
              }}
            >
              <Wallet size={22} />
            </div>
          </div>

          {/* Card 2: Số dư cuối kỳ */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#CCFBF1', textTransform: 'uppercase' }}>
                Số Dư Cuối Kỳ Đối Soát (Sổ Quỹ S2e)
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', marginTop: 4 }}>
                {formatMoney(fundMetrics.closingBalance)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#E0F2FE', marginTop: 2 }}>
                = Số dư đầu kỳ + Thu ({formatMoney(fundMetrics.totalIn)}) - Chi ({formatMoney(fundMetrics.totalOut)})
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Filter, Search & Export */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Period Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
            }}
          >
            <Calendar size={14} style={{ color: '#0F766E' }} />
            <select
              value={filterPeriodType}
              onChange={(e) => setFilterPeriodType(e.target.value as 'quarter' | 'month' | 'year')}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="quarter">Theo Quý</option>
              <option value="month">Theo Tháng</option>
              <option value="year">Theo Năm</option>
            </select>

            <select
              value={filterPeriodType === 'year' ? 1 : filterNumber}
              onChange={(e) => setFilterNumber(Number(e.target.value))}
              style={{
                border: 'none',
                background: '#F1F5F9',
                padding: '2px 6px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#0F766E',
                outline: 'none',
              }}
            >
              {filterPeriodType === 'quarter' ? (
                <>
                  <option value={1}>Quý 1</option>
                  <option value={2}>Quý 2</option>
                  <option value={3}>Quý 3</option>
                  <option value={4}>Quý 4</option>
                </>
              ) : filterPeriodType === 'month' ? (
                Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))
              ) : (
                <option value={1}>Cả năm {year}</option>
              )}
            </select>

            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Năm {year}</span>
          </div>

          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
            }}
          >
            <Search size={14} style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm số chứng từ, nội dung..."
              style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none', width: 190 }}
            />
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadBookData}
            disabled={isLoadingBooks}
            title="Tải lại dữ liệu từ máy chủ"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#ffffff',
              cursor: isLoadingBooks ? 'not-allowed' : 'pointer',
              color: '#475569',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} className={isLoadingBooks ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleExportExcel(true)}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} style={{ color: '#059669' }} />}
            <span>{isExporting ? 'Đang xuất...' : `Xuất Excel sổ ${activeTabMetadata.code}`}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportExcel(false)}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} style={{ color: '#0F766E' }} />}
            <span>{isExporting ? 'Đang xuất...' : 'Xuất trọn bộ 7 sổ Excel'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#0F766E',
              border: '1px solid #0F766E',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
            }}
          >
            <Printer size={15} />
            <span>Xem bản in & In A4</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {bookError && (
        <div
          className="no-print"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '0.82rem',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{bookError}</span>
        </div>
      )}

      {/* Export Error Notice */}
      {exportError && (
        <div
          className="no-print"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '0.82rem',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>⚠️ {exportError}</span>
        </div>
      )}

      {/* Printable / Interactive Book Sheet Card */}
      <div className="tax-table-card tax-print-card" style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
        {/* PRINT HEADER: Legal National Header, Household Info & Book Title */}
        <div className="print-only" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: '48%', fontSize: '8.5pt', lineHeight: 1.45 }}>
              <div><strong>HỘ KINH DOANH:</strong> {summary?.branchName || 'Điểm kinh doanh chính'}</div>
              <div><strong>Nhóm quy mô:</strong> {summary?.householdGroupName || 'Hộ kinh doanh'}</div>
              <div><strong>Kỳ hạch toán:</strong> {periodDisplayName}</div>
            </div>
            <div style={{ width: '50%', textAlign: 'center', fontSize: '8.5pt', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 800 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style={{ fontWeight: 700 }}>Độc lập - Tự do - Hạnh phúc</div>
              <div>----------o0o----------</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: 4 }}>
                {activeTabMetadata.templateCode}
                <br />
                (Ban hành theo Thông tư số 152/2025/TT-BTC của Bộ Tài chính)
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', margin: '4px 0', letterSpacing: '0.03em' }}>
              {activeTabMetadata.name}
            </h2>
            <div style={{ fontSize: '9pt', fontWeight: 700, color: '#333333' }}>
              Kỳ tính thuế: {periodDisplayName}
            </div>
            <div style={{ fontSize: '8pt', fontStyle: 'italic', color: '#555555' }}>
              Đơn vị tiền tệ: Đồng Việt Nam (VNĐ)
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoadingBooks ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: 12,
            }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: '#0F766E' }} />
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
              Đang tải dữ liệu chứng từ sổ kế toán {activeTabMetadata.code} từ máy chủ...
            </span>
          </div>
        ) : (
          /* DYNAMIC TAB TABLE RENDERING */
          <div className="tax-table-wrapper" style={{ overflowX: 'auto' }}>
            {/* TAB S1a: BẢNG 3 CỘT (Ngày ghi sổ, Diễn giải, Doanh thu) */}
            {activeBookTab === AccountingBookType.S1a_RevenueGroup1 && (
              <table className="tax-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>NGÀY GHI SỔ</th>
                    <th>DIỄN GIẢI CHI TIẾT</th>
                    <th style={{ width: 220, textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry, idx) => (
                      <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                        <td style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 600 }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            Số chứng từ: {entry.voucherNumber || '—'} {entry.invoiceNumber ? `• HĐ: ${entry.invoiceNumber}` : ''}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                          {formatMoney(entry.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow colSpan={3} bookDesc="Sổ S1a-HKD theo dõi doanh thu phát sinh cho HKD Nhóm 1." />
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={2} style={{ padding: '12px 16px', color: '#0F172A' }}>
                      TỔNG DOANH THU PHÁT SINH TRONG KỲ ({filteredEntries.length} chứng từ):
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#0F766E', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatMoney(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* TAB S2a: BẢNG 4 CỘT GOM THEO NGÀNH NGHỀ & DÒNG THUẾ GTGT + TNCN */}
            {activeBookTab === AccountingBookType.S2a_RevenueGroup2 && (
              <table className="tax-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>SỐ CHỨNG TỪ</th>
                    <th style={{ width: 130 }}>NGÀY GHI SỔ</th>
                    <th>DIỄN GIẢI CHI TIẾT</th>
                    <th style={{ width: 220, textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length > 0 ? (
                    <>
                      {/* Section Group Header */}
                      <tr style={{ background: '#F0FDFA' }}>
                        <td colSpan={4} style={{ padding: '8px 14px', fontWeight: 800, color: '#0F766E', fontSize: '0.84rem' }}>
                          Ngành nghề: Phân phối, cung cấp hàng hóa (Tỷ lệ GTGT 1% • TNCN 0.5%)
                        </td>
                      </tr>

                      {paginatedEntries.map((entry, idx) => (
                        <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                          <td style={{ fontWeight: 700, color: '#0F766E' }}>{entry.voucherNumber || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                            {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</div>
                            {entry.beneficiaryName && (
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                Đối tác: {entry.beneficiaryName}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                            {formatMoney(entry.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* Tax Calculation Rows */}
                      <tr style={{ background: '#F8FAFC', fontWeight: 700 }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '8px 14px', color: '#475569' }}>
                          1. Tổng doanh thu chịu thuế ngành nghề:
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 800, color: '#0F172A' }}>
                          {formatMoney(totalAmount)}
                        </td>
                      </tr>
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '6px 14px', color: '#475569', fontSize: '0.82rem' }}>
                          2. Thuế GTGT phải nộp (1.0% / tỷ lệ quy định):
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 14px', fontWeight: 700, color: '#0F766E', fontSize: '0.86rem' }}>
                          {formatMoney(summary?.vatAmount ?? Math.round(totalAmount * 0.01))}
                        </td>
                      </tr>
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '6px 14px', color: '#475569', fontSize: '0.82rem' }}>
                          3. Thuế TNCN phải nộp (0.5% / tỷ lệ quy định):
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 14px', fontWeight: 700, color: '#0F766E', fontSize: '0.86rem' }}>
                          {formatMoney(summary?.pitAmount ?? Math.round(totalAmount * 0.005))}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <EmptyTableRow colSpan={4} bookDesc="Sổ S2a-HKD theo dõi doanh thu và tính thuế tỷ lệ % cho HKD Nhóm 2." />
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F0FDFA', fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '12px 16px', color: '#0F766E' }}>
                      TỔNG NGHĨA VỤ THUẾ PHẢI NỘP (GTGT + TNCN):
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#0F766E', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatMoney(
                        summary?.totalTaxAmount ??
                        (summary?.vatAmount ?? Math.round(totalAmount * 0.01)) +
                        (summary?.pitAmount ?? Math.round(totalAmount * 0.005))
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* TAB S2b: BẢNG 4 CỘT GOM THEO NGÀNH NGHỀ CHỈ CÓ DÒNG THUẾ GTGT */}
            {activeBookTab === AccountingBookType.S2b_RevenueDeclaration && (
              <table className="tax-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>SỐ CHỨNG TỪ</th>
                    <th style={{ width: 130 }}>NGÀY GHI SỔ</th>
                    <th>DIỄN GIẢI DOANH THU KÊ KHAI</th>
                    <th style={{ width: 220, textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length > 0 ? (
                    <>
                      <tr style={{ background: '#F0FDFA' }}>
                        <td colSpan={4} style={{ padding: '8px 14px', fontWeight: 800, color: '#0F766E', fontSize: '0.84rem' }}>
                          Ngành nghề: Phân phối, cung cấp hàng hóa (Thuế GTGT kê khai: 1.0%)
                        </td>
                      </tr>

                      {paginatedEntries.map((entry, idx) => (
                        <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                          <td style={{ fontWeight: 700, color: '#0F766E' }}>{entry.voucherNumber || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                            {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                            {formatMoney(entry.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* Only VAT tax row per requirements */}
                      <tr style={{ background: '#F8FAFC', fontWeight: 700 }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '8px 14px', color: '#475569' }}>
                          Tổng doanh thu chịu thuế GTGT:
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 800, color: '#0F172A' }}>
                          {formatMoney(totalAmount)}
                        </td>
                      </tr>
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '8px 14px', color: '#0F766E', fontWeight: 700 }}>
                          Thuế Giá trị gia tăng (GTGT) phải nộp (1%):
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 900, color: '#0F766E', fontSize: '0.92rem' }}>
                          {formatMoney(summary?.vatAmount ?? Math.round(totalAmount * 0.01))}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <EmptyTableRow colSpan={4} bookDesc="Sổ S2b-HKD theo dõi doanh thu kê khai tính thuế GTGT." />
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F0FDFA', fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '12px 16px', color: '#0F766E' }}>
                      TỔNG THUẾ GTGT PHẢI NỘP KÊ KHAI TRONG KỲ:
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#0F766E', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatMoney(summary?.vatAmount ?? Math.round(totalAmount * 0.01))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* TAB S2c: BẢNG 4 CỘT GOM THEO 4 NHÓM LỚN (1. Doanh thu, 2. Chi phí a->e có COGS, 3. Chênh lệch, 4. Thuế TNCN) */}
            {activeBookTab === AccountingBookType.S2c_RevenueAndExpense && (() => {
              const s2cRevenueEntries = filteredEntries.filter(
                (e) =>
                  e.sectionGroup?.startsWith('1.') ||
                  e.category === 'Doanh thu bán hàng' ||
                  e.description?.startsWith('[Thu]')
              );
              const s2cCogsEntries = filteredEntries.filter(
                (e) =>
                  e.voucherNumber?.startsWith('COGS') ||
                  e.category?.includes('COGS') ||
                  e.sectionGroup?.startsWith('2.a')
              );
              const s2cExpenseEntries = filteredEntries.filter(
                (e) => !s2cRevenueEntries.includes(e) && !s2cCogsEntries.includes(e)
              );

              const s2cTotalRevenue =
                summary?.taxableRevenueInPeriod ??
                s2cRevenueEntries.reduce((s, e) => s + (e.amount || 0), 0);
              const s2cTotalCogs =
                summary?.cogsAmount ??
                s2cCogsEntries.reduce((s, e) => s + (e.amount || 0), 0);
              const s2cTotalOpex = s2cExpenseEntries.reduce((s, e) => s + (e.amount || 0), 0);
              const s2cTotalExpense =
                summary?.deductibleExpensesInPeriod ?? s2cTotalCogs + s2cTotalOpex;
              const s2cTaxableIncome =
                summary?.taxableIncomeDeclaration ?? Math.max(0, s2cTotalRevenue - s2cTotalExpense);
              const s2cPitAmount =
                summary?.declarationPitAmount ??
                summary?.pitAmount ??
                Math.round(s2cTaxableIncome * 0.15);

              return (
                <table className="tax-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>SỐ CHỨNG TỪ</th>
                      <th style={{ width: 130 }}>NGÀY GHI SỔ</th>
                      <th>NỘI DUNG DOANH THU & CHI PHÍ</th>
                      <th style={{ width: 220, textAlign: 'right' }}>SỐ TIỀN (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Nhóm 1: Doanh thu bán hàng hóa, cung cấp dịch vụ */}
                    <tr style={{ background: '#F0FDF4' }}>
                      <td colSpan={4} style={{ padding: '8px 14px', fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}>
                        1. DOANH THU BÁN HÀNG HÓA, DỊCH VỤ TRONG KỲ
                      </td>
                    </tr>
                    {s2cRevenueEntries.length > 0 ? (
                      s2cRevenueEntries.map((entry, idx) => (
                        <tr key={entry.voucherNumber ? `rev-${entry.voucherNumber}-${idx}` : `rev-${idx}`}>
                          <td style={{ fontWeight: 700, color: '#166534' }}>{entry.voucherNumber || '—'}</td>
                          <td style={{ color: '#64748B', fontSize: '0.8rem' }}>
                            {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : periodDisplayName}
                          </td>
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                            {formatMoney(entry.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={{ fontWeight: 700, color: '#166534' }}>BK-DT</td>
                        <td style={{ color: '#64748B', fontSize: '0.8rem' }}>{periodDisplayName}</td>
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>
                          Doanh thu bán lẻ quầy thu ngân (Tổng hợp từ hệ thống đơn hàng trong kỳ)
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                          {formatMoney(s2cTotalRevenue)}
                        </td>
                      </tr>
                    )}

                    {/* Nhóm 2: Chi phí SXKD hợp lý hợp lệ (2.a -> 2.e có COGS) */}
                    <tr style={{ background: '#FEF2F2' }}>
                      <td colSpan={4} style={{ padding: '8px 14px', fontWeight: 800, color: '#991B1B', fontSize: '0.85rem' }}>
                        2. CHI PHÍ SẢN XUẤT, KINH DOANH HỢP LÝ, HỢP LỆ
                      </td>
                    </tr>

                    {/* 2a. Chi phí giá vốn hàng bán COGS */}
                    {s2cCogsEntries.length > 0 ? (
                      s2cCogsEntries.map((entry, idx) => (
                        <tr key={entry.voucherNumber ? `cogs-${entry.voucherNumber}-${idx}` : `cogs-${idx}`}>
                          <td style={{ fontWeight: 700, color: '#B91C1C' }}>{entry.voucherNumber || 'COGS'}</td>
                          <td style={{ color: '#64748B', fontSize: '0.8rem' }}>
                            {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : periodDisplayName}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Phân loại: {entry.sectionGroup || '2.a. Chi phí nguyên vật liệu, hàng hóa (Giá vốn)'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#B91C1C' }}>
                            {formatMoney(entry.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={{ fontWeight: 700, color: '#B91C1C' }}>COGS</td>
                        <td style={{ color: '#64748B', fontSize: '0.8rem' }}>{periodDisplayName}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>
                            2a. Chi phí giá vốn hàng đã bán (COGS - Kết chuyển từ Sổ S2d-HKD)
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Xuất kho hàng hóa bán lẻ theo giá vốn thực tế khi bán
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#B91C1C' }}>
                          {formatMoney(s2cTotalCogs)}
                        </td>
                      </tr>
                    )}

                    {/* 2b -> 2e: Các phiếu chi thực tế */}
                    {s2cExpenseEntries.map((entry, idx) => (
                      <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                        <td style={{ fontWeight: 700, color: '#B91C1C' }}>{entry.voucherNumber || '—'}</td>
                        <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Phân loại: {entry.sectionGroup || entry.category}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#B91C1C' }}>
                          {formatMoney(entry.amount)}
                        </td>
                      </tr>
                    ))}

                    {/* Nhóm 3: Chênh lệch thu chi */}
                    <tr style={{ background: '#F1F5F9' }}>
                      <td colSpan={4} style={{ padding: '8px 14px', fontWeight: 800, color: '#334155', fontSize: '0.85rem' }}>
                        3. CHÊNH LỆCH THU - CHI (LỢI NHUẬN / THU NHẬP CHỊU THUẾ TNCN)
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                        Lợi nhuận kinh doanh = (1. Doanh thu: {formatMoney(s2cTotalRevenue)}) - (2. Tổng chi phí hợp lý: {formatMoney(s2cTotalExpense)}):
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 900, color: '#0F172A', fontSize: '0.98rem' }}>
                        {formatMoney(s2cTaxableIncome)}
                      </td>
                    </tr>

                    {/* Nhóm 4: Thuế TNCN tính theo phương pháp kê khai */}
                    <tr style={{ background: '#F0FDFA' }}>
                      <td colSpan={4} style={{ padding: '8px 14px', fontWeight: 800, color: '#0F766E', fontSize: '0.85rem' }}>
                        4. NGHĨA VỤ THUẾ THU NHẬP CÁ NHÂN (TNCN) THEO PHƯƠNG PHÁP KÊ KHAI
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, color: '#0F766E' }}>
                        Thuế TNCN phải nộp theo phương pháp kê khai trên thu nhập tính thuế:
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 900, color: '#0F766E', fontSize: '1rem' }}>
                        {formatMoney(s2cPitAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}

            {/* TAB S2d: BẢNG 12 CỘT NHẬP - XUẤT - TỒN CHUẨN THÔNG TƯ 152 */}
            {activeBookTab === AccountingBookType.S2d_MaterialsAndGoods && (
              <table className="tax-data-table">
                <thead>
                  <tr>
                    <th colSpan={2} style={{ textAlign: 'center' }}>CHỨNG TỪ</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', minWidth: 180 }}>DIỄN GIẢI / TÊN HÀNG HÓA</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', width: 70, textAlign: 'center' }}>ĐVT</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', width: 100, textAlign: 'right' }}>ĐƠN GIÁ (VNĐ)</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: '#F0FDF4' }}>NHẬP TRONG KỲ</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: '#FEF2F2' }}>XUẤT TRONG KỲ</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: '#F0FDFA' }}>TỒN CUỐI KỲ</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', width: 110 }}>GHI CHÚ</th>
                  </tr>
                  <tr>
                    <th style={{ width: 110 }}>Số hiệu</th>
                    <th style={{ width: 95 }}>Ngày ghi</th>
                    <th style={{ width: 70, textAlign: 'right', background: '#F0FDF4' }}>SL</th>
                    <th style={{ width: 110, textAlign: 'right', background: '#F0FDF4' }}>Thành tiền</th>
                    <th style={{ width: 70, textAlign: 'right', background: '#FEF2F2' }}>SL</th>
                    <th style={{ width: 110, textAlign: 'right', background: '#FEF2F2' }}>Thành tiền</th>
                    <th style={{ width: 70, textAlign: 'right', background: '#F0FDFA' }}>SL</th>
                    <th style={{ width: 110, textAlign: 'right', background: '#F0FDFA' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry, idx) => (
                      <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                        <td style={{ fontWeight: 700, color: '#0F766E', fontSize: '0.78rem' }}>
                          {entry.voucherNumber || '—'}
                        </td>
                        <td style={{ color: '#64748B', fontSize: '0.76rem' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.82rem' }}>
                          {entry.description}
                        </td>
                        <td style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>
                          {entry.unit || 'Cái'}
                        </td>
                        <td style={{ textAlign: 'right', color: '#475569', fontSize: '0.8rem' }}>
                          {formatMoney(entry.unitPrice ?? 0)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, background: '#FAFCFA', color: '#166534' }}>
                          {(entry.inQuantity ?? 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, background: '#FAFCFA', color: '#166534' }}>
                          {formatMoney(entry.inAmount ?? entry.amount)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, background: '#FCFAFA', color: '#991B1B' }}>
                          {(entry.outQuantity ?? 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, background: '#FCFAFA', color: '#991B1B' }}>
                          {formatMoney(entry.outAmount ?? 0)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, background: '#F0FDFA', color: '#0F766E' }}>
                          {(entry.balanceQuantity ?? 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, background: '#F0FDFA', color: '#0F766E' }}>
                          {formatMoney(entry.balanceAmount ?? 0)}
                        </td>
                        <td style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {entry.beneficiaryName || entry.invoiceNumber || 'Hợp lệ'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow colSpan={12} bookDesc="Sổ S2d-HKD theo dõi nhập xuất tồn kho hàng hóa và dụng cụ." />
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={5} style={{ padding: '12px 14px', color: '#0F172A' }}>
                      TỔNG CỘNG NHẬP - XUẤT - TỒN TRONG KỲ:
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', color: '#166534' }}>
                      {filteredEntries.reduce((s, e) => s + (e.inQuantity ?? 0), 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', color: '#166534' }}>
                      {formatMoney(filteredEntries.reduce((s, e) => s + (e.inAmount ?? e.amount ?? 0), 0))}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', color: '#991B1B' }}>
                      {filteredEntries.reduce((s, e) => s + (e.outQuantity ?? 0), 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', color: '#991B1B' }}>
                      {formatMoney(filteredEntries.reduce((s, e) => s + (e.outAmount ?? 0), 0))}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', color: '#0F766E' }}>
                      {(filteredEntries.length > 0
                        ? (filteredEntries[filteredEntries.length - 1].balanceQuantity ?? 0)
                        : 0
                      ).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', color: '#0F766E', fontSize: '0.96rem' }}>
                      {formatMoney(
                        filteredEntries.length > 0
                          ? (filteredEntries[filteredEntries.length - 1].balanceAmount ?? 0)
                          : 0
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* TAB S2e: BẢNG 5 CỘT PHÂN 2 KHỐI (Khối I: Quỹ Tiền Mặt, Khối II: Tiền Gửi Ngân Hàng) */}
            {activeBookTab === AccountingBookType.S2e_CashAndBank && (
              <table className="tax-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>SỐ CHỨNG TỪ</th>
                    <th style={{ width: 120 }}>NGÀY GHI SỔ</th>
                    <th>DIỄN GIẢI THU / CHI QUỸ</th>
                    <th style={{ width: 190, textAlign: 'right', color: '#166534' }}>THU / GỬI VÀO (VNĐ)</th>
                    <th style={{ width: 190, textAlign: 'right', color: '#991B1B' }}>CHI / RÚT RA (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* KHỐI I: QUỸ TIỀN MẶT */}
                  <tr style={{ background: '#F0FDF4' }}>
                    <td colSpan={5} style={{ padding: '8px 14px', fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}>
                      KHỐI I: QUỸ TIỀN MẶT (TẠI QUẦY & KÉT SẮT) — Số dư đầu kỳ: {formatMoney(fundMetrics.openingCash)}
                    </td>
                  </tr>
                  {filteredEntries
                    .filter(
                      (e) =>
                        !e.isSummaryRow &&
                        e.voucherNumber !== 'DK-CASH' &&
                        e.voucherNumber !== 'DK-BANK' &&
                        e.voucherNumber !== 'DK_CASH' &&
                        e.voucherNumber !== 'DK_BANK' &&
                        !e.category?.toLowerCase().includes('ngân hàng') &&
                        !e.category?.toLowerCase().includes('bank') &&
                        !e.sectionGroup?.includes('Khối II') &&
                        !e.sectionGroup?.includes('II.')
                    )
                    .map((entry, idx) => {
                      const { isReceipt, inAmt, outAmt } = getEntryFundAmounts(entry);
                      return (
                        <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                          <td style={{ fontWeight: 700, color: '#0F766E' }}>{entry.voucherNumber || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                            {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Tài khoản / Quỹ: {entry.beneficiaryName || 'Két quầy thu ngân'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                            {isReceipt ? formatMoney(inAmt) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#991B1B' }}>
                            {!isReceipt ? formatMoney(outAmt) : '—'}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Subtotal Khối I */}
                  <tr style={{ background: '#F8FAFC', fontWeight: 700 }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '8px 14px', color: '#166534' }}>
                      Cộng phát sinh Khối I (Quỹ Tiền mặt) — Tồn quỹ cuối kỳ: {formatMoney(fundMetrics.cashClosing)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#166534', fontWeight: 800 }}>
                      {formatMoney(fundMetrics.cashIn)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#991B1B', fontWeight: 800 }}>
                      {formatMoney(fundMetrics.cashOut)}
                    </td>
                  </tr>

                  {/* KHỐI II: TIỀN GỬI NGÂN HÀNG */}
                  <tr style={{ background: '#EFF6FF' }}>
                    <td colSpan={5} style={{ padding: '8px 14px', fontWeight: 800, color: '#1E40AF', fontSize: '0.85rem' }}>
                      KHỐI II: TIỀN GỬI NGÂN HÀNG (TÀI KHOẢN THANH TOÁN) — Số dư đầu kỳ: {formatMoney(fundMetrics.openingBank)}
                    </td>
                  </tr>
                  {filteredEntries
                    .filter(
                      (e) =>
                        !e.isSummaryRow &&
                        e.voucherNumber !== 'DK-CASH' &&
                        e.voucherNumber !== 'DK-BANK' &&
                        e.voucherNumber !== 'DK_CASH' &&
                        e.voucherNumber !== 'DK_BANK' &&
                        (e.category?.toLowerCase().includes('ngân hàng') ||
                          e.category?.toLowerCase().includes('bank') ||
                          e.sectionGroup?.includes('Khối II') ||
                          e.sectionGroup?.includes('II.'))
                    )
                    .map((entry, idx) => {
                      const { isReceipt, inAmt, outAmt } = getEntryFundAmounts(entry);
                      return (
                        <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                          <td style={{ fontWeight: 700, color: '#1E40AF' }}>{entry.voucherNumber || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                            {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Ngân hàng: {entry.beneficiaryName || 'Tài khoản ngân hàng Vietcombank'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                            {isReceipt ? formatMoney(inAmt) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#991B1B' }}>
                            {!isReceipt ? formatMoney(outAmt) : '—'}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Subtotal Khối II */}
                  <tr style={{ background: '#F8FAFC', fontWeight: 700 }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '8px 14px', color: '#1E40AF' }}>
                      Cộng phát sinh Khối II (Tiền gửi Ngân hàng) — Số dư cuối kỳ: {formatMoney(fundMetrics.bankClosing)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#166534', fontWeight: 800 }}>
                      {formatMoney(fundMetrics.bankIn)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#991B1B', fontWeight: 800 }}>
                      {formatMoney(fundMetrics.bankOut)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F0FDFA', fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '12px 16px', color: '#0F766E' }}>
                      TỔNG CỘNG PHÁT SINH THU / CHI TOÀN BỘ QUỸ:
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#166534', fontSize: '1rem', fontWeight: 900 }}>
                      {formatMoney(fundMetrics.totalIn)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#991B1B', fontSize: '1rem', fontWeight: 900 }}>
                      {formatMoney(fundMetrics.totalOut)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* TAB S3a: BẢNG THEO DÕI NGHĨA VỤ THUẾ KHÁC VỚI NSNN */}
            {activeBookTab === AccountingBookType.S3a_TaxObligation && (
              <table className="tax-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>SỐ CHỨNG TỪ</th>
                    <th style={{ width: 120 }}>NGÀY GHI SỔ</th>
                    <th>NỘI DUNG NGHĨA VỤ THUẾ</th>
                    <th style={{ width: 160 }}>SẮC THUẾ / TIỂU MỤC</th>
                    <th style={{ width: 170, textAlign: 'right' }}>PHẢI NỘP (VNĐ)</th>
                    <th style={{ width: 170, textAlign: 'right' }}>ĐÃ NỘP (VNĐ)</th>
                    <th style={{ width: 150 }}>CÒN NỢ / GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry, idx) => (
                      <tr key={entry.voucherNumber ? `${entry.voucherNumber}-${idx}` : idx}>
                        <td style={{ fontWeight: 700, color: '#0F766E' }}>{entry.voucherNumber || '—'}</td>
                        <td style={{ color: '#475569', fontSize: '0.8rem' }}>
                          {entry.voucherDate ? new Date(entry.voucherDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>{entry.description}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: '#F0FDFA',
                              color: '#0F766E',
                              fontWeight: 600,
                            }}
                          >
                            {entry.category || 'Thuế NSNN'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                          {formatMoney(entry.amount)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                          {formatMoney(entry.outAmount ?? 0)}
                        </td>
                        <td style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          {(entry.outAmount ?? 0) >= entry.amount ? (
                            <span style={{ color: '#166534', fontWeight: 600 }}>Đã hoàn thành</span>
                          ) : (
                            <span style={{ color: '#D97706', fontWeight: 700 }}>Chờ nộp kho bạc</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow colSpan={7} bookDesc="Sổ S3a-HKD theo dõi các khoản thuế phát sinh và nộp vào Ngân sách Nhà nước." />
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={4} style={{ padding: '12px 16px', color: '#0F172A' }}>
                      TỔNG CỘNG NGHĨA VỤ THUẾ PHÁT SINH TRONG KỲ:
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#0F766E', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatMoney(totalAmount)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#166534', fontWeight: 800 }}>
                      {formatMoney(filteredEntries.reduce((s, e) => s + (e.outAmount ?? 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* Client-Side Pagination */}
        {totalPages > 1 && !isLoadingBooks && (
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Trang {currentPage} / {totalPages} (Tổng {filteredEntries.length} chứng từ)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#ffffff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                Trước
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#ffffff',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                Sau
              </button>
            </div>
          </div>
        )}

        {/* PRINT FOOTER: Signature block */}
        <div className="print-only print-signature-section">
          <div style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '8.5pt', marginBottom: 16 }}>
            Ngày ..... tháng ..... năm {year}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
              fontSize: '8.5pt',
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>NGƯỜI LẬP BIỂU</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', color: '#555555' }}>(Ký, ghi rõ họ tên)</div>
              <div style={{ height: 60 }}></div>
              <div style={{ fontWeight: 600 }}>Nguyễn Thị Thu Ngân</div>
            </div>

            <div>
              <div style={{ fontWeight: 800 }}>KẾ TOÁN TRƯỞNG</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', color: '#555555' }}>(Ký, ghi rõ họ tên)</div>
              <div style={{ height: 60 }}></div>
              <div style={{ fontWeight: 600 }}>Trần Văn Kế Toán</div>
            </div>

            <div>
              <div style={{ fontWeight: 800 }}>NGƯỜI ĐẠI DIỆN HỘ KINH DOANH</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', color: '#555555' }}>(Ký, đóng dấu nếu có)</div>
              <div style={{ height: 60 }}></div>
              <div style={{ fontWeight: 700 }}>Cô Ba - Đại diện HKD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xem trước và in ấn A4 chuẩn Thông tư 152 */}
      <TaxBookPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        activeBookTab={activeBookTab}
        onSelectBookTab={(type) => setActiveBookTab(type)}
        bookTabs={bookTabs}
        activeTabMetadata={activeTabMetadata}
        entries={filteredEntries}
        fundMetrics={fundMetrics}
        totalAmount={totalAmount}
        summary={summary}
        periodDisplayName={periodDisplayName}
        year={year}
        onPrint={handlePrint}
      />
    </div>
  );
};

/**
 * Empty Table Row Helper
 */
const EmptyTableRow: FC<{ colSpan: number; bookDesc: string }> = ({ colSpan, bookDesc }) => (
  <tr>
    <td colSpan={colSpan} style={{ textAlign: 'center', padding: '44px 20px', color: '#94A3B8' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <PackageOpen size={36} style={{ color: '#CBD5E1' }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748B' }}>
          Chưa có chứng từ nào phát sinh trong kỳ kế toán được chọn.
        </span>
        <span style={{ fontSize: '0.78rem', color: '#94A3B8', maxWidth: 480 }}>
          {bookDesc}
        </span>
      </div>
    </td>
  </tr>
);
