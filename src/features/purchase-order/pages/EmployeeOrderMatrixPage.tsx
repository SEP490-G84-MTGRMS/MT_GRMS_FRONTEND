import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MOCK_PO_SUPPLIERS,
  MOCK_BRANCHES,
  MOCK_MATRIX_PRODUCTS,
} from '../lib/mockData';
import type {
  QtyMatrixMap,
  DayColInfo,
} from '../types/po.types';
import { OrderMatrixHeader } from '../components/matrix/OrderMatrixHeader';
import { OrderMatrixFilterBar } from '../components/matrix/OrderMatrixFilterBar';
import { OrderMatrixTable } from '../components/matrix/OrderMatrixTable';
import { AdminToast, type ToastState } from '../../admin/components';
import '../purchase-order.css';

// Base mock reference date matching design prototype
const BASE_TODAY = '2026-09-26';

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtShortStr(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function getDowName(d: Date): string {
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
}

function addDaysToDate(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function computeDayColumns(
  viewFrom: Date,
  viewMode: number,
  supplierId: string
): DayColInfo[] {
  const list: DayColInfo[] = [];
  const isAll = supplierId === 'ALL';
  const sup = MOCK_PO_SUPPLIERS.find((s) => s.id === supplierId) || MOCK_PO_SUPPLIERS[0];
  const config = sup.config;
  const baseDate = parseDateStr(BASE_TODAY);
  const earliestAllowed = isAll
    ? BASE_TODAY
    : fmtDateStr(addDaysToDate(baseDate, config.leadDays));

  for (let i = 0; i < viewMode; i++) {
    const d = addDaysToDate(viewFrom, i);
    const k = fmtDateStr(d);
    const isLeadBlocked = isAll ? false : k < earliestAllowed;
    const isDayOff = isAll ? d.getDay() === 0 : !config.activeDeliveryDays.includes(d.getDay());
    const isHoliday = isAll ? false : config.holidays.includes(k);
    const isOff = isLeadBlocked || isDayOff || isHoliday;
    const isLocked = !isOff && k <= fmtDateStr(addDaysToDate(baseDate, 2));

    list.push({
      date: d,
      dateKey: k,
      dowName: getDowName(d),
      dateShort: fmtShortStr(d),
      isOff,
      isLocked,
    });
  }
  return list;
}

function computeDefaultQtyMap(
  supplierId: string,
  days: DayColInfo[]
): QtyMatrixMap {
  const initialMap: QtyMatrixMap = {};
  const relevantProducts =
    supplierId === 'ALL'
      ? MOCK_MATRIX_PRODUCTS
      : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === supplierId);

  relevantProducts.forEach((p) => {
    initialMap[p.id] = {};
  });

  days.forEach((d, idx) => {
    if (!d.isOff && !d.isLocked && idx % 2 === 0) {
      relevantProducts.slice(0, 8).forEach((p) => {
        if (!initialMap[p.id]) initialMap[p.id] = {};
        initialMap[p.id][d.dateKey] = Math.max(p.moq, 5);
      });
    }
  });

  return initialMap;
}

export const EmployeeOrderMatrixPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Employee belongs to a fixed branch (default BR-01 or param if set)
  const branchParam = searchParams.get('branchId') || searchParams.get('branch');
  const employeeBranch = useMemo(() => {
    return MOCK_BRANCHES.find((b) => b.id === branchParam) || MOCK_BRANCHES.find((b) => b.id === 'BR-01') || MOCK_BRANCHES[0];
  }, [branchParam]);

  const initialSupplier = searchParams.get('supplier') || 'ALL';
  const isReadOnly = searchParams.get('mode') === 'view' || searchParams.get('readOnly') === 'true';
  const initialViewMode = 14;
  const initialViewFrom = parseDateStr(BASE_TODAY);
  const initialDays = computeDayColumns(initialViewFrom, initialViewMode, initialSupplier);

  // State: Supplier & Time Scope
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplier);
  const viewMode = 14;
  const [viewFrom, setViewFrom] = useState<Date>(initialViewFrom);
  const [dateFromInput, setDateFromInput] = useState<string>(BASE_TODAY);
  const [dateToInput, setDateToInput] = useState<string>(() =>
    fmtDateStr(addDaysToDate(parseDateStr(BASE_TODAY), initialViewMode - 1))
  );

  // State: Secondary Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [moqOnly, setMoqOnly] = useState<boolean>(false);
  const [orderedOnly, setOrderedOnly] = useState<boolean>(false);
  const [showSoh, setShowSoh] = useState<boolean>(false);

  // State: Matrix Data & Operational
  const [qtyMap, setQtyMap] = useState<QtyMatrixMap>(() =>
    computeDefaultQtyMap(initialSupplier, initialDays)
  );
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Draft');

  // State: Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Available Categories for current supplier(s)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const prods =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);
    prods.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [selectedSupplierId]);

  // Date column list based on viewFrom and viewMode
  const dayColumns: DayColInfo[] = useMemo(() => {
    return computeDayColumns(viewFrom, viewMode, selectedSupplierId);
  }, [viewFrom, viewMode, selectedSupplierId]);

  // Handle cell quantity change
  const handleQtyChange = (productId: string, dateKey: string, val: number) => {
    setQtyMap((prev) => {
      const prodMap = { ...(prev[productId] || {}) };
      prodMap[dateKey] = val;
      return { ...prev, [productId]: prodMap };
    });
    setIsDirty(true);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return MOCK_MATRIX_PRODUCTS.filter((p) => {
      if (selectedSupplierId !== 'ALL' && p.supplierId !== selectedSupplierId) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (kw && !p.name.toLowerCase().includes(kw) && !p.sku.toLowerCase().includes(kw)) {
        return false;
      }
      if (moqOnly) {
        const hasMoqFail = dayColumns.some((d) => {
          const q = qtyMap[p.id]?.[d.dateKey] || 0;
          return q > 0 && q < p.moq;
        });
        if (!hasMoqFail) return false;
      }
      if (orderedOnly) {
        const hasQty = dayColumns.some((d) => (qtyMap[p.id]?.[d.dateKey] || 0) > 0);
        if (!hasQty) return false;
      }
      return true;
    });
  }, [selectedSupplierId, categoryFilter, keyword, moqOnly, orderedOnly, dayColumns, qtyMap]);

  // Real-time Matrix Calculations
  const { moqFails } = useMemo(() => {
    const fails: string[] = [];
    const activeProducts =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);

    activeProducts.forEach((p) => {
      dayColumns.forEach((d) => {
        const q = qtyMap[p.id]?.[d.dateKey] || 0;
        if (q > 0 && q < p.moq) {
          fails.push(`${p.name} (${d.dateShort}): SL ${q} < MOQ ${p.moq}`);
        }
      });
    });

    return { moqFails: fails };
  }, [dayColumns, qtyMap, selectedSupplierId]);

  // Week Shifts
  const handleShiftWeek = (deltaWeeks: number) => {
    const newFrom = addDaysToDate(viewFrom, deltaWeeks * 7);
    setViewFrom(newFrom);
    setDateFromInput(fmtDateStr(newFrom));
    setDateToInput(fmtDateStr(addDaysToDate(newFrom, viewMode - 1)));
  };

  const handleThisWeek = () => {
    const base = parseDateStr(BASE_TODAY);
    setViewFrom(base);
    setDateFromInput(BASE_TODAY);
    setDateToInput(fmtDateStr(addDaysToDate(base, viewMode - 1)));
  };

  const handleApplyRange = () => {
    const from = parseDateStr(dateFromInput);
    const to = parseDateStr(dateToInput);
    if (to < from) {
      showToast('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!', 'warning');
      return;
    }
    setViewFrom(from);
    showToast(`Đã áp dụng khoảng thời gian từ ${dateFromInput} đến ${dateToInput}`, 'success');
  };

  // Copy Previous Week
  const handleCopyPrevWeek = () => {
    const newMap = { ...qtyMap };
    let copyCount = 0;
    const relevantProducts =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);

    relevantProducts.forEach((p) => {
      if (!newMap[p.id]) newMap[p.id] = {};
      dayColumns.forEach((d) => {
        if (!d.isOff && !d.isLocked) {
          const prevKey = fmtDateStr(addDaysToDate(d.date, -7));
          const prevQty = qtyMap[p.id]?.[prevKey];
          if (prevQty !== undefined && prevQty > 0) {
            newMap[p.id][d.dateKey] = prevQty;
            copyCount++;
          }
        }
      });
    });

    setQtyMap(newMap);
    setIsDirty(true);
    showToast(
      copyCount > 0
        ? `Đã sao chép thành công ${copyCount} ô số lượng từ tuần trước sang tuần này!`
        : 'Không tìm thấy dữ liệu số lượng tuần trước để sao chép.',
      copyCount > 0 ? 'success' : 'warning'
    );
  };

  // Excel Download
  const handleExcelDownload = () => {
    const relevantProducts =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);

    const headers = [
      'Nhà Cung Cấp',
      'Ngành Hàng',
      'Tên Sản Phẩm',
      'Mã SKU',
      'MOQ',
      'ĐVT',
      'Đơn Giá (VNĐ)',
      ...dayColumns.map((d) => `${d.dowName} ${d.dateShort}`),
      'Tổng SL',
      'Thành Tiền (VNĐ)',
    ];

    let csvContent = headers.join(',') + '\n';

    relevantProducts.forEach((p) => {
      let rowQty = 0;
      const dayCells = dayColumns.map((d) => {
        const q = qtyMap[p.id]?.[d.dateKey] || 0;
        rowQty += q;
        return q;
      });
      const rowAmt = rowQty * p.price;

      const row = [
        `"${(p.supplierName || p.supplierId).replace(/"/g, '""')}"`,
        p.category,
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku,
        p.moq,
        p.unit,
        p.price,
        ...dayCells,
        rowQty,
        rowAmt,
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PO_Matrix_${employeeBranch.code}_${selectedSupplierId}_${fmtDateStr(viewFrom)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file bảng ma trận đặt hàng (.csv) thành công!', 'success');
  };

  // Excel Upload
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const newMap = { ...qtyMap };
      let updatedItems = 0;

      lines.slice(1).forEach((line) => {
        const cols = line.split(',');
        if (cols.length >= 7) {
          const sku = cols[3]?.trim();
          const targetProd = MOCK_MATRIX_PRODUCTS.find((p) => p.sku === sku);
          if (targetProd && (selectedSupplierId === 'ALL' || targetProd.supplierId === selectedSupplierId)) {
            if (!newMap[targetProd.id]) newMap[targetProd.id] = {};
            dayColumns.forEach((d, idx) => {
              if (!d.isOff && !d.isLocked) {
                const val = parseFloat(cols[7 + idx]);
                if (!isNaN(val) && val >= 0) {
                  newMap[targetProd.id][d.dateKey] = val;
                  updatedItems++;
                }
              }
            });
          }
        }
      });

      setQtyMap(newMap);
      setIsDirty(true);
      showToast(`Đã nạp thành công dữ liệu từ file "${file.name}" (${updatedItems} ô số lượng)!`, 'success');
    };
    reader.readAsText(file);
  };

  // Save Draft
  const handleSaveDraft = () => {
    setStatus('Draft');
    setIsDirty(false);
    showToast(`Đã lưu nháp kế hoạch đặt hàng cho chi nhánh ${employeeBranch.name}.`, 'success');
  };

  return (
    <div className="po-matrix-container">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* 1. Page Header */}
      <OrderMatrixHeader
        status={status}
        onBack={() => navigate(-1)}
        onSave={handleSaveDraft}
        readOnly={isReadOnly}
        title={isReadOnly ? `Chi Tiết Đơn Đặt Hàng — ${employeeBranch.name}` : `Đặt Hàng Theo Ma Trận — ${employeeBranch.name}`}
      />

      {/* 2. Unified Filter Bar — without branch selector */}
      <OrderMatrixFilterBar
        hideBranchSelect={true}
        fixedBranchLabel={`${employeeBranch.code} - ${employeeBranch.name}`}
        selectedBranchId={employeeBranch.id}
        suppliers={MOCK_PO_SUPPLIERS}
        selectedSupplierId={selectedSupplierId}
        onSelectSupplier={(id) => {
          setSelectedSupplierId(id);
          const nextDays = computeDayColumns(viewFrom, viewMode, id);
          setQtyMap(computeDefaultQtyMap(id, nextDays));
          setIsDirty(false);
        }}
        dateFrom={dateFromInput}
        dateTo={dateToInput}
        onDateFromChange={(val) => setDateFromInput(val)}
        onDateToChange={(val) => setDateToInput(val)}
        onApplyRange={handleApplyRange}
        categories={availableCategories}
        categoryFilter={categoryFilter}
        onCategoryChange={(cat) => setCategoryFilter(cat)}
        keyword={keyword}
        onKeywordChange={(kw) => setKeyword(kw)}
        moqOnly={moqOnly}
        onMoqOnlyChange={(checked) => setMoqOnly(checked)}
        orderedOnly={orderedOnly}
        onOrderedOnlyChange={(checked) => setOrderedOnly(checked)}
        moqFailsCount={moqFails.length}
        showSoh={showSoh}
        onShowSohChange={(checked) => setShowSoh(checked)}
        onResetFilters={() => {
          setCategoryFilter('');
          setKeyword('');
          setMoqOnly(false);
          setOrderedOnly(false);
          setShowSoh(false);
        }}
        isDirty={isDirty}
        onShiftWeek={handleShiftWeek}
        onThisWeek={handleThisWeek}
        onCopyPrevWeek={handleCopyPrevWeek}
        onExcelDownload={handleExcelDownload}
        onExcelUpload={handleExcelUpload}
      />

      {/* 3. Main Matrix Table — full remaining height */}
      <div className="po-table-flex">
        <OrderMatrixTable
          products={filteredProducts}
          days={dayColumns}
          qtyMap={qtyMap}
          showSoh={showSoh}
          onQtyChange={handleQtyChange}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
};

export default EmployeeOrderMatrixPage;
