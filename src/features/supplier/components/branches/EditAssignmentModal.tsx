import { useEffect, useState, type FC } from 'react';
import { CalendarDays, Loader2, Pencil, X } from 'lucide-react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { StatusToggle } from '../StatusToggle';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_OPTIONS = [
  { val: 1, label: 'T2' },
  { val: 2, label: 'T3' },
  { val: 3, label: 'T4' },
  { val: 4, label: 'T5' },
  { val: 5, label: 'T6' },
  { val: 6, label: 'T7' },
  { val: 0, label: 'CN' },
] as const;

function mapDeliveryDaysToJs(days?: string[]): number[] {
  if (!days?.length) return [1, 2, 3, 4, 5, 6];
  return days
    .map((day) => DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]))
    .filter((index) => index >= 0);
}

function mapJsDaysToNames(days: number[]): string[] {
  return days.map((day) => DAY_NAMES[day]).filter(Boolean);
}

export interface EditAssignmentSavePayload {
  status: 'Active' | 'Inactive';
  inactiveReason?: string;
  deliveryDays: string[];
}

interface EditAssignmentModalProps {
  item: SupplierBranchAssignmentItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (payload: EditAssignmentSavePayload) => Promise<void>;
}

export const EditAssignmentModal: FC<EditAssignmentModalProps> = ({
  item,
  isSubmitting = false,
  onClose,
  onSave,
}) => {
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!item) return;
    setStatus(item.status);
    setReason(item.inactiveReason || '');
    setDays(mapDeliveryDaysToJs(item.deliveryDays));
    setErrorMsg('');
  }, [item]);

  if (!item) return null;

  const toggleDay = (dayVal: number) => {
    setDays((prev) => (prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ngày giao hàng.');
      return;
    }
    if (status === 'Inactive' && !reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do khi đặt trạng thái Inactive.');
      return;
    }

    await onSave({
      status,
      inactiveReason: status === 'Inactive' ? reason.trim() : undefined,
      deliveryDays: mapJsDaysToNames(days),
    });
  };

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
        zIndex: 10000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 520,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={16} color="#0f766e" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Chỉnh sửa phân bổ</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {item.supplierCode} · {item.branchCode}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMsg && (
            <div
              style={{
                padding: '8px 10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 12.5,
              }}
            >
              {errorMsg}
            </div>
          )}

          <div>
            <StatusToggle
              checked={status === 'Active'}
              disabled={isSubmitting}
              onChange={(next) => {
                setStatus(next ? 'Active' : 'Inactive');
                setErrorMsg('');
              }}
            />
            {status === 'Inactive' && (
              <div style={{ marginTop: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Lý do tạm ngưng
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do..."
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 8,
              }}
            >
              <CalendarDays size={14} color="#0f766e" />
              Ngày giao hàng theo thứ
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEKDAY_OPTIONS.map((day) => {
                const isChecked = days.includes(day.val);
                return (
                  <button
                    key={day.val}
                    type="button"
                    onClick={() => toggleDay(day.val)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isChecked ? '1px solid #0f766e' : '1px solid #e2e8f0',
                      background: isChecked ? '#ccfbf1' : '#fff',
                      color: isChecked ? '#0f766e' : '#64748b',
                    }}
                  >
                    {isChecked ? '✓ ' : ''}
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            background: '#f8fafc',
          }}
        >
          <button type="button" className="po-btn po-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          <button type="submit" className="po-btn po-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Đang lưu…
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
