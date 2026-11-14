import { useState, useEffect } from 'react';
import type { FC, FormEvent, CSSProperties } from 'react';
import type { SupplierSummary, SupplierDeliveryConfig, HolidayDateRange } from '../../types/supplier.types';
import { Calendar, Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminToast, type ToastState } from '../../../admin/components';

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (
    cfg: SupplierDeliveryConfig,
    options?: { silentToast?: boolean; toastMessage?: string },
  ) => void | Promise<void>;
}

function formatDate(value: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

const fieldRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
};

const labelStyle: CSSProperties = {
  flex: '0 0 210px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-main, #1e293b)',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 38,
  width: '100%',
};

export const SupplierHolidaysTab: FC<Props> = ({ supplier, initialConfig, onSaveConfig }) => {
  const [holidays, setHolidays] = useState<HolidayDateRange[]>(initialConfig?.holidays ?? []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayDateRange | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setHolidays(initialConfig?.holidays ?? []);
  }, [initialConfig]);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const persist = async (next: HolidayDateRange[]) => {
    if (!initialConfig || !onSaveConfig) {
      setHolidays(next);
      return;
    }
    // silentToast: page cha không toast — tab tự báo 1 msg duy nhất
    await onSaveConfig({ ...initialConfig, holidays: next }, { silentToast: true });
    setHolidays(next);
  };

  const openCreate = () => {
    setEditing(null);
    setFromDate('');
    setToDate('');
    setReason('');
    setIsModalOpen(true);
  };

  const openEdit = (item: HolidayDateRange) => {
    setEditing(item);
    setFromDate(item.fromDate);
    setToDate(item.toDate);
    setReason(item.reason);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      showToast('Vui lòng nhập đủ: Từ ngày, Đến ngày và Lý do nghỉ.', 'error');
      return;
    }
    if (toDate < fromDate) {
      showToast('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.', 'error');
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
      await persist(next);
      closeModal();
      showToast(
        editing
          ? `Đã cập nhật kỳ nghỉ cho ${supplier.name}.`
          : `Đã thêm kỳ nghỉ lễ thành công cho ${supplier.name}.`
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu kỳ nghỉ.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa kỳ nghỉ này?')) return;
    try {
      await persist(holidays.filter((item) => item.id !== id));
      showToast(`Đã xóa kỳ nghỉ khỏi ${supplier.name}.`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa kỳ nghỉ.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AdminToast toast={toast} onClose={() => setToast(null)} />

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
          <div className="modal-box" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
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
              <div style={fieldRowStyle}>
                <span style={labelStyle}>Từ ngày (*)</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    const nextFrom = e.target.value;
                    setFromDate(nextFrom);
                    if (toDate && nextFrom && toDate < nextFrom) {
                      setToDate(nextFrom);
                    }
                  }}
                  className="admin-search-input"
                  style={inputStyle}
                />
              </div>
              <div style={fieldRowStyle}>
                <span style={labelStyle}>Đến ngày (*)</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="admin-search-input"
                  style={inputStyle}
                />
              </div>
              <div style={fieldRowStyle}>
                <span style={labelStyle}>Lý do nghỉ / Tên ngày lễ (*)</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nghỉ Tết Nguyên Đán, Bảo trì kho hàng..."
                  className="admin-search-input"
                  style={inputStyle}
                />
              </div>
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
