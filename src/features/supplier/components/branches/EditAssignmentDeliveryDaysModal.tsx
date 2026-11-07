import { useEffect, useState, type FC } from 'react';
import { CalendarDays, Loader2, X } from 'lucide-react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';

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

interface EditAssignmentDeliveryDaysModalProps {
  isOpen: boolean;
  item: SupplierBranchAssignmentItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (deliveryDays: string[]) => Promise<void>;
}

export const EditAssignmentDeliveryDaysModal: FC<EditAssignmentDeliveryDaysModalProps> = ({
  isOpen,
  item,
  isSubmitting = false,
  onClose,
  onSave,
}) => {
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setDays(mapDeliveryDaysToJs(item.deliveryDays));
      setErrorMsg('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

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
    await onSave(mapJsDaysToNames(days));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} color="#0f766e" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Ngày giao hàng</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {item.supplierCode} · {item.branchCode}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {errorMsg && (
            <div style={{ marginBottom: 10, color: '#b91c1c', fontSize: 12.5 }}>{errorMsg}</div>
          )}
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
              'Lưu ngày giao'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
