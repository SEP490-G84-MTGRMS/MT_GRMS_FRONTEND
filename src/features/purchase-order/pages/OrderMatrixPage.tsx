import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MOCK_PO_SUPPLIERS,
  MOCK_BRANCHES,
  MOCK_MATRIX_PRODUCTS,
} from '../lib/mockData';
import type {
  DayColInfo,
  MatrixCellMap,
  MatrixCellData,
  SplitPoPreview,
  SplitPoItem,
} from '../types/po.types';
import { OrderMatrixHeader } from '../components/matrix/OrderMatrixHeader';
import { OrderMatrixFilterBar } from '../components/matrix/OrderMatrixFilterBar';
import { OrderMatrixTable } from '../components/matrix/OrderMatrixTable';
import { OrderMatrixSplitModal } from '../components/matrix/OrderMatrixSplitModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import '../purchase-order.css';

// Base mock reference date matching FE-05 prototype: Monday 2026-11-02
const BASE_TODAY = '2026-11-02';

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
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDowName(d: Date): string {
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
}

function addDaysToDate(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function diffInDays(d1: Date, d2: Date): number {
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Compute dynamic day columns with cutoff rules per delivery date
function computeDayColumns(
  viewFrom: Date,
  durationDays: number,
  supplierId: string,
  lockedDates: Set<string>
): DayColInfo[] {
  const list: DayColInfo[] = [];
  const isAll = supplierId === 'ALL';
  const sup = MOCK_PO_SUPPLIERS.find((s) => s.id === supplierId) || MOCK_PO_SUPPLIERS[0];
  const config = sup.config;
  const baseDate = parseDateStr(BASE_TODAY);
  const earliestAllowed = isAll
    ? BASE_TODAY
    : fmtDateStr(addDaysToDate(baseDate, config.leadDays));

  // Today + 1 is Tuesday 03/11 in this scenario -> cutoff due today at 15:00
  const cutoffDueThreshold = fmtDateStr(addDaysToDate(baseDate, 1));

  for (let i = 0; i < durationDays; i++) {
    const d = addDaysToDate(viewFrom, i);
    const k = fmtDateStr(d);
    const isLeadBlocked = isAll ? false : k < earliestAllowed;
    const isDayOff = isAll ? d.getDay() === 0 : !config.activeDeliveryDays.includes(d.getDay());
    const isHoliday = isAll ? false : config.holidays.includes(k);
    const isOff = isLeadBlocked || isDayOff || isHoliday;

    let offReason = '';
    if (isLeadBlocked) offReason = 'Vi phạm thời gian chuẩn bị giao hàng (Lead time)';
    else if (isDayOff) offReason = 'Nhà cung cấp không giao hàng vào thứ này';
    else if (isHoliday) offReason = 'Ngày lễ/nghỉ của nhà cung cấp';

    // Status resolution
    const isAlreadyPo = lockedDates.has(k);
    const isPastLocked = !isOff && k < BASE_TODAY;
    const isLocked = isAlreadyPo || isPastLocked;

    let cutoffStatus: DayColInfo['cutoffStatus'] = 'OPEN';
    if (isAlreadyPo) {
      cutoffStatus = 'PO_GENERATED';
    } else if (isPastLocked) {
      cutoffStatus = 'LOCKED';
    } else if (!isOff && k <= cutoffDueThreshold) {
      // The nearest delivery date (e.g. Tuesday 03/11) has reached cutoff!
      cutoffStatus = 'CUTOFF_DUE';
    } else {
      cutoffStatus = 'OPEN';
    }

    list.push({
      date: d,
      dateKey: k,
      dowName: getDowName(d),
      dateShort: fmtShortStr(d),
      isOff,
      isLocked,
      offReason,
      cutoffHour: config.cutoffHour || '15:00',
      cutoffStatus,
      poCode: isAlreadyPo ? `PO-${k.replace(/-/g, '')}-GEN` : undefined,
    });
  }
  return list;
}

// Compute default initial 3-tier matrix cell data
function computeDefaultCellMap(
  supplierId: string,
  days: DayColInfo[]
): MatrixCellMap {
  const initialMap: MatrixCellMap = {};
  const relevantProducts =
    supplierId === 'ALL'
      ? MOCK_MATRIX_PRODUCTS
      : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === supplierId);

  relevantProducts.forEach((p) => {
    initialMap[p.id] = {};
  });

  days.forEach((d, idx) => {
    if (!d.isOff && !d.isLocked && idx % 2 === 1) {
      relevantProducts.slice(0, 10).forEach((p, pIdx) => {
        if (!initialMap[p.id]) initialMap[p.id] = {};

        // Base employee proposed quantity
        const empQty = Math.max(p.moq, 10 + (pIdx % 3) * 5);

        // Simulate a few Store Owner overrides for demonstration
        let storeQty: number | null = null;
        if (pIdx === 0 && idx === 1) {
          storeQty = empQty + 5; // Store Owner increased by 5
        } else if (pIdx === 2 && idx === 3) {
          storeQty = 0; // Store Owner explicitly zeroed out
        }

        const finalQty = storeQty !== null ? storeQty : empQty;
        const suggestedQty = Math.max(0, Math.round(p.sales * 2.5 + (p.safetyStock || 4) - p.soh));

        initialMap[p.id][d.dateKey] = {
          employeeQty: empQty,
          storeQty,
          finalQty,
          suggestedQty,
          isOwnerOverridden: storeQty !== null,
          modifiedBy: storeQty !== null ? 'store_owner' : 'employee',
        };
      });
    }
  });

  return initialMap;
}

export const OrderMatrixPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialSupplier = searchParams.get('supplier') || 'ALL';
  const branchParam = searchParams.get('branchId') || searchParams.get('branch');
  const initialBranch =
    branchParam && MOCK_BRANCHES.some((b) => b.id === branchParam) ? branchParam : 'DC1';
  const isReadOnly =
    searchParams.get('mode') === 'view' || searchParams.get('readOnly') === 'true';

  // State: Duration Preset (7, 14, 21, 31 - Max 31 days per FE-05)
  const [durationDays, setDurationDays] = useState<number>(14);
  const initialViewFrom = parseDateStr(BASE_TODAY);

  // Set of dates that have been locked or PO generated
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());

  // State: Filter Scope
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranch);

  useEffect(() => {
    const currentParam = searchParams.get('branchId') || searchParams.get('branch');
    if (currentParam && MOCK_BRANCHES.some((b) => b.id === currentParam)) {
      setSelectedBranchId(currentParam);
    }
  }, [searchParams]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplier);
  const [viewFrom, setViewFrom] = useState<Date>(initialViewFrom);
  const [dateFromInput, setDateFromInput] = useState<string>(BASE_TODAY);
  const [dateToInput, setDateToInput] = useState<string>(() =>
    fmtDateStr(addDaysToDate(parseDateStr(BASE_TODAY), durationDays - 1))
  );

  // State: Secondary Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [moqOnly, setMoqOnly] = useState<boolean>(false);
  const [orderedOnly, setOrderedOnly] = useState<boolean>(false);
  const [ownerModifiedOnly, setOwnerModifiedOnly] = useState<boolean>(false);
  const [showSoh, setShowSoh] = useState<boolean>(false);

  // State: Matrix 3-tier Data
  const initialDays = useMemo(
    () => computeDayColumns(initialViewFrom, durationDays, initialSupplier, lockedDates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [cellMap, setCellMap] = useState<MatrixCellMap>(() =>
    computeDefaultCellMap(initialSupplier, initialDays)
  );

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Draft');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // State: PO Split Modal
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);

  // State: Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Date columns calculated dynamically
  const dayColumns: DayColInfo[] = useMemo(() => {
    return computeDayColumns(viewFrom, durationDays, selectedSupplierId, lockedDates);
  }, [viewFrom, durationDays, selectedSupplierId, lockedDates]);

  // Available Categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const prods =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);
    prods.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [selectedSupplierId]);

  // Handle cell quantity change by Store Owner
  const handleCellChange = (productId: string, dateKey: string, newStoreQty: number) => {
    setCellMap((prev) => {
      const prodMap = { ...(prev[productId] || {}) };
      const currentCell = prodMap[dateKey] || {
        employeeQty: 0,
        storeQty: null,
        finalQty: 0,
      };

      const updatedCell: MatrixCellData = {
        ...currentCell,
        storeQty: newStoreQty,
        finalQty: newStoreQty,
        isOwnerOverridden: true,
        modifiedBy: 'store_owner',
        modifiedAt: new Date().toISOString(),
      };

      prodMap[dateKey] = updatedCell;
      return { ...prev, [productId]: prodMap };
    });
    setIsDirty(true);
  };

  // Handle revert Store Owner override back to Employee proposed qty
  const handleResetOverride = (productId: string, dateKey: string) => {
    setCellMap((prev) => {
      const prodMap = { ...(prev[productId] || {}) };
      const currentCell = prodMap[dateKey];
      if (!currentCell) return prev;

      const updatedCell: MatrixCellData = {
        ...currentCell,
        storeQty: null,
        finalQty: currentCell.employeeQty,
        isOwnerOverridden: false,
        modifiedBy: 'employee',
      };

      prodMap[dateKey] = updatedCell;
      return { ...prev, [productId]: prodMap };
    });
    setIsDirty(true);
    showToast('Đã khôi phục số lượng theo đề xuất ban đầu của Nhân viên!', 'info');
  };

  // Count owner modified items
  const ownerModifiedCount = useMemo(() => {
    let count = 0;
    Object.values(cellMap).forEach((prodMap) => {
      Object.values(prodMap).forEach((cell) => {
        if (cell.storeQty !== null && cell.storeQty !== cell.employeeQty) {
          count++;
        }
      });
    });
    return count;
  }, [cellMap]);

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
          const q = cellMap[p.id]?.[d.dateKey]?.finalQty || 0;
          return q > 0 && q < p.moq;
        });
        if (!hasMoqFail) return false;
      }
      if (orderedOnly) {
        const hasQty = dayColumns.some(
          (d) => (cellMap[p.id]?.[d.dateKey]?.finalQty || 0) > 0
        );
        if (!hasQty) return false;
      }
      if (ownerModifiedOnly) {
        const hasOwnerMod = dayColumns.some((d) => {
          const cell = cellMap[p.id]?.[d.dateKey];
          return cell && cell.storeQty !== null && cell.storeQty !== cell.employeeQty;
        });
        if (!hasOwnerMod) return false;
      }
      return true;
    });
  }, [
    selectedSupplierId,
    categoryFilter,
    keyword,
    moqOnly,
    orderedOnly,
    ownerModifiedOnly,
    dayColumns,
    cellMap,
  ]);

  // Real-time MOQ Fails check
  const { moqFails } = useMemo(() => {
    const fails: string[] = [];
    const activeProducts =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);

    activeProducts.forEach((p) => {
      dayColumns.forEach((d) => {
        const q = cellMap[p.id]?.[d.dateKey]?.finalQty || 0;
        if (q > 0 && q < p.moq) {
          fails.push(`${p.name} (${d.dateShort}): SL ${q} < MOQ ${p.moq}`);
        }
      });
    });

    return { moqFails: fails };
  }, [dayColumns, cellMap, selectedSupplierId]);

  // Change duration preset (7, 14, 21, 31)
  const handleSelectDuration = (days: number) => {
    setDurationDays(days);
    setDateToInput(fmtDateStr(addDaysToDate(viewFrom, days - 1)));
    showToast(`Đã chuyển sang chế độ xem ma trận ${days} ngày.`, 'info');
  };

  // Week Shifts
  const handleShiftWeek = (deltaWeeks: number) => {
    const newFrom = addDaysToDate(viewFrom, deltaWeeks * 7);
    setViewFrom(newFrom);
    setDateFromInput(fmtDateStr(newFrom));
    setDateToInput(fmtDateStr(addDaysToDate(newFrom, durationDays - 1)));
  };

  const handleThisWeek = () => {
    const base = parseDateStr(BASE_TODAY);
    setViewFrom(base);
    setDateFromInput(BASE_TODAY);
    setDateToInput(fmtDateStr(addDaysToDate(base, durationDays - 1)));
  };

  // Apply custom range with strict max 31 days check
  const handleApplyRange = () => {
    const from = parseDateStr(dateFromInput);
    const to = parseDateStr(dateToInput);
    if (to < from) {
      showToast('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!', 'warning');
      return;
    }
    const diff = diffInDays(from, to) + 1;
    if (diff > 31) {
      showToast('Phạm vi lập kế hoạch tối đa là 31 ngày (1 tháng)! Đã tự động điều chỉnh về 31 ngày.', 'warning');
      const clampedTo = addDaysToDate(from, 30);
      setDateToInput(fmtDateStr(clampedTo));
      setDurationDays(31);
      setViewFrom(from);
      return;
    }

    setDurationDays(diff);
    setViewFrom(from);
    showToast(`Đã áp dụng khoảng thời gian ${diff} ngày (từ ${dateFromInput} đến ${dateToInput})`, 'success');
  };

  // Auto-Suggest smart quantities based on SOH, Sales, and Safety Stock
  const handleAutoSuggest = () => {
    const newMap = { ...cellMap };
    let suggestedCount = 0;

    filteredProducts.forEach((p) => {
      if (!newMap[p.id]) newMap[p.id] = {};
      dayColumns.forEach((d) => {
        if (!d.isOff && !d.isLocked && d.cutoffStatus !== 'PO_GENERATED') {
          const currentCell = newMap[p.id][d.dateKey];
          const currentQty = currentCell?.finalQty || 0;
          if (currentQty === 0) {
            // Apply formula: max(MOQ, TargetStock - NetAvailable)
            const forecastSales = p.sales * 2.5;
            const targetStock = forecastSales + (p.safetyStock || 5);
            const netAvailable = p.soh;
            const rawSuggested = Math.max(0, targetStock - netAvailable);
            const finalSuggested = Math.max(p.moq, Math.ceil(rawSuggested / 5) * 5);

            newMap[p.id][d.dateKey] = {
              employeeQty: finalSuggested,
              storeQty: null,
              finalQty: finalSuggested,
              suggestedQty: finalSuggested,
              isOwnerOverridden: false,
              modifiedBy: 'employee',
            };
            suggestedCount++;
          }
        }
      });
    });

    setCellMap(newMap);
    setIsDirty(true);
    showToast(
      suggestedCount > 0
        ? `Đã áp dụng số lượng gợi ý thông minh cho ${suggestedCount} ô đặt hàng!`
        : 'Tất cả các ô hợp lệ đã có số lượng đặt hàng.',
      suggestedCount > 0 ? 'success' : 'info'
    );
  };

  // Copy Previous Week
  const handleCopyPrevWeek = () => {
    const newMap = { ...cellMap };
    let copyCount = 0;
    const relevantProducts =
      selectedSupplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === selectedSupplierId);

    relevantProducts.forEach((p) => {
      if (!newMap[p.id]) newMap[p.id] = {};
      dayColumns.forEach((d) => {
        if (!d.isOff && !d.isLocked && d.cutoffStatus !== 'PO_GENERATED') {
          const prevKey = fmtDateStr(addDaysToDate(d.date, -7));
          const prevCell = cellMap[p.id]?.[prevKey];
          if (prevCell && prevCell.finalQty > 0) {
            newMap[p.id][d.dateKey] = {
              employeeQty: prevCell.employeeQty,
              storeQty: prevCell.storeQty,
              finalQty: prevCell.finalQty,
              isOwnerOverridden: prevCell.storeQty !== null,
              modifiedBy: prevCell.modifiedBy,
            };
            copyCount++;
          }
        }
      });
    });

    setCellMap(newMap);
    setIsDirty(true);
    showToast(
      copyCount > 0
        ? `Đã sao chép thành công ${copyCount} ô số lượng từ tuần trước sang tuần này!`
        : 'Không tìm thấy dữ liệu số lượng tuần trước để sao chép.',
      copyCount > 0 ? 'success' : 'warning'
    );
  };

  // Excel Download with 3-tier Quantity support
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
      ...dayColumns.map((d) => `${d.dowName} ${d.dateShort} [${d.dateKey}]`),
      'Tổng SL Chốt',
      'Thành Tiền (VNĐ)',
    ];

    let csvContent = headers.join(',') + '\n';

    relevantProducts.forEach((p) => {
      let rowQty = 0;
      const dayCells = dayColumns.map((d) => {
        const q = cellMap[p.id]?.[d.dateKey]?.finalQty || 0;
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
    a.download = `PO_Matrix_${selectedSupplierId}_${fmtDateStr(viewFrom)}.csv`;
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

      const newMap = { ...cellMap };
      let updatedItems = 0;

      lines.slice(1).forEach((line) => {
        const cols = line.split(',');
        if (cols.length >= 7) {
          const sku = cols[3]?.trim();
          const targetProd = MOCK_MATRIX_PRODUCTS.find((p) => p.sku === sku);
          if (targetProd && (selectedSupplierId === 'ALL' || targetProd.supplierId === selectedSupplierId)) {
            if (!newMap[targetProd.id]) newMap[targetProd.id] = {};
            dayColumns.forEach((d, idx) => {
              if (!d.isOff && !d.isLocked && d.cutoffStatus !== 'PO_GENERATED') {
                const val = parseFloat(cols[7 + idx]);
                if (!isNaN(val) && val >= 0) {
                  newMap[targetProd.id][d.dateKey] = {
                    employeeQty: val,
                    storeQty: null,
                    finalQty: val,
                    isOwnerOverridden: false,
                    modifiedBy: 'employee',
                  };
                  updatedItems++;
                }
              }
            });
          }
        }
      });

      setCellMap(newMap);
      setIsDirty(true);
      showToast(`Đã nạp thành công dữ liệu từ file "${file.name}" (${updatedItems} ô số lượng)!`, 'success');
    };
    reader.readAsText(file);
  };

  // Compute PO Split Preview according to FE-05 rules:
  // 1 PO for each [Branch + Supplier + Delivery Date]
  const splitPos: SplitPoPreview[] = useMemo(() => {
    const list: SplitPoPreview[] = [];
    const currentBranch = MOCK_BRANCHES.find((b) => b.id === selectedBranchId) || MOCK_BRANCHES[0];

    // Determine relevant suppliers
    const activeSuppliers =
      selectedSupplierId === 'ALL'
        ? MOCK_PO_SUPPLIERS
        : MOCK_PO_SUPPLIERS.filter((s) => s.id === selectedSupplierId);

    activeSuppliers.forEach((sup) => {
      const supProducts = MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === sup.id);

      dayColumns.forEach((d) => {
        if (d.isOff) return;

        // Gather products having finalQty > 0 for this date
        const items: SplitPoItem[] = [];
        let totalQty = 0;
        let totalAmount = 0;

        supProducts.forEach((p) => {
          const cell = cellMap[p.id]?.[d.dateKey];
          const finalQty = cell?.finalQty || 0;
          if (finalQty > 0) {
            const lineTotal = finalQty * p.price;
            items.push({
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              category: p.category,
              unit: p.unit,
              price: p.price,
              moq: p.moq,
              employeeQty: cell?.employeeQty || 0,
              storeQty: cell?.storeQty ?? null,
              finalQty,
              lineTotal,
            });
            totalQty += finalQty;
            totalAmount += lineTotal;
          }
        });

        if (items.length > 0) {
          const isCutoffDue = d.cutoffStatus === 'CUTOFF_DUE';
          const poId = `PO-${d.dateKey.replace(/-/g, '')}-${currentBranch.id}-${sup.id.slice(0, 4).toUpperCase()}`;

          list.push({
            id: poId,
            supplierId: sup.id,
            supplierName: sup.name,
            branchId: currentBranch.id,
            branchName: currentBranch.name,
            deliveryDate: d.dateKey,
            dowName: d.dowName,
            dateShort: d.dateShort,
            cutoffStatus: d.cutoffStatus,
            isCutoffDue,
            items,
            totalQuantity: totalQty,
            totalAmount,
            status: 'DRAFT',
          });
        }
      });
    });

    return list;
  }, [selectedBranchId, selectedSupplierId, dayColumns, cellMap]);

  // Handle confirming PO Generation from Split Modal
  const handleConfirmGeneratePo = async (selectedPoIds: string[]) => {
    const selectedList = splitPos.filter((p) => selectedPoIds.includes(p.id));
    if (selectedList.length === 0) return;

    try {
      setIsSaving(true);
      const generated = await purchaseOrderApi.splitMatrixPo(selectedBranchId, selectedList);

      // Lock the finalized dates
      const newLocked = new Set(lockedDates);
      selectedList.forEach((po) => {
        newLocked.add(po.deliveryDate);
      });
      setLockedDates(newLocked);

      setIsSplitModalOpen(false);
      setStatus('Submitted / POs Generated');
      setIsDirty(false);

      const codes = generated.map((g) => g.orderCode).join(', ');
      showToast(
        `Đã phát hành và bóc tách thành công ${selectedList.length} đơn PO trên hệ thống (${codes})!`,
        'success'
      );
    } catch {
      showToast('Có lỗi xảy ra khi tạo PO, vui lòng thử lại!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      await purchaseOrderApi.saveMatrixDraft(
        selectedBranchId,
        selectedSupplierId,
        dateFromInput,
        dateToInput,
        cellMap
      );
      setStatus('Draft');
      setIsDirty(false);
      showToast('Bản thảo ma trận đặt hàng đã được lưu thành công trên hệ thống backend.', 'success');
    } catch {
      showToast('Không thể kết nối máy chủ, đã lưu bản thảo tạm thời ở chế độ ngoại tuyến.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="po-matrix-container">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* 1. Page Header */}
      <OrderMatrixHeader
        status={status}
        onBack={() => navigate('/store-owner/purchase-orders/branches')}
        onSave={handleSaveDraft}
        isSaving={isSaving}
        onOpenSplitModal={() => setIsSplitModalOpen(true)}
        onGoToCutoffHub={() => navigate('/store-owner/purchase-orders/dispatch-hub')}
        readOnly={isReadOnly}
        title={
          isReadOnly
            ? `Chi Tiết Đơn Đặt Hàng — ${MOCK_BRANCHES.find((b) => b.id === selectedBranchId)?.name || ''}`
            : undefined
        }
      />

      {/* 2. Unified Filter + Action Bar (1 row) */}
      <OrderMatrixFilterBar
        branches={MOCK_BRANCHES}
        selectedBranchId={selectedBranchId}
        onSelectBranch={(id) => setSelectedBranchId(id)}
        suppliers={MOCK_PO_SUPPLIERS}
        selectedSupplierId={selectedSupplierId}
        onSelectSupplier={(id) => {
          setSelectedSupplierId(id);
          const nextDays = computeDayColumns(viewFrom, durationDays, id, lockedDates);
          setCellMap(computeDefaultCellMap(id, nextDays));
          setIsDirty(false);
        }}
        dateFrom={dateFromInput}
        dateTo={dateToInput}
        onDateFromChange={(val) => setDateFromInput(val)}
        onDateToChange={(val) => setDateToInput(val)}
        onApplyRange={handleApplyRange}
        durationDays={durationDays}
        onSelectDuration={handleSelectDuration}
        categories={availableCategories}
        categoryFilter={categoryFilter}
        onCategoryChange={(cat) => setCategoryFilter(cat)}
        keyword={keyword}
        onKeywordChange={(kw) => setKeyword(kw)}
        moqOnly={moqOnly}
        onMoqOnlyChange={(checked) => setMoqOnly(checked)}
        orderedOnly={orderedOnly}
        onOrderedOnlyChange={(checked) => setOrderedOnly(checked)}
        ownerModifiedOnly={ownerModifiedOnly}
        onOwnerModifiedOnlyChange={(checked) => setOwnerModifiedOnly(checked)}
        ownerModifiedCount={ownerModifiedCount}
        moqFailsCount={moqFails.length}
        showSoh={showSoh}
        onShowSohChange={(checked) => setShowSoh(checked)}
        onResetFilters={() => {
          setCategoryFilter('');
          setKeyword('');
          setMoqOnly(false);
          setOrderedOnly(false);
          setOwnerModifiedOnly(false);
          setShowSoh(false);
        }}
        isDirty={isDirty}
        onShiftWeek={handleShiftWeek}
        onThisWeek={handleThisWeek}
        onCopyPrevWeek={handleCopyPrevWeek}
        onAutoSuggest={handleAutoSuggest}
        onExcelDownload={handleExcelDownload}
        onExcelUpload={handleExcelUpload}
      />

      {/* 3. Main Matrix Table — full remaining height */}
      <div className="po-table-flex">
        <OrderMatrixTable
          products={filteredProducts}
          days={dayColumns}
          cellMap={cellMap}
          showSoh={showSoh}
          onCellChange={handleCellChange}
          onResetOverride={handleResetOverride}
          onDayCutoffClick={() => setIsSplitModalOpen(true)}
          readOnly={isReadOnly}
          isStoreOwner={true}
        />
      </div>

      {/* 4. PO Split Modal */}
      <OrderMatrixSplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        splitPos={splitPos}
        branchName={MOCK_BRANCHES.find((b) => b.id === selectedBranchId)?.name || 'Chi nhánh'}
        onConfirmGenerate={handleConfirmGeneratePo}
      />
    </div>
  );
};

export default OrderMatrixPage;
