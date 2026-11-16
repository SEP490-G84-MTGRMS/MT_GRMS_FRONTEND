import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { Plus, RotateCcw, Percent, Save, ShieldCheck, Trash2 } from 'lucide-react';
import type {
  SupplierReturnPolicy,
  SupplierReturnPolicyCategoryCostShare,
} from '../../types/supplier.types';
import { categoryApi } from '../../../product/api/categoryApi';
import type { CategoryDto } from '../../../product/types';

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

/** Layout 4 cột: Nhãn | Control | Nhãn | Control */
const policyGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, auto) minmax(0, 1fr) minmax(120px, auto) minmax(0, 1fr)',
  columnGap: 14,
  rowGap: 12,
  alignItems: 'start',
  marginBottom: 8,
};

const policyLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  paddingTop: 10,
  lineHeight: 1.35,
};

const policyFieldStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const checkLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  lineHeight: 1.35,
  paddingTop: 8,
};

/** Một dòng gọn cho chia sẻ chi phí */
const costShareRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '10px 16px',
  marginBottom: 12,
};

const costShareItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flex: '0 0 auto',
};

const costShareItemLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  whiteSpace: 'nowrap',
};

const percentInputStyle: CSSProperties = {
  ...inputStyle,
  width: 92,
  padding: '8px 10px',
  textAlign: 'right',
};

const RETURN_TYPES = [
  { value: 'QUALITY_DEFECT', label: 'Lỗi chất lượng' },
  { value: 'NEAR_EXPIRY', label: 'Cận hạn' },
  { value: 'EXPIRED', label: 'Hết hạn' },
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
  allowedReturnTypes: ['QUALITY_DEFECT', 'NEAR_EXPIRY', 'EXPIRED', 'WRONG_ITEM'],
  allowedResolutionTypes: ['REDUCE_PAYABLE', 'EXCHANGE', 'REFUND', 'SUPPLIER_CREDIT'],
  defaultResolutionType: 'REDUCE_PAYABLE',
  nearExpiryMinDaysLeft: null,
  requireEvidenceImage: true,
  maxReturnDaysAfterReceipt: null,
  costShareEnabled: false,
  costShareByCategoryEnabled: false,
  storeCostSharePercent: null,
  supplierCostSharePercent: null,
  costShareBase: 'REPLACEMENT_VALUE',
  requireStorePaymentBeforeReplacement: true,
  notes: '',
  isActive: true,
  categoryCostShares: [],
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
    categoryCostShares: initialPolicy?.categoryCostShares || [],
  });
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPolicy) {
      setPolicy({
        ...DEFAULT_RETURN_POLICY,
        ...initialPolicy,
        categoryCostShares: initialPolicy.categoryCostShares || [],
      });
    }
  }, [initialPolicy]);

  useEffect(() => {
    let cancelled = false;
    void categoryApi.getCategories().then((list) => {
      if (!cancelled) setCategories(list || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const usedCategoryIds = useMemo(
    () => new Set((policy.categoryCostShares || []).map((c) => c.categoryId)),
    [policy.categoryCostShares]
  );

  const availableCategories = useMemo(
    () => categories.filter((c) => c.id && !usedCategoryIds.has(c.id)),
    [categories, usedCategoryIds]
  );

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
        setErrorMsg('Khi bật chia sẻ chi phí phải nhập % cửa hàng chịu (mặc định NCC).');
        return;
      }
      const sum =
        Number(policy.storeCostSharePercent) + Number(policy.supplierCostSharePercent ?? 0);
      if (Math.abs(sum - 100) > 0.01) {
        setErrorMsg('Tổng % cửa hàng và % NCC (mặc định) phải bằng 100.');
        return;
      }
      if (policy.costShareByCategoryEnabled) {
        const rows = policy.categoryCostShares || [];
        const ids = rows.map((r) => r.categoryId).filter(Boolean);
        if (ids.length !== new Set(ids).size) {
          setErrorMsg('Mỗi nhóm sản phẩm chỉ được cấu hình một lần.');
          return;
        }
        for (const row of rows) {
          if (!row.categoryId) {
            setErrorMsg('Vui lòng chọn nhóm sản phẩm cho mọi dòng.');
            return;
          }
          const rowSum = Number(row.storeCostSharePercent) + Number(row.supplierCostSharePercent);
          if (Math.abs(rowSum - 100) > 0.01) {
            setErrorMsg(`Nhóm "${row.categoryName || row.categoryId}": tổng % phải bằng 100.`);
            return;
          }
        }
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

        <div style={policyGridStyle}>
          <div style={policyLabelStyle}>Số ngày tối đa sau nhận hàng</div>
          <div style={policyFieldStyle}>
            <input
              type="number"
              min={0}
              style={{ ...inputStyle, maxWidth: 230, padding: '8px 10px' }}
              disabled={readOnly}
              placeholder="Trống = không giới hạn"
              value={policy.maxReturnDaysAfterReceipt ?? ''}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  maxReturnDaysAfterReceipt: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </div>

          <div style={policyLabelStyle}>Ngưỡng cận date (ngày còn lại)</div>
          <div style={policyFieldStyle}>
            <input
              type="number"
              min={0}
              style={{ ...inputStyle, maxWidth: 170, padding: '8px 10px' }}
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

          <div style={policyLabelStyle}>Bắt buộc ảnh bằng chứng</div>
          <div style={policyFieldStyle}>
            <label style={checkLabelStyle}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={policy.requireEvidenceImage}
                onChange={(e) => setPolicy((p) => ({ ...p, requireEvidenceImage: e.target.checked }))}
              />
              Yêu cầu đính kèm ảnh hàng lỗi
            </label>
          </div>
          <div />
          <div />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.45 }}>
          Ngưỡng cận date dùng khi trả hàng cận hạn (NEAR_EXPIRY). Phiếu kiểm kê xử lý riêng hàng
          hết hạn (EXPIRED) — chọn loại &quot;Hết hạn&quot; ở phần lý do được phép.
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
          Chỉ áp dụng khi hình thức bồi hoàn là <b>Đổi hàng (EXCHANGE)</b>, trên giá trị hàng thay
          thế đã xác nhận. Có thể đặt % mặc định NCC và/hoặc % riêng theo nhóm sản phẩm (danh mục
          hiện có).
        </p>

        <div style={costShareRowStyle}>
          <div style={costShareItemStyle}>
            <span style={costShareItemLabelStyle}>Bật chia sẻ</span>
            <label style={{ ...checkLabelStyle, paddingTop: 0 }}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={policy.costShareEnabled}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    costShareEnabled: e.target.checked,
                    costShareByCategoryEnabled: e.target.checked
                      ? p.costShareByCategoryEnabled
                      : false,
                    storeCostSharePercent: e.target.checked ? p.storeCostSharePercent : null,
                    supplierCostSharePercent: e.target.checked ? p.supplierCostSharePercent : null,
                  }))
                }
              />
            </label>
          </div>

          {policy.costShareEnabled && (
            <>
              <div style={costShareItemStyle}>
                <span style={costShareItemLabelStyle}>% CH</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  style={percentInputStyle}
                  disabled={readOnly}
                  placeholder="30"
                  title="Fallback khi nhóm chưa cấu hình"
                  value={policy.storeCostSharePercent ?? ''}
                  onChange={(e) => handleStorePercentChange(e.target.value)}
                />
              </div>

              <div style={costShareItemStyle}>
                <span style={costShareItemLabelStyle}>% NCC</span>
                <input
                  type="number"
                  style={{ ...percentInputStyle, background: '#f8fafc' }}
                  disabled
                  value={policy.supplierCostSharePercent ?? ''}
                  readOnly
                />
              </div>

              <div style={costShareItemStyle}>
                <span style={costShareItemLabelStyle}>Theo nhóm SP</span>
                <label style={{ ...checkLabelStyle, paddingTop: 0 }}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={policy.costShareByCategoryEnabled}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        costShareByCategoryEnabled: e.target.checked,
                      }))
                    }
                  />
                </label>
              </div>

              <div style={costShareItemStyle}>
                <span style={costShareItemLabelStyle}>TT trước nhận hàng đổi</span>
                <label style={{ ...checkLabelStyle, paddingTop: 0 }}>
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
                </label>
              </div>
            </>
          )}
        </div>
        {policy.costShareEnabled && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: -6, marginBottom: 12 }}>
            % CH / % NCC mặc định dùng khi nhóm SP chưa cấu hình tỷ lệ riêng. TT trước = bắt buộc
            trả phần CH trước khi tạo PO đổi hàng.
          </div>
        )}

        {policy.costShareEnabled && policy.costShareByCategoryEnabled && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 8,
              }}
            >
              Tỷ lệ riêng theo nhóm sản phẩm
            </div>
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
                maxWidth: 560,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Nhóm sản phẩm</th>
                    <th style={{ padding: '8px 10px', width: 88, textAlign: 'right' }}>
                      NCC (%)
                    </th>
                    <th style={{ padding: '8px 10px', width: 88, textAlign: 'right' }}>
                      CH (%)
                    </th>
                    {!readOnly && <th style={{ padding: '8px 10px', width: 40 }} />}
                  </tr>
                </thead>
                <tbody>
                  {(policy.categoryCostShares || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={readOnly ? 3 : 4}
                        style={{ padding: 12, color: '#94a3b8', textAlign: 'center' }}
                      >
                        Chưa có nhóm — dùng % mặc định.
                      </td>
                    </tr>
                  ) : (
                    (policy.categoryCostShares || []).map((row, idx) => (
                      <tr key={`${row.categoryId}-${idx}`} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                          {row.categoryName || row.categoryId}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          {readOnly ? (
                            row.supplierCostSharePercent
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={row.supplierCostSharePercent}
                              onChange={(e) => {
                                const supplier = Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value) || 0)
                                );
                                setPolicy((p) => {
                                  const next = [...(p.categoryCostShares || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    supplierCostSharePercent: supplier,
                                    storeCostSharePercent:
                                      Math.round((100 - supplier) * 100) / 100,
                                  };
                                  return { ...p, categoryCostShares: next };
                                });
                              }}
                              style={percentInputStyle}
                            />
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          {readOnly ? (
                            row.storeCostSharePercent
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={row.storeCostSharePercent}
                              onChange={(e) => {
                                const store = Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value) || 0)
                                );
                                setPolicy((p) => {
                                  const next = [...(p.categoryCostShares || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    storeCostSharePercent: store,
                                    supplierCostSharePercent:
                                      Math.round((100 - store) * 100) / 100,
                                  };
                                  return { ...p, categoryCostShares: next };
                                });
                              }}
                              style={percentInputStyle}
                            />
                          )}
                        </td>
                        {!readOnly && (
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              title="Xóa nhóm"
                              onClick={() =>
                                setPolicy((p) => ({
                                  ...p,
                                  categoryCostShares: (p.categoryCostShares || []).filter(
                                    (_, i) => i !== idx
                                  ),
                                }))
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: 4,
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!readOnly && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  maxWidth: 560,
                }}
              >
                <select
                  id="add-category-cost-share"
                  defaultValue=""
                  style={{
                    ...inputStyle,
                    flex: '1 1 auto',
                    maxWidth: 320,
                    padding: '8px 10px',
                  }}
                  disabled={availableCategories.length === 0}
                >
                  <option value="">
                    {availableCategories.length === 0
                      ? 'Đã thêm hết nhóm có sẵn'
                      : '-- Chọn nhóm --'}
                  </option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="po-btn po-btn-secondary"
                  disabled={availableCategories.length === 0}
                  onClick={() => {
                    const el = document.getElementById(
                      'add-category-cost-share'
                    ) as HTMLSelectElement | null;
                    const categoryId = el?.value || '';
                    if (!categoryId) return;
                    const cat = categories.find((c) => c.id === categoryId);
                    if (!cat) return;
                    const defaultStore = Number(policy.storeCostSharePercent ?? 0);
                    const row: SupplierReturnPolicyCategoryCostShare = {
                      categoryId: cat.id,
                      categoryName: cat.name,
                      storeCostSharePercent: defaultStore,
                      supplierCostSharePercent: Math.round((100 - defaultStore) * 100) / 100,
                    };
                    setPolicy((p) => ({
                      ...p,
                      categoryCostShares: [...(p.categoryCostShares || []), row],
                    }));
                    if (el) el.value = '';
                  }}
                  style={{
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={14} />
                  Thêm
                </button>
              </div>
            )}
          </div>
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
