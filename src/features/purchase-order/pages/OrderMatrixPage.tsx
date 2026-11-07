import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type {
  DayColInfo,
  DayCutoffStatus,
  MatrixCellMap,
  MatrixCellData,
  SplitPoPreview,
  SplitPoItem,
  OrderMatrixProduct,
  OrderMatrixSupplierDeliveryConfig,
  OrderMatrixDayStatus,
  BranchOption,
  SupplierOption,
  SupplierDeliveryConfig,
} from '../types/po.types';
import { OrderMatrixHeader } from '../components/matrix/OrderMatrixHeader';
import { OrderMatrixFilterBar } from '../components/matrix/OrderMatrixFilterBar';
import { OrderMatrixTable } from '../components/matrix/OrderMatrixTable';
import { OrderMatrixSplitModal } from '../components/matrix/OrderMatrixSplitModal';
import { OrderMatrixImportPreviewModal } from '../components/matrix/OrderMatrixImportPreviewModal';
import {
  exportMatrixToExcel,
  validateMatrixExcelFile,
  applyMatrixExcelImport,
  type ExcelValidationResult,
} from '../lib/matrixExcelService';
import { AdminToast, type ToastState } from '../../admin/components';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { storeProductApi } from '../../product/api/storeProductApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../purchase-order.css';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_DELIVERY: SupplierDeliveryConfig = {
  supplierId: '',
  leadDays: 0,
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
        leadDays: 0,
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

function todayKey(fromIso?: string): string {
  if (fromIso) {
    const d = new Date(fromIso);
    if (!Number.isNaN(d.getTime())) return fmtDateStr(d);
  }
  return fmtDateStr(new Date());
}

const REASON_LABELS: Record<string, string> = {
  BRANCH_INACTIVE: 'Chi nhánh đang ngừng hoạt động',
  SUPPLIER_INACTIVE: 'Nhà cung cấp đang ngừng hoạt động',
  SUPPLIER_BRANCH_ASSIGNMENT_INACTIVE: 'NCC chưa được gán hoặc đã ngừng phục vụ chi nhánh này',
  PRODUCT_INACTIVE: 'Sản phẩm đã ngừng trên danh mục master',
  SUPPLIER_PRODUCT_INACTIVE: 'NCC không còn cung ứng sản phẩm này',
  BRANCH_PRODUCT_INACTIVE: 'Chi nhánh không kinh doanh sản phẩm này',
  NOT_DELIVERY_DAY: 'Không phải ngày giao của NCC',
  HOLIDAY_BLACKOUT: 'Ngày nghỉ/blackout của NCC',
  LEAD_TIME_VIOLATION: 'Chưa đủ LeadDays để giao ngày này',
  CUTOFF_PASSED: 'Đã đến hoặc qua giờ chốt đơn',
  PO_ALREADY_COMMITTED: 'Ngày này đã chốt PO',
  PO_EXISTED_EDITABLE: 'Đã có PO — còn sửa trước cutoff',
  PO_COMMITTED_CUTOFF_PASSED: 'PO đã khóa sau cutoff',
};

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

function mapServerStatus(status?: string): DayCutoffStatus {
  switch ((status || '').toUpperCase()) {
    case 'FINALIZED':
      return 'PO_GENERATED';
    case 'LOCKED':
      return 'LOCKED';
    case 'CUTOFF_DUE':
      return 'CUTOFF_DUE';
    case 'SUPPLIER_OFF':
      return 'SUPPLIER_OFF';
    default:
      return 'OPEN';
  }
}

// Compute dynamic day columns — ưu tiên DayStatuses từ BE (OpenSpec §4.4)
function computeDayColumns(
  viewFrom: Date,
  durationDays: number,
  supplierId: string,
  lockedDates: Set<string>,
  supplierConfigs?: OrderMatrixSupplierDeliveryConfig[],
  dayStatuses?: OrderMatrixDayStatus[],
  today: string = todayKey()
): DayColInfo[] {
  const list: DayColInfo[] = [];
  const isAll = supplierId === 'ALL';
  const supConfig = supplierConfigs?.find((sc) => sc.supplierId === supplierId);
  const earliestAllowed = today;

  for (let i = 0; i < durationDays; i++) {
    const d = addDaysToDate(viewFrom, i);
    const k = fmtDateStr(d);
    const dow = d.getDay();

    const serverStatuses = (dayStatuses || []).filter((ds) => ds.deliveryDate === k);
    const serverForSupplier =
      !isAll
        ? serverStatuses.find((ds) => ds.supplierId === supplierId)
        : undefined;

    // Khi xem ALL: chỉ khóa cột khi MỌI NCC đều FINALIZED/LOCKED/OFF — PO trước cutoff vẫn editable.
    const allFinalized =
      isAll && serverStatuses.length > 0 && serverStatuses.every((ds) => ds.deliveryDateStatus === 'FINALIZED');
    const allOffOrLocked =
      isAll &&
      serverStatuses.length > 0 &&
      serverStatuses.every((ds) =>
        ['SUPPLIER_OFF', 'LOCKED', 'FINALIZED'].includes(ds.deliveryDateStatus)
      );

    let cutoffStatus: DayCutoffStatus = 'OPEN';
    let isOff = false;
    let isLocked = false;
    let offReason = '';
    let poCode: string | undefined;
    let primaryReasonCode: string | undefined;
    let cutoffHour = supConfig?.cutoffTime || DEFAULT_DELIVERY.cutoffHour;

    if (serverForSupplier) {
      cutoffStatus = mapServerStatus(serverForSupplier.deliveryDateStatus);
      primaryReasonCode = serverForSupplier.primaryReasonCode;
      poCode = serverForSupplier.poCode;
      isOff = cutoffStatus === 'SUPPLIER_OFF';
      // PO_EXISTED_EDITABLE: có PoCode nhưng status OPEN/CUTOFF_DUE → vẫn sửa được
      isLocked = cutoffStatus === 'LOCKED' || cutoffStatus === 'PO_GENERATED';
      offReason =
        (primaryReasonCode && REASON_LABELS[primaryReasonCode]) ||
        serverForSupplier.primaryReasonCode ||
        '';
      if (serverForSupplier.cutoffDateTime) {
        const cd = new Date(serverForSupplier.cutoffDateTime);
        if (!Number.isNaN(cd.getTime())) {
          cutoffHour = `${String(cd.getHours()).padStart(2, '0')}:${String(cd.getMinutes()).padStart(2, '0')}`;
        }
      }
    } else if (isAll && serverStatuses.length > 0) {
      poCode = serverStatuses.find((ds) => ds.poCode)?.poCode;
      if (allFinalized) {
        cutoffStatus = 'PO_GENERATED';
        isLocked = true;
      } else if (allOffOrLocked) {
        const locked = serverStatuses.some((ds) => ds.deliveryDateStatus === 'LOCKED');
        const finalized = serverStatuses.some((ds) => ds.deliveryDateStatus === 'FINALIZED');
        cutoffStatus = finalized ? 'PO_GENERATED' : locked ? 'LOCKED' : 'SUPPLIER_OFF';
        isOff = cutoffStatus === 'SUPPLIER_OFF';
        isLocked = cutoffStatus === 'LOCKED' || cutoffStatus === 'PO_GENERATED';
      } else if (serverStatuses.some((ds) => ds.deliveryDateStatus === 'CUTOFF_DUE')) {
        cutoffStatus = 'CUTOFF_DUE';
      } else {
        cutoffStatus = 'OPEN';
      }
    } else {
      // Fallback local khi chưa có DayStatuses
      const isLeadBlocked = isAll ? false : k < earliestAllowed;
      let isDayOff = false;
      let isHoliday = false;
      let isSupplierInactive = false;
      let isSupplierNotAssigned = false;

      if (supConfig) {
        if (!supConfig.isActive) {
          isSupplierInactive = true;
          offReason = supConfig.inactiveReason || 'Nhà cung cấp đang tạm dừng hoạt động';
        } else if (!supConfig.isAssignedToBranch) {
          isSupplierNotAssigned = true;
          offReason = 'Nhà cung cấp chưa được phân bổ tới chi nhánh này';
        } else {
          isDayOff = supConfig.activeDeliveryDays ? !supConfig.activeDeliveryDays.includes(dow) : false;
          isHoliday = !!supConfig.blackoutDates?.includes(k);
        }
      } else if (!isAll) {
        isDayOff = !DEFAULT_DELIVERY.activeDeliveryDays.includes(dow);
      }

      isOff = isSupplierInactive || isSupplierNotAssigned || isLeadBlocked || isDayOff || isHoliday;
      if (!offReason) {
        if (isLeadBlocked) offReason = REASON_LABELS.LEAD_TIME_VIOLATION;
        else if (isDayOff) offReason = REASON_LABELS.NOT_DELIVERY_DAY;
        else if (isHoliday) offReason = REASON_LABELS.HOLIDAY_BLACKOUT;
      }

      const isAlreadyPo = lockedDates.has(k);
      const isPastLocked = !isOff && k < today;
      isLocked = isAlreadyPo || isPastLocked;
      if (isAlreadyPo) cutoffStatus = 'PO_GENERATED';
      else if (isPastLocked) cutoffStatus = 'LOCKED';
      else if (!isOff && k <= fmtDateStr(addDaysToDate(parseDateStr(today), 1))) cutoffStatus = 'CUTOFF_DUE';
      else cutoffStatus = 'OPEN';
      if (isAlreadyPo) poCode = `PO-${k.replace(/-/g, '')}-GEN`;
    }

    // lockedDates chỉ áp dụng khi BE đánh FINALIZED (sau cutoff) — không khóa PO còn amend được.
    if (lockedDates.has(k) && !serverForSupplier && !(isAll && serverStatuses.length > 0)) {
      isLocked = true;
      cutoffStatus = 'PO_GENERATED';
    }

    list.push({
      date: d,
      dateKey: k,
      dowName: getDowName(d),
      dateShort: fmtShortStr(d),
      isOff,
      isLocked,
      offReason,
      cutoffHour,
      cutoffStatus,
      poCode,
      primaryReasonCode,
    });
  }
  return list;
}

function buildEmptyCellMap(
  prodList: OrderMatrixProduct[],
  existing?: MatrixCellMap
): MatrixCellMap {
  const map: MatrixCellMap = { ...(existing || {}) };
  prodList.forEach((p) => {
    if (!map[p.id]) {
      map[p.id] = {};
    }
  });
  return map;
}

export interface OrderMatrixPageProps {
  forcedRole?: 'STORE_OWNER' | 'EMPLOYEE';
}

export const OrderMatrixPage: FC<OrderMatrixPageProps> = ({ forcedRole }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialSupplier = searchParams.get('supplier') || 'ALL';
  const branchParam =
    searchParams.get('branchId') || searchParams.get('branch') || searchParams.get('storeId') || '';
  const isReadOnly =
    searchParams.get('mode') === 'view' || searchParams.get('readOnly') === 'true';

  // State: Duration Preset (7, 14, 21, 31 - Max 31 days per FE-05)
  const [durationDays, setDurationDays] = useState<number>(14);
  const initialToday = todayKey();
  const initialViewFrom = parseDateStr(initialToday);

  // Set of dates that have been locked or PO generated
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());
  const [dayStatuses, setDayStatuses] = useState<OrderMatrixDayStatus[]>([]);
  const [serverToday, setServerToday] = useState<string>(initialToday);
  const [branchIsActive, setBranchIsActive] = useState<boolean>(true);
  const [draftPoId, setDraftPoId] = useState<string | undefined>();

  // State: Filter Scope
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    GUID_RE.test(branchParam) ? branchParam : ''
  );

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplier);
  const [viewFrom, setViewFrom] = useState<Date>(initialViewFrom);
  const [dateFromInput, setDateFromInput] = useState<string>(initialToday);
  const [dateToInput, setDateToInput] = useState<string>(() =>
    fmtDateStr(addDaysToDate(parseDateStr(initialToday), durationDays - 1))
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

  const isCellEditable = (d: DayColInfo, product?: OrderMatrixProduct) => {
    if (!branchIsActive) return false;
    if (product?.isRowDisabled) return false;
    if (d.isOff || d.isLocked) return false;
    if (d.cutoffStatus === 'PO_GENERATED' || d.cutoffStatus === 'LOCKED' || d.cutoffStatus === 'SUPPLIER_OFF') {
      return false;
    }
    return true;
  };

  const [cellMap, setCellMap] = useState<MatrixCellMap>({});

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // State: PO Split Modal
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [importPreviewResult, setImportPreviewResult] = useState<ExcelValidationResult | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // State: Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  // Role State: Xác định quyền thao tác Store Owner vs Employee
  // Ưu tiên: 1. forcedRole từ Route, 2. param ?role=, 3. userRole trong AuthStore
  const roleParam = searchParams.get('role');
  const userRole = useAuthStore((s) => s.user?.role);
  const isStoreOwner = useMemo(() => {
    if (forcedRole === 'STORE_OWNER') return true;
    if (forcedRole === 'EMPLOYEE') return false;
    if (roleParam === 'employee' || roleParam === 'staff') return false;
    if (roleParam === 'owner' || roleParam === 'store_owner') return true;
    return userRole !== 'EMPLOYEE' && userRole !== 'CASHIER';
  }, [forcedRole, roleParam, userRole]);

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

        const authUser = useAuthStore.getState().user;
        const employeeBranchId = !isStoreOwner ? (authUser?.branchId || '') : '';

        const urlBranch =
          employeeBranchId ||
          searchParams.get('branchId') ||
          searchParams.get('branch') ||
          searchParams.get('storeId') ||
          '';
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
  }, [searchParams, isStoreOwner]);

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
        // Nạp toàn bộ sản phẩm và cấu hình NCC của chi nhánh đã chọn
        const res = await purchaseOrderApi.getOrderMatrix(
          selectedBranchId,
          undefined,
          fmtDateStr(viewFrom),
          durationDays
        );
        if (!isMounted) return;

        setMatrixProducts(res.products || []);
        setSupplierConfigs(res.supplierConfigs || []);
        setDayStatuses(res.dayStatuses || []);
        setBranchIsActive(res.branchIsActive ?? true);
        setServerToday(todayKey(res.serverNow));
        setDraftPoId(res.draftPoId);

        const finalized = new Set<string>();
        (res.dayStatuses || []).forEach((ds) => {
          if (ds.deliveryDateStatus === 'FINALIZED') finalized.add(ds.deliveryDate);
        });
        setLockedDates(finalized);

        // Khôi phục số lượng ô đặt hàng: Ưu tiên dữ liệu từ Backend, nếu chưa có thì nạp từ LocalStorage
        let targetCells = res.cellMap || {};
        if (Object.keys(targetCells).length === 0) {
          try {
            const localKey = `matrix_draft_${selectedBranchId}_ALL`;
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

        setCellMap(buildEmptyCellMap(res.products || [], targetCells));
        const nextSuppliers = suppliersFromMatrix(res.products || [], res.supplierConfigs || []);
        setSuppliers(nextSuppliers);
        if (res.branchIsActive === false) {
          showToast('Chi nhánh đang ngừng hoạt động — ma trận chỉ xem, không chỉnh sửa/chốt.', 'warning');
        }
      } catch {
        if (!isMounted) return;
        setMatrixProducts([]);
        setCellMap({});
        setDayStatuses([]);
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
  }, [selectedBranchId, viewFrom, durationDays]);

  // Date columns calculated dynamically with supplier configurations
  const dayColumns: DayColInfo[] = useMemo(() => {
    return computeDayColumns(
      viewFrom,
      durationDays,
      selectedSupplierId,
      lockedDates,
      supplierConfigs,
      dayStatuses,
      serverToday
    );
  }, [viewFrom, durationDays, selectedSupplierId, lockedDates, supplierConfigs, dayStatuses, serverToday]);

  // Tóm tắt theo ngày — không dùng 1 status DRAFT cho cả màn
  const daySummary = useMemo(() => {
    let openDays = 0;
    let finalizedDays = 0;
    let lockedDays = 0;
    dayColumns.forEach((d) => {
      if (d.cutoffStatus === 'PO_GENERATED') finalizedDays++;
      else if (d.isLocked || d.cutoffStatus === 'LOCKED') lockedDays++;
      else if (!d.isOff) openDays++;
    });
    return { openDays, finalizedDays, lockedDays };
  }, [dayColumns]);

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
    if (!branchIsActive) {
      showToast('Chi nhánh đang ngừng hoạt động — không thể nhập số lượng.', 'warning');
      return;
    }
    if (val < 0) return;
    const product = matrixProducts.find((p) => p.id === productId);
    const day = dayColumns.find((d) => d.dateKey === dateKey);
    if (product?.isRowDisabled || (day && !isCellEditable(day, product))) {
      showToast('Ô này không còn chỉnh sửa được.', 'warning');
      return;
    }

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
    const base = parseDateStr(serverToday);
    setViewFrom(base);
    setDateFromInput(serverToday);
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

  // Auto-Suggest — chỉ ghi đúng trường theo role (OpenSpec §3 / §11.4)
  const handleAutoSuggest = () => {
    const newMap = { ...cellMap };
    let suggestedCount = 0;
    let skippedOwner = 0;

    filteredProducts.forEach((p) => {
      if (p.isRowDisabled) return;
      if (!newMap[p.id]) newMap[p.id] = {};
      dayColumns.forEach((d) => {
        if (!isCellEditable(d, p)) return;
        const currentCell = newMap[p.id][d.dateKey] || {
          employeeQty: 0,
          storeQty: null,
          finalQty: 0,
          isOwnerAdjusted: false,
        };

        // Không tự ghi đè Owner override nếu Employee thao tác
        if (!isStoreOwner && (currentCell.isOwnerAdjusted || currentCell.storeQty !== null)) {
          skippedOwner++;
          return;
        }
        if ((currentCell.finalQty || 0) > 0) return;

        const forecastSales = (p.sales || 0) * 2.5;
        const targetStock = forecastSales + (p.safetyStock || 5);
        const rawSuggested = Math.max(0, targetStock - (p.soh || 0));
        const multiple = p.orderMultiple && p.orderMultiple > 0 ? p.orderMultiple : 1;
        let finalSuggested = Math.max(p.moq || 0, Math.ceil(rawSuggested / multiple) * multiple);

        if (isStoreOwner) {
          newMap[p.id][d.dateKey] = {
            ...currentCell,
            storeQty: finalSuggested,
            isOwnerAdjusted: true,
            isOwnerOverridden: true,
            finalQty: finalSuggested,
            suggestedQty: finalSuggested,
            modifiedBy: 'store_owner',
            modifiedAt: new Date().toISOString(),
          };
        } else {
          newMap[p.id][d.dateKey] = {
            ...currentCell,
            employeeQty: finalSuggested,
            storeQty: null,
            isOwnerAdjusted: false,
            isOwnerOverridden: false,
            finalQty: finalSuggested,
            suggestedQty: finalSuggested,
            modifiedBy: 'employee',
            modifiedAt: new Date().toISOString(),
          };
        }
        suggestedCount++;
      });
    });

    setCellMap(newMap);
    setIsDirty(true);
    const extra = skippedOwner > 0 ? ` (bỏ qua ${skippedOwner} ô đã có Owner override)` : '';
    showToast(
      suggestedCount > 0
        ? `Đã áp dụng Suggested Qty cho ${suggestedCount} ô${extra}.`
        : 'Không có ô EDITABLE trống để áp dụng gợi ý.',
      suggestedCount > 0 ? 'success' : 'info'
    );
  };

  // Copy tuần trước — chỉ cập nhật trường theo role, chỉ ô EDITABLE
  const handleCopyPrevWeek = () => {
    const newMap = { ...cellMap };
    let copyCount = 0;
    let skipped = 0;
    const relevantProducts =
      selectedSupplierId === 'ALL'
        ? matrixProducts
        : matrixProducts.filter((p) => p.supplierId === selectedSupplierId);

    relevantProducts.forEach((p) => {
      if (p.isRowDisabled) return;
      if (!newMap[p.id]) newMap[p.id] = {};
      dayColumns.forEach((d) => {
        if (!isCellEditable(d, p)) {
          skipped++;
          return;
        }
        const prevKey = fmtDateStr(addDaysToDate(d.date, -7));
        const prevCell = cellMap[p.id]?.[prevKey];
        if (!prevCell || prevCell.finalQty <= 0) return;

        const currentCell = newMap[p.id][d.dateKey] || {
          employeeQty: 0,
          storeQty: null,
          finalQty: 0,
          isOwnerAdjusted: false,
        };

        if (isStoreOwner) {
          const qty = prevCell.storeQty ?? prevCell.finalQty;
          newMap[p.id][d.dateKey] = {
            ...currentCell,
            storeQty: qty,
            isOwnerAdjusted: true,
            isOwnerOverridden: true,
            finalQty: qty,
            modifiedBy: 'store_owner',
            modifiedAt: new Date().toISOString(),
          };
        } else {
          if (currentCell.isOwnerAdjusted || currentCell.storeQty !== null) {
            skipped++;
            return;
          }
          newMap[p.id][d.dateKey] = {
            ...currentCell,
            employeeQty: prevCell.employeeQty || prevCell.finalQty,
            storeQty: null,
            isOwnerAdjusted: false,
            isOwnerOverridden: false,
            finalQty: prevCell.employeeQty || prevCell.finalQty,
            modifiedBy: 'employee',
            modifiedAt: new Date().toISOString(),
          };
        }
        copyCount++;
      });
    });

    setCellMap(newMap);
    setIsDirty(true);
    showToast(
      copyCount > 0
        ? `Đã sao chép ${copyCount} ô từ tuần trước${skipped ? `, bỏ qua ${skipped} ô không hợp lệ` : ''}.`
        : 'Không tìm thấy dữ liệu tuần trước để sao chép vào ô EDITABLE.',
      copyCount > 0 ? 'success' : 'warning'
    );
  };

  // Excel Download — Chuẩn CISCA / MT-GRMS .xlsx
  const handleExcelDownload = () => {
    try {
      const branch = branches.find((b) => b.id === selectedBranchId);
      const supplier = suppliers.find((s) => s.id === selectedSupplierId);
      exportMatrixToExcel(matrixProducts, dayColumns, cellMap, {
        branch,
        supplier,
        supplierId: selectedSupplierId,
        viewFrom,
        viewTo: addDaysToDate(viewFrom, durationDays - 1),
        exportedBy: isStoreOwner ? 'Store Owner' : 'Nhân viên chi nhánh',
        isCellEditable,
      });
      showToast('Đã xuất file bảng ma trận đặt hàng (.xlsx) chuẩn doanh nghiệp thành công!', 'success');
    } catch (err: any) {
      showToast('Xuất file Excel thất bại: ' + (err?.message || err), 'error');
    }
  };

  // Excel Upload — 3 Giai đoạn: Validate -> Preview Modal -> Apply
  const handleExcelUpload = async (file: File) => {
    try {
      const validationResult = await validateMatrixExcelFile({
        file,
        currentBranchId: selectedBranchId,
        currentSupplierId: selectedSupplierId,
        matrixProducts,
        dayColumns,
        cellMap,
        supplierConfigs,
        isCellEditable,
      });

      setImportPreviewResult(validationResult);
      setIsImportModalOpen(true);
    } catch (err: any) {
      showToast('Kiểm tra file Excel thất bại: ' + (err?.message || err), 'error');
    }
  };

  // Xử lý nạp dữ liệu từ Modal Preview sau khi đã kiểm tra không có lỗi
  const handleConfirmApplyImport = () => {
    if (!importPreviewResult || !importPreviewResult.valid) return;

    const newMap = applyMatrixExcelImport(
      importPreviewResult.cellsToApply,
      cellMap,
      isStoreOwner
    );

    setCellMap(newMap);
    setIsDirty(true);
    setIsImportModalOpen(false);

    showToast(
      'Nạp thành công ' + importPreviewResult.summary.validCells + ' ô số lượng từ file "' + importPreviewResult.fileName + '" vào Ma trận!',
      'success'
    );
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
      const supDayCols = computeDayColumns(
        viewFrom,
        durationDays,
        sup.id,
        lockedDates,
        supplierConfigs,
        dayStatuses,
        serverToday
      );

      supDayCols.forEach((d) => {
        // Không đưa ngày đã khóa/finalized/off hoặc sản phẩm inactive vào preview chốt
        if (d.isOff || d.isLocked || d.cutoffStatus === 'PO_GENERATED' || d.cutoffStatus === 'LOCKED' || d.cutoffStatus === 'SUPPLIER_OFF') {
          return;
        }

        const items: SplitPoItem[] = [];
        let totalQty = 0;
        let totalAmount = 0;

        supProducts.forEach((p) => {
          if (p.isRowDisabled) return;
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
  }, [
    branches,
    suppliers,
    selectedBranchId,
    selectedSupplierId,
    viewFrom,
    durationDays,
    lockedDates,
    supplierConfigs,
    dayStatuses,
    serverToday,
    cellMap,
    matrixProducts,
  ]);

  // Handle confirming PO Generation from Split Modal
  const handleConfirmGeneratePo = async (selectedPoIds: string[]) => {
    if (!isStoreOwner) {
      showToast('Chỉ Store Owner được phép chốt PO.', 'error');
      return;
    }
    if (!branchIsActive) {
      showToast('Chi nhánh đang ngừng hoạt động — không thể chốt PO.', 'error');
      return;
    }

    const selectedList = splitPos.filter((p) => selectedPoIds.includes(p.id));
    if (selectedList.length === 0) return;

    const moqErrors: string[] = [];
    selectedList.forEach((po) => {
      po.items.forEach((item) => {
        if (item.finalQty > 0 && item.finalQty < item.moq) {
          moqErrors.push(`${item.sku} (${po.dateShort}): SL ${item.finalQty} < MOQ ${item.moq}`);
        }
      });
    });
    if (moqErrors.length > 0) {
      showToast(`Chặn chốt — còn vi phạm MOQ: ${moqErrors.slice(0, 3).join('; ')}`, 'error');
      return;
    }

    try {
      setIsSaving(true);
      const generated = await purchaseOrderApi.splitMatrixPo(
        selectedBranchId,
        selectedList,
        undefined,
        draftPoId
      );

      const newLocked = new Set(lockedDates);
      generated.forEach((po) => {
        if (po.deliveryDate) newLocked.add(po.deliveryDate);
      });
      selectedList.forEach((po) => newLocked.add(po.deliveryDate));
      setLockedDates(newLocked);

      setIsSplitModalOpen(false);
      setIsDirty(false);

      const codes = generated.map((g) => g.orderCode).join(', ');
      showToast(`Đã chốt thành công ${generated.length} PO (${codes}).`, 'success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi tạo PO, vui lòng thử lại!';
      showToast(msg, 'error');
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
      setIsDirty(false);
      showToast('Bản thảo ma trận đặt hàng đã được lưu thành công trên hệ thống backend.', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể kết nối máy chủ, đã lưu bản thảo tạm thời ở chế độ ngoại tuyến.';
      showToast(msg, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchScreen = () => {
    const params = new URLSearchParams(searchParams);
    if (selectedBranchId) params.set('branchId', selectedBranchId);
    if (selectedSupplierId && selectedSupplierId !== 'ALL') params.set('supplier', selectedSupplierId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    if (isStoreOwner) {
      navigate(`/store-owner/purchase-orders/employee-matrix${qs}`);
    } else {
      navigate(`/store-owner/purchase-orders/create-matrix${qs}`);
    }
  };

  return (
    <div className="po-matrix-container">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* 1. Page Header */}
      <OrderMatrixHeader
        daySummary={daySummary}
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
            : isStoreOwner
            ? '👑 Tạo Đơn Mua Hàng (Chủ Cửa Hàng Duyệt & Tách PO)'
            : '👤 Đặt Hàng Theo Ma Trận (Nhân Viên Đề Xuất)'
        }
        onSwitchScreen={handleSwitchScreen}
        switchScreenLabel={
          isStoreOwner
            ? '👉 Sang Màn Nhân Viên Đặt Hàng'
            : '👉 Sang Màn Chủ Cửa Hàng Duyệt'
        }
      />

      {/* 2. Unified Filter + Action Bar (2 rows) */}
      <OrderMatrixFilterBar
        branches={branches}
        selectedBranchId={selectedBranchId}
        hideBranchSelect={!isStoreOwner}
        fixedBranchLabel={branches.find((b) => b.id === selectedBranchId)?.name}
        onSelectBranch={(id) => {
          setSelectedBranchId(id);
          setSelectedSupplierId('ALL');
          setCategoryFilter('');
          setKeyword('');
          setCellMap({});
          setIsDirty(false);
        }}
        suppliers={suppliers}
        selectedSupplierId={selectedSupplierId}
        onSelectSupplier={(id) => {
          setSelectedSupplierId(id);
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
        onOwnerModifiedOnlyChange={isStoreOwner ? (checked) => setOwnerModifiedOnly(checked) : undefined}
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

      {/* 5. Excel Import Preview Modal (CISCA Style) */}
      <OrderMatrixImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        result={importPreviewResult}
        onConfirmApply={handleConfirmApplyImport}
      />
    </div>
  );
};

export default OrderMatrixPage;
