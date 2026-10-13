import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, SupplierDeliveryConfig, HolidayDateRange } from '../../types/supplier.types';
import { Calendar, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (cfg: SupplierDeliveryConfig) => void;
}

const DEFAULT_HOLIDAYS: HolidayDateRange[] = [
  { id: 'hol-1', fromDate: '2026-10-20', toDate: '2026-10-20', reason: 'Bảo trì hệ thống kho lạnh trung tâm' },
  { id: 'hol-2', fromDate: '2027-02-05', toDate: '2027-02-12', reason: 'Nghỉ Tết Nguyên Đán Đinh Mùi 2027 (7 ngày)' },
  { id: 'hol-3', fromDate: '2027-04-30', toDate: '2027-05-01', reason: 'Đại lễ 30/4 & Quốc tế Lao động 1/5' },
];

export const SupplierHolidaysTab: FC<Props> = ({ supplier, initialConfig, onSaveConfig }) => {
  const [holidays, setHolidays] = useState<HolidayDateRange[]>(
    initialConfig?.holidays ?? DEFAULT_HOLIDAYS
  );
  const [newFromDate, setNewFromDate] = useState('');
  const [newToDate, setNewToDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saveMsg, setSaveMsg] = useState(false);

  const handleAdd = () => {
    if (!newFromDate || !newToDate || !newReason.trim()) {
      alert('Vui lòng nhập đủ: Từ ngày, Đến ngày và Lý do nghỉ.');
      return;
    }
    if (newToDate < newFromDate) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }
    const newHol: HolidayDateRange = {
      id: `hol-${Date.now()}`,
      fromDate: newFromDate,
      toDate: newToDate,
      reason: newReason.trim(),
    };
    setHolidays((prev) => [...prev, newHol]);
    setNewFromDate('');
    setNewToDate('');
    setNewReason('');
  };

  const handleDelete = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSave = () => {
    if (initialConfig && onSaveConfig) {
      onSaveConfig({ ...initialConfig, holidays });
    }
    setSaveMsg(true);
    setTimeout(() => setSaveMsg(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Save success banner */}
      {saveMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#e8f9ee', border: '1px solid #bbf7d0',
          padding: '12px 18px', borderRadius: 'var(--radius-pill)',
          color: '#065f46', fontWeight: 600, fontSize: '0.88rem',
        }}>
          <CheckCircle2 size={18} color="#00c853" />
          <span>Đã lưu danh sách ngày nghỉ lễ thành công cho {supplier.name}!</span>
        </div>
      )}

      <div className="supplier-detail-card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--orange-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--orange-accent)',
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Kỳ Nghỉ Lễ &amp; Ngày Không Giao Hàng (Holidays &amp; Blackout Dates)
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cài đặt các khoảng ngày NCC tạm nghỉ giao hàng (Tết Nguyên Đán, Lễ 30/4 - 1/5, bảo trì kho bãi).
            </div>
          </div>
        </div>

        {/* Form thêm kỳ nghỉ mới */}
        <div style={{
          background: 'var(--bg-soft-blue)', borderRadius: 16,
          padding: '16px', border: '1px solid var(--border-light)', marginBottom: 16,
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-main)' }}>
            + Thêm khoảng ngày nghỉ lễ mới:
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <span className="form-label" style={{ fontSize: 12 }}>Từ ngày (*)</span>
              <input
                type="date"
                value={newFromDate}
                onChange={(e) => setNewFromDate(e.target.value)}
                className="admin-search-input"
                style={{ width: '100%', height: 38 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <span className="form-label" style={{ fontSize: 12 }}>Đến ngày (*)</span>
              <input
                type="date"
                value={newToDate}
                onChange={(e) => setNewToDate(e.target.value)}
                className="admin-search-input"
                style={{ width: '100%', height: 38 }}
              />
            </div>
            <div style={{ flex: 2, minWidth: 240 }}>
              <span className="form-label" style={{ fontSize: 12 }}>Lý do nghỉ / Tên ngày lễ (*)</span>
              <input
                type="text"
                placeholder="VD: Nghỉ Tết Nguyên Đán, Bảo trì kho hàng..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="admin-search-input"
                style={{ width: '100%', height: 38 }}
              />
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleAdd}
              style={{ height: 38, padding: '0 16px', borderRadius: 'var(--radius-pill)', gap: 6 }}
            >
              <Plus size={14} />
              <span>Thêm Kỳ Nghỉ</span>
            </button>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>#</th>
                <th style={{ width: 140 }}>Từ ngày</th>
                <th style={{ width: 140 }}>Đến ngày</th>
                <th>Lý do / Tên kỳ nghỉ</th>
                <th style={{ width: 100, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length > 0 ? (
                holidays.map((hol, idx) => (
                  <tr key={hol.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{hol.fromDate}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{hol.toDate}</td>
                    <td><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{hol.reason}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(hol.id)}
                        className="admin-btn admin-btn-secondary"
                        style={{ height: 28, padding: '0 8px', color: 'var(--red-accent)', borderRadius: 'var(--radius-pill)' }}
                        title="Xóa kỳ nghỉ này"
                      >
                        <Trash2 size={13} />
                        <span style={{ fontSize: 11 }}>Xóa</span>
                      </button>
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

        {/* Save button */}
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            style={{ height: 42, padding: '0 24px', borderRadius: 'var(--radius-pill)', gap: 8 }}
          >
            <CheckCircle2 size={16} />
            <span>Lưu Danh Sách Kỳ Nghỉ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
