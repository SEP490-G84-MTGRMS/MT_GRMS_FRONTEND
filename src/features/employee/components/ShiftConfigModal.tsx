import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  shiftConfigApi,
  type ShiftConfigDto,
  type CreateShiftConfigPayload,
  type UpdateShiftConfigPayload,
} from '../api/shiftConfigApi';

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName?: string;
}

export const ShiftConfigModal: React.FC<ShiftConfigModalProps> = ({
  isOpen,
  onClose,
  branchId,
  branchName,
}) => {
  const [shifts, setShifts] = useState<ShiftConfigDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form mode: null | 'create' | 'edit'
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Form states
  const [shiftCode, setShiftCode] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [durationHours, setDurationHours] = useState<string>('');
  const [allowedStart, setAllowedStart] = useState<string>('');
  const [allowedEnd, setAllowedEnd] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchShifts = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await shiftConfigApi.getShiftConfigsByBranch(branchId);
      setShifts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách ca làm việc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && branchId) {
      fetchShifts();
      setFormMode(null);
      setEditingShiftId(null);
    }
  }, [isOpen, branchId]);

  if (!isOpen) return null;

  const calculateAutoHours = (startStr: string, endStr: string) => {
    try {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // Ca đêm qua 24h
      return Math.round((diff / 60) * 100) / 100;
    } catch {
      return 8;
    }
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingShiftId(null);
    setShiftCode('');
    setShiftName('');
    setStartTime('06:00');
    setEndTime('14:00');
    setDurationHours('8');
    setAllowedStart('05:30');
    setAllowedEnd('07:00');
    setDescription('');
    setIsActive(true);
    setError(null);
  };

  const handleOpenEdit = (sh: ShiftConfigDto) => {
    setFormMode('edit');
    setEditingShiftId(sh.id);
    setShiftCode(sh.shiftCode);
    setShiftName(sh.shiftName);
    setStartTime(sh.startTime.slice(0, 5));
    setEndTime(sh.endTime.slice(0, 5));
    setDurationHours(String(sh.durationHours));
    setAllowedStart(sh.allowedCheckInStart ? sh.allowedCheckInStart.slice(0, 5) : '');
    setAllowedEnd(sh.allowedCheckInEnd ? sh.allowedCheckInEnd.slice(0, 5) : '');
    setDescription(sh.description || '');
    setIsActive(sh.isActive);
    setError(null);
  };

  const handleToggleStatus = async (sh: ShiftConfigDto) => {
    try {
      const updated = await shiftConfigApi.updateShiftConfigStatus(sh.id, !sh.isActive);
      setShifts((prev) => prev.map((item) => (item.id === sh.id ? updated : item)));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cấu hình ca này không?')) return;
    try {
      await shiftConfigApi.deleteShiftConfig(id);
      setShifts((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi khi xóa ca làm việc');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) {
      alert('Vui lòng nhập tên ca làm việc.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const parsedDuration = durationHours ? parseFloat(durationHours) : calculateAutoHours(startTime, endTime);
      const formatTimeSpan = (t: string) => (t.length === 5 ? `${t}:00` : t);

      if (formMode === 'create') {
        if (!shiftCode.trim()) {
          alert('Vui lòng nhập mã ca làm việc (ví dụ: SANG, CHIEU, TOI).');
          return;
        }

        const payload: CreateShiftConfigPayload = {
          branchId,
          shiftCode: shiftCode.trim().toUpperCase(),
          shiftName: shiftName.trim(),
          startTime: formatTimeSpan(startTime),
          endTime: formatTimeSpan(endTime),
          durationHours: parsedDuration,
          allowedCheckInStart: allowedStart ? formatTimeSpan(allowedStart) : undefined,
          allowedCheckInEnd: allowedEnd ? formatTimeSpan(allowedEnd) : undefined,
          description: description.trim() || undefined,
          isActive,
        };

        const created = await shiftConfigApi.createShiftConfig(payload);
        setShifts((prev) => [...prev, created]);
        setFormMode(null);
      } else if (formMode === 'edit' && editingShiftId) {
        const payload: UpdateShiftConfigPayload = {
          shiftName: shiftName.trim(),
          startTime: formatTimeSpan(startTime),
          endTime: formatTimeSpan(endTime),
          durationHours: parsedDuration,
          allowedCheckInStart: allowedStart ? formatTimeSpan(allowedStart) : undefined,
          allowedCheckInEnd: allowedEnd ? formatTimeSpan(allowedEnd) : undefined,
          description: description.trim() || undefined,
          isActive,
        };

        const updated = await shiftConfigApi.updateShiftConfig(editingShiftId, payload);
        setShifts((prev) => prev.map((s) => (s.id === editingShiftId ? updated : s)));
        setFormMode(null);
        setEditingShiftId(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 760, width: '90%' }}>
        {/* Header Modal */}
        <div className="emp-modal-header" style={{ background: '#F8FAFC' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="#0F766E" />
              <span>Quản lý danh mục Ca làm việc</span>
            </h3>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Chi nhánh: <b>{branchName || 'Đang chọn'}</b> · Cấu hình các khung giờ làm việc chuẩn để xếp ca
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Create/Edit */}
          {formMode ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#F8FAFC', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: 15, color: '#0F172A' }}>
                  {formMode === 'create' ? '➕ Tạo mới ca làm việc' : `✏️ Chỉnh sửa ca: ${shiftCode}`}
                </h4>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => setFormMode(null)}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  Hủy bỏ
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Mã ca *</label>
                  <input
                    type="text"
                    required
                    disabled={formMode === 'edit'}
                    placeholder="VD: SANG, CHIEU"
                    value={shiftCode}
                    onChange={(e) => setShiftCode(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4, textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Tên ca *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Ca sáng chuẩn"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Giờ bắt đầu *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setDurationHours(String(calculateAutoHours(e.target.value, endTime)));
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Giờ kết thúc *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setDurationHours(String(calculateAutoHours(startTime, e.target.value)));
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Thời lượng (giờ)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="24"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="Tự tính theo khung giờ"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Check-in sớm từ</label>
                  <input
                    type="time"
                    value={allowedStart}
                    onChange={(e) => setAllowedStart(e.target.value)}
                    placeholder="Mặc định: trước 30p"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Check-in trễ tối đa</label>
                  <input
                    type="time"
                    value={allowedEnd}
                    onChange={(e) => setAllowedEnd(e.target.value)}
                    placeholder="Mặc định: sau 60p"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Ghi chú ca</label>
                <input
                  type="text"
                  placeholder="Mô tả bổ sung hoặc bàn giao ca..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="chk-shift-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="chk-shift-active" style={{ fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                  Kích hoạt sử dụng ca này trong phân ca
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => setFormMode(null)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="emp-btn emp-btn-primary"
                >
                  {submitting ? 'Đang lưu...' : formMode === 'create' ? 'Tạo ca' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Tổng cộng <b>{shifts.length}</b> cấu hình ca trong chi nhánh
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={fetchShifts}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Tải lại</span>
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-primary"
                  onClick={handleOpenCreate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={15} />
                  <span>Thêm ca mới</span>
                </button>
              </div>
            </div>
          )}

          {/* Danh sách các ca */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748B' }}>Đang tải dữ liệu ca...</div>
            ) : shifts.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8' }}>
                Chưa có cấu hình ca nào cho chi nhánh này. Hãy bấm <b>Thêm ca mới</b> để bắt đầu.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>Mã ca</th>
                    <th style={{ padding: '10px 12px' }}>Tên ca</th>
                    <th style={{ padding: '10px 12px' }}>Khung giờ</th>
                    <th style={{ padding: '10px 12px' }}>Thời lượng</th>
                    <th style={{ padding: '10px 12px' }}>Check-in</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((sh) => (
                    <tr key={sh.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                          {sh.shiftCode}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{sh.shiftName}</td>
                      <td style={{ padding: '10px 12px', color: '#0F766E', fontWeight: 600 }}>
                        {sh.startTime.slice(0, 5)} - {sh.endTime.slice(0, 5)}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{sh.durationHours}h</td>
                      <td style={{ padding: '10px 12px', color: '#64748B', fontSize: 12 }}>
                        {sh.allowedCheckInStart?.slice(0, 5)} ~ {sh.allowedCheckInEnd?.slice(0, 5)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(sh)}
                          title="Bấm để bật/tắt kích hoạt"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: sh.isActive ? '#10B981' : '#94A3B8',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {sh.isActive ? (
                            <>
                              <CheckCircle2 size={16} color="#10B981" />
                              <span>Hoạt động</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} color="#94A3B8" />
                              <span>Tắt</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sh)}
                            className="emp-btn emp-btn-secondary"
                            style={{ padding: '4px 8px' }}
                            title="Sửa cấu hình ca"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sh.id)}
                            className="emp-btn emp-btn-danger"
                            style={{ padding: '4px 8px' }}
                            title="Xóa ca"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="emp-modal-footer" style={{ justifyContent: 'flex-end', background: '#F8FAFC' }}>
          <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

