import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierSummary, SupplierDeliveryConfig, HolidayDateRange } from '../../types/supplier.types';
import { Calendar, Plus, Pencil, Trash2, X, CheckCircle2 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (cfg: SupplierDeliveryConfig) => void | Promise<void>;
}

function formatDate(value: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export const SupplierHolidaysTab: FC<Props> = ({ supplier, initialConfig, onSaveConfig }) => {
  const [holidays, setHolidays] = useState<HolidayDateRange[]>(initialConfig?.holidays ?? []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayDateRange | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [saveMsg, setSaveMsg] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setHolidays(initialConfig?.holidays ?? []);
  }, [initialConfig]);

  const persist = async (next: HolidayDateRange[]) => {
    if (!initialConfig || !onSaveConfig) {
      setHolidays(next);
      return;
    }
    await onSaveConfig({ ...initialConfig, holidays: next });
    setHolidays(next);
  };

  const openCreate = () => {
    setEditing(null);
    setFromDate('');
    setToDate('');
    setReason('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (item: HolidayDateRange) => {
    setEditing(item);
    setFromDate(item.fromDate);
    setToDate(item.toDate);
    setReason(item.reason);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setFormError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      setFormError('Vui lòng nhập đủ: Từ ngày, Đến ngày và Lý do nghỉ.');
      return;
    }
    if (toDate < fromDate) {
      setFormError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }

    const nextItem: HolidayDateRange = {
      id: editing?.id || `hol-${Date.now()}`,
      fromDate,
      toDate,
      reason: reason.trim(),
    };
    const next = editing
      ? holidays.map((item) => (item.id === editing.id ? nextItem : item))
      : [...holidays, nextItem];

    try {
      setSaveError(null);
      await persist(next);
      closeModal();
      setSaveMsg(true);
      setTimeout(() => setSaveMsg(false), 3000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu kỳ nghỉ.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa kỳ nghỉ này?')) return;
    try {
      setSaveError(null);
      await persist(holidays.filter((item) => item.id !== id));
      setSaveMsg(true);
      setTimeout(() => setSaveMsg(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Không thể xóa kỳ nghỉ.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {saveMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#e8f9ee',
            border: '1px solid #bbf7d0',
            padding: '12px 18px',
            borderRadius: 'var(--radius-pill)',
            color: '#065f46',
            fontWeight: 600,
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={18} color="#00c853" />
          <span>Đã lưu danh sách ngày nghỉ lễ thành công cho {supplier.name}!</span>
        </div>
      )}
      {saveError && (
        <div
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
          {saveError}
        </div>
      )}

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
                background: 'var(--orange-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--orange-accent)',
              }}
            >
              <Calendar size={20} />
            </div>
            <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Kỳ Nghỉ Lễ &amp; Ngày Không Giao Hàng
            </h2>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreate}
            style={{ height: 36, padding: '0 16px', borderRadius: 6, gap: 6 }}
          >
            <Plus size={14} />
            <span>Thêm kỳ nghỉ</span>
          </button>
        </div>

        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: 'center' }}>#</th>
                <th style={{ width: 140 }}>Từ ngày</th>
                <th style={{ width: 140 }}>Đến ngày</th>
                <th>Lý do / Tên kỳ nghỉ</th>
                <th style={{ width: 160, textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length > 0 ? (
                holidays.map((holiday, index) => (
                  <tr key={holiday.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatDate(holiday.fromDate)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatDate(holiday.toDate)}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{holiday.reason}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => openEdit(holiday)}
                          className="admin-table-btn"
                          title="Sửa kỳ nghỉ"
                        >
                          <Pencil size={12} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(holiday.id)}
                          className="admin-table-btn"
                          style={{ color: '#dc2626' }}
                          title="Xóa kỳ nghỉ"
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Chưa có kỳ nghỉ lễ nào được thiết lập.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 80 }} onClick={closeModal}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Calendar size={18} />
                {editing ? 'Sửa kỳ nghỉ' : 'Thêm kỳ nghỉ'}
              </h3>
              <button type="button" className="modal-close" onClick={closeModal} title="Đóng">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {formError}
                </div>
              )}
              <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Từ ngày (*)</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="admin-search-input"
                  style={{ width: '100%', height: 38 }}
                />
              </label>
              <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Đến ngày (*)</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="admin-search-input"
                  style={{ width: '100%', height: 38 }}
                />
              </label>
              <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="form-label">Lý do nghỉ / Tên ngày lễ (*)</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nghỉ Tết Nguyên Đán, Bảo trì kho hàng..."
                  className="admin-search-input"
                  style={{ width: '100%', height: 38 }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={closeModal}
                  style={{ height: 36, padding: '0 16px', borderRadius: 6 }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  style={{ height: 36, padding: '0 18px', borderRadius: 6 }}
                >
                  {editing ? 'Lưu thay đổi' : 'Thêm kỳ nghỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
