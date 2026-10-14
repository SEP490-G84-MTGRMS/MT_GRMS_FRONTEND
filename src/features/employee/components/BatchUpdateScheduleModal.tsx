import React, { useState, useMemo } from 'react';
import { Calendar, Users, Clock, Check, AlertCircle } from 'lucide-react';
import type { Employee, WorkShiftDefinition, Branch, ScheduleAssignment } from '../types';

interface BatchUpdateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shifts: WorkShiftDefinition[];
  branches: Branch[];
  onSaveBatch: (assignments: ScheduleAssignment[], replaceExisting: boolean) => void;
}

type DayKey = 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';

const DAYS_LIST: Array<{ key: DayKey; label: string; dateStr: string }> = [
  { key: 'T2', label: 'Thứ hai', dateStr: '14/10' },
  { key: 'T3', label: 'Thứ ba', dateStr: '15/10' },
  { key: 'T4', label: 'Thứ tư', dateStr: '16/10' },
  { key: 'T5', label: 'Thứ năm', dateStr: '17/10' },
  { key: 'T6', label: 'Thứ sáu', dateStr: '18/10' },
  { key: 'T7', label: 'Thứ bảy', dateStr: '19/10' },
  { key: 'CN', label: 'Chủ nhật', dateStr: '20/10' },
];

export const BatchUpdateScheduleModal: React.FC<BatchUpdateScheduleModalProps> = ({
  isOpen,
  onClose,
  employees,
  shifts,
  branches,
  onSaveBatch,
}) => {
  // 1. Danh sách nhân viên được chọn để cập nhật hàng loạt
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  // 2. Chế độ cập nhật: 'template' (áp dụng 1 ca cho nhiều ngày) | 'matrix' (chỉnh từng ngày)
  const [mode, setMode] = useState<'template' | 'matrix'>('template');

  // State cho Mode Template:
  const [targetDays, setTargetDays] = useState<DayKey[]>(['T2', 'T3', 'T4', 'T5', 'T6']);
  const [templateShiftId, setTemplateShiftId] = useState<string>(shifts[0]?.id || '');
  const [templateBranchId, setTemplateBranchId] = useState<string>(branches[0]?.id || '');

  // State cho Mode Matrix: cấu hình từng ngày { T2: { shiftId, branchId } }
  const [matrixConfig, setMatrixConfig] = useState<Record<DayKey, { shiftId: string; branchId: string; enabled: boolean }>>({
    T2: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: true },
    T3: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: true },
    T4: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: true },
    T5: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: true },
    T6: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: true },
    T7: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: false },
    CN: { shiftId: shifts[0]?.id || '', branchId: branches[0]?.id || '', enabled: false },
  });

  // Tùy chọn: Ghi đè lịch cũ hay thêm bổ sung
  const [replaceExisting, setReplaceExisting] = useState(true);

  // Lọc nhân viên theo từ khóa tìm kiếm
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(empSearch.toLowerCase())
    );
  }, [employees, empSearch]);

  const handleSelectAllEmployees = () => {
    if (selectedEmpIds.length === filteredEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleToggleEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleTargetDay = (day: DayKey) => {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 nhân viên để cập nhật lịch!');
      return;
    }

    const generatedAssignments: ScheduleAssignment[] = [];
    const timestamp = Date.now();

    selectedEmpIds.forEach((empId, empIdx) => {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return;

      if (mode === 'template') {
        const sh = shifts.find((s) => s.id === templateShiftId);
        const br = branches.find((b) => b.id === templateBranchId);

        targetDays.forEach((dayKey, dIdx) => {
          generatedAssignments.push({
            id: `batch-${timestamp}-${empIdx}-${dIdx}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeCode: emp.employeeCode,
            shiftId: sh?.id || 's1',
            shiftName: sh?.name || 'Ca sáng',
            shiftTime: sh ? `${sh.startTime} - ${sh.endTime}` : '06:00 - 14:15',
            shiftColor: sh?.color || '#3B82F6',
            dayOfWeek: dayKey,
            dateStr: DAYS_LIST.find((d) => d.key === dayKey)?.dateStr || '',
            branchName: br?.name || 'Chi nhánh trung tâm',
          });
        });
      } else {
        // Mode matrix
        DAYS_LIST.forEach((d, dIdx) => {
          const cfg = matrixConfig[d.key];
          if (cfg && cfg.enabled && cfg.shiftId) {
            const sh = shifts.find((s) => s.id === cfg.shiftId);
            const br = branches.find((b) => b.id === cfg.branchId);

            generatedAssignments.push({
              id: `batch-${timestamp}-${empIdx}-${dIdx}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeCode: emp.employeeCode,
              shiftId: sh?.id || 's1',
              shiftName: sh?.name || 'Ca làm việc',
              shiftTime: sh ? `${sh.startTime} - ${sh.endTime}` : '06:00 - 14:15',
              shiftColor: sh?.color || '#3B82F6',
              dayOfWeek: d.key,
              dateStr: d.dateStr,
              branchName: br?.name || 'Chi nhánh trung tâm',
            });
          }
        });
      }
    });

    onSaveBatch(generatedAssignments, replaceExisting);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 840 }}>
        {/* Header */}
        <div className="emp-modal-header" style={{ background: '#F8FAFC' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} color="#0F766E" />
              <span>Cập nhật lịch làm việc hàng loạt</span>
            </h3>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Áp dụng phân ca nhanh cho nhiều nhân viên hoặc toàn bộ tuần làm việc
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ─── PHẦN 1: CHỌN NHÂN VIÊN ÁP DỤNG ─── */}
            <div className="emp-section-card" style={{ margin: 0, padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={16} color="#0F766E" />
                  <span>1. Chọn nhân viên áp dụng</span>
                  <span
                    style={{
                      background: '#CCFBF1',
                      color: '#0F766E',
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontWeight: 700,
                    }}
                  >
                    Đã chọn: {selectedEmpIds.length} / {employees.length}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã NV..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      width: 170,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSelectAllEmployees}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0F766E',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {selectedEmpIds.length === filteredEmployees.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
              </div>

              {/* Grid danh sách nhân viên cuộn gọn */}
              <div
                style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: 8,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: 8,
                  background: '#FFFFFF',
                }}
              >
                {filteredEmployees.map((emp) => {
                  const isChecked = selectedEmpIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleToggleEmp(emp.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: `1px solid ${isChecked ? '#0F766E' : '#E2E8F0'}`,
                        background: isChecked ? '#F0FDFA' : '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: '#0F766E' }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.fullName}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B' }}>{emp.employeeCode}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── PHẦN 2: CHỌN HÌNH THỨC PHÂN CA ─── */}
            <div className="emp-section-card" style={{ margin: 0, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color="#0F766E" />
                  <span>2. Thiết lập ca làm việc</span>
                </div>

                {/* Tab switch giữa Template & Matrix */}
                <div style={{ display: 'flex', background: '#F1F5F9', padding: 2, borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => setMode('template')}
                    style={{
                      border: 'none',
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: mode === 'template' ? '#FFFFFF' : 'transparent',
                      color: mode === 'template' ? '#0F766E' : '#64748B',
                      boxShadow: mode === 'template' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Áp dụng cùng ca cho các ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('matrix')}
                    style={{
                      border: 'none',
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: mode === 'matrix' ? '#FFFFFF' : 'transparent',
                      color: mode === 'matrix' ? '#0F766E' : '#64748B',
                      boxShadow: mode === 'matrix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Cấu hình chi tiết từng ngày
                  </button>
                </div>
              </div>

              {/* GIAO DIỆN CHẾ ĐỘ 1: TEMPLATE (CÙNG CA NHIỀU NGÀY) */}
              {mode === 'template' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Chọn các ngày áp dụng */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>
                      Chọn các ngày làm việc trong tuần:
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DAYS_LIST.map((d) => {
                        const isSelected = targetDays.includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => handleToggleTargetDay(d.key)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              border: `1px solid ${isSelected ? '#0F766E' : '#CBD5E1'}`,
                              background: isSelected ? '#0F766E' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#334155',
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && <Check size={14} />}
                            <span>{d.label} ({d.dateStr})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ca làm việc và Chi nhánh */}
                  <div className="emp-grid-2">
                    <div className="emp-form-group" style={{ margin: 0 }}>
                      <label className="emp-form-label">Chọn ca làm việc áp dụng</label>
                      <select
                        className="emp-form-select"
                        value={templateShiftId}
                        onChange={(e) => setTemplateShiftId(e.target.value)}
                      >
                        {shifts.map((sh) => (
                          <option key={sh.id} value={sh.id}>
                            {sh.name} {sh.id === 'custom' ? '(Linh hoạt)' : `(${sh.startTime} - ${sh.endTime})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="emp-form-group" style={{ margin: 0 }}>
                      <label className="emp-form-label">Chi nhánh làm việc</label>
                      <select
                        className="emp-form-select"
                        value={templateBranchId}
                        onChange={(e) => setTemplateBranchId(e.target.value)}
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* GIAO DIỆN CHẾ ĐỘ 2: MATRIX (CẤU HÌNH TỪNG NGÀY) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                    Tích chọn ngày làm việc và chọn ca tương ứng cho từng ngày:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {DAYS_LIST.map((d) => {
                      const cfg = matrixConfig[d.key];
                      return (
                        <div
                          key={d.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 12px',
                            background: cfg.enabled ? '#F0FDFA' : '#F8FAFC',
                            border: `1px solid ${cfg.enabled ? '#99F6E4' : '#E2E8F0'}`,
                            borderRadius: 8,
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 150 }}>
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={(e) =>
                                setMatrixConfig({
                                  ...matrixConfig,
                                  [d.key]: { ...cfg, enabled: e.target.checked },
                                })
                              }
                              style={{ accentColor: '#0F766E' }}
                            />
                            <span style={{ fontWeight: 700, fontSize: 13, color: cfg.enabled ? '#0F766E' : '#94A3B8' }}>
                              {d.label} ({d.dateStr})
                            </span>
                          </label>

                          <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                            <select
                              disabled={!cfg.enabled}
                              className="emp-form-select"
                              style={{ height: 32, fontSize: 12, flex: 1, opacity: cfg.enabled ? 1 : 0.5 }}
                              value={cfg.shiftId}
                              onChange={(e) =>
                                setMatrixConfig({
                                  ...matrixConfig,
                                  [d.key]: { ...cfg, shiftId: e.target.value },
                                })
                              }
                            >
                              {shifts.map((sh) => (
                                <option key={sh.id} value={sh.id}>
                                  {sh.name} {sh.id === 'custom' ? '(Linh hoạt)' : `(${sh.startTime} - ${sh.endTime})`}
                                </option>
                              ))}
                            </select>

                            <select
                              disabled={!cfg.enabled}
                              className="emp-form-select"
                              style={{ height: 32, fontSize: 12, width: 220, opacity: cfg.enabled ? 1 : 0.5 }}
                              value={cfg.branchId}
                              onChange={(e) =>
                                setMatrixConfig({
                                  ...matrixConfig,
                                  [d.key]: { ...cfg, branchId: e.target.value },
                                })
                              }
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─── PHẦN 3: TÙY CHỌN GHI ĐÈ ─── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 8,
              }}
            >
              <AlertCircle size={18} color="#D97706" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#92400E' }}>
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  style={{ accentColor: '#D97706' }}
                />
                <span style={{ fontWeight: 600 }}>
                  Ghi đè (thay thế) các ca làm việc cũ của nhân viên đã chọn trong tuần này
                </span>
              </label>
            </div>
          </div>

          {/* Footer cố định */}
          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="emp-btn emp-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 140 }}
            >
              <Check size={16} />
              <span>Cập nhật ({selectedEmpIds.length} NV)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
