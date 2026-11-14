import type { CSSProperties, FC, ReactNode } from 'react';

export interface StocktakeBranchOption {
  id: string;
  label: string;
}

interface StocktakeFormHeaderCardProps {
  stocktakeCode: string;
  branchId: string;
  branches: StocktakeBranchOption[];
  createdBy: string;
  createdAtLabel: string;
  statusLabel: string;
  canPickBranch: boolean;
  disabled?: boolean;
  onBranchChange: (branchId: string) => void;
}

const fieldCol: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const controlBase: CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 12,
  boxSizing: 'border-box',
  outline: 'none',
  minWidth: 0,
};

const FieldCol: FC<{ label: string; span?: number; children: ReactNode }> = ({
  label,
  span = 1,
  children,
}) => (
  <div style={{ ...fieldCol, gridColumn: span > 1 ? `span ${span}` : undefined }}>
    <span style={labelStyle} title={label}>
      {label}
    </span>
    {children}
  </div>
);

export const StocktakeFormHeaderCard: FC<StocktakeFormHeaderCardProps> = ({
  stocktakeCode,
  branchId,
  branches,
  createdBy,
  createdAtLabel,
  statusLabel,
  canPickBranch,
  disabled = false,
  onBranchChange,
}) => {
  const resolveBranchLabel = (id: string) =>
    branches.find((b) => b.id === id)?.label || id || '—';

  const readOnlyBox: CSSProperties = {
    ...controlBase,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  };

  return (
    <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 10,
        }}
      >
        Thông tin phiếu kiểm kê
        <span style={{ fontWeight: 500, color: '#64748b' }}>
          {' '}
          · Chi nhánh đăng nhập / được chọn
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '10px 12px',
        }}
      >
        <FieldCol label="Chi nhánh kiểm kê">
          {canPickBranch && !disabled ? (
            <select
              value={branchId}
              onChange={(e) => onBranchChange(e.target.value)}
              style={{
                ...controlBase,
                fontWeight: 600,
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Chọn chi nhánh --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          ) : (
            <div style={readOnlyBox}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {resolveBranchLabel(branchId)}
              </span>
            </div>
          )}
        </FieldCol>

        <FieldCol label="Mã phiếu kiểm kê">
          <input
            type="text"
            value={stocktakeCode || 'Tự sinh khi lưu'}
            readOnly
            style={{
              ...controlBase,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: stocktakeCode ? '#0f766e' : '#94a3b8',
              backgroundColor: '#f8fafc',
            }}
          />
        </FieldCol>

        <FieldCol label="Người lập phiếu">
          <input
            type="text"
            value={createdBy}
            readOnly
            style={{ ...controlBase, color: '#334155', backgroundColor: '#f8fafc' }}
          />
        </FieldCol>

        <FieldCol label="Ngày lập phiếu">
          <input
            type="text"
            value={createdAtLabel}
            readOnly
            style={{ ...controlBase, color: '#334155', backgroundColor: '#f8fafc' }}
          />
        </FieldCol>

        <FieldCol label="Trạng thái phiếu">
          <div
            style={{
              ...readOnlyBox,
              color: '#0f766e',
              fontWeight: 700,
            }}
          >
            {statusLabel}
          </div>
        </FieldCol>
      </div>
    </div>
  );
};
