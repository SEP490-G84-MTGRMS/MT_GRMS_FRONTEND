import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, SupplierDeliveryConfig } from '../../types/supplier.types';
import { Clock, Truck, ShieldCheck, Calculator, CheckCircle2 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (cfg: SupplierDeliveryConfig) => void;
}

const DEFAULT_CONFIG: SupplierDeliveryConfig = {
  leadTimeDays: 1,
  leadTimeUnit: 'BUSINESS_DAYS',
  activeDeliveryDays: [1, 2, 3, 4, 5, 6],
  cutoffTime: '16:00',
  allowStoreEdit: true,
  editWindowType: 'BEFORE_CUTOFF',
  hoursBeforeDelivery: 24,
  hoursAfterOrder: 2,
  holidays: [],
};

const WEEKDAYS = [
  { val: 1, label: 'Thứ 2 (T2)' },
  { val: 2, label: 'Thứ 3 (T3)' },
  { val: 3, label: 'Thứ 4 (T4)' },
  { val: 4, label: 'Thứ 5 (T5)' },
  { val: 5, label: 'Thứ 6 (T6)' },
  { val: 6, label: 'Thứ 7 (T7)' },
  { val: 0, label: 'Chủ nhật (CN)' },
];

export const SupplierDeliveryConfigTab: FC<Props> = ({
  supplier,
  initialConfig,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<SupplierDeliveryConfig>(initialConfig || DEFAULT_CONFIG);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const [simOrderDatetime, setSimOrderDatetime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T15:00`;
  });
  const [calcResult, setCalcResult] = useState<{ deliveryDate: string; editDeadline: string; note: string } | null>(null);

  const handleToggleWeekday = (dayVal: number) => {
    setConfig((prev) => {
      const exists = prev.activeDeliveryDays.includes(dayVal);
      const updated = exists
        ? prev.activeDeliveryDays.filter((d) => d !== dayVal)
        : [...prev.activeDeliveryDays, dayVal];
      return { ...prev, activeDeliveryDays: updated };
    });
  };

  const handleRunCalculator = () => {
    if (!simOrderDatetime) return;
    const dt = new Date(simOrderDatetime);
    if (isNaN(dt.getTime())) return;

    const [cutHourStr, cutMinStr] = config.cutoffTime.split(':');
    const cutoffHour = parseInt(cutHourStr) || 16;
    const cutoffMin = parseInt(cutMinStr) || 0;

    const isAfterCutoff =
      dt.getHours() > cutoffHour ||
      (dt.getHours() === cutoffHour && dt.getMinutes() > cutoffMin);

    const checkHoliday = (d: Date): string | null => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayStr}`;
      for (const hol of config.holidays) {
        if (dateStr >= hol.fromDate && dateStr <= hol.toDate) return hol.reason;
      }
      return null;
    };

    const targetDate = new Date(dt);
    if (isAfterCutoff) targetDate.setDate(targetDate.getDate() + 1);

    let addedDays = 0;
    while (addedDays < config.leadTimeDays) {
      targetDate.setDate(targetDate.getDate() + 1);
      if (targetDate.getDay() !== 0 && !checkHoliday(targetDate)) addedDays++;
    }

    let loopCount = 0;
    let bypassedReason: string | null = null;
    while (
      (targetDate.getDay() === 0 ||
        !config.activeDeliveryDays.includes(targetDate.getDay()) ||
        checkHoliday(targetDate)) &&
      loopCount < 30
    ) {
      const reason = checkHoliday(targetDate);
      if (reason && !bypassedReason) bypassedReason = reason;
      targetDate.setDate(targetDate.getDate() + 1);
      loopCount++;
    }

    const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const formattedDelDate = `${targetDate.getDate().toString().padStart(2, '0')}/${(targetDate.getMonth() + 1).toString().padStart(2, '0')}/${targetDate.getFullYear()} (${dayNames[targetDate.getDay()]})`;

    let editDeadlineText = '';
    if (!config.allowStoreEdit) {
      editDeadlineText = 'Khóa đơn ngay khi đặt (Không cho phép chỉnh sửa PO)';
    } else if (config.editWindowType === 'BEFORE_CUTOFF') {
      const cutoffDt = new Date(dt);
      if (isAfterCutoff) cutoffDt.setDate(cutoffDt.getDate() + 1);
      editDeadlineText = `${cutoffDt.getDate().toString().padStart(2, '0')}/${(cutoffDt.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDt.getFullYear()} lúc ${config.cutoffTime} (Giờ chốt đơn kế tiếp)`;
    } else if (config.editWindowType === 'HOURS_BEFORE_DELIVERY') {
      const bufHours = config.hoursBeforeDelivery || 24;
      const dl = new Date(targetDate);
      dl.setHours(dl.getHours() - bufHours);
      editDeadlineText = `${dl.getDate().toString().padStart(2, '0')}/${(dl.getMonth() + 1).toString().padStart(2, '0')} ${dl.getHours()}:${dl.getMinutes().toString().padStart(2, '0')} (${bufHours} giờ trước ngày giao)`;
    } else {
      const fixedHours = config.hoursAfterOrder || 2;
      const dl = new Date(dt);
      dl.setHours(dl.getHours() + fixedHours);
      editDeadlineText = `${dl.getDate().toString().padStart(2, '0')}/${(dl.getMonth() + 1).toString().padStart(2, '0')} ${dl.getHours()}:${dl.getMinutes().toString().padStart(2, '0')} (${fixedHours} giờ sau khi đặt đơn)`;
    }

    setCalcResult({
      deliveryDate: formattedDelDate,
      editDeadline: editDeadlineText,
      note: bypassedReason
        ? `Tự động né ngày nghỉ lễ: ${bypassedReason}`
        : isAfterCutoff
        ? 'Đơn đặt sau giờ Cutoff — tự động chuyển sang chu kỳ kế tiếp'
        : 'Chu kỳ giao hàng hợp lệ',
    });
  };

  const handleSave = () => {
    onSaveConfig?.(config);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {saveSuccessMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#e8f9ee', border: '1px solid #bbf7d0',
          padding: '12px 18px', borderRadius: 'var(--radius-pill)',
          color: '#065f46', fontWeight: 600, fontSize: '0.88rem',
        }}>
          <CheckCircle2 size={18} color="#00c853" />
          <span>Đã lưu cấu hình lịch giao hàng và thời gian Cutoff thành công cho {supplier.name}!</span>
        </div>
      )}

      {/* Lịch giao hàng & Cutoff Time */}
      <div className="supplier-detail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--blue-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--blue-primary)',
          }}>
            <Truck size={20} />
          </div>
          <div>
            <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Lịch Giao Hàng &amp; Thời Gian Cutoff
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cấu hình thời gian chuẩn bị đơn (Lead time), ngày giao hàng hoạt động và giờ chốt đơn hằng ngày.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--blue-primary)" />
              <span>Thời gian chuẩn bị (Lead Time)</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number" min="0" max="30"
                value={config.leadTimeDays}
                onChange={(e) => setConfig({ ...config, leadTimeDays: Math.max(0, parseInt(e.target.value) || 0) })}
                className="admin-search-input"
                style={{ width: 80, height: 40, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
              />
              <select
                value={config.leadTimeUnit}
                onChange={(e) => setConfig({ ...config, leadTimeUnit: e.target.value as any })}
                className="form-select"
                style={{ height: 40, flex: 1 }}
              >
                <option value="BUSINESS_DAYS">Ngày làm việc (Business Days)</option>
                <option value="CALENDAR_DAYS">Ngày dương lịch (Calendar Days)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--orange-accent)" />
              <span>Giờ chốt đơn hàng ngày (Order Cutoff Time)</span>
            </label>
            <input
              type="time"
              value={config.cutoffTime}
              onChange={(e) => setConfig({ ...config, cutoffTime: e.target.value })}
              className="admin-search-input"
              style={{ width: '100%', height: 40, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              💡 Đơn PO đặt sau <b>{config.cutoffTime}</b> sẽ tự động tính chuyển sang chu kỳ giao hàng tiếp theo.
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Các ngày giao hàng trong tuần (Active Delivery Days)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((day) => {
              const isChecked = config.activeDeliveryDays.includes(day.val);
              return (
                <button
                  key={day.val} type="button"
                  onClick={() => handleToggleWeekday(day.val)}
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-pill)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isChecked ? '1px solid var(--blue-primary)' : '1px solid var(--border-light)',
                    background: isChecked ? 'var(--blue-light)' : '#ffffff',
                    color: isChecked ? 'var(--blue-primary)' : 'var(--text-muted)',
                  }}
                >
                  {isChecked ? '✓ ' : ''}{day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, marginTop: 16 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ShieldCheck size={16} color="var(--blue-primary)" />
            <span>Chính sách chỉnh sửa đơn mua hàng (PO Modification Rules)</span>
          </label>

          <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" name="allowEdit" checked={config.allowStoreEdit} onChange={() => setConfig({ ...config, allowStoreEdit: true })} />
              <span><b>Cho phép</b> cửa hàng chỉnh sửa PO trước hạn chót</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" name="allowEdit" checked={!config.allowStoreEdit} onChange={() => setConfig({ ...config, allowStoreEdit: false })} />
              <span><b>Khóa ngay</b> (Không cho phép sửa sau khi gửi PO)</span>
            </label>
          </div>

          {config.allowStoreEdit && (
            <div style={{
              background: 'var(--bg-soft-blue)', borderRadius: 14,
              padding: '12px 16px', border: '1px solid var(--border-light)',
              display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="editWindowType" checked={config.editWindowType === 'BEFORE_CUTOFF'} onChange={() => setConfig({ ...config, editWindowType: 'BEFORE_CUTOFF' })} />
                <span><b>Trước giờ Cutoff:</b> Cho phép sửa đến đúng giờ chốt đơn ({config.cutoffTime}) của ngày đặt</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="editWindowType" checked={config.editWindowType === 'HOURS_BEFORE_DELIVERY'} onChange={() => setConfig({ ...config, editWindowType: 'HOURS_BEFORE_DELIVERY' })} />
                <span>
                  <b>Trước giờ giao hàng:</b> Cho phép sửa trước ngày giao{' '}
                  <input type="number" min="1" max="72" value={config.hoursBeforeDelivery || 24}
                    onChange={(e) => setConfig({ ...config, hoursBeforeDelivery: parseInt(e.target.value) || 24 })}
                    style={{ width: 55, height: 28, textAlign: 'center', borderRadius: 6, border: '1px solid #ccc' }}
                  />{' '}giờ
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="editWindowType" checked={config.editWindowType === 'HOURS_AFTER_ORDER'} onChange={() => setConfig({ ...config, editWindowType: 'HOURS_AFTER_ORDER' })} />
                <span>
                  <b>Sau khi đặt đơn:</b> Cho phép sửa trong vòng{' '}
                  <input type="number" min="1" max="24" value={config.hoursAfterOrder || 2}
                    onChange={(e) => setConfig({ ...config, hoursAfterOrder: parseInt(e.target.value) || 2 })}
                    style={{ width: 55, height: 28, textAlign: 'center', borderRadius: 6, border: '1px solid #ccc' }}
                  />{' '}giờ kể từ lúc tạo PO
                </span>
              </label>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            type="button" className="admin-btn admin-btn-primary"
            onClick={handleSave}
            style={{ height: 42, padding: '0 24px', borderRadius: 'var(--radius-pill)', gap: 8 }}
          >
            <CheckCircle2 size={16} />
            <span>Lưu Cấu Hình Giao Hàng &amp; Cutoff</span>
          </button>
        </div>
      </div>

      {/* Preview Calculator */}
      <div className="supplier-detail-card" style={{ background: 'linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%)', border: '1px solid var(--blue-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--blue-primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#ffffff',
          }}>
            <Calculator size={20} />
          </div>
          <div>
            <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0, color: 'var(--blue-primary)' }}>
              Trình Mô Phỏng Tính Toán Giao Hàng (Preview Calculator)
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Thử nghiệm giả lập thuật toán tính ngày giao dự kiến và hạn chót sửa đơn hàng dựa trên giờ Cutoff đã cấu hình.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
            Thời điểm giả lập đặt đơn (Order Time):
          </label>
          <input
            type="datetime-local" value={simOrderDatetime}
            onChange={(e) => setSimOrderDatetime(e.target.value)}
            className="admin-search-input"
            style={{ width: 240, height: 38, fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="button" className="admin-btn admin-btn-primary"
            onClick={handleRunCalculator}
            style={{ height: 38, padding: '0 18px', borderRadius: 'var(--radius-pill)', gap: 6 }}
          >
            <Calculator size={14} />
            <span>Tính Toán Ngày Giao</span>
          </button>
        </div>

        {calcResult && (
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '16px 20px',
            border: '1px solid var(--blue-border)', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>➔ Ngày giao hàng dự kiến (Delivery Date):</span>
              <b style={{ color: 'var(--blue-primary)', fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>
                {calcResult.deliveryDate}
              </b>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>➔ Hạn chót sửa đơn hàng (CanEditUntil):</span>
              <span style={{ color: 'var(--red-accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {calcResult.editDeadline}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#059669', fontStyle: 'italic', marginTop: 2 }}>
              ℹ️ {calcResult.note}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
