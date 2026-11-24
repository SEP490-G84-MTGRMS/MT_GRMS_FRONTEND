import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Info, Plus, Trash2, Settings, Building2, Copy, Check, RotateCw, AlertTriangle } from 'lucide-react';
import type { Branch } from '../../types';
import {
  attendancePolicyApi,
  type WorkHourConversionRule,
  type UpsertAttendancePolicyPayload,
} from '../../api/attendancePolicyApi';

export type { WorkHourConversionRule };

export interface AttendanceConfig {
  // 1. Thiết lập số giờ tính công
  standardDayHours: number;
  isConvertHoursToDays: boolean;
  conversionRules: WorkHourConversionRule[];

  // 2. Cài đặt đi muộn - về sớm
  enableLateThreshold: boolean;
  lateThresholdMinutes: number;
  enableEarlyLeaveThreshold: boolean;
  earlyLeaveThresholdMinutes: number;
}

const createDefaultConversionRules = (): WorkHourConversionRule[] => [
  {
    id: 'rule-1',
    type: 'range',
    fromHours: 1,
    fromMinutes: 0,
    toHours: 4,
    toMinutes: 30,
    workUnits: 0.5,
    workUnitsLabel: '0.5 công',
  },
  {
    id: 'rule-2',
    type: 'gte',
    fromHours: 4,
    fromMinutes: 30,
    workUnits: 1,
    workUnitsLabel: '1 công',
  },
];

/**
 * Chuẩn hóa danh sách mức quy đổi theo cấu trúc bậc thang:
 * - Cố định tối thiểu 2 mức cơ bản (Mức 1, Mức 2).
 * - Các mức 1..(n-1) luôn là dạng khoảng "từ ... đến dưới ...".
 * - Mức cuối cùng (n) luôn là dạng mở "từ ... trở lên".
 */
const normalizeTieredRules = (input: WorkHourConversionRule[]): WorkHourConversionRule[] => {
  const defaults = createDefaultConversionRules();
  const base = input.length >= 2 ? input : [...input, ...defaults.slice(input.length)];
  const result: WorkHourConversionRule[] = [];

  for (let index = 0; index < base.length; index++) {
    const rule = base[index];
    const isLast = index === base.length - 1;
    const fromHours = index === 0 ? (rule.fromHours ?? 0) : (result[index - 1].toHours ?? 0);
    const fromMinutes = index === 0 ? (rule.fromMinutes ?? 0) : (result[index - 1].toMinutes ?? 0);

    if (isLast) {
      const { toHours: _th, toMinutes: _tm, ...rest } = rule;
      result.push({
        ...rest,
        type: 'gte',
        fromHours,
        fromMinutes,
      });
      continue;
    }

    const fromTotal = fromHours * 60 + fromMinutes;
    const existingToTotal = (rule.toHours ?? 0) * 60 + (rule.toMinutes ?? 0);
    const hasValidExistingTo = rule.toHours !== undefined && existingToTotal > fromTotal;
    const fallbackToTotal = Math.min(24 * 60, fromTotal + 240);

    result.push({
      ...rule,
      type: 'range',
      fromHours,
      fromMinutes,
      toHours: hasValidExistingTo ? rule.toHours! : Math.floor(fallbackToTotal / 60),
      toMinutes: hasValidExistingTo ? (rule.toMinutes ?? 0) : fallbackToTotal % 60,
    });
  }

  return result;
};

const EMPTY_ATTENDANCE_CONFIG: AttendanceConfig = {
  standardDayHours: 0,
  isConvertHoursToDays: false,
  conversionRules: [],
  enableLateThreshold: false,
  lateThresholdMinutes: 0,
  enableEarlyLeaveThreshold: false,
  earlyLeaveThresholdMinutes: 0,
};

export type AttendanceConfigsByBranch = Record<string, AttendanceConfig>;

interface AttendanceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  initialBranchId?: string;
  onSaveSuccess?: (branchId: string, savedConfig: AttendanceConfig) => void;
}

export const AttendanceConfigModal: React.FC<AttendanceConfigModalProps> = ({
  isOpen,
  onClose,
  branches,
  initialBranchId,
  onSaveSuccess,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<AttendanceConfig>(EMPTY_ATTENDANCE_CONFIG);
  const [rules, setRules] = useState<WorkHourConversionRule[]>([]);
  const [, setIsCustomized] = useState<boolean>(false);

  // Trạng thái async
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validation state (theo chuẩn pattern EmployeeFormModal)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Modal sao chép sang chi nhánh khác
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [targetBranchIds, setTargetBranchIds] = useState<string[]>([]);
  const [copySearch, setCopySearch] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Tải cấu hình chính sách từ Backend
  const fetchBranchPolicy = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const dto = await attendancePolicyApi.getByBranch(branchId);

      let parsedRules: WorkHourConversionRule[] = [];
      if (dto.conversionRulesJson) {
        try {
          const parsed = JSON.parse(dto.conversionRulesJson);
          if (Array.isArray(parsed)) {
            parsedRules = parsed;
          }
        } catch (e) {
          console.warn('Lỗi parse conversionRulesJson:', e);
        }
      }

      const normalizedRules = normalizeTieredRules(parsedRules);

      setCurrentConfig({
        standardDayHours: dto.standardDayHours ?? 0,
        isConvertHoursToDays: dto.isConvertHoursToDays ?? false,
        conversionRules: normalizedRules,
        enableLateThreshold: dto.enableLateThreshold ?? false,
        lateThresholdMinutes: dto.lateThresholdMinutes ?? 0,
        enableEarlyLeaveThreshold: dto.enableEarlyLeaveThreshold ?? false,
        earlyLeaveThresholdMinutes: dto.earlyLeaveThresholdMinutes ?? 0,
      });
      setRules(normalizedRules);
      setIsCustomized(Boolean(dto.isCustomized));
      setTouched({});
      setHasSubmitted(false);
    } catch (err: any) {
      console.error('Lỗi tải cấu hình chấm công chi nhánh:', err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Không thể tải cấu hình chấm công từ máy chủ.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Đồng bộ khi mở modal hoặc danh sách branches thay đổi
  useEffect(() => {
    if (isOpen && branches.length > 0) {
      const defaultBranchId =
        initialBranchId && branches.some((b) => b.id === initialBranchId)
          ? initialBranchId
          : branches[0]?.id || '';

      setSelectedBranchId(defaultBranchId);
      setShowCopyModal(false);
      setCopyFeedback(null);
      setErrorMessage(null);
      setTouched({});
      setHasSubmitted(false);
      fetchBranchPolicy(defaultBranchId);
    }
  }, [isOpen, initialBranchId, branches, fetchBranchPolicy]);

  // Realtime Inline Errors (chuẩn hóa theo Prompt_Validate_Input_NhanVien.md)
  const branchError = useMemo(() => {
    if (!selectedBranchId) {
      return 'Chi nhánh không được để trống.';
    }
    return null;
  }, [selectedBranchId]);

  const standardDayHoursError = useMemo(() => {
    const val = currentConfig.standardDayHours;
    if (val === undefined || val === null || isNaN(val) || val <= 0 || val > 24) {
      return 'Số giờ chuẩn của 1 ngày công phải lớn hơn 0 và không vượt quá 24 giờ.';
    }
    if (Math.abs(Math.round(val * 100) - val * 100) > 1e-9) {
      return 'Số giờ chuẩn chỉ được phép tối đa 2 chữ số thập phân.';
    }
    return null;
  }, [currentConfig.standardDayHours]);

  const lateThresholdError = useMemo(() => {
    if (!currentConfig.enableLateThreshold) return null;
    const val = currentConfig.lateThresholdMinutes;
    if (val === undefined || val === null || isNaN(val) || !Number.isInteger(val) || val < 0 || val > 240) {
      return 'Số phút đi muộn tối đa phải là số nguyên từ 0 đến 240 phút (4 giờ).';
    }
    return null;
  }, [currentConfig.enableLateThreshold, currentConfig.lateThresholdMinutes]);

  const earlyLeaveThresholdError = useMemo(() => {
    if (!currentConfig.enableEarlyLeaveThreshold) return null;
    const val = currentConfig.earlyLeaveThresholdMinutes;
    if (val === undefined || val === null || isNaN(val) || !Number.isInteger(val) || val < 0 || val > 240) {
      return 'Số phút về sớm tối đa phải là số nguyên từ 0 đến 240 phút (4 giờ).';
    }
    return null;
  }, [currentConfig.enableEarlyLeaveThreshold, currentConfig.earlyLeaveThresholdMinutes]);

  // Helper kiểm tra lỗi chi tiết từng rule quy đổi giờ sang công
  const getRuleErrors = useCallback((r: WorkHourConversionRule) => {
    const fromH = r.fromHours ?? 0;
    const fromM = r.fromMinutes ?? 0;
    const fromTotal = fromH * 60 + fromM;
    const isFromInvalid =
      !Number.isInteger(fromH) ||
      !Number.isInteger(fromM) ||
      fromH < 0 ||
      fromH > 24 ||
      fromM < 0 ||
      fromM > 59 ||
      fromTotal > 1440 ||
      (r.type === 'gte' && fromTotal >= 1440);
    const isWorkUnitsInvalid =
      isNaN(r.workUnits) ||
      r.workUnits <= 0 ||
      r.workUnits > 5 ||
      Math.abs(Math.round(r.workUnits * 100) - r.workUnits * 100) > 1e-9;
    let isToInvalid = false;
    let isRangeOrderInvalid = false;

    if (r.type === 'range') {
      const toH = r.toHours ?? 0;
      const toM = r.toMinutes ?? 0;
      const toTotal = toH * 60 + toM;
      isToInvalid =
        !Number.isInteger(toH) ||
        !Number.isInteger(toM) ||
        toH < 0 ||
        toH > 24 ||
        toM < 0 ||
        toM > 59 ||
        toTotal > 1440;
      if (!isFromInvalid && !isToInvalid && toTotal <= fromTotal) {
        isRangeOrderInvalid = true;
      }
    }

    return {
      isFromInvalid,
      isToInvalid,
      isRangeOrderInvalid,
      isWorkUnitsInvalid,
      hasError: isFromInvalid || isToInvalid || isRangeOrderInvalid || isWorkUnitsInvalid,
    };
  }, []);

  const rulesValidation = useMemo(() => {
    const emptyResult = { error: null as string | null, overlappingIds: new Set<string>() };
    if (!currentConfig.isConvertHoursToDays) return emptyResult;
    if (!rules || rules.length === 0) {
      return {
        error: 'Vui lòng thêm ít nhất một quy tắc quy đổi giờ làm thành ngày công.',
        overlappingIds: new Set<string>(),
      };
    }

    const ranges: { index: number; id: string; fromTotal: number; toTotal: number }[] = [];
    const gteRules: { index: number; id: string; fromTotal: number }[] = [];

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const err = getRuleErrors(r);
      if (err.isWorkUnitsInvalid) {
        return {
          error: `Số công quy đổi ở Dòng ${i + 1} phải lớn hơn 0, không vượt quá 5 và tối đa 2 chữ số thập phân.`,
          overlappingIds: new Set<string>(),
        };
      }
      if (err.isRangeOrderInvalid) {
        return {
          error: `Quy tắc quy đổi công không hợp lệ ở Dòng ${i + 1}: mốc giờ kết thúc phải lớn hơn mốc giờ bắt đầu.`,
          overlappingIds: new Set<string>(),
        };
      }
      if (err.isFromInvalid) {
        return {
          error: `Mốc giờ/phút bắt đầu trong quy tắc quy đổi công không hợp lệ (Dòng ${i + 1}, tối đa 24:00).`,
          overlappingIds: new Set<string>(),
        };
      }
      if (err.isToInvalid) {
        return {
          error: `Mốc giờ/phút kết thúc trong quy tắc quy đổi công không hợp lệ (Dòng ${i + 1}, tối đa 24:00).`,
          overlappingIds: new Set<string>(),
        };
      }

      const fromTotal = (r.fromHours ?? 0) * 60 + (r.fromMinutes ?? 0);
      if (r.type === 'gte') {
        gteRules.push({ index: i + 1, id: r.id, fromTotal });
      } else {
        const toTotal = (r.toHours ?? 0) * 60 + (r.toMinutes ?? 0);
        ranges.push({ index: i + 1, id: r.id, fromTotal, toTotal });
      }
    }

    const overlappingIds = new Set<string>();
    let firstCrossError: string | null = null;

    if (gteRules.length > 1) {
      gteRules.forEach((g) => overlappingIds.add(g.id));
      firstCrossError = "Chỉ được cấu hình tối đa một quy tắc dạng 'Từ ... giờ trở lên'.";
    }

    const activeGte = gteRules.length === 1 ? gteRules[0] : null;
    for (let i = 0; i < ranges.length; i++) {
      if (activeGte && ranges[i].toTotal > activeGte.fromTotal) {
        overlappingIds.add(ranges[i].id);
        overlappingIds.add(activeGte.id);
        if (!firstCrossError) {
          firstCrossError = `Khoảng giờ quy đổi ở Dòng ${ranges[i].index} đang chồng lấn lên mốc 'Từ ... giờ trở lên'.`;
        }
      }
      for (let j = i + 1; j < ranges.length; j++) {
        if (Math.max(ranges[i].fromTotal, ranges[j].fromTotal) < Math.min(ranges[i].toTotal, ranges[j].toTotal)) {
          overlappingIds.add(ranges[i].id);
          overlappingIds.add(ranges[j].id);
          if (!firstCrossError) {
            firstCrossError = `Các khoảng giờ quy đổi công không được chồng lấn lên nhau (Dòng ${ranges[i].index} và Dòng ${ranges[j].index}).`;
          }
        }
      }
    }

    return { error: firstCrossError, overlappingIds };
  }, [currentConfig.isConvertHoursToDays, rules, getRuleErrors]);

  const rulesError = rulesValidation.error;

  const validatePolicyConfig = (): string | null => {
    if (branchError) return branchError;
    if (standardDayHoursError) return standardDayHoursError;
    if (lateThresholdError) return lateThresholdError;
    if (earlyLeaveThresholdError) return earlyLeaveThresholdError;
    if (rulesError) return rulesError;
    return null;
  };

  if (!isOpen) return null;

  // Xử lý chuyển đổi chi nhánh
  const handleSwitchBranch = (nextBranchId: string) => {
    setSelectedBranchId(nextBranchId);
    fetchBranchPolicy(nextBranchId);
  };

  const handleAddRule = () => {
    setRules((prev) => {
      const normalized = normalizeTieredRules(prev);
      const prevLast = normalized[normalized.length - 1];
      const prevFromTotal = (prevLast.fromHours ?? 0) * 60 + (prevLast.fromMinutes ?? 0);

      // Tính mốc chuyển tiếp [C], [D]... sao cho luôn lớn hơn mốc trước và <= 23:59
      const nextBoundaryTotal =
        prevFromTotal < 8 * 60
          ? 8 * 60
          : prevFromTotal + 240 < 24 * 60
            ? prevFromTotal + 240
            : Math.min(23 * 60 + 59, prevFromTotal + Math.max(1, Math.floor((24 * 60 - prevFromTotal) / 2)));

      const boundaryHours = Math.floor(nextBoundaryTotal / 60);
      const boundaryMinutes = nextBoundaryTotal % 60;
      const nextWorkUnits = Math.min(
        5,
        Math.round(((Number(prevLast.workUnits) || 1) + 0.5) * 100) / 100
      );

      const updatedPrevLast: WorkHourConversionRule = {
        ...prevLast,
        type: 'range',
        toHours: boundaryHours,
        toMinutes: boundaryMinutes,
      };

      const newLastRule: WorkHourConversionRule = {
        id: `rule-${Date.now()}-${normalized.length + 1}`,
        type: 'gte',
        fromHours: boundaryHours,
        fromMinutes: boundaryMinutes,
        workUnits: nextWorkUnits,
        workUnitsLabel: `${nextWorkUnits} công`,
      };

      return [...normalized.slice(0, -1), updatedPrevLast, newLastRule];
    });
    if (!touched.rules) markTouched('rules');
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (prev.length <= 2 || idx < 2) return prev;
      return normalizeTieredRules(prev.filter((r) => r.id !== id));
    });
    if (!touched.rules) markTouched('rules');
  };

  const handleUpdateRule = (id: string, updates: Partial<WorkHourConversionRule>) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const next = prev.map((r, i) => (i === idx ? { ...r, ...updates } : r));
      if ((updates.toHours !== undefined || updates.toMinutes !== undefined) && idx + 1 < next.length) {
        const updatedCurrent = next[idx];
        next[idx + 1] = {
          ...next[idx + 1],
          fromHours: updatedCurrent.toHours ?? 0,
          fromMinutes: updatedCurrent.toMinutes ?? 0,
        };
      }
      return next;
    });
    if (!touched.rules) markTouched('rules');
  };

  // Mở modal sao chép
  const handleOpenCopyModal = () => {
    // Mặc định chọn tất cả chi nhánh khác chi nhánh hiện tại
    const otherBranchIds = branches.filter((b) => b.id !== selectedBranchId).map((b) => b.id);
    setTargetBranchIds(otherBranchIds);
    setCopySearch('');
    setCopyFeedback(null);
    setShowCopyModal(true);
  };

  // Xác nhận sao chép sang các chi nhánh được chọn
  const handleConfirmCopy = async () => {
    if (!selectedBranchId) {
      setCopyFeedback('Chi nhánh nguồn không được để trống.');
      return;
    }
    if (targetBranchIds.length === 0) {
      setCopyFeedback('Vui lòng chọn ít nhất một chi nhánh đích để sao chép.');
      return;
    }
    if (targetBranchIds.includes(selectedBranchId)) {
      setCopyFeedback('Danh sách chi nhánh đích không được chứa chi nhánh nguồn.');
      return;
    }

    const validationErr = validatePolicyConfig();
    if (validationErr) {
      setCopyFeedback(validationErr);
      return;
    }

    try {
      setIsCopying(true);
      setCopyFeedback(null);

      // 1. Lưu cấu hình hiện tại của chi nhánh nguồn nếu người dùng đang có chỉnh sửa
      const payload: UpsertAttendancePolicyPayload = {
        standardDayHours: currentConfig.standardDayHours,
        isConvertHoursToDays: currentConfig.isConvertHoursToDays,
        conversionRulesJson: JSON.stringify(rules),
        enableLateThreshold: currentConfig.enableLateThreshold,
        lateThresholdMinutes: currentConfig.lateThresholdMinutes,
        enableEarlyLeaveThreshold: currentConfig.enableEarlyLeaveThreshold,
        earlyLeaveThresholdMinutes: currentConfig.earlyLeaveThresholdMinutes,
      };
      await attendancePolicyApi.upsertPolicy(selectedBranchId, payload);

      // 2. Gọi API sao chép
      const res = await attendancePolicyApi.copyPolicy({
        sourceBranchId: selectedBranchId,
        targetBranchIds,
      });

      setCopyFeedback(res.message || `Đã sao chép cấu hình sang ${targetBranchIds.length} chi nhánh thành công!`);
      setTimeout(() => {
        setShowCopyModal(false);
        setCopyFeedback(null);
      }, 1200);
    } catch (err: any) {
      console.error('Lỗi sao chép cấu hình:', err);
      setCopyFeedback(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi sao chép cấu hình.');
    } finally {
      setIsCopying(false);
    }
  };

  // Lưu toàn bộ cài đặt cho chi nhánh đang chọn
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setErrorMessage(null);

    const validationErr = validatePolicyConfig();
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: UpsertAttendancePolicyPayload = {
        standardDayHours: currentConfig.standardDayHours,
        isConvertHoursToDays: currentConfig.isConvertHoursToDays,
        conversionRulesJson: JSON.stringify(rules),
        enableLateThreshold: currentConfig.enableLateThreshold,
        lateThresholdMinutes: currentConfig.lateThresholdMinutes,
        enableEarlyLeaveThreshold: currentConfig.enableEarlyLeaveThreshold,
        earlyLeaveThresholdMinutes: currentConfig.earlyLeaveThresholdMinutes,
      };

      await attendancePolicyApi.upsertPolicy(selectedBranchId, payload);

      const finalCurrentConfig: AttendanceConfig = {
        ...currentConfig,
        conversionRules: rules,
      };

      if (onSaveSuccess) {
        onSaveSuccess(selectedBranchId, finalCurrentConfig);
      }
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu cấu hình chấm công:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể lưu cấu hình chấm công lên máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBranchName = branches.find((b) => b.id === selectedBranchId)?.name || 'Chi nhánh';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !showCopyModal) onClose();
      }}
    >
      <div
        style={{
          width: 840,
          maxWidth: '95vw',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#E6FFFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F766E',
              }}
            >
              <Settings size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Thiết lập chấm công theo chi nhánh
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                Cấu hình số giờ tính công, quy tắc quy đổi và dung sai đi muộn / làm thêm cho từng chi nhánh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 6,
              borderRadius: 6,
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── THANH ĐIỀU HƯỚNG CHỌN CHI NHÁNH (MÔ HÌNH 1) ─── */}
        <div
          style={{
            background: '#F8FAFC',
            padding: '12px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={18} color="#0F766E" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
              Chi nhánh cấu hình:
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => handleSwitchBranch(e.target.value)}
              className="emp-form-select"
              style={{
                height: 34,
                padding: '0 12px',
                minWidth: 240,
                fontSize: 13,
                fontWeight: 600,
                color: '#0F766E',
                borderColor: '#CBD5E1',
                background: '#FFFFFF',
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {/* {isCustomized ? (
              <span
                style={{
                  fontSize: 11.5,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: '#DCFCE7',
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                Đã tùy chỉnh
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11.5,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: '#F1F5F9',
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                Mặc định hệ thống
              </span>
            )} */}
          </div>

          {branches.length > 1 && (
            <button
              type="button"
              onClick={handleOpenCopyModal}
              disabled={isLoading || isSubmitting}
              className="emp-btn emp-btn-secondary"
              style={{
                height: 32,
                fontSize: 12,
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
                opacity: isLoading || isSubmitting ? 0.6 : 1,
                cursor: isLoading || isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <Copy size={14} />
              <span>Sao chép sang chi nhánh khác</span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: '20px 28px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  color: '#DC2626',
                  fontSize: 13,
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {isLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
                <RotateCw size={28} className="spin-icon" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <div>Đang tải cấu hình chấm công chi nhánh...</div>
              </div>
            ) : (
              <>
                {/* ─── SECTION 1: THIẾT LẬP SỐ GIỜ TÍNH CÔNG ─── */}
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 22 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                    Thiết lập số giờ tính công
                  </div>

                  {/* Dòng 1: Số giờ của 1 ngày công chuẩn */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13.5,
                        color: '#334155',
                      }}
                    >
                      <span>Số giờ của 1 ngày công chuẩn là</span>
                      <input
                        type="number"
                        min={0.5}
                        max={24}
                        step={0.5}
                        value={currentConfig.standardDayHours}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCurrentConfig((prev) => ({
                            ...prev,
                            standardDayHours: isNaN(val) ? ('' as any) : val,
                          }));
                          if (!touched.standardDayHours) markTouched('standardDayHours');
                        }}
                        onBlur={() => markTouched('standardDayHours')}
                        style={{
                          width: 70,
                          height: 34,
                          textAlign: 'center',
                          border: `1px solid ${(touched.standardDayHours || hasSubmitted) && standardDayHoursError ? '#EF4444' : '#CBD5E1'}`,
                          boxShadow: (touched.standardDayHours || hasSubmitted) && standardDayHoursError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                          borderRadius: 6,
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: '#0F172A',
                          outline: 'none',
                          background: '#FFFFFF',
                        }}
                      />
                      <span>giờ</span>
                      <span
                        title="Số giờ làm việc tiêu chuẩn tương ứng với 1 ngày công hoàn chỉnh (thường là 8 giờ)."
                        style={{
                          cursor: 'help',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#94A3B8',
                        }}
                      >
                        <Info size={15} />
                      </span>
                    </div>
                    {(touched.standardDayHours || hasSubmitted) && standardDayHoursError && (
                      <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>•</span>
                        <span>{standardDayHoursError}</span>
                      </div>
                    )}
                  </div>

                  {/* Dòng 2: Checkbox Quy đổi số giờ làm thành số ngày công */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#1E293B',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={currentConfig.isConvertHoursToDays}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCurrentConfig((prev) => ({
                            ...prev,
                            isConvertHoursToDays: checked,
                          }));
                          if (checked && rules.length < 2) {
                            setRules((prev) => normalizeTieredRules(prev));
                          }
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: 'var(--blue-primary, #0F766E)',
                          cursor: 'pointer',
                        }}
                      />
                      <span>Quy đổi số giờ làm thành số ngày công</span>
                      <span
                        title="Tự động quy đổi số giờ thực tế làm việc thành nửa công hoặc 1 công theo các mốc quy định."
                        style={{
                          cursor: 'help',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#94A3B8',
                        }}
                      >
                        <Info size={15} />
                      </span>
                    </label>
                  </div>

                  {/* Danh sách các mức quy đổi khi bật checkbox */}
                  {currentConfig.isConvertHoursToDays && (
                    <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {rules.map((rule, index) => {
                        const ruleErrors = getRuleErrors(rule);
                        const shouldShowRuleError = Boolean(touched.rules || hasSubmitted);

                        return (
                          <div
                            key={rule.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 13,
                              color: '#334155',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#0F766E', minWidth: 48 }}>
                              Mức {index + 1}:
                            </span>
                            <span>Từ</span>
                            <input
                              type="number"
                              min={0}
                              max={24}
                              value={rule.fromHours}
                              disabled={index >= 1}
                              aria-label={`Mức ${index + 1} từ giờ`}
                              onChange={(e) =>
                                handleUpdateRule(rule.id, { fromHours: Number(e.target.value) || 0 })
                              }
                              style={{
                                width: 55,
                                height: 32,
                                textAlign: 'center',
                                border: `1px solid ${shouldShowRuleError && ruleErrors.isFromInvalid ? '#EF4444' : '#CBD5E1'}`,
                                boxShadow: shouldShowRuleError && ruleErrors.isFromInvalid ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                                borderRadius: 6,
                                fontSize: 13,
                                outline: 'none',
                                backgroundColor: index >= 1 ? '#F1F5F9' : '#FFFFFF',
                                color: index >= 1 ? '#64748B' : '#0F172A',
                                cursor: index >= 1 ? 'not-allowed' : 'text',
                              }}
                            />
                            <span>giờ</span>

                            {rule.fromMinutes !== undefined && (
                              <>
                                <input
                                  type="number"
                                  min={0}
                                  max={59}
                                  value={rule.fromMinutes}
                                  disabled={index >= 1}
                                  aria-label={`Mức ${index + 1} từ phút`}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, {
                                      fromMinutes: Number(e.target.value) || 0,
                                    })
                                  }
                                  style={{
                                    width: 55,
                                    height: 32,
                                    textAlign: 'center',
                                    border: `1px solid ${shouldShowRuleError && ruleErrors.isFromInvalid ? '#EF4444' : '#CBD5E1'}`,
                                    boxShadow: shouldShowRuleError && ruleErrors.isFromInvalid ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    outline: 'none',
                                    backgroundColor: index >= 1 ? '#F1F5F9' : '#FFFFFF',
                                    color: index >= 1 ? '#64748B' : '#0F172A',
                                    cursor: index >= 1 ? 'not-allowed' : 'text',
                                  }}
                                />
                                <span>phút</span>
                              </>
                            )}

                            {rule.type === 'range' ? (
                              <>
                                <span style={{ marginLeft: 4 }}>đến dưới</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={24}
                                  value={rule.toHours ?? 4}
                                  aria-label={`Mức ${index + 1} đến dưới giờ`}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, { toHours: Number(e.target.value) || 0 })
                                  }
                                  style={{
                                    width: 55,
                                    height: 32,
                                    textAlign: 'center',
                                    border: `1px solid ${shouldShowRuleError && (ruleErrors.isToInvalid || ruleErrors.isRangeOrderInvalid) ? '#EF4444' : '#CBD5E1'}`,
                                    boxShadow: shouldShowRuleError && (ruleErrors.isToInvalid || ruleErrors.isRangeOrderInvalid) ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    outline: 'none',
                                  }}
                                />
                                <span>giờ</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={59}
                                  value={rule.toMinutes ?? 30}
                                  aria-label={`Mức ${index + 1} đến dưới phút`}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, { toMinutes: Number(e.target.value) || 0 })
                                  }
                                  style={{
                                    width: 55,
                                    height: 32,
                                    textAlign: 'center',
                                    border: `1px solid ${shouldShowRuleError && (ruleErrors.isToInvalid || ruleErrors.isRangeOrderInvalid) ? '#EF4444' : '#CBD5E1'}`,
                                    boxShadow: shouldShowRuleError && (ruleErrors.isToInvalid || ruleErrors.isRangeOrderInvalid) ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    outline: 'none',
                                  }}
                                />
                                <span>phút</span>
                              </>
                            ) : (
                              <span style={{ marginLeft: 4 }}>trở lên</span>
                            )}

                            <span style={{ margin: '0 4px', color: '#64748B' }}>:</span>
                            <span style={{ color: '#334155' }}>ghi nhận</span>
                            <input
                              type="number"
                              min={0.01}
                              max={5}
                              step={0.01}
                              value={rule.workUnits}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateRule(rule.id, {
                                  workUnits: isNaN(val) ? ('' as any) : val,
                                  workUnitsLabel: isNaN(val) ? '' : `${val} công`,
                                });
                              }}
                              style={{
                                width: 60,
                                height: 32,
                                textAlign: 'center',
                                border: `1px solid ${shouldShowRuleError && ruleErrors.isWorkUnitsInvalid ? '#EF4444' : '#CBD5E1'}`,
                                boxShadow: shouldShowRuleError && ruleErrors.isWorkUnitsInvalid ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#0F172A',
                                outline: 'none',
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>công</span>

                            {index >= 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRule(rule.id)}
                                style={{
                                  marginLeft: 'auto',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: 4,
                                  borderRadius: 4,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title={`Xóa Mức ${index + 1}`}
                                aria-label={`Xóa Mức ${index + 1}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      <div>
                        <button
                          type="button"
                          onClick={handleAddRule}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            fontSize: 12.5,
                            fontWeight: 500,
                            color: '#334155',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            cursor: 'pointer',
                            marginTop: 4,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.borderColor = '#94A3B8')}
                          onMouseOut={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                        >
                          <Plus size={14} />
                          <span>Thêm mức quy đổi</span>
                        </button>
                      </div>

                      {(touched.rules || hasSubmitted) && rulesError && (
                        <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span>
                          <span>{rulesError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ─── SECTION 2: CÀI ĐẶT ĐI MUỘN - VỀ SỚM ─── */}
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 22 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                    Cài đặt đi muộn - về sớm
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Tính đi muộn sau */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 160,
                            cursor: 'pointer',
                            color: '#334155',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentConfig.enableLateThreshold}
                            onChange={(e) => {
                              setCurrentConfig((prev) => ({
                                ...prev,
                                enableLateThreshold: e.target.checked,
                              }));
                              if (!touched.lateThreshold) markTouched('lateThreshold');
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: 'var(--blue-primary, #0F766E)',
                              cursor: 'pointer',
                            }}
                          />
                          <span>Tính đi muộn sau</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={240}
                          value={currentConfig.lateThresholdMinutes}
                          disabled={!currentConfig.enableLateThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCurrentConfig((prev) => ({
                              ...prev,
                              lateThresholdMinutes: isNaN(val) ? ('' as any) : val,
                            }));
                            if (!touched.lateThreshold) markTouched('lateThreshold');
                          }}
                          onBlur={() => markTouched('lateThreshold')}
                          style={{
                            width: 70,
                            height: 32,
                            textAlign: 'center',
                            border: `1px solid ${(touched.lateThreshold || hasSubmitted) && lateThresholdError ? '#EF4444' : '#CBD5E1'}`,
                            boxShadow: (touched.lateThreshold || hasSubmitted) && lateThresholdError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            outline: 'none',
                            backgroundColor: currentConfig.enableLateThreshold ? '#FFFFFF' : '#F1F5F9',
                          }}
                        />
                        <span style={{ color: '#334155' }}>phút</span>
                        <span
                          title="Số phút trễ tối đa cho phép trước khi bắt đầu ghi nhận vi phạm đi muộn (từ 0 đến 240 phút)."
                          style={{
                            cursor: 'help',
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: '#94A3B8',
                          }}
                        >
                          <Info size={15} />
                        </span>
                      </div>
                      {(touched.lateThreshold || hasSubmitted) && lateThresholdError && (
                        <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span>
                          <span>{lateThresholdError}</span>
                        </div>
                      )}
                    </div>

                    {/* Tính về sớm trước */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 160,
                            cursor: 'pointer',
                            color: '#334155',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentConfig.enableEarlyLeaveThreshold}
                            onChange={(e) => {
                              setCurrentConfig((prev) => ({
                                ...prev,
                                enableEarlyLeaveThreshold: e.target.checked,
                              }));
                              if (!touched.earlyLeaveThreshold) markTouched('earlyLeaveThreshold');
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: 'var(--blue-primary, #0F766E)',
                              cursor: 'pointer',
                            }}
                          />
                          <span>Tính về sớm trước</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={240}
                          value={currentConfig.earlyLeaveThresholdMinutes}
                          disabled={!currentConfig.enableEarlyLeaveThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCurrentConfig((prev) => ({
                              ...prev,
                              earlyLeaveThresholdMinutes: isNaN(val) ? ('' as any) : val,
                            }));
                            if (!touched.earlyLeaveThreshold) markTouched('earlyLeaveThreshold');
                          }}
                          onBlur={() => markTouched('earlyLeaveThreshold')}
                          style={{
                            width: 70,
                            height: 32,
                            textAlign: 'center',
                            border: `1px solid ${(touched.earlyLeaveThreshold || hasSubmitted) && earlyLeaveThresholdError ? '#EF4444' : '#CBD5E1'}`,
                            boxShadow: (touched.earlyLeaveThreshold || hasSubmitted) && earlyLeaveThresholdError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            outline: 'none',
                            backgroundColor: currentConfig.enableEarlyLeaveThreshold ? '#FFFFFF' : '#F1F5F9',
                          }}
                        />
                        <span style={{ color: '#334155' }}>phút</span>
                        <span
                          title="Số phút về sớm tối đa cho phép trước giờ tan ca mà không bị tính về sớm (từ 0 đến 240 phút)."
                          style={{
                            cursor: 'help',
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: '#94A3B8',
                          }}
                        >
                          <Info size={15} />
                        </span>
                      </div>
                      {(touched.earlyLeaveThreshold || hasSubmitted) && earlyLeaveThresholdError && (
                        <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>•</span>
                          <span>{earlyLeaveThresholdError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
            }}
          >
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              Cấu hình đang thao tác trên: <strong style={{ color: '#0F766E' }}>{currentBranchName}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="emp-btn emp-btn-secondary"
                style={{ minWidth: 90 }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="emp-btn emp-btn-primary"
                style={{
                  minWidth: 120,
                  background: 'var(--blue-primary, #0F766E)',
                  borderColor: 'var(--blue-primary, #0F766E)',
                  opacity: isLoading || isSubmitting ? 0.7 : 1,
                  cursor: isLoading || isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </div>
          </div>
        </form>

        {/* ─── MODAL SAO CHÉP SANG CHI NHÁNH KHÁC (SUB-MODAL) ─── */}
        {showCopyModal && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: 20,
            }}
          >
            <div
              style={{
                width: 480,
                maxWidth: '90%',
                background: '#FFFFFF',
                borderRadius: 10,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Copy size={16} color="#0F766E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    Sao chép cấu hình sang chi nhánh khác
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '16px 20px', maxHeight: 330, overflowY: 'auto' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
                  Sao chép toàn bộ thông số chấm công của <strong>"{currentBranchName}"</strong> sang các chi nhánh được chọn:
                </p>

                {/* Ô tìm kiếm chi nhánh đích kèm character counter */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Tìm nhanh chi nhánh đích..."
                    value={copySearch}
                    maxLength={50}
                    onChange={(e) => setCopySearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 45px 0 10px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 12.5,
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 10.5,
                      color: copySearch.length >= 50 ? '#EF4444' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  >
                    {copySearch.length}/50
                  </span>
                </div>

                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const otherBranches = branches
                        .filter((b) => b.id !== selectedBranchId)
                        .filter((b) => b.name.toLowerCase().includes(copySearch.toLowerCase().trim()));
                      const otherIds = otherBranches.map((b) => b.id);
                      const isAllSelected = otherIds.length > 0 && otherIds.every((id) => targetBranchIds.includes(id));
                      if (isAllSelected) {
                        setTargetBranchIds((prev) => prev.filter((id) => !otherIds.includes(id)));
                      } else {
                        setTargetBranchIds((prev) => Array.from(new Set([...prev, ...otherIds])));
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0F766E',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Chọn / Bỏ chọn tất cả
                  </button>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Đã chọn: <strong style={{ color: '#0F766E' }}>{targetBranchIds.length}</strong> chi nhánh
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {branches
                    .filter((b) => b.id !== selectedBranchId)
                    .filter((b) => b.name.toLowerCase().includes(copySearch.toLowerCase().trim()))
                    .map((b) => {
                      const isChecked = targetBranchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isChecked ? '#F0FDFA' : '#F8FAFC',
                            border: `1px solid ${isChecked ? '#99F6E4' : '#E2E8F0'}`,
                            cursor: 'pointer',
                            fontSize: 13,
                            color: '#1E293B',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setTargetBranchIds((prev) =>
                                prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                              );
                            }}
                            style={{ width: 16, height: 16, accentColor: '#0F766E', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 500 }}>{b.name}</span>
                        </label>
                      );
                    })}
                </div>

                {copyFeedback && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      background: '#DCFCE7',
                      color: '#166534',
                      borderRadius: 6,
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Check size={16} />
                    <span>{copyFeedback}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  background: '#F8FAFC',
                }}
              >
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => setShowCopyModal(false)}
                  style={{ height: 32, fontSize: 12 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-primary"
                  onClick={handleConfirmCopy}
                  disabled={isCopying || targetBranchIds.length === 0}
                  style={{
                    height: 32,
                    fontSize: 12,
                    background: '#0F766E',
                    borderColor: '#0F766E',
                    opacity: isCopying || targetBranchIds.length === 0 ? 0.6 : 1,
                    cursor: isCopying || targetBranchIds.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isCopying ? 'Đang sao chép...' : `Sao chép (${targetBranchIds.length})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
