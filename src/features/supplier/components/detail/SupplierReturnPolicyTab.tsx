import { useEffect, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { RotateCcw, Percent, Save, ShieldCheck } from 'lucide-react';
import type { SupplierReturnPolicy } from '../../types/supplier.types';

const LABEL_WIDTH = 240;

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
  marginBottom: 14,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  width: LABEL_WIDTH,
  minWidth: LABEL_WIDTH,
  paddingTop: 10,
  flexShrink: 0,
};

const fieldColStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const inputStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'Be Vietnam Pro, sans-serif',
};

const RETURN_TYPES = [
  { value: 'QUALITY_DEFECT', label: 'Lỗi chất lượng' },
  { value: 'NEAR_EXPIRY', label: 'Cận hạn' },
  { value: 'WRONG_ITEM', label: 'Sai quy cách / sai hàng' },
  { value: 'RECALL', label: 'Thu hồi' },
  { value: 'OTHER', label: 'Khác' },
];

const RESOLUTION_TYPES = [
  { value: 'REDUCE_PAYABLE', label: 'Cấn trừ công nợ' },
  { value: 'EXCHANGE', label: 'Đổi hàng' },
  { value: 'REFUND', label: 'Hoàn tiền' },
  { value: 'SUPPLIER_CREDIT', label: 'Credit note NCC' },
];

export const DEFAULT_RETURN_POLICY: SupplierReturnPolicy = {
  id: '',
  supplierId: '',
  allowReturn: true,
  allowedReturnTypes: ['QUALITY_DEFECT', 'NEAR_EXPIRY', 'WRONG_ITEM'],
  allowedResolutionTypes: ['REDUCE_PAYABLE', 'EXCHANGE', 'REFUND'],
  defaultResolutionType: 'REDUCE_PAYABLE',
  nearExpiryMinDaysLeft: null,
  requireEvidenceImage: true,
  maxReturnDaysAfterReceipt: null,
  costShareEnabled: false,
  storeCostSharePercent: null,
  supplierCostSharePercent: null,
  costShareBase: 'REPLACEMENT_VALUE',
  requireStorePaymentBeforeReplacement: true,
  notes: '',
  isActive: true,
};

interface Props {
  initialPolicy?: SupplierReturnPolicy | null;
  readOnly?: boolean;
  onSave?: (policy: SupplierReturnPolicy) => void | Promise<void>;
}

export const SupplierReturnPolicyTab: FC<Props> = ({
  initialPolicy,
  readOnly = false,
  onSave,
}) => {
  const [policy, setPolicy] = useState<SupplierReturnPolicy>({
    ...DEFAULT_RETURN_POLICY,
    ...initialPolicy,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPolicy) {
      setPolicy({ ...DEFAULT_RETURN_POLICY, ...initialPolicy });
    }
  }, [initialPolicy]);

  const toggleInList = (key: 'allowedReturnTypes' | 'allowedResolutionTypes', value: string) => {
    setPolicy((prev) => {
      const list = prev[key] || [];
      const exists = list.includes(value);
      const next = exists ? list.filter((x) => x !== value) : [...list, value];
      const patch: Partial<SupplierReturnPolicy> = { [key]: next };
      if (key === 'allowedResolutionTypes' && !next.includes(prev.defaultResolutionType)) {
        patch.defaultResolutionType = next[0] || 'REDUCE_PAYABLE';
      }
      return { ...prev, ...patch };
    });
  };

  const handleStorePercentChange = (raw: string) => {
    if (raw.trim() === '') {
      setPolicy((p) => ({
        ...p,
        storeCostSharePercent: null,
        supplierCostSharePercent: null,
      }));
      return;
    }
    const store = Number(raw);
    if (Number.isNaN(store)) return;
    const clamped = Math.max(0, Math.min(100, store));
    setPolicy((p) => ({
      ...p,
      storeCostSharePercent: clamped,
      supplierCostSharePercent: Math.round((100 - clamped) * 100) / 100,
    }));
  };

  const handleSave = async () => {
    if (!onSave || readOnly) return;
    setErrorMsg(null);

    if (policy.costShareEnabled) {
      if (policy.storeCostSharePercent == null) {
        setErrorMsg('Khi bật chia sẻ chi phí phải nhập % cửa hàng chịu.');
        return;
      }
      const sum =
        Number(policy.storeCostSharePercent) + Number(policy.supplierCostSharePercent ?? 0);
      if (Math.abs(sum - 100) > 0.01) {
        setErrorMsg('Tổng % cửa hàng và % NCC phải bằng 100.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(policy);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e.message || 'Không thể lưu chính sách trả hàng.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid #e2e8f0',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <RotateCcw size={18} color="#0066FF" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Cho phép trả / đổi hàng
          </h3>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Cho phép trả/đổi</div>
          <div style={fieldColStyle}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={policy.allowReturn}
                disabled={readOnly}
                onChange={(e) => setPolicy((p) => ({ ...p, allowReturn: e.target.checked }))}
              />
              Nhà cung cấp nhận trả / đổi hàng
            </label>
          </div>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Loại lý do được phép</div>
          <div style={{ ...fieldColStyle, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {RETURN_TYPES.map((t) => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  disabled={readOnly || !policy.allowReturn}
                  checked={policy.allowedReturnTypes.includes(t.value)}
                  onChange={() => toggleInList('allowedReturnTypes', t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Hình thức bồi hoàn</div>
          <div style={{ ...fieldColStyle, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {RESOLUTION_TYPES.map((t) => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  disabled={readOnly || !policy.allowReturn}
                  checked={policy.allowedResolutionTypes.includes(t.value)}
                  onChange={() => toggleInList('allowedResolutionTypes', t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Hình thức mặc định</div>
          <div style={fieldColStyle}>
            <select
              style={inputStyle}
              disabled={readOnly || !policy.allowReturn}
              value={policy.defaultResolutionType}
              onChange={(e) => setPolicy((p) => ({ ...p, defaultResolutionType: e.target.value }))}
            >
              {policy.allowedResolutionTypes.map((v) => {
                const meta = RESOLUTION_TYPES.find((x) => x.value === v);
                return (
                  <option key={v} value={v}>
                    {meta?.label || v}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid #e2e8f0',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldCheck size={18} color="#00C853" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Điều kiện</h3>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Số ngày tối đa sau nhận hàng</div>
          <div style={fieldColStyle}>
            <input
              type="number"
              min={0}
              style={inputStyle}
              disabled={readOnly}
              placeholder="Để trống = không giới hạn"
              value={policy.maxReturnDaysAfterReceipt ?? ''}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  maxReturnDaysAfterReceipt: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Ngưỡng cận date (ngày còn lại)</div>
          <div style={fieldColStyle}>
            <input
              type="number"
              min={0}
              style={inputStyle}
              disabled={readOnly}
              placeholder="VD: 30"
              value={policy.nearExpiryMinDaysLeft ?? ''}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  nearExpiryMinDaysLeft: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Bắt buộc ảnh bằng chứng</div>
          <div style={fieldColStyle}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={policy.requireEvidenceImage}
                onChange={(e) => setPolicy((p) => ({ ...p, requireEvidenceImage: e.target.checked }))}
              />
              Yêu cầu đính kèm ảnh hàng lỗi
            </label>
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid #e2e8f0',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Percent size={18} color="#FF9500" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Chia sẻ chi phí khi đổi hàng
          </h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          Tỷ lệ chỉ áp dụng trên giá trị hàng thay thế; NCC vẫn giao đủ 100% số lượng đã xác nhận.
          Không hard-code 50 — nhập đúng thỏa thuận với NCC.
        </p>

        <div style={labelRowStyle}>
          <div style={labelStyle}>Bật chia sẻ chi phí</div>
          <div style={fieldColStyle}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={policy.costShareEnabled}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    costShareEnabled: e.target.checked,
                    storeCostSharePercent: e.target.checked ? p.storeCostSharePercent : null,
                    supplierCostSharePercent: e.target.checked ? p.supplierCostSharePercent : null,
                  }))
                }
              />
              Cửa hàng chịu một phần giá trị hàng thay thế
            </label>
          </div>
        </div>

        {policy.costShareEnabled && (
          <>
            <div style={labelRowStyle}>
              <div style={labelStyle}>% cửa hàng chịu</div>
              <div style={fieldColStyle}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  style={inputStyle}
                  disabled={readOnly}
                  placeholder="VD: 30, 40, 50…"
                  value={policy.storeCostSharePercent ?? ''}
                  onChange={(e) => handleStorePercentChange(e.target.value)}
                />
              </div>
            </div>
            <div style={labelRowStyle}>
              <div style={labelStyle}>% NCC chịu</div>
              <div style={fieldColStyle}>
                <input
                  type="number"
                  style={{ ...inputStyle, background: '#f8fafc' }}
                  disabled
                  value={policy.supplierCostSharePercent ?? ''}
                  readOnly
                />
              </div>
            </div>
            <div style={labelRowStyle}>
              <div style={labelStyle}>Thanh toán trước khi nhận hàng đổi</div>
              <div style={fieldColStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={policy.requireStorePaymentBeforeReplacement}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        requireStorePaymentBeforeReplacement: e.target.checked,
                      }))
                    }
                  />
                  Bắt buộc thanh toán phần cửa hàng trước khi tạo PO / nhận hàng thay thế
                </label>
              </div>
            </div>
          </>
        )}

        <div style={labelRowStyle}>
          <div style={labelStyle}>Ghi chú thỏa thuận</div>
          <div style={fieldColStyle}>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              disabled={readOnly}
              value={policy.notes || ''}
              onChange={(e) => setPolicy((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ghi chú chính sách thương mại với NCC…"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: '#FF3B30', fontSize: 13, fontWeight: 600 }}>{errorMsg}</div>
      )}

      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0066FF',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '12px 22px',
              fontWeight: 700,
              fontSize: 14,
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              fontFamily: 'Be Vietnam Pro, sans-serif',
            }}
          >
            <Save size={16} />
            {isSaving ? 'Đang lưu…' : 'Lưu chính sách trả hàng'}
          </button>
        </div>
      )}
    </div>
  );
};
