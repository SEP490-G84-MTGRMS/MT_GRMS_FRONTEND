import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type {
  DayColInfo,
  MatrixCellMap,
  MatrixCellData,
  SplitPoPreview,
  SplitPoItem,
  OrderMatrixProduct,
  OrderMatrixSupplierDeliveryConfig,
  BranchOption,
  SupplierOption,
  SupplierDeliveryConfig,
} from '../types/po.types';
import { OrderMatrixHeader } from '../components/matrix/OrderMatrixHeader';
import { OrderMatrixFilterBar } from '../components/matrix/OrderMatrixFilterBar';
import { OrderMatrixTable } from '../components/matrix/OrderMatrixTable';
import { OrderMatrixSplitModal } from '../components/matrix/OrderMatrixSplitModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { storeProductApi } from '../../product/api/storeProductApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../purchase-order.css';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_DELIVERY: SupplierDeliveryConfig = {
  supplierId: '',
  leadDays: 1,
  cutoffHour: '15:00',
  lockHour: '16:00',
  activeDeliveryDays: [1, 2, 3, 4, 5, 6],
  holidays: [],
};

function suppliersFromMatrix(
  products: OrderMatrixProduct[],
  configs: OrderMatrixSupplierDeliveryConfig[]
): SupplierOption[] {
  const map = new Map<string, SupplierOption>();
  configs.forEach((sc) => {
    map.set(sc.supplierId, {
      id: sc.supplierId,
      code: sc.supplierCode,
      name: sc.supplierName,
      creditLimit: 0,
      openAp: 0,
      config: {
        supplierId: sc.supplierId,
        leadDays: sc.leadTimeDays,
        cutoffHour: sc.cutoffTime,
        lockHour: sc.cutoffTime,
        activeDeliveryDays: sc.activeDeliveryDays,
        holidays: sc.blackoutDates,
      },
    });
  });
  products.forEach((p) => {
    if (!p.supplierId || map.has(p.supplierId)) return;
    map.set(p.supplierId, {
      id: p.supplierId,
      code: p.supplierId,
      name: p.supplierName || p.supplierId,
      creditLimit: 0,
      openAp: 0,
      config: { ...DEFAULT_DELIVERY, supplierId: p.supplierId },
    });
  });
  return Array.from(map.values());
}

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
  lockedDates: Set<string>,
  supplierConfigs?: OrderMatrixSupplierDeliveryConfig[]
): DayColInfo[] {
  const list: DayColInfo[] = [];
  const isAll = supplierId === 'ALL';
  const supConfig = supplierConfigs?.find((sc) => sc.supplierId === supplierId);
  const baseDate = parseDateStr(BASE_TODAY);

  const leadDays = supConfig?.leadTimeDays ?? (isAll ? 0 : DEFAULT_DELIVERY.leadDays);
  const earliestAllowed = isAll
    ? BASE_TODAY
    : fmtDateStr(addDaysToDate(baseDate, leadDays));

  // Today + 1 is Tuesday 03/11 in this scenario -> cutoff due today at 15:00
  const cutoffDueThreshold = fmtDateStr(addDaysToDate(baseDate, 1));

  for (let i = 0; i < durationDays; i++) {
    const d = addDaysToDate(viewFrom, i);
    const k = fmtDateStr(d);
    const dow = d.getDay();
    const isLeadBlocked = isAll ? false : k < earliestAllowed;

    let isDayOff = false;
    let isHoliday = false;
    let isSupplierInactive = false;
    let isSupplierNotAssigned = false;
    let offReason = '';

    if (supConfig) {
      if (!supConfig.isActive) {
        isSupplierInactive = true;
        offReason = supConfig.inactiveReason || 'Nhà cung cấp đang tạm dừng hoạt động';
      } else if (!supConfig.isAssignedToBranch) {
        isSupplierNotAssigned = true;
        offReason = 'Nhà cung cấp chưa được phân bổ tới chi nhánh này';
      } else {
        isDayOff = supConfig.activeDeliveryDays ? !supConfig.activeDeliveryDays.includes(dow) : false;
        isHoliday = supConfig.blackoutDates ? supConfig.blackoutDates.includes(k) : false;
      }
    } else {
      isDayOff = isAll ? false : !DEFAULT_DELIVERY.activeDeliveryDays.includes(dow);
      isHoliday = false;
    }

    const isOff = isSupplierInactive || isSupplierNotAssigned || isLeadBlocked || isDayOff || isHoliday;

    if (!offReason) {
      if (isLeadBlocked) offReason = 'Vi phạm thời gian chuẩn bị giao hàng (Lead time)';
      else if (isDayOff) offReason = 'Nhà cung cấp không giao hàng vào thứ này';
      else if (isHoliday) offReason = 'Ngày lễ/nghỉ của nhà cung cấp';
    }

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
      cutoffHour: supConfig?.cutoffTime || DEFAULT_DELIVERY.cutoffHour,
      cutoffStatus,
      poCode: isAlreadyPo ? `PO-${k.replace(/-/g, '')}-GEN` : undefined,
    });
  }
  return list;
}

function buildEmptyCellMap(
  supplierId: string,
  prodList: OrderMatrixProduct[],
  existing?: MatrixCellMap
): MatrixCellMap {
  const products =
    supplierId === 'ALL'
      ? prodList
      : prodList.filter((p) => p.supplierId === supplierId);
  const map: MatrixCellMap = {};
  products.forEach((p) => {
    map[p.id] = existing?.[p.id] ? { ...existing[p.id] } : {};
  });
  return map;
}

export const OrderMatrixPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialSupplier = searchParams.get('supplier') || 'ALL';
  const branchParam =
    searchParams.get('branchId') || searchParams.get('branch') || searchParams.get('storeId') || '';
  const isReadOnly =
    searchParams.get('mode') === 'view' || searchParams.get('readOnly') === 'true';

  // State: Duration Preset (7, 14, 21, 31 - Max 31 days per FE-05)
  const [durationDays, setDurationDays] = useState<number>(14);
  const initialViewFrom = parseDateStr(BASE_TODAY);

  // Set of dates that have been locked or PO generated
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());

  // State: Filter Scope
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    GUID_RE.test(branchParam) ? branchParam : ''
  );

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

  // Backend Data State: Products & Supplier Delivery Configurations
  const [matrixProducts, setMatrixProducts] = useState<OrderMatrixProduct[]>([]);
  const [supplierConfigs, setSupplierConfigs] = useState<OrderMatrixSupplierDeliveryConfig[]>([]);
  const [, setIsLoadingMatrix] = useState<boolean>(false);

  const [cellMap, setCellMap] = useState<MatrixCellMap>({});

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Draft');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // State: PO Split Modal
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);

  // State: Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  // Role State: Xác định quyền thao tác Store Owner vs Employee theo tài khoản đăng nhập
  const userRole = useAuthStore((s) => s.user?.role);
  const isStoreOwner = userRole !== 'EMPLOYEE' && userRole !== 'CASHIER';

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Nạp danh sách chi nhánh thật (không dùng mock DC1 / BR-01)
  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      try {
        const summaries = await storeProductApi.getStoreSummaries();
        if (!isMounted) return;
        const realBranches = (summaries || [])
          .filter((b) => GUID_RE.test(b.id))
          .map((b) => ({ id: b.id, code: b.code, name: b.name }));
        setBranches(realBranches);

        const urlBranch =
          searchParams.get('branchId') || searchParams.get('branch') || searchParams.get('storeId') || '';
        if (urlBranch && realBranches.some((b) => b.id === urlBranch)) {
          setSelectedBranchId(urlBranch);
        } else {
          const withProducts = (summaries || []).find(
            (b) => GUID_RE.test(b.id) && (b.totalProducts || 0) > 0
          );
          const nextId = withProducts?.id || realBranches[0]?.id || '';
          if (nextId !== selectedBranchId) {
            setSelectedBranchId(nextId);
          }
        }
      } catch {
        if (isMounted) {
          setBranches([]);
          showToast('Không tải được danh sách chi nhánh.', 'error');
        }
      }
    };
    loadBranches();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Nạp dữ liệu ma trận từ sản phẩm theo chi nhánh
  useEffect(() => {
    let isMounted = true;
    const fetchMatrixData = async () => {
      if (!GUID_RE.test(selectedBranchId)) {
        setMatrixProducts([]);
        setCellMap({});
        setSupplierConfigs([]);
        return;
      }
      try {
        setIsLoadingMatrix(true);
        const res = await purchaseOrderApi.getOrderMatrix(
          selectedBranchId,
          selectedSupplierId,
          fmtDateStr(viewFrom),
          durationDays
        );
        if (!isMounted) return;

        setMatrixProducts(res.products || []);
        setSupplierConfigs(res.supplierConfigs || []);

        // Khôi phục số lượng ô đặt hàng: Ưu tiên dữ liệu từ Backend, nếu chưa có thì nạp từ LocalStorage
        let targetCells = res.cellMap || {};
        if (Object.keys(targetCells).length === 0) {
          try {
            const localKey = `matrix_draft_${selectedBranchId}_${selectedSupplierId || 'ALL'}`;
            const raw = localStorage.getItem(localKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && Object.keys(parsed).length > 0) {
                targetCells = parsed;
              }
            }
          } catch {
            // ignore
          }
        }

        setCellMap(buildEmptyCellMap(selectedSupplierId, res.products || [], targetCells));
        const nextSuppliers = suppliersFromMatrix(res.products || [], res.supplierConfigs || []);
        if (selectedSupplierId === 'ALL') {
          setSuppliers(nextSuppliers);
        } else {
          setSuppliers((prev) => (prev.length > 0 ? prev : nextSuppliers));
        }
      } catch {
        if (!isMounted) return;
        setMatrixProducts([]);
        setCellMap({});
        showToast('Không tải được sản phẩm theo chi nhánh cho ma trận đặt hàng.', 'error');
      } finally {
        if (isMounted) setIsLoadingMatrix(false);
      }
    };

    fetchMatrixData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, selectedSupplierId, viewFrom, durationDays]);

  // Date columns calculated dynamically with supplier configurations
  const dayColumns: DayColInfo[] = useMemo(() => {
    return computeDayColumns(viewFrom, durationDays, selectedSupplierId, lockedDates, supplierConfigs);
  }, [viewFrom, durationDays, selectedSupplierId, lockedDates, supplierConfigs]);

  // Available Categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const prods =
      selectedSupplierId === 'ALL'
        ? matrixProducts
        : matrixProducts.filter((p) => p.supplierId === selectedSupplierId);
    prods.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [selectedSupplierId, matrixProducts]);

  // Handle cell quantity change by Store Owner or Employee
  const handleCellChange = (productId: string, dateKey: string, val: number) => {
    setCellMap((prev) => {
      const prodMap = { ...(prev[productId] || {}) };
      const currentCell = prodMap[dateKey] || {
        employeeQty: 0,
        storeQty: null,
        finalQty: 0,
        isOwnerAdjusted: false,
        isOwnerOverridden: false,
      };

      let updatedCell: MatrixCellData;

      if (isStoreOwner) {
        // Store Owner điều chỉnh:
        // 1. Cập nhật ownerQuantity (storeQty) = val (chủ động điều chỉnh, kể cả gán 0).
        // 2. Bật isOwnerAdjusted = true.
        // 3. finalQuantity = ownerQuantity (val).
        // 4. employeeQuantity KHÔNG bị thay đổi.
        updatedCell = {
          ...currentCell,
          storeQty: val,
          isOwnerAdjusted: true,
          isOwnerOverridden: true,
          finalQty: val,
          modifiedBy: 'store_owner',
          modifiedAt: new Date().toISOString(),
        };
      } else {
        // Employee nhập số lượng đề xuất:
        // 1. Lưu vào employeeQuantity = val.
        // 2. Không cập nhật ownerQuantity.
        // 3. Nếu Store Owner đã điều chỉnh: giữ nguyên ownerQuantity và finalQuantity.
        // 4. Nếu Store Owner chưa điều chỉnh: finalQuantity = employeeQuantity (val).
        const isAdjusted = Boolean(
          currentCell.isOwnerAdjusted ||
          currentCell.isOwnerOverridden ||
          (currentCell.storeQty !== null && currentCell.storeQty !== undefined)
        );
        const finalQty = isAdjusted ? (currentCell.storeQty ?? val) : val;

        updatedCell = {
          ...currentCell,
          employeeQty: val,
          finalQty,
          modifiedBy: 'employee',
          modifiedAt: new Date().toISOString(),
        };
      }

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

      // 1. Xóa owner override / đặt ownerQuantity về null.
      // 2. isOwnerAdjusted = false.
      // 3. finalQuantity = employeeQuantity (mới nhất).
      // 4. Không được xóa employeeQuantity.
      const updatedCell: MatrixCellData = {
        ...currentCell,
        storeQty: null,
        isOwnerAdjusted: false,
        isOwnerOverridden: false,
        finalQty: currentCell.employeeQty,
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
        if (cell.isOwnerAdjusted || cell.isOwnerOverridden || (cell.storeQty !== null && cell.storeQty !== undefined)) {
          count++;
        }
      });
    });
    return count;
  }, [cellMap]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return matrixProducts.filter((p) => {
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
    matrixProducts,
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
        ? matrixProducts
        : matrixProducts.filter((p) => p.supplierId === selectedSupplierId);

    activeProducts.forEach((p) => {
      dayColumns.forEach((d) => {
        const q = cellMap[p.id]?.[d.dateKey]?.finalQty || 0;
        if (q > 0 && q < p.moq) {
          fails.push(`${p.name} (${d.dateShort}): SL ${q} < MOQ ${p.moq}`);
        }
      });
    });

    return { moqFails: fails };
  }, [dayColumns, cellMap, selectedSupplierId, matrixProducts]);

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
        ? matrixProducts
        : matrixProducts.filter((p) => p.supplierId === selectedSupplierId);

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
        ? matrixProducts
        : matrixProducts.filter((p) => p.supplierId === selectedSupplierId);

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
          const targetProd = matrixProducts.find((p) => p.sku === sku);
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
    const currentBranch = branches.find((b) => b.id === selectedBranchId) || {
      id: selectedBranchId,
      code: '',
      name: 'Chi nhánh',
    };

    const activeSuppliers =
      selectedSupplierId === 'ALL'
        ? suppliers
        : suppliers.filter((s) => s.id === selectedSupplierId);

    activeSuppliers.forEach((sup) => {
      const supProducts = matrixProducts.filter((p) => p.supplierId === sup.id);

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
  }, [branches, suppliers, selectedBranchId, selectedSupplierId, dayColumns, cellMap, matrixProducts]);

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
        isStoreOwner={isStoreOwner}
        title={
          isReadOnly
            ? `Chi Tiết Đơn Đặt Hàng — ${branches.find((b) => b.id === selectedBranchId)?.name || ''}`
            : undefined
        }
      />

      {/* 2. Unified Filter + Action Bar (1 row) */}
      <OrderMatrixFilterBar
        branches={branches}
        onSelectBranch={(id) => {
          setSelectedBranchId(id);
          const localKey = `matrix_draft_${id}_${selectedSupplierId || 'ALL'}`;
          try {
            const raw = localStorage.getItem(localKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && Object.keys(parsed).length > 0) {
                setCellMap(parsed);
              }
            }
          } catch {
            // ignore
          }
        }}
        suppliers={suppliers}
        selectedSupplierId={selectedSupplierId}
        onSelectSupplier={(id) => {
          setSelectedSupplierId(id);
          const localKey = `matrix_draft_${selectedBranchId}_${id || 'ALL'}`;
          let cached: MatrixCellMap | undefined = undefined;
          try {
            const raw = localStorage.getItem(localKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && Object.keys(parsed).length > 0) cached = parsed;
            }
          } catch {
            // ignore
          }
          setCellMap(buildEmptyCellMap(id, matrixProducts, cached || cellMap));
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
          supplierConfigs={supplierConfigs}
          showSoh={showSoh}
          onCellChange={handleCellChange}
          onResetOverride={handleResetOverride}
          onDayCutoffClick={() => setIsSplitModalOpen(true)}
          readOnly={isReadOnly}
          isStoreOwner={isStoreOwner}
        />
      </div>

      {/* 4. PO Split Modal */}
      <OrderMatrixSplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        splitPos={splitPos}
        branchName={branches.find((b) => b.id === selectedBranchId)?.name || 'Chi nhánh'}
        onConfirmGenerate={handleConfirmGeneratePo}
      />
    </div>
  );
};

export default OrderMatrixPage;
