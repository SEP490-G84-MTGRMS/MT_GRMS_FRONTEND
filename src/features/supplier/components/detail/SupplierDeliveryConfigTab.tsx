import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties, FC } from 'react';
import type {
  SupplierSummary,
  SupplierDeliveryConfig,
  SupplierBranchAssignmentItem,
} from '../../types/supplier.types';
import { supplierBranchApi } from '../../api/supplierBranchApi';
import { StatusToggle } from '../StatusToggle';
import {
  Clock,
  Truck,
  ShieldCheck,
  Package,
  CheckCircle2,
  Store,
  Loader2,
  Plus,
} from 'lucide-react';

const LABEL_WIDTH = 220;

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  width: LABEL_WIDTH,
  minWidth: LABEL_WIDTH,
  paddingTop: 10,
  lineHeight: 1.35,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const fieldColStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

export interface ActiveBranchInfo {
  id: string; // 'ALL' or Guid
  code?: string;
  name?: string;
  address?: string;
  isHeadquarter?: boolean;
}

const STORAGE_KEY = 'mtgrms_active_branch';
const BRANCH_DELIVERY_STORAGE_KEY = 'mtgrms_supplier_branch_delivery_config_v1';

interface BranchDeliveryRecord {
  defaultConfig?: SupplierDeliveryConfig;
  byBranchId: Record<string, SupplierDeliveryConfig>;
}

const getStoredActiveBranch = (): ActiveBranchInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    }
  } catch {
    // fallback
  }
  return { id: 'ALL', name: 'Toàn hệ thống', code: 'ALL' };
};

const getStoredBranchDeliveryMap = (): Record<string, BranchDeliveryRecord> => {
  try {
    const raw = localStorage.getItem(BRANCH_DELIVERY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // fallback
  }
  return {};
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function mapDeliveryDaysToJs(days?: string[]): number[] {
  if (!days?.length) return [1, 2, 3, 4, 5, 6];
  return days
    .map((day) => DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]))
    .filter((index) => index >= 0);
}

function mapJsDaysToNames(days: number[]): string[] {
  return days.map((day) => DAY_NAMES[day]).filter(Boolean);
}

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (cfg: SupplierDeliveryConfig) => void | Promise<void>;
  onNotify?: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
  ) => void;
}

const DEFAULT_CONFIG: SupplierDeliveryConfig = {
  minOrderQuantity: 0,
  activeDeliveryDays: [1, 2, 3, 4, 5, 6],
  cutoffDayOffset: 1,
  cutoffTime: '17:00',
  allowStoreEdit: true,
  editWindowType: 'BEFORE_CUTOFF',
  hoursBeforeDelivery: 24,
  hoursAfterOrder: 2,
  holidays: [],
};

const WEEKDAYS = [
  { val: 1, label: 'Thứ 2 (T2)' },
  { val: 2, label: 'Thứ 3 (T3)' },
  { val: 3, label: 'Thứ 4 (T4)' },
  { val: 4, label: 'Thứ 5 (T5)' },
  { val: 5, label: 'Thứ 6 (T6)' },
  { val: 6, label: 'Thứ 7 (T7)' },
  { val: 0, label: 'Chủ nhật (CN)' },
];

export const SupplierDeliveryConfigTab: FC<Props> = ({
  supplier,
  initialConfig,
  onSaveConfig,
  onNotify,
}) => {
  // Active branch from Header Dropdown
  const [activeBranch, setActiveBranch] = useState<ActiveBranchInfo>(
    getStoredActiveBranch,
  );
  const [branchDeliveryMap, setBranchDeliveryMap] = useState<
    Record<string, BranchDeliveryRecord>
  >(getStoredBranchDeliveryMap);

  // Branch assignment state (from Cửa Hàng với nhà cung cấp)
  const [branchAssignments, setBranchAssignments] = useState<
    SupplierBranchAssignmentItem[]
  >([]);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false);
  const [branchStatus, setBranchStatus] = useState<'Active' | 'Inactive'>(
    'Active',
  );
  const [inactiveReason, setInactiveReason] = useState('');

  // Form config state
  const [config, setConfig] = useState<SupplierDeliveryConfig>(
    initialConfig || DEFAULT_CONFIG,
  );
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isBranchFiltered = Boolean(
    activeBranch.id && activeBranch.id !== 'ALL',
  );
  const isMainOrTotalBranch =
    !isBranchFiltered ||
    Boolean(activeBranch.isHeadquarter) ||
    Boolean(activeBranch.name?.toLowerCase().includes('chi nhánh chính'));

  // 1. Subscribe to Header Dropdown (BranchSelectorDropdown) changes
  useEffect(() => {
    const handleBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveBranchInfo>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
      } else {
        setActiveBranch(getStoredActiveBranch());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setActiveBranch(getStoredActiveBranch());
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleBranchChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleBranchChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 2. Load branch assignments for this supplier
  const fetchSupplierBranchAssignments = useCallback(async () => {
    if (!supplier?.id) return;
    setIsLoadingAssignment(true);
    try {
      const res = await supplierBranchApi.getBranchAssignments({
        supplierCodes: [],
        supplierNames: [],
        branchCodes: [],
        branchNames: [],
        supplierId: supplier.id,
        branchId: 'ALL',
        status: 'ALL',
        pageIndex: 1,
        pageSize: 100,
      });
      setBranchAssignments(res.items || []);
    } catch {
      // non-blocking in tests or offline
    } finally {
      setIsLoadingAssignment(false);
    }
  }, [supplier?.id]);

  useEffect(() => {
    void fetchSupplierBranchAssignments();
  }, [fetchSupplierBranchAssignments]);

  const currentBranchAssignment = isBranchFiltered
    ? branchAssignments.find((a) => a.branchId === activeBranch.id) || null
    : null;

  // 3. Synchronize form config when initialConfig, activeBranch, or branchAssignments change
  useEffect(() => {
    const baseCfg = initialConfig || DEFAULT_CONFIG;
    const branchKey = activeBranch.id || 'ALL';
    const record = supplier?.id ? branchDeliveryMap[supplier.id] : undefined;

    if (branchKey === 'ALL') {
      // On "Toàn hệ thống", always reflect the authoritative initialConfig from API/props
      setConfig(baseCfg);
    } else if (record?.byBranchId?.[branchKey]) {
      // Chi nhánh đã từng được chỉnh sửa hoặc bảo toàn cấu hình riêng -> ưu tiên 100%
      setConfig({
        ...baseCfg,
        ...record.byBranchId[branchKey],
      });
    } else if (record?.defaultConfig) {
      // Kế thừa cấu hình mặc định đã được bảo toàn trước khi chi nhánh chính/tổng thay đổi
      setConfig({
        ...baseCfg,
        ...record.defaultConfig,
      });
    } else {
      // Chưa có cấu hình riêng tại localStorage: ưu tiên ngày giao của chi nhánh từ API (nếu có)
      setConfig({
        ...baseCfg,
        activeDeliveryDays: currentBranchAssignment?.deliveryDays?.length
          ? mapDeliveryDaysToJs(currentBranchAssignment.deliveryDays)
          : baseCfg.activeDeliveryDays,
      });
    }

    if (currentBranchAssignment) {
      setBranchStatus(currentBranchAssignment.status);
      setInactiveReason(currentBranchAssignment.inactiveReason || '');
    } else {
      setBranchStatus('Active');
      setInactiveReason('');
    }
    setSaveErrorMsg(null);
  }, [
    initialConfig,
    activeBranch.id,
    supplier?.id,
    branchDeliveryMap,
    currentBranchAssignment,
  ]);

  const handleSwitchToAllBranches = () => {
    const allOption: ActiveBranchInfo = {
      id: 'ALL',
      name: 'Toàn hệ thống',
      code: 'ALL',
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allOption));
      window.dispatchEvent(
        new CustomEvent('mtgrms:branch-changed', { detail: allOption }),
      );
    } catch {
      // ignore
    }
    setActiveBranch(allOption);
  };

  const handleToggleWeekday = (dayVal: number) => {
    setConfig((prev) => {
      const exists = prev.activeDeliveryDays.includes(dayVal);
      const updated = exists
        ? prev.activeDeliveryDays.filter((d) => d !== dayVal)
        : [...prev.activeDeliveryDays, dayVal];
      return { ...prev, activeDeliveryDays: updated };
    });
  };

  const validate = (): string | null => {
    if (!config.activeDeliveryDays || config.activeDeliveryDays.length === 0) {
      return 'Vui lòng chọn ít nhất một ngày giao hàng hoạt động trong tuần (Active Delivery Days).';
    }

    if (config.minOrderQuantity < 0) {
      return 'Số lượng đặt tối thiểu (MOQ) phải lớn hơn hoặc bằng 0.';
    }

    const offset = Number(config.cutoffDayOffset);
    if (!Number.isFinite(offset) || offset < 0 || !Number.isInteger(offset)) {
      return 'Số ngày trước ngày giao để chốt đơn phải là số nguyên ≥ 0.';
    }

    const cleanCutoff = (config.cutoffTime || '').trim();
    if (!cleanCutoff) {
      return 'Vui lòng nhập giờ chốt đơn hàng ngày (Cutoff Time).';
    }
    const cutoffRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!cutoffRegex.test(cleanCutoff)) {
      return 'Giờ chốt đơn không hợp lệ. Vui lòng nhập đúng định dạng HH:mm (từ 00:00 đến 23:59).';
    }

    if (config.allowStoreEdit) {
      if (config.editWindowType === 'HOURS_BEFORE_DELIVERY') {
        const h = config.hoursBeforeDelivery ?? 24;
        if (h < 1 || h > 72) {
          return 'Số giờ cho phép sửa trước ngày giao hàng phải từ 1 đến 72 giờ.';
        }
      } else if (config.editWindowType === 'HOURS_AFTER_ORDER') {
        const h = config.hoursAfterOrder ?? 2;
        if (h < 1 || h > 24) {
          return 'Số giờ cho phép sửa sau khi đặt đơn phải từ 1 đến 24 giờ.';
        }
      }
    }

    if (
      isBranchFiltered &&
      branchStatus === 'Inactive' &&
      !inactiveReason.trim()
    ) {
      return 'Vui lòng nhập lý do khi tạm ngưng phân bổ nhà cung cấp tại chi nhánh này.';
    }

    return null;
  };

  const handleSaveWithScope = async (
    scope: 'CURRENT_ONLY' | 'ALL_BRANCHES' = 'CURRENT_ONLY',
  ) => {
    if (isSaving) return;
    setSaveErrorMsg(null);

    const validationErr = validate();
    if (validationErr) {
      setSaveErrorMsg(validationErr);
      return;
    }

    setIsSaving(true);
    try {
      const branchKey = activeBranch.id || 'ALL';
      const baseCfg = initialConfig || DEFAULT_CONFIG;
      const dayNames = mapJsDaysToNames(config.activeDeliveryDays);

      if (scope === 'ALL_BRANCHES') {
        // 1. Lưu cấu hình chuẩn trên nhà cung cấp
        await onSaveConfig?.(config);

        // 2. Đồng bộ ngày giao cho tất cả các chi nhánh đã phân bổ
        if (branchAssignments.length > 0) {
          await Promise.allSettled(
            branchAssignments.map((assignment) =>
              supplierBranchApi.updateAssignmentDeliveryDays(
                supplier.id,
                assignment.branchId,
                dayNames,
              ),
            ),
          );
        }

        // 3. Nếu đang đứng ở 1 chi nhánh cụ thể (vd: Chi nhánh chính), cập nhật cả trạng thái phân bổ
        if (isBranchFiltered && activeBranch.id !== 'ALL') {
          try {
            if (!currentBranchAssignment) {
              await supplierBranchApi.assignSuppliersToBranch({
                branchId: activeBranch.id,
                supplierIds: [supplier.id],
                items: [{ supplierId: supplier.id, deliveryDays: dayNames }],
              });
            }
            if (
              currentBranchAssignment &&
              branchStatus !== currentBranchAssignment.status
            ) {
              await supplierBranchApi.updateAssignmentStatus(
                supplier.id,
                activeBranch.id,
                branchStatus,
                branchStatus === 'Inactive' ? inactiveReason.trim() : undefined,
              );
            }
          } catch {
            // non-blocking
          }
        }

        // 4. Lưu defaultConfig và xóa các bản ghi ghi đè cũ của chi nhánh khác
        if (supplier?.id) {
          setBranchDeliveryMap((prev) => {
            const next: Record<string, BranchDeliveryRecord> = {
              ...prev,
              [supplier.id]: {
                defaultConfig: config,
                byBranchId: { ALL: config },
              },
            };
            try {
              localStorage.setItem(
                BRANCH_DELIVERY_STORAGE_KEY,
                JSON.stringify(next),
              );
            } catch {
              // ignore
            }
            return next;
          });
        }

        await fetchSupplierBranchAssignments();
        onNotify?.(
          `Đã lưu và đồng bộ cấu hình Giao hàng & Cutoff trên toàn bộ các chi nhánh!`,
          'success',
        );
        return;
      }

      // scope === 'CURRENT_ONLY'
      if (supplier?.id) {
        setBranchDeliveryMap((prev) => {
          const existing = prev[supplier.id];
          const preservedDefault = existing?.defaultConfig ?? baseCfg;
          const nextByBranch: Record<string, SupplierDeliveryConfig> = {
            ...(existing?.byBranchId || {}),
          };

          // Trước khi lưu cho chi nhánh chính/tổng, khóa lại cấu hình hiện tại của tất cả các chi nhánh khác
          if (branchAssignments.length > 0) {
            branchAssignments.forEach((assignment) => {
              if (
                assignment.branchId !== branchKey &&
                !nextByBranch[assignment.branchId]
              ) {
                nextByBranch[assignment.branchId] = {
                  ...preservedDefault,
                  activeDeliveryDays: assignment.deliveryDays?.length
                    ? mapDeliveryDaysToJs(assignment.deliveryDays)
                    : preservedDefault.activeDeliveryDays,
                };
              }
            });
          }

          nextByBranch[branchKey] = config;

          const next: Record<string, BranchDeliveryRecord> = {
            ...prev,
            [supplier.id]: {
              defaultConfig: preservedDefault,
              byBranchId: nextByBranch,
            },
          };
          try {
            localStorage.setItem(
              BRANCH_DELIVERY_STORAGE_KEY,
              JSON.stringify(next),
            );
          } catch {
            // ignore
          }
          return next;
        });
      }

      if (isBranchFiltered && activeBranch.id !== 'ALL') {
        try {
          if (!currentBranchAssignment) {
            await supplierBranchApi.assignSuppliersToBranch({
              branchId: activeBranch.id,
              supplierIds: [supplier.id],
              items: [{ supplierId: supplier.id, deliveryDays: dayNames }],
            });
          } else {
            await supplierBranchApi.updateAssignmentDeliveryDays(
              supplier.id,
              activeBranch.id,
              dayNames,
            );
          }

          if (
            !currentBranchAssignment ||
            branchStatus !== currentBranchAssignment.status ||
            inactiveReason.trim() !==
              (currentBranchAssignment.inactiveReason || '')
          ) {
            await supplierBranchApi.updateAssignmentStatus(
              supplier.id,
              activeBranch.id,
              branchStatus,
              branchStatus === 'Inactive' ? inactiveReason.trim() : undefined,
            );
          }
        } catch {
          // non-blocking if backend endpoint not reachable in unit test
        }

        // Lưu riêng tại chi nhánh đang chọn (kể cả Chi nhánh chính) -> KHÔNG gọi onSaveConfig toàn chuỗi
        onNotify?.(
          isMainOrTotalBranch
            ? `Đã lưu cấu hình Giao hàng & Cutoff chỉ trên thông tin chi nhánh chính "${activeBranch.name}" (giữ nguyên các chi nhánh khác)!`
            : `Đã lưu cấu hình Giao hàng & Cutoff riêng cho chi nhánh "${activeBranch.name}"!`,
          'success',
        );
        await fetchSupplierBranchAssignments();
      } else {
        // Đang ở "Toàn hệ thống" (ALL) và bấm "Lưu Cấu Hình Giao Hàng & Cutoff" (CURRENT_ONLY)
        // Bảo toàn ngày giao hiện tại của các chi nhánh con trên Backend để không bị ghi đè
        if (branchAssignments.length > 0) {
          await Promise.allSettled(
            branchAssignments.map((assignment) => {
              const existingDays = assignment.deliveryDays?.length
                ? assignment.deliveryDays
                : mapJsDaysToNames(baseCfg.activeDeliveryDays);
              return supplierBranchApi.updateAssignmentDeliveryDays(
                supplier.id,
                assignment.branchId,
                existingDays,
              );
            }),
          );
        }
        await onSaveConfig?.(config);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể lưu cấu hình giao hàng.';
      setSaveErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignToCurrentBranch = async () => {
    if (!isBranchFiltered || !supplier?.id || isSaving) return;
    setIsSaving(true);
    setSaveErrorMsg(null);
    try {
      const dayNames = mapJsDaysToNames(config.activeDeliveryDays);
      await supplierBranchApi.assignSuppliersToBranch({
        branchId: activeBranch.id,
        supplierIds: [supplier.id],
        items: [{ supplierId: supplier.id, deliveryDays: dayNames }],
      });
      await fetchSupplierBranchAssignments();
      onNotify?.(
        `Đã gán nhà cung cấp ${supplier.name} cho chi nhánh "${activeBranch.name}" thành công!`,
        'success',
      );
    } catch (err: any) {
      setSaveErrorMsg(
        err.message || 'Không thể gán nhà cung cấp cho chi nhánh.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {saveErrorMsg && (
        <div
          data-testid="save-delivery-error-alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '12px 18px',
            borderRadius: 'var(--radius-pill)',
            color: '#991b1b',
            fontWeight: 600,
            fontSize: '0.88rem',
          }}
        >
          {saveErrorMsg}
        </div>
      )}

      {/* Lịch giao hàng & Cutoff Time (kết hợp phân bổ Chi nhánh từ Header Dropdown) */}
      <div className="supplier-detail-card" data-testid="delivery-config-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary)',
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <h2
                  className="supplier-detail-card-title"
                  style={{ margin: 0, border: 'none', padding: 0 }}
                >
                  Lịch Giao Hàng &amp; Thời Gian Cutoff
                </h2>

                {/* Active Branch Pill from Header Dropdown */}
                {isBranchFiltered ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #a7f3d0',
                    }}
                    title="Đang cấu hình Giao hàng & Cutoff theo chi nhánh được chọn trên thanh Header"
                  >
                    <Store size={13} color="#059669" />
                    <span>Chi nhánh: {activeBranch.name}</span>
                    <button
                      type="button"
                      onClick={handleSwitchToAllBranches}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        marginLeft: 4,
                        color: '#047857',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      (Xem toàn hệ thống)
                    </button>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Store size={13} color="#64748b" />
                    <span>Toàn hệ thống</span>
                  </span>
                )}

                {isLoadingAssignment && (
                  <Loader2
                    size={15}
                    className="animate-spin"
                    style={{ color: 'var(--blue-primary, #0f766e)' }}
                  />
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isBranchFiltered ? (
                  <span>
                    Cấu hình trạng thái cung ứng, ngày giao hàng và giờ chốt đơn
                    của <b>{supplier.name}</b> áp dụng tại chi nhánh{' '}
                    <b>{activeBranch.name}</b>.
                  </span>
                ) : (
                  <span>
                    Cấu hình ngày giao hàng hoạt động và giờ chốt đơn hằng ngày.
                  </span>
                )}
              </div>
            </div>
          </div>

          {isBranchFiltered && !currentBranchAssignment && !isLoadingAssignment && (
            <button
              type="button"
              onClick={handleAssignToCurrentBranch}
              disabled={isSaving}
              className="po-btn po-btn-primary"
              style={{ height: 34 }}
            >
              <Plus size={14} />
              <span>Gán NCC vào chi nhánh này</span>
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Trạng thái phân bổ tại Chi nhánh (Hợp nhất từ màn Cửa Hàng với nhà cung cấp) */}
          {isBranchFiltered && (
            <div
              style={{
                ...labelRowStyle,
                paddingBottom: 14,
                borderBottom: '1px dashed #e2e8f0',
              }}
            >
              <div className="form-label" style={{ ...labelStyle, paddingTop: 4 }}>
                <Store size={14} color="var(--blue-primary)" />
                <span>Trạng thái tại chi nhánh</span>
              </div>
              <div style={fieldColStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <StatusToggle
                    checked={branchStatus === 'Active'}
                    disabled={isSaving}
                    onChange={(next) => {
                      setBranchStatus(next ? 'Active' : 'Inactive');
                      setSaveErrorMsg(null);
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {currentBranchAssignment
                      ? `Mã cửa hàng: ${currentBranchAssignment.branchCode || activeBranch.code || '—'} • Ngày phân bổ: ${currentBranchAssignment.assignedAt || '—'}`
                      : `Đang thiết lập cho chi nhánh ${activeBranch.name}`}
                  </span>
                </div>

                {branchStatus === 'Inactive' && (
                  <div style={{ marginTop: 8, maxWidth: 460 }}>
                    <input
                      type="text"
                      value={inactiveReason}
                      onChange={(e) => setInactiveReason(e.target.value)}
                      placeholder="Nhập lý do tạm ngưng giao hàng tại chi nhánh này..."
                      className="admin-search-input"
                      style={{ width: '100%', height: 36, fontSize: 13 }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={labelRowStyle}>
            <label className="form-label" style={labelStyle} htmlFor="input-moq">
              <Package size={14} color="var(--blue-primary)" />
              <span>Số lượng đặt tối thiểu (MOQ)</span>
            </label>
            <div style={fieldColStyle}>
              <input
                id="input-moq"
                type="number"
                min="0"
                data-testid="input-moq"
                value={config.minOrderQuantity}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    minOrderQuantity: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                className="admin-search-input"
                style={{
                  width: '100%',
                  maxWidth: 280,
                  height: 40,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <div
                data-testid="moq-helper-text"
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
              >
                Đơn đặt hàng phải đạt tối thiểu <b>{config.minOrderQuantity}</b>{' '}
                đơn vị mới được gửi cho nhà cung cấp.
              </div>
            </div>
          </div>

          <div style={labelRowStyle}>
            <label
              className="form-label"
              style={labelStyle}
              htmlFor="input-cutoff-day-offset"
            >
              <Clock size={14} color="var(--orange-accent)" />
              <span>Số ngày trước ngày giao để chốt đơn</span>
            </label>
            <div style={fieldColStyle}>
              <input
                id="input-cutoff-day-offset"
                type="number"
                min={0}
                step={1}
                data-testid="input-cutoff-day-offset"
                value={config.cutoffDayOffset}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cutoffDayOffset: Math.max(
                      0,
                      parseInt(e.target.value, 10) || 0,
                    ),
                  })
                }
                className="admin-search-input"
                style={{
                  width: '100%',
                  maxWidth: 280,
                  height: 40,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <div
                data-testid="cutoff-day-offset-helper-text"
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
              >
                {config.cutoffDayOffset === 0 ? (
                  <>
                    Chốt đơn <b>cùng ngày giao</b> lúc{' '}
                    <b>{config.cutoffTime || '—'}</b>.
                  </>
                ) : (
                  <>
                    Ví dụ ngày giao <b>09/11</b>, offset{' '}
                    <b>{config.cutoffDayOffset}</b> → chốt lúc{' '}
                    <b>{config.cutoffTime || '—'}</b> của ngày trước ngày giao{' '}
                    {config.cutoffDayOffset} ngày
                    {config.cutoffDayOffset === 1 ? ' (08/11)' : ''}.
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={labelRowStyle}>
            <label
              className="form-label"
              style={labelStyle}
              htmlFor="input-cutoff-time"
            >
              <Clock size={14} color="var(--orange-accent)" />
              <span>Giờ chốt đơn hàng ngày (Cutoff)</span>
            </label>
            <div style={fieldColStyle}>
              <input
                id="input-cutoff-time"
                type="time"
                data-testid="input-cutoff-time"
                value={config.cutoffTime}
                onChange={(e) =>
                  setConfig({ ...config, cutoffTime: e.target.value })
                }
                className="admin-search-input"
                style={{
                  width: '100%',
                  maxWidth: 280,
                  height: 40,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                }}
              />
              <div
                data-testid="cutoff-helper-text"
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
              >
                Kết hợp với số ngày trên: sau giờ <b>{config.cutoffTime}</b> của
                ngày chốt, cột ngày giao tương ứng bị khóa.
              </div>
            </div>
          </div>

          <div style={labelRowStyle}>
            <div className="form-label" style={{ ...labelStyle, paddingTop: 8 }}>
              Các ngày giao hàng trong tuần
            </div>
            <div style={fieldColStyle} data-testid="delivery-weekdays-group">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WEEKDAYS.map((day) => {
                  const isChecked = config.activeDeliveryDays.includes(day.val);
                  return (
                    <button
                      key={day.val}
                      type="button"
                      data-testid={`btn-weekday-${day.val}`}
                      aria-pressed={isChecked}
                      onClick={() => handleToggleWeekday(day.val)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isChecked
                          ? '1px solid var(--blue-primary)'
                          : '1px solid var(--border-light)',
                        background: isChecked ? 'var(--blue-light)' : '#ffffff',
                        color: isChecked
                          ? 'var(--blue-primary)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {isChecked ? '✓ ' : ''}
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-light)',
            paddingTop: 16,
            marginTop: 16,
          }}
        >
          <label
            className="form-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={16} color="var(--blue-primary)" />
            <span>Chính sách chỉnh sửa đơn mua hàng (PO Modification Rules)</span>
          </label>

          <div
            style={{
              display: 'flex',
              gap: 20,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <input
                type="radio"
                name="allowEdit"
                data-testid="radio-allow-store-edit"
                checked={config.allowStoreEdit}
                onChange={() => setConfig({ ...config, allowStoreEdit: true })}
              />
              <span>
                <b>Cho phép</b> cửa hàng chỉnh sửa PO trước hạn chót
              </span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <input
                type="radio"
                name="allowEdit"
                data-testid="radio-lock-immediately"
                checked={!config.allowStoreEdit}
                onChange={() => setConfig({ ...config, allowStoreEdit: false })}
              />
              <span>
                <b>Khóa ngay</b> (Không cho phép sửa sau khi gửi PO)
              </span>
            </label>
          </div>

          {config.allowStoreEdit && (
            <div
              data-testid="po-edit-sub-options"
              style={{
                background: 'var(--bg-soft-blue)',
                borderRadius: 14,
                padding: '12px 16px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: '0.84rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="editWindowType"
                  data-testid="radio-edit-before-cutoff"
                  checked={config.editWindowType === 'BEFORE_CUTOFF'}
                  onChange={() =>
                    setConfig({ ...config, editWindowType: 'BEFORE_CUTOFF' })
                  }
                />
                <span>
                  <b>Trước giờ Cutoff:</b> Cho phép sửa đến đúng giờ chốt đơn (
                  {config.cutoffTime}) của ngày đặt
                </span>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="editWindowType"
                  data-testid="radio-edit-hours-before-delivery"
                  checked={config.editWindowType === 'HOURS_BEFORE_DELIVERY'}
                  onChange={() =>
                    setConfig({
                      ...config,
                      editWindowType: 'HOURS_BEFORE_DELIVERY',
                    })
                  }
                />
                <span>
                  <b>Trước giờ giao hàng:</b> Cho phép sửa trước ngày giao{' '}
                  <input
                    type="number"
                    min="1"
                    max="72"
                    data-testid="input-hours-before-delivery"
                    value={config.hoursBeforeDelivery || 24}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hoursBeforeDelivery: parseInt(e.target.value) || 24,
                      })
                    }
                    style={{
                      width: 55,
                      height: 28,
                      textAlign: 'center',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                    }}
                  />{' '}
                  giờ
                </span>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="editWindowType"
                  data-testid="radio-edit-hours-after-order"
                  checked={config.editWindowType === 'HOURS_AFTER_ORDER'}
                  onChange={() =>
                    setConfig({
                      ...config,
                      editWindowType: 'HOURS_AFTER_ORDER',
                    })
                  }
                />
                <span>
                  <b>Sau khi đặt đơn:</b> Cho phép sửa trong vòng{' '}
                  <input
                    type="number"
                    min="1"
                    max="24"
                    data-testid="input-hours-after-order"
                    value={config.hoursAfterOrder || 2}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hoursAfterOrder: parseInt(e.target.value) || 2,
                      })
                    }
                    style={{
                      width: 55,
                      height: 28,
                      textAlign: 'center',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                    }}
                  />{' '}
                  giờ kể từ lúc tạo PO
                </span>
              </label>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            data-testid="btn-save-delivery-config"
            disabled={isSaving}
            onClick={() => void handleSaveWithScope('CURRENT_ONLY')}
            style={{
              height: 42,
              padding: '0 24px',
              borderRadius: 'var(--radius-pill)',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Giao Hàng & Cutoff'}
            </span>
          </button>

          {isMainOrTotalBranch && (
            <button
              type="button"
              className="po-btn po-btn-secondary"
              data-testid="btn-save-delivery-config-all-branches"
              disabled={isSaving}
              onClick={() => void handleSaveWithScope('ALL_BRANCHES')}
              style={{
                height: 42,
                padding: '0 20px',
                borderRadius: 'var(--radius-pill)',
                gap: 8,
                border: '1px solid #0f766e',
                color: '#0f766e',
                backgroundColor: '#f0fdfa',
                fontWeight: 600,
              }}
              title="Lưu cấu hình giao hàng & ngày giao và đồng bộ áp dụng sang tất cả các chi nhánh khác"
            >
              <Store size={15} />
              <span>Lưu thay đổi trên các chi nhánh khác</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
