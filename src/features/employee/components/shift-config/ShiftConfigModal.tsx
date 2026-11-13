import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Info, X, ChevronDown, Check, AlertCircle } from 'lucide-react';
import {
  shiftConfigApi,
  type ShiftConfigDto,
  type CreateShiftConfigPayload,
  type UpdateShiftConfigPayload,
} from '../../api/shiftConfigApi';
import { employeeApi } from '../../api/employeeApi';
import type { Branch } from '../../types';
import { normalizeVietnameseComparison } from '../../lib/vietnamTime';
import '../../employee.css';

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  branchName?: string;
  branches?: Branch[];
  shiftToEdit?: ShiftConfigDto | null;
  existingShifts?: ShiftConfigDto[];
  onSaved?: () => void;
}

// Helper tính khoảng cách giờ (hỗ trợ ca qua đêm)
const calculateHoursText = (start: string, end: string): { hours: number; text: string } => {
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return { hours: 4, text: '4h' };
    let diff = eh * 60 + em - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    const h = Math.round((diff / 60) * 100) / 100;
    return { hours: h, text: `${h}h` };
  } catch {
    return { hours: 4, text: '4h' };
  }
};

// Helper format HH:mm:ss -> HH:mm
const formatTimeHHmm = (timeStr?: string | null, fallback = '00:00'): string => {
  if (!timeStr) return fallback;
  return timeStr.slice(0, 5);
};

export const ShiftConfigModal: React.FC<ShiftConfigModalProps> = ({
  isOpen,
  onClose,
  branchId,
  branches: passedBranches,
  shiftToEdit,
  existingShifts = [],
  onSaved,
}) => {
  const [allBranches, setAllBranches] = useState<Branch[]>(passedBranches || []);
  const [shiftCode, setShiftCode] = useState('');
  const [shiftName, setShiftName] = useState('Tối');
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('21:00');
  const [description, setDescription] = useState('');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Validation state (theo chuẩn pattern EmployeeFormModal: useMemo errors + touched + hasSubmitted)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Load branches nếu chưa có
  useEffect(() => {
    if (passedBranches && passedBranches.length > 0) {
      setAllBranches(passedBranches);
    } else {
      employeeApi.getBranches().then((list) => {
        setAllBranches(list || []);
      });
    }
  }, [passedBranches]);

  // Đóng dropdown chọn chi nhánh khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBranchDropdownOpen]);

  // Khi modal mở hoặc shiftToEdit thay đổi
  useEffect(() => {
    if (!isOpen) return;

    if (shiftToEdit) {
      setShiftCode(shiftToEdit.shiftCode || '');
      setShiftName(shiftToEdit.shiftName || '');
      setStartTime(formatTimeHHmm(shiftToEdit.startTime, '17:00'));
      setEndTime(formatTimeHHmm(shiftToEdit.endTime, '21:00'));
      setDescription(shiftToEdit.description || '');
      setIsActive(shiftToEdit.isActive ?? true);

      // Branch ids
      if (shiftToEdit.branchIds && shiftToEdit.branchIds.length > 0) {
        setSelectedBranchIds(shiftToEdit.branchIds);
      } else if (shiftToEdit.branchId) {
        setSelectedBranchIds([shiftToEdit.branchId]);
      } else {
        setSelectedBranchIds([]);
      }
    } else {
      // Create mode
      setShiftCode('');
      setShiftName('');
      setStartTime('17:00');
      setEndTime('21:00');
      setDescription('');
      setIsActive(true);
      if (branchId) {
        setSelectedBranchIds([branchId]);
      } else if (allBranches.length > 0) {
        setSelectedBranchIds([allBranches[0].id]);
      } else {
        setSelectedBranchIds([]);
      }
    }
    setErrorMessage(null);
    setTouched({});
    setHasSubmitted(false);
    setIsBranchDropdownOpen(false);
  }, [isOpen, shiftToEdit, branchId, allBranches.length]);

  // Tính số giờ làm việc
  const durationInfo = useMemo(() => {
    return calculateHoursText(startTime, endTime);
  }, [startTime, endTime]);

  // Toggle chi nhánh
  const handleToggleBranch = (bId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    );
    if (!touched.branches) markTouched('branches');
  };

  const handleRemoveBranch = (e: React.MouseEvent, bId: string) => {
    e.stopPropagation();
    setSelectedBranchIds((prev) => prev.filter((id) => id !== bId));
    if (!touched.branches) markTouched('branches');
  };

  const handleSelectAllBranches = () => {
    setSelectedBranchIds(allBranches.map((b) => b.id));
    if (!touched.branches) markTouched('branches');
  };

  const handleClearAllBranches = () => {
    setSelectedBranchIds([]);
    if (!touched.branches) markTouched('branches');
  };

  // Helper kiểm tra trùng ca theo chi nhánh áp dụng
  const isBranchOverlap = (s: ShiftConfigDto) => {
    if (selectedBranchIds.length === 0) return true;
    const sBranches = s.branchIds && s.branchIds.length > 0 ? s.branchIds : s.branchId ? [s.branchId] : [];
    if (sBranches.length === 0) return true;
    return sBranches.some((b) => selectedBranchIds.includes(b));
  };

  // Realtime Inline Errors (chuẩn hóa theo Prompt_Validate_Input_NhanVien.md)
  const shiftNameError = useMemo(() => {
    const trimmed = shiftName.trim();
    if (!trimmed) {
      return 'Tên ca làm việc không được để trống.';
    }
    if (trimmed.length > 100) {
      return 'Tên ca làm việc không được vượt quá 100 ký tự.';
    }
    const normalized = normalizeVietnameseComparison(trimmed);
    const isDuplicate = existingShifts.some((s) => {
      if (shiftToEdit && s.id === shiftToEdit.id) return false;
      if (!isBranchOverlap(s)) return false;
      return normalizeVietnameseComparison(s.shiftName) === normalized;
    });
    if (isDuplicate) {
      return `Tên ca '${trimmed}' đã tồn tại trong chi nhánh (không phân biệt dấu và chữ hoa/thường).`;
    }
    return null;
  }, [shiftName, existingShifts, shiftToEdit, selectedBranchIds]);

  const shiftCodeError = useMemo(() => {
    const trimmed = shiftCode.trim();
    if (!trimmed) return null; // Mã ca là tùy chọn khi tạo mới, để trống hệ thống tự sinh
    if (trimmed.length < 2 || trimmed.length > 30) {
      return 'Mã ca phải từ 2 đến 30 ký tự và chỉ gồm chữ cái không dấu, số, gạch ngang/dưới.';
    }
    if (!/^[A-Za-z0-9_-]{2,30}$/.test(trimmed)) {
      return 'Mã ca phải từ 2 đến 30 ký tự và chỉ gồm chữ cái không dấu, số, gạch ngang/dưới.';
    }
    const upper = trimmed.toUpperCase();
    const isDuplicateCode = existingShifts.some((s) => {
      if (shiftToEdit && s.id === shiftToEdit.id) return false;
      if (!isBranchOverlap(s)) return false;
      return (s.shiftCode || '').toUpperCase() === upper;
    });
    if (isDuplicateCode) {
      return `Mã ca '${upper}' đã tồn tại trong chi nhánh.`;
    }
    return null;
  }, [shiftCode, existingShifts, shiftToEdit, selectedBranchIds]);

  const timeError = useMemo(() => {
    if (!startTime || !endTime) {
      return 'Giờ bắt đầu và giờ kết thúc ca không được để trống.';
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      return 'Giờ làm việc phải có định dạng HH:mm hợp lệ (00:00 - 23:59).';
    }
    if (startTime === endTime) {
      return 'Giờ bắt đầu và giờ kết thúc ca không được trùng nhau (thời lượng ca phải lớn hơn 0).';
    }
    const hours = durationInfo.hours;
    if (hours < 0.5) {
      return 'Thời lượng ca làm việc tối thiểu phải từ 0.5 giờ (30 phút).';
    }
    if (hours > 24) {
      return 'Thời lượng ca làm việc phải lớn hơn 0 và không được vượt quá 24 giờ.';
    }
    return null;
  }, [startTime, endTime, durationInfo.hours]);

  const branchError = useMemo(() => {
    if (selectedBranchIds.length === 0) {
      return 'Vui lòng chọn ít nhất một chi nhánh áp dụng.';
    }
    return null;
  }, [selectedBranchIds]);

  const descriptionError = useMemo(() => {
    if (description && description.length > 255) {
      return 'Mô tả ca không được vượt quá 255 ký tự.';
    }
    return null;
  }, [description]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setErrorMessage(null);

    if (shiftNameError) {
      setErrorMessage(shiftNameError);
      return;
    }
    if (shiftCodeError) {
      setErrorMessage(shiftCodeError);
      return;
    }
    if (timeError) {
      setErrorMessage(timeError);
      return;
    }
    if (branchError) {
      setErrorMessage(branchError);
      return;
    }
    if (descriptionError) {
      setErrorMessage(descriptionError);
      return;
    }

    try {
      setSubmitting(true);
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const isNextDay = (eh * 60 + em) < (sh * 60 + sm);
      const normalizedCode = shiftCode.trim() ? shiftCode.trim().toUpperCase() : undefined;
      const normalizedDesc = description.trim() ? description.trim() : undefined;

      if (shiftToEdit) {
        const payload: UpdateShiftConfigPayload = {
          shiftCode: normalizedCode,
          shiftName: shiftName.trim(),
          startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
          endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
          durationHours: durationInfo.hours,
          isCheckInNextDay: isNextDay,
          branchIds: selectedBranchIds,
          branchId: selectedBranchIds[0],
          description: normalizedDesc,
          isActive,
        };
        await shiftConfigApi.updateShiftConfig(shiftToEdit.id, payload);
      } else {
        const payload: CreateShiftConfigPayload = {
          shiftCode: normalizedCode,
          shiftName: shiftName.trim(),
          startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
          endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
          durationHours: durationInfo.hours,
          isCheckInNextDay: isNextDay,
          branchIds: selectedBranchIds,
          branchId: selectedBranchIds[0],
          description: normalizedDesc,
          isActive,
        };
        await shiftConfigApi.createShiftConfig(payload);
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu ca làm việc:', err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu ca làm việc.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBranches = allBranches.filter((b) =>
    b.name.toLowerCase().includes(branchSearch.toLowerCase().trim())
  );

  if (!isOpen) return null;

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="emp-modal-card"
        style={{
          borderRadius: 16,
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 14px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
            {shiftToEdit ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              fontSize: 18,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflow: 'visible', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, justifyContent: 'space-between' }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'visible' }}>
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
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Hàng 1: Tên ca làm việc */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ paddingTop: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Tên ca làm việc <span style={{ color: '#EF4444' }}>*</span>
                </label>
              </div>
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="VD: Ca Sáng, Ca Chiều, Ca Tối..."
                    value={shiftName}
                    maxLength={100}
                    onChange={(e) => {
                      setShiftName(e.target.value);
                      if (!touched.shiftName) markTouched('shiftName');
                    }}
                    onBlur={() => markTouched('shiftName')}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 55px 0 12px',
                      borderRadius: 8,
                      border: `1px solid ${(touched.shiftName || hasSubmitted) && shiftNameError ? '#EF4444' : '#CBD5E1'}`,
                      boxShadow: (touched.shiftName || hasSubmitted) && shiftNameError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                      fontSize: 14,
                      color: '#1E293B',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 11,
                      color: shiftName.length >= 100 ? '#EF4444' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  >
                    {shiftName.length}/100
                  </span>
                </div>
                {(touched.shiftName || hasSubmitted) && shiftNameError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>•</span>
                    <span>{shiftNameError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hàng 2: Mã ca làm việc */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ paddingTop: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Mã ca
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>(tùy chọn)</span>
              </div>
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="VD: CA_SANG, CA_TOI... (để trống tự sinh CA001)"
                    value={shiftCode}
                    maxLength={30}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      setShiftCode(upper);
                      if (!touched.shiftCode) markTouched('shiftCode');
                    }}
                    onBlur={() => markTouched('shiftCode')}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 50px 0 12px',
                      borderRadius: 8,
                      border: `1px solid ${(touched.shiftCode || hasSubmitted) && shiftCodeError ? '#EF4444' : '#CBD5E1'}`,
                      boxShadow: (touched.shiftCode || hasSubmitted) && shiftCodeError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                      fontSize: 14,
                      color: '#1E293B',
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 11,
                      color: shiftCode.length >= 30 ? '#EF4444' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  >
                    {shiftCode.length}/30
                  </span>
                </div>
                {(touched.shiftCode || hasSubmitted) && shiftCodeError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>•</span>
                    <span>{shiftCodeError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hàng 3: Giờ làm việc ⓘ */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Giờ làm việc <span style={{ color: '#EF4444' }}>*</span>
                </span>
                <span title="Khung giờ nhân viên thực hiện ca làm việc (tối thiểu 0.5h, tối đa 24h)" style={{ cursor: 'pointer', display: 'flex' }}>
                  <Info size={15} color="#94A3B8" />
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Giờ bắt đầu */}
                  <div style={{ position: 'relative', width: 205 }}>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (!touched.startTime) markTouched('startTime');
                      }}
                      onBlur={() => markTouched('startTime')}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 6px 0 10px',
                        borderRadius: 8,
                        border: `1px solid ${(touched.startTime || touched.endTime || hasSubmitted) && timeError ? '#EF4444' : '#CBD5E1'}`,
                        boxShadow: (touched.startTime || touched.endTime || hasSubmitted) && timeError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1E293B',
                        background: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Đến</span>

                  {/* Giờ kết thúc */}
                  <div style={{ position: 'relative', width: 205 }}>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        if (!touched.endTime) markTouched('endTime');
                      }}
                      onBlur={() => markTouched('endTime')}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 6px 0 10px',
                        borderRadius: 8,
                        border: `1px solid ${(touched.startTime || touched.endTime || hasSubmitted) && timeError ? '#EF4444' : '#CBD5E1'}`,
                        boxShadow: (touched.startTime || touched.endTime || hasSubmitted) && timeError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1E293B',
                        background: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Thời lượng hiển thị (e.g. 4h) */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: durationInfo.hours < 0.5 || durationInfo.hours > 24 ? '#EF4444' : '#0F766E',
                      marginLeft: 6,
                    }}
                  >
                    {durationInfo.text}
                  </span>
                </div>
                {(touched.startTime || touched.endTime || hasSubmitted) && timeError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>•</span>
                    <span>{timeError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hàng 5: Phạm vi áp dụng (Multi-select Chips) */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', paddingTop: 6 }}>
                Phạm vi áp dụng <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <div ref={branchDropdownRef} style={{ position: 'relative', width: '100%' }}>
                {/* Khung chứa các tag chi nhánh */}
                <div
                  onClick={() => {
                    setIsBranchDropdownOpen((prev) => !prev);
                    if (!touched.branches) markTouched('branches');
                  }}
                  style={{
                    minHeight: 42,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: `1px solid ${(touched.branches || hasSubmitted) && branchError ? '#EF4444' : isBranchDropdownOpen ? 'var(--blue-primary, #0F766E)' : '#CBD5E1'}`,
                    boxShadow: (touched.branches || hasSubmitted) && branchError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : isBranchDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {selectedBranchIds.length === 0 ? (
                    <span style={{ color: '#94A3B8', fontSize: 13, padding: '4px 6px' }}>
                      Chọn chi nhánh áp dụng...
                    </span>
                  ) : (
                    selectedBranchIds.map((bId) => {
                      const branch = allBranches.find((b) => b.id === bId);
                      const name = branch ? branch.name : 'Chi nhánh';
                      return (
                        <span
                          key={bId}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'var(--blue-primary, #0F766E)',
                            color: '#FFFFFF',
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 8,
                          }}
                        >
                          <span>{name}</span>
                          <span
                            onClick={(e) => handleRemoveBranch(e, bId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                            title="Xóa chi nhánh"
                          >
                            ✕
                          </span>
                        </span>
                      );
                    })
                  )}

                  <div style={{ marginLeft: 'auto', paddingRight: 4, color: '#94A3B8' }}>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </div>
                {(touched.branches || hasSubmitted) && branchError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>•</span>
                    <span>{branchError}</span>
                  </div>
                )}

                {/* Dropdown Menu để chọn chi nhánh */}
                {isBranchDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.18), 0 -4px 10px -4px rgba(0, 0, 0, 0.1)',
                      zIndex: 2000,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Thanh tìm kiếm */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Tìm chi nhánh..."
                        value={branchSearch}
                        maxLength={50}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 45px 6px 10px',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          fontSize: 12,
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 18,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 10.5,
                          color: branchSearch.length >= 50 ? '#EF4444' : '#94A3B8',
                          pointerEvents: 'none',
                        }}
                      >
                        {branchSearch.length}/50
                      </span>
                    </div>

                    {/* Quick selection */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: '#F8FAFC',
                        borderBottom: '1px solid #F1F5F9',
                        fontSize: 12,
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--blue-primary, #0F766E)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Chọn tất cả ({allBranches.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllBranches}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>

                    {/* Danh sách */}
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {filteredBranches.map((b) => {
                        const isChecked = selectedBranchIds.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleToggleBranch(b.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              background: isChecked ? 'var(--blue-light, #F0FDFA)' : 'transparent',
                              fontSize: 13,
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }}
                                style={{ accentColor: 'var(--blue-primary, #0F766E)', width: 15, height: 15 }}
                              />
                              <span style={{ fontWeight: isChecked ? 600 : 400, color: '#1E293B' }}>
                                {b.name}
                              </span>
                            </label>
                            {isChecked && <Check size={14} color="var(--blue-primary, #0F766E)" />}
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        background: '#F8FAFC',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setIsBranchDropdownOpen(false)}
                        style={{
                          padding: '4px 12px',
                          fontSize: 12,
                          background: 'var(--blue-primary, #0F766E)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hàng 6: Mô tả ca (Ghi chú tùy chọn, tối đa 255 ký tự) */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ paddingTop: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Mô tả ca
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>(tùy chọn)</span>
              </div>
              <div>
                <div style={{ position: 'relative' }}>
                  <textarea
                    placeholder="Mô tả công việc hoặc ghi chú cho ca làm việc này..."
                    value={description}
                    maxLength={255}
                    rows={2}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (!touched.description) markTouched('description');
                    }}
                    onBlur={() => markTouched('description')}
                    style={{
                      width: '100%',
                      padding: '8px 50px 8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${(touched.description || hasSubmitted) && descriptionError ? '#EF4444' : '#CBD5E1'}`,
                      boxShadow: (touched.description || hasSubmitted) && descriptionError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                      fontSize: 13,
                      color: '#1E293B',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: 58,
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      bottom: 8,
                      fontSize: 11,
                      color: description.length >= 255 ? '#EF4444' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  >
                    {description.length}/255
                  </span>
                </div>
                {(touched.description || hasSubmitted) && descriptionError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>•</span>
                    <span>{descriptionError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: '#F8FAFC',
              borderRadius: '0 0 16px 16px',
            }}
          >
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '0 18px', height: 38 }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="emp-btn emp-btn-primary"
              disabled={submitting}
              style={{
                padding: '0 24px',
                height: 38,
                background: 'var(--blue-primary, #0F766E)',
                borderColor: 'var(--blue-primary, #0F766E)',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Đang lưu...' : shiftToEdit ? 'Lưu thay đổi' : 'Thêm ca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
