import { useState, useEffect } from 'react';
import type { CSSProperties, FC } from 'react';
import type { SupplierSummary, SupplierDeliveryConfig } from '../../types/supplier.types';
import { Clock, Truck, ShieldCheck, Package, CheckCircle2 } from 'lucide-react';

const LABEL_WIDTH = 220;

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  width: LABEL_WIDTH,
  minWidth: LABEL_WIDTH,
  paddingTop: 10,
  lineHeight: 1.35,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const fieldColStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

interface Props {
  supplier: SupplierSummary;
  initialConfig?: SupplierDeliveryConfig;
  onSaveConfig?: (cfg: SupplierDeliveryConfig) => void | Promise<void>;
}

const DEFAULT_CONFIG: SupplierDeliveryConfig = {
  minOrderQuantity: 0,
  activeDeliveryDays: [1, 2, 3, 4, 5, 6],
  cutoffTime: '17:00',
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
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const validate = (): string | null => {
    if (!config.activeDeliveryDays || config.activeDeliveryDays.length === 0) {
      return 'Vui lòng chọn ít nhất một ngày giao hàng hoạt động trong tuần (Active Delivery Days).';
    }

    if (config.minOrderQuantity < 0) {
      return 'Số lượng đặt tối thiểu (MOQ) phải lớn hơn hoặc bằng 0.';
    }

    const cleanCutoff = (config.cutoffTime || '').trim();
    if (!cleanCutoff) {
      return 'Vui lòng nhập giờ chốt đơn hàng ngày (Cutoff Time).';
    }
    const cutoffRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!cutoffRegex.test(cleanCutoff)) {
      return 'Giờ chốt đơn không hợp lệ. Vui lòng nhập đúng định dạng HH:mm (từ 00:00 đến 23:59).';
    }

    if (config.allowStoreEdit) {
      if (config.editWindowType === 'HOURS_BEFORE_DELIVERY') {
        const h = config.hoursBeforeDelivery ?? 24;
        if (h < 1 || h > 72) {
          return 'Số giờ cho phép sửa trước ngày giao hàng phải từ 1 đến 72 giờ.';
        }
      } else if (config.editWindowType === 'HOURS_AFTER_ORDER') {
        const h = config.hoursAfterOrder ?? 2;
        if (h < 1 || h > 24) {
          return 'Số giờ cho phép sửa sau khi đặt đơn phải từ 1 đến 24 giờ.';
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveErrorMsg(null);

    const validationErr = validate();
    if (validationErr) {
      setSaveErrorMsg(validationErr);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveConfig?.(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu cấu hình giao hàng.';
      setSaveErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {saveErrorMsg && (
        <div
          data-testid="save-delivery-error-alert"
          style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            padding: '12px 18px', borderRadius: 'var(--radius-pill)',
            color: '#991b1b', fontWeight: 600, fontSize: '0.88rem',
          }}
        >
          {saveErrorMsg}
        </div>
      )}

      {/* Lịch giao hàng & Cutoff Time */}
      <div className="supplier-detail-card" data-testid="delivery-config-card">
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
              Cấu hình ngày giao hàng hoạt động và giờ chốt đơn hằng ngày.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <div style={labelRowStyle}>
            <label className="form-label" style={labelStyle} htmlFor="input-moq">
              <Package size={14} color="var(--blue-primary)" />
              <span>Số lượng đặt tối thiểu (MOQ)</span>
            </label>
            <div style={fieldColStyle}>
              <input
                id="input-moq"
                type="number"
                min="0"
                data-testid="input-moq"
                value={config.minOrderQuantity}
                onChange={(e) => setConfig({ ...config, minOrderQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                className="admin-search-input"
                style={{ width: '100%', maxWidth: 280, height: 40, fontFamily: 'var(--font-mono)' }}
              />
              <div data-testid="moq-helper-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đơn đặt hàng phải đạt tối thiểu <b>{config.minOrderQuantity}</b> đơn vị mới được gửi cho nhà cung cấp.
              </div>
            </div>
          </div>

          <div style={labelRowStyle}>
            <label className="form-label" style={labelStyle} htmlFor="input-cutoff-time">
              <Clock size={14} color="var(--orange-accent)" />
              <span>Giờ chốt đơn hàng ngày (Cutoff)</span>
            </label>
            <div style={fieldColStyle}>
              <input
                id="input-cutoff-time"
                type="time"
                data-testid="input-cutoff-time"
                value={config.cutoffTime}
                onChange={(e) => setConfig({ ...config, cutoffTime: e.target.value })}
                className="admin-search-input"
                style={{ width: '100%', maxWidth: 280, height: 40, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}
              />
              <div data-testid="cutoff-helper-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đơn PO đặt sau <b>{config.cutoffTime}</b> sẽ tự động tính chuyển sang chu kỳ giao hàng tiếp theo.
              </div>
            </div>
          </div>

          <div style={labelRowStyle}>
            <div className="form-label" style={{ ...labelStyle, paddingTop: 8 }}>
              Các ngày giao hàng trong tuần
            </div>
            <div style={fieldColStyle} data-testid="delivery-weekdays-group">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WEEKDAYS.map((day) => {
                  const isChecked = config.activeDeliveryDays.includes(day.val);
                  return (
                    <button
                      key={day.val}
                      type="button"
                      data-testid={`btn-weekday-${day.val}`}
                      aria-pressed={isChecked}
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
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, marginTop: 16 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ShieldCheck size={16} color="var(--blue-primary)" />
            <span>Chính sách chỉnh sửa đơn mua hàng (PO Modification Rules)</span>
          </label>

          <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="radio"
                name="allowEdit"
                data-testid="radio-allow-store-edit"
                checked={config.allowStoreEdit}
                onChange={() => setConfig({ ...config, allowStoreEdit: true })}
              />
              <span><b>Cho phép</b> cửa hàng chỉnh sửa PO trước hạn chót</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="radio"
                name="allowEdit"
                data-testid="radio-lock-immediately"
                checked={!config.allowStoreEdit}
                onChange={() => setConfig({ ...config, allowStoreEdit: false })}
              />
              <span><b>Khóa ngay</b> (Không cho phép sửa sau khi gửi PO)</span>
            </label>
          </div>

          {config.allowStoreEdit && (
            <div
              data-testid="po-edit-sub-options"
              style={{
                background: 'var(--bg-soft-blue)', borderRadius: 14,
                padding: '12px 16px', border: '1px solid var(--border-light)',
                display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="editWindowType"
                  data-testid="radio-edit-before-cutoff"
                  checked={config.editWindowType === 'BEFORE_CUTOFF'}
                  onChange={() => setConfig({ ...config, editWindowType: 'BEFORE_CUTOFF' })}
                />
                <span><b>Trước giờ Cutoff:</b> Cho phép sửa đến đúng giờ chốt đơn ({config.cutoffTime}) của ngày đặt</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="editWindowType"
                  data-testid="radio-edit-hours-before-delivery"
                  checked={config.editWindowType === 'HOURS_BEFORE_DELIVERY'}
                  onChange={() => setConfig({ ...config, editWindowType: 'HOURS_BEFORE_DELIVERY' })}
                />
                <span>
                  <b>Trước giờ giao hàng:</b> Cho phép sửa trước ngày giao{' '}
                  <input
                    type="number"
                    min="1"
                    max="72"
                    data-testid="input-hours-before-delivery"
                    value={config.hoursBeforeDelivery || 24}
                    onChange={(e) => setConfig({ ...config, hoursBeforeDelivery: parseInt(e.target.value) || 24 })}
                    style={{ width: 55, height: 28, textAlign: 'center', borderRadius: 6, border: '1px solid #ccc' }}
                  />{' '}giờ
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="editWindowType"
                  data-testid="radio-edit-hours-after-order"
                  checked={config.editWindowType === 'HOURS_AFTER_ORDER'}
                  onChange={() => setConfig({ ...config, editWindowType: 'HOURS_AFTER_ORDER' })}
                />
                <span>
                  <b>Sau khi đặt đơn:</b> Cho phép sửa trong vòng{' '}
                  <input
                    type="number"
                    min="1"
                    max="24"
                    data-testid="input-hours-after-order"
                    value={config.hoursAfterOrder || 2}
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
            type="button"
            className="admin-btn admin-btn-primary"
            data-testid="btn-save-delivery-config"
            disabled={isSaving}
            onClick={handleSave}
            style={{ height: 42, padding: '0 24px', borderRadius: 'var(--radius-pill)', gap: 8 }}
          >
            <CheckCircle2 size={16} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Giao Hàng & Cutoff'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
