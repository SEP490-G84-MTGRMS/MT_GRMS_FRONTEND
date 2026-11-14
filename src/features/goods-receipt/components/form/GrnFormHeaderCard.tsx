import type { CSSProperties, FC, ReactNode } from 'react';
import type {
  PaymentMethod,
  PaymentTerm,
  PoLookupOption,
  UserRole,
} from '../../types/grn.types';

export interface GrnBranchOption {
  id: string;
  label: string;
}

interface GrnFormHeaderCardProps {
  grnNo: string;
  branchId: string;
  poReference: string;
  availablePos: PoLookupOption[];
  branches?: GrnBranchOption[];
  supplierName: string;
  supplierCode: string;
  receiptTime: string;
  invoiceNo: string;
  createdBy: string;
  paymentTerm: PaymentTerm;
  paymentMethod: PaymentMethod;
  role: UserRole;
  employeeBranchId?: string;
  readOnly?: boolean;
  onBranchChange: (branchId: string) => void;
  onPoChange: (poCode: string) => void;
  onInvoiceNoChange: (val: string) => void;
  onPaymentTermChange: (val: PaymentTerm) => void;
  onPaymentMethodChange: (val: PaymentMethod) => void;
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

export const GrnFormHeaderCard: FC<GrnFormHeaderCardProps> = ({
  grnNo,
  branchId,
  poReference,
  availablePos: _availablePos = [],
  branches = [],
  supplierName,
  supplierCode,
  receiptTime,
  invoiceNo,
  createdBy,
  paymentTerm,
  paymentMethod,
  role,
  employeeBranchId = '',
  readOnly = false,
  onBranchChange,
  onPoChange: _onPoChange,
  onInvoiceNoChange,
  onPaymentTermChange,
  onPaymentMethodChange,
}) => {
  const isEmployee = role === 'employee';
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
    <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #e2e8f0' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 10,
        }}
      >
        Thông tin phiếu nhập kho
        <span style={{ fontWeight: 500, color: '#64748b' }}> · Nhập từ PO</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
          gap: '10px 12px',
        }}
      >
        {/* Hàng 1 — 8 cột */}
        <FieldCol label="Chi nhánh nhận">
          {isEmployee || readOnly ? (
            <div style={readOnlyBox}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {resolveBranchLabel(branchId || employeeBranchId)}
              </span>
            </div>
          ) : (
            <select
              value={branchId}
              onChange={(e) => onBranchChange(e.target.value)}
              style={{ ...controlBase, fontWeight: 600, backgroundColor: '#fff', cursor: 'pointer' }}
            >
              <option value="">-- Chọn CN --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
        </FieldCol>

        <FieldCol label="Mã phiếu GRN">
          <input
            type="text"
            value={grnNo}
            readOnly
            style={{
              ...controlBase,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#0f766e',
              backgroundColor: '#f8fafc',
            }}
          />
        </FieldCol>

        <FieldCol label="Đơn mua hàng PO">
          <div
            style={{
              ...readOnlyBox,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: poReference ? '#0284c7' : '#94a3b8',
            }}
            title="PO gốc cố định theo đơn được chọn để nhập kho"
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {poReference || '—'}
            </span>
          </div>
        </FieldCol>

        <FieldCol label="Mã NCC">
          <div style={{ ...readOnlyBox, fontFamily: 'monospace', fontWeight: 700 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {supplierCode || '—'}
            </span>
          </div>
        </FieldCol>

        <FieldCol label="Tên nhà cung cấp" span={2}>
          <div style={readOnlyBox} title={supplierName || undefined}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {supplierName || '— Chưa chọn PO —'}
            </span>
          </div>
        </FieldCol>

        <FieldCol label="Ngày / giờ nhập">
          <input
            type="text"
            value={receiptTime}
            readOnly
            style={{ ...controlBase, color: '#334155', backgroundColor: '#f8fafc' }}
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

        {/* Hàng 2 */}
        <FieldCol label="Số HĐ / phiếu NCC" span={2}>
          <input
            type="text"
            value={invoiceNo}
            onChange={(e) => onInvoiceNoChange(e.target.value)}
            disabled={readOnly}
            placeholder="VD: INV-998822"
            style={{
              ...controlBase,
              color: '#0f172a',
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
            }}
          />
        </FieldCol>

        <FieldCol label="Hạn thanh toán" span={2}>
          <select
            value={paymentTerm}
            onChange={(e) => onPaymentTermChange(e.target.value as PaymentTerm)}
            disabled={readOnly}
            style={{
              ...controlBase,
              fontWeight: 500,
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            <option value="30">30 Ngày (Công nợ AP)</option>
            <option value="15">15 Ngày</option>
            <option value="0">Thanh toán ngay (0 Ngày)</option>
          </select>
        </FieldCol>

        <FieldCol label="Hình thức TT" span={2}>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
            disabled={readOnly}
            style={{
              ...controlBase,
              fontWeight: 500,
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            <option value="Credit">Công nợ (Credit AP)</option>
            <option value="Cash">Tiền mặt (Cash)</option>
            <option value="Bank">Chuyển khoản (Bank Transfer)</option>
          </select>
        </FieldCol>
      </div>
    </div>
  );
};
