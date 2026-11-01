import { useState, useEffect } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, SupplierDeliveryConfig } from '../../types/supplier.types';
import { Clock, Truck, ShieldCheck, Package, CheckCircle2 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (cfg: SupplierDeliveryConfig) => void | Promise<void>;
}

const DEFAULT_CONFIG: SupplierDeliveryConfig = {
  leadTimeDays: 1,
  leadTimeUnit: 'BUSINESS_DAYS',
  minOrderQuantity: 0,
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
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const handleToggleWeekday = (dayVal: number) => {
    setConfig((prev) => {
      const exists = prev.activeDeliveryDays.includes(dayVal);
      const updated = exists
        ? prev.activeDeliveryDays.filter((d) => d !== dayVal)
        : [...prev.activeDeliveryDays, dayVal];
      return { ...prev, activeDeliveryDays: updated };
    });
  };

  const handleSave = async () => {
    try {
      setSaveErrorMsg(null);
      await onSaveConfig?.(config);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu cấu hình giao hàng.';
      setSaveErrorMsg(message);
    }
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
      {saveErrorMsg && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          padding: '12px 18px', borderRadius: 'var(--radius-pill)',
          color: '#991b1b', fontWeight: 600, fontSize: '0.88rem',
        }}>
          {saveErrorMsg}
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
              <Package size={14} color="var(--blue-primary)" />
              <span>Số lượng đặt tối thiểu (MOQ)</span>
            </label>
            <input
              type="number"
              min="0"
              value={config.minOrderQuantity}
              onChange={(e) => setConfig({ ...config, minOrderQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
              className="admin-search-input"
              style={{ width: '100%', height: 40, fontFamily: 'var(--font-mono)' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Đơn đặt hàng phải đạt tối thiểu <b>{config.minOrderQuantity}</b> đơn vị mới được gửi cho nhà cung cấp.
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
    </div>
  );
};
