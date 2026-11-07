import React, { useState, useEffect, useCallback } from 'react';
import { X, Info, Plus, Trash2, Settings, Building2, Copy, Check, RotateCw, AlertTriangle } from 'lucide-react';
import type { Branch } from '../types';
import {
  attendancePolicyApi,
  type WorkHourConversionRule,
  type UpsertAttendancePolicyPayload,
} from '../api/attendancePolicyApi';

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

  // 3. Cài đặt làm thêm giờ
  enableOtBeforeShift: boolean;
  otBeforeShiftMinutes: number;
  enableOtAfterShift: boolean;
  otAfterShiftMinutes: number;
}

export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  standardDayHours: 8,
  isConvertHoursToDays: true,
  conversionRules: [
    {
      id: 'rule-1',
      type: 'range',
      fromHours: 1,
      fromMinutes: 0,
      toHours: 4,
      toMinutes: 30,
      workUnits: 0.5,
      workUnitsLabel: 'nửa công',
    },
    {
      id: 'rule-2',
      type: 'gte',
      fromHours: 4,
      fromMinutes: 30,
      workUnits: 1,
      workUnitsLabel: '1 công',
    },
  ],
  enableLateThreshold: true,
  lateThresholdMinutes: 0,
  enableEarlyLeaveThreshold: true,
  earlyLeaveThresholdMinutes: 0,
  enableOtBeforeShift: true,
  otBeforeShiftMinutes: 0,
  enableOtAfterShift: true,
  otAfterShiftMinutes: 0,
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
  const [currentConfig, setCurrentConfig] = useState<AttendanceConfig>(DEFAULT_ATTENDANCE_CONFIG);
  const [rules, setRules] = useState<WorkHourConversionRule[]>(DEFAULT_ATTENDANCE_CONFIG.conversionRules);
  const [isCustomized, setIsCustomized] = useState<boolean>(false);

  // Trạng thái async
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal sao chép sang chi nhánh khác
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [targetBranchIds, setTargetBranchIds] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Tải cấu hình chính sách từ Backend
  const fetchBranchPolicy = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const dto = await attendancePolicyApi.getByBranch(branchId);

      let parsedRules: WorkHourConversionRule[] = DEFAULT_ATTENDANCE_CONFIG.conversionRules;
      if (dto.conversionRulesJson) {
        try {
          const parsed = JSON.parse(dto.conversionRulesJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedRules = parsed;
          }
        } catch (e) {
          console.warn('Lỗi parse conversionRulesJson:', e);
        }
      }

      setCurrentConfig({
        standardDayHours: dto.standardDayHours ?? 8,
        isConvertHoursToDays: dto.isConvertHoursToDays ?? true,
        conversionRules: parsedRules,
        enableLateThreshold: dto.enableLateThreshold ?? true,
        lateThresholdMinutes: dto.lateThresholdMinutes ?? 0,
        enableEarlyLeaveThreshold: dto.enableEarlyLeaveThreshold ?? true,
        earlyLeaveThresholdMinutes: dto.earlyLeaveThresholdMinutes ?? 0,
        enableOtBeforeShift: dto.enableOtBeforeShift ?? true,
        otBeforeShiftMinutes: dto.otBeforeShiftMinutes ?? 0,
        enableOtAfterShift: dto.enableOtAfterShift ?? true,
        otAfterShiftMinutes: dto.otAfterShiftMinutes ?? 0,
      });
      setRules(parsedRules);
      setIsCustomized(Boolean(dto.isCustomized));
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
      fetchBranchPolicy(defaultBranchId);
    }
  }, [isOpen, initialBranchId, branches, fetchBranchPolicy]);

  if (!isOpen) return null;

  // Xử lý chuyển đổi chi nhánh
  const handleSwitchBranch = (nextBranchId: string) => {
    setSelectedBranchId(nextBranchId);
    fetchBranchPolicy(nextBranchId);
  };

  const handleAddRule = () => {
    const newRule: WorkHourConversionRule = {
      id: `rule-${Date.now()}`,
      type: 'gte',
      fromHours: 8,
      fromMinutes: 0,
      workUnits: 1.5,
      workUnitsLabel: '1.5 công',
    };
    setRules((prev) => [...prev, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<WorkHourConversionRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  // Mở modal sao chép
  const handleOpenCopyModal = () => {
    // Mặc định chọn tất cả chi nhánh khác chi nhánh hiện tại
    const otherBranchIds = branches.filter((b) => b.id !== selectedBranchId).map((b) => b.id);
    setTargetBranchIds(otherBranchIds);
    setCopyFeedback(null);
    setShowCopyModal(true);
  };

  // Xác nhận sao chép sang các chi nhánh được chọn
  const handleConfirmCopy = async () => {
    if (!selectedBranchId || targetBranchIds.length === 0) return;

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
        enableOtBeforeShift: currentConfig.enableOtBeforeShift,
        otBeforeShiftMinutes: currentConfig.otBeforeShiftMinutes,
        enableOtAfterShift: currentConfig.enableOtAfterShift,
        otAfterShiftMinutes: currentConfig.otAfterShiftMinutes,
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
    if (!selectedBranchId) return;

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
        enableOtBeforeShift: currentConfig.enableOtBeforeShift,
        otBeforeShiftMinutes: currentConfig.otBeforeShiftMinutes,
        enableOtAfterShift: currentConfig.enableOtAfterShift,
        otAfterShiftMinutes: currentConfig.otAfterShiftMinutes,
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
            {isCustomized ? (
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
            )}
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
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
                Thiết lập các mức giờ làm tương ứng với số công của loại lương Theo ngày công chuẩn tại{' '}
                <strong style={{ color: '#0F766E' }}>{currentBranchName}</strong>.
              </div>

              {/* Dòng 1: Số giờ của 1 ngày công chuẩn */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13.5,
                  color: '#334155',
                  marginBottom: 16,
                }}
              >
                <span>Số giờ của 1 ngày công chuẩn là</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  step={0.5}
                  value={currentConfig.standardDayHours}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      standardDayHours: Number(e.target.value) || 8,
                    }))
                  }
                  style={{
                    width: 70,
                    height: 34,
                    textAlign: 'center',
                    border: '1px solid #CBD5E1',
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
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        isConvertHoursToDays: e.target.checked,
                      }))
                    }
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
                  {rules.map((rule) => (
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
                      <span>Từ</span>
                      <input
                        type="number"
                        min={0}
                        max={24}
                        value={rule.fromHours}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { fromHours: Number(e.target.value) || 0 })
                        }
                        style={{
                          width: 55,
                          height: 32,
                          textAlign: 'center',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          fontSize: 13,
                          outline: 'none',
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
                            onChange={(e) =>
                              handleUpdateRule(rule.id, {
                                fromMinutes: Number(e.target.value) || 0,
                              })
                            }
                            style={{
                              width: 55,
                              height: 32,
                              textAlign: 'center',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              fontSize: 13,
                              outline: 'none',
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
                            onChange={(e) =>
                              handleUpdateRule(rule.id, { toHours: Number(e.target.value) || 0 })
                            }
                            style={{
                              width: 55,
                              height: 32,
                              textAlign: 'center',
                              border: '1px solid #CBD5E1',
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
                            onChange={(e) =>
                              handleUpdateRule(rule.id, { toMinutes: Number(e.target.value) || 0 })
                            }
                            style={{
                              width: 55,
                              height: 32,
                              textAlign: 'center',
                              border: '1px solid #CBD5E1',
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
                      <span style={{ fontWeight: 600, color: '#0F172A', minWidth: 100 }}>
                        ghi nhận {rule.workUnitsLabel}
                      </span>

                      {rules.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rule.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Xóa mức quy đổi"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}

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
                </div>
              )}
            </div>

            {/* ─── SECTION 2: CÀI ĐẶT ĐI MUỘN - VỀ SỚM ─── */}
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 22 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                Cài đặt đi muộn - về sớm
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
                Cài đặt thời gian tối đa được đi muộn hoặc về sớm tại {currentBranchName}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Tính đi muộn sau */}
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
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          enableLateThreshold: e.target.checked,
                        }))
                      }
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
                    max={120}
                    value={currentConfig.lateThresholdMinutes}
                    disabled={!currentConfig.enableLateThreshold}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        lateThresholdMinutes: Number(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: 70,
                      height: 32,
                      textAlign: 'center',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: currentConfig.enableLateThreshold ? '#FFFFFF' : '#F1F5F9',
                    }}
                  />
                  <span style={{ color: '#334155' }}>phút</span>
                  <span
                    title="Số phút trễ tối đa cho phép trước khi bắt đầu ghi nhận vi phạm đi muộn."
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

                {/* Tính về sớm trước */}
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
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          enableEarlyLeaveThreshold: e.target.checked,
                        }))
                      }
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
                    max={120}
                    value={currentConfig.earlyLeaveThresholdMinutes}
                    disabled={!currentConfig.enableEarlyLeaveThreshold}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        earlyLeaveThresholdMinutes: Number(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: 70,
                      height: 32,
                      textAlign: 'center',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: currentConfig.enableEarlyLeaveThreshold ? '#FFFFFF' : '#F1F5F9',
                    }}
                  />
                  <span style={{ color: '#334155' }}>phút</span>
                  <span
                    title="Số phút về sớm tối đa cho phép trước giờ tan ca mà không bị tính về sớm."
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
              </div>
            </div>

            {/* ─── SECTION 3: CÀI ĐẶT LÀM THÊM GIỜ ─── */}
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                Cài đặt làm thêm giờ
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
                Tính làm thêm giờ cho nhân viên khi vào ca sớm hoặc tan ca muộn tại {currentBranchName}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Tính làm thêm giờ trước ca */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 180,
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={currentConfig.enableOtBeforeShift}
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          enableOtBeforeShift: e.target.checked,
                        }))
                      }
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: 'var(--blue-primary, #0F766E)',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Tính làm thêm giờ trước ca</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={currentConfig.otBeforeShiftMinutes}
                    disabled={!currentConfig.enableOtBeforeShift}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        otBeforeShiftMinutes: Number(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: 70,
                      height: 32,
                      textAlign: 'center',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: currentConfig.enableOtBeforeShift ? '#FFFFFF' : '#F1F5F9',
                    }}
                  />
                  <span style={{ color: '#334155' }}>phút</span>
                  <span
                    title="Chỉ bắt đầu tính làm thêm giờ (OT) trước ca nếu nhân viên check-in sớm hơn ngưỡng này."
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

                {/* Tính làm thêm giờ sau ca */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 180,
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={currentConfig.enableOtAfterShift}
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          enableOtAfterShift: e.target.checked,
                        }))
                      }
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: 'var(--blue-primary, #0F766E)',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Tính làm thêm giờ sau ca</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={currentConfig.otAfterShiftMinutes}
                    disabled={!currentConfig.enableOtAfterShift}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        otAfterShiftMinutes: Number(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: 70,
                      height: 32,
                      textAlign: 'center',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: currentConfig.enableOtAfterShift ? '#FFFFFF' : '#F1F5F9',
                    }}
                  />
                  <span style={{ color: '#334155' }}>phút</span>
                  <span
                    title="Chỉ bắt đầu tính làm thêm giờ (OT) sau ca nếu nhân viên check-out muộn hơn ngưỡng này."
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

              <div style={{ padding: '16px 20px', maxHeight: 300, overflowY: 'auto' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
                  Sao chép toàn bộ thông số chấm công của <strong>"{currentBranchName}"</strong> sang các chi nhánh được chọn:
                </p>

                <div style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const allOther = branches.filter((b) => b.id !== selectedBranchId).map((b) => b.id);
                      setTargetBranchIds(targetBranchIds.length === allOther.length ? [] : allOther);
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
                    {targetBranchIds.length === branches.filter((b) => b.id !== selectedBranchId).length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả chi nhánh'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {branches
                    .filter((b) => b.id !== selectedBranchId)
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
