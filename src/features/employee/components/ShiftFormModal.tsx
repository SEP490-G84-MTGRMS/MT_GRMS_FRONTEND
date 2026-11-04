import React, { useState, useEffect } from 'react';
import type { WorkShiftDefinition } from '../types';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift?: WorkShiftDefinition | null;
  onSave: (shift: WorkShiftDefinition) => void;
}

const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  isOpen,
  onClose,
  shift,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('12:30');
  const [breakTime, setBreakTime] = useState('Không');
  const [checkInAllowance, setCheckInAllowance] = useState('Trước 30p - Sau 15p');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (shift) {
      setName(shift.name);
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
      setBreakTime(shift.breakTime || 'Không');
      setCheckInAllowance(shift.checkInAllowance);
      setColor(shift.color);
      setStatus(shift.status);
    } else {
      setName('');
      setStartTime('07:00');
      setEndTime('12:30');
      setBreakTime('Không');
      setCheckInAllowance('Trước 30p - Sau 15p');
      setColor(PRESET_COLORS[0]);
      setStatus('active');
    }
  }, [shift, isOpen]);

  if (!isOpen) return null;

  const calculateHours = () => {
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let diffMinutes = endH * 60 + endM - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // qua đêm
      return Math.round((diffMinutes / 60) * 10) / 10;
    } catch {
      return 5.5;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên ca làm việc!');
      return;
    }

    const savedShift: WorkShiftDefinition = {
      id: shift?.id || `s_${Date.now()}`,
      name: name.trim(),
      startTime,
      endTime,
      totalHours: calculateHours(),
      breakTime,
      checkInAllowance,
      color,
      status,
    };

    onSave(savedShift);
    onClose();
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 560 }}>
        <div className="emp-modal-header">
          <h3>{shift ? `Cập nhật ca: ${shift.name}` : 'Tạo mới ca làm việc'}</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            <div className="emp-form-group">
              <label className="emp-form-label">
                Tên ca làm việc <span className="required">*</span>
              </label>
              <input
                type="text"
                className="emp-form-input"
                placeholder="VD: Ca sáng, Ca chiều, Ca đêm..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="emp-grid-2">
              <div className="emp-form-group">
                <label className="emp-form-label">
                  Giờ bắt đầu <span className="required">*</span>
                </label>
                <input
                  type="time"
                  className="emp-form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">
                  Giờ kết thúc <span className="required">*</span>
                </label>
                <input
                  type="time"
                  className="emp-form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div
              style={{
                background: '#F0FDFA',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                color: '#0F766E',
                marginBottom: 16,
                fontWeight: 600,
              }}
            >
              ⏱️ Tổng thời lượng ca tính toán: {calculateHours()} giờ
            </div>

            <div className="emp-grid-2">
              <div className="emp-form-group">
                <label className="emp-form-label">Nghỉ giữa ca</label>
                <input
                  type="text"
                  className="emp-form-input"
                  placeholder="VD: 30 phút, 1 tiếng..."
                  value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value)}
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Giới hạn chấm công</label>
                <input
                  type="text"
                  className="emp-form-input"
                  value={checkInAllowance}
                  onChange={(e) => setCheckInAllowance(e.target.value)}
                />
              </div>
            </div>

            {/* Màu nhận diện */}
            <div className="emp-form-group">
              <label className="emp-form-label">Màu nhận diện ca</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      background: c,
                      border: color === c ? '3px solid #0F766E' : '2px solid transparent',
                      cursor: 'pointer',
                      transform: color === c ? 'scale(1.15)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Trạng thái */}
            <div className="emp-form-group">
              <label className="emp-form-label">Trạng thái ca</label>
              <select
                className="emp-form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Đang sử dụng</option>
                <option value="inactive">Ngừng sử dụng</option>
              </select>
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary">
              Lưu ca làm việc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
