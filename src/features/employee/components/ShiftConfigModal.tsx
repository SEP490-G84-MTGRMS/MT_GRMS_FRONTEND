import React, { useState, useEffect, useRef } from 'react';
import { Info, X, ChevronDown, Check, AlertCircle } from 'lucide-react';
import {
  shiftConfigApi,
  type ShiftConfigDto,
  type CreateShiftConfigPayload,
  type UpdateShiftConfigPayload,
} from '../api/shiftConfigApi';
import { employeeApi } from '../api/employeeApi';
import type { Branch } from '../types';
import '../employee.css';

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  branchName?: string;
  branches?: Branch[];
  shiftToEdit?: ShiftConfigDto | null;
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
  onSaved,
}) => {
  const [allBranches, setAllBranches] = useState<Branch[]>(passedBranches || []);
  const [shiftName, setShiftName] = useState('Tối');
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('21:00');
  const [checkInStart, setCheckInStart] = useState('14:00');
  const [checkInEnd, setCheckInEnd] = useState('00:00');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

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
      setShiftName(shiftToEdit.shiftName || '');
      setStartTime(formatTimeHHmm(shiftToEdit.startTime, '17:00'));
      setEndTime(formatTimeHHmm(shiftToEdit.endTime, '21:00'));
      setCheckInStart(formatTimeHHmm(shiftToEdit.allowedCheckInStart, '14:00'));
      setCheckInEnd(formatTimeHHmm(shiftToEdit.allowedCheckInEnd, '00:00'));
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
      setShiftName('');
      setStartTime('17:00');
      setEndTime('21:00');
      setCheckInStart('14:00');
      setCheckInEnd('00:00');
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
    setIsBranchDropdownOpen(false);
  }, [isOpen, shiftToEdit, branchId, allBranches.length]);

  if (!isOpen) return null;

  // Tính số giờ làm việc
  const durationInfo = calculateHoursText(startTime, endTime);

  // Kiểm tra check-in có kéo dài sang ngày "hôm sau" hay không
  const isNextDayCheckIn = (): boolean => {
    try {
      const [sh, sm] = checkInStart.split(':').map(Number);
      const [eh, em] = checkInEnd.split(':').map(Number);
      const [wsh] = startTime.split(':').map(Number);
      // Kết thúc lúc 00:00 hoặc trước giờ check-in bắt đầu, hoặc qua đêm
      if (eh * 60 + em <= sh * 60 + sm) return true;
      if (eh * 60 + em < wsh * 60) return true;
      return false;
    } catch {
      return false;
    }
  };

  // Toggle chi nhánh
  const handleToggleBranch = (bId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    );
  };

  const handleRemoveBranch = (e: React.MouseEvent, bId: string) => {
    e.stopPropagation();
    setSelectedBranchIds((prev) => prev.filter((id) => id !== bId));
  };

  const handleSelectAllBranches = () => {
    setSelectedBranchIds(allBranches.map((b) => b.id));
  };

  const handleClearAllBranches = () => {
    setSelectedBranchIds([]);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!shiftName.trim()) {
      setErrorMessage('Vui lòng nhập tên ca làm việc.');
      return;
    }

    if (shiftName.trim().length > 100) {
      setErrorMessage('Tên ca làm việc không được vượt quá 100 ký tự.');
      return;
    }

    if (selectedBranchIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một chi nhánh trong phạm vi áp dụng.');
      return;
    }

    if (startTime === endTime || durationInfo.hours <= 0 || durationInfo.hours < 0.5) {
      setErrorMessage('Giờ bắt đầu và giờ kết thúc không hợp lệ (thời lượng ca phải từ 0.5 đến 24 giờ).');
      return;
    }

    try {
      setSubmitting(true);
      const isNextDay = isNextDayCheckIn();

      if (shiftToEdit) {
        const payload: UpdateShiftConfigPayload = {
          shiftName: shiftName.trim(),
          startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
          endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
          durationHours: durationInfo.hours,
          allowedCheckInStart: checkInStart.length === 5 ? `${checkInStart}:00` : checkInStart,
          allowedCheckInEnd: checkInEnd.length === 5 ? `${checkInEnd}:00` : checkInEnd,
          isCheckInNextDay: isNextDay,
          branchIds: selectedBranchIds,
          branchId: selectedBranchIds[0],
          isActive,
        };
        await shiftConfigApi.updateShiftConfig(shiftToEdit.id, payload);
      } else {
        const payload: CreateShiftConfigPayload = {
          shiftName: shiftName.trim(),
          startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
          endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
          durationHours: durationInfo.hours,
          allowedCheckInStart: checkInStart.length === 5 ? `${checkInStart}:00` : checkInStart,
          allowedCheckInEnd: checkInEnd.length === 5 ? `${checkInEnd}:00` : checkInEnd,
          isCheckInNextDay: isNextDay,
          branchIds: selectedBranchIds,
          branchId: selectedBranchIds[0],
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

            {/* Hàng 1: Tên */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Tên
              </label>
              <div>
                <input
                  type="text"
                  placeholder="VD: Tối, Sáng, Chiều..."
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    color: '#1E293B',
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Hàng 2: Giờ làm việc ⓘ */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Giờ làm việc
                </span>
                <span title="Khung giờ nhân viên thực hiện ca làm việc" style={{ cursor: 'pointer', display: 'flex' }}>
                  <Info size={15} color="#94A3B8" />
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Giờ bắt đầu */}
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                </div>

                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Đến</span>

                {/* Giờ kết thúc */}
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
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
                    color: '#334155',
                    marginLeft: 6,
                  }}
                >
                  {durationInfo.text}
                </span>
              </div>
            </div>

            {/* Hàng 3: Giờ cho phép chấm công ⓘ */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Giờ cho phép chấm công
                </span>
                <span title="Khoảng thời gian cho phép nhân viên điểm danh vào ca" style={{ cursor: 'pointer', display: 'flex' }}>
                  <Info size={15} color="#94A3B8" />
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Check-in start */}
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    type="time"
                    value={checkInStart}
                    onChange={(e) => setCheckInStart(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                </div>

                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Đến</span>

                {/* Check-in end */}
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    type="time"
                    value={checkInEnd}
                    onChange={(e) => setCheckInEnd(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Chữ 'hôm sau' khi kết thúc qua ngày hôm sau */}
                {isNextDayCheckIn() && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#475569',
                      marginLeft: 6,
                    }}
                  >
                    hôm sau
                  </span>
                )}
              </div>
            </div>

            {/* Hàng 4: Phạm vi áp dụng (Multi-select Chips) */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', paddingTop: 6 }}>
                Phạm vi áp dụng
              </label>

              <div ref={branchDropdownRef} style={{ position: 'relative', width: '100%' }}>
                {/* Khung chứa các tag chi nhánh */}
                <div
                  onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                  style={{
                    minHeight: 42,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: `1px solid ${isBranchDropdownOpen ? 'var(--blue-primary, #0F766E)' : '#CBD5E1'}`,
                    boxShadow: isBranchDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none',
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
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                      <input
                        type="text"
                        placeholder="Tìm chi nhánh..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          fontSize: 12,
                          outline: 'none',
                        }}
                        autoFocus
                      />
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
                                onChange={() => {}}
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
