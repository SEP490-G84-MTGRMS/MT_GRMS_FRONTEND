import type { FC } from 'react';
import {
  FileSpreadsheet,
  Building2,
  Package,
  Calendar,
  User,
  CreditCard,
  Receipt,
  FileCheck,
} from 'lucide-react';
import type {
  PaymentMethod,
  PaymentTerm,
  PoLookupOption,
  UserRole,
} from '../../types/grn.types';
import { MOCK_GRN_BRANCHES } from '../../lib/mockGrnData';

interface GrnFormHeaderCardProps {
  grnNo: string;
  branchId: string;
  poReference: string;
  availablePos: PoLookupOption[];
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

export const GrnFormHeaderCard: FC<GrnFormHeaderCardProps> = ({
  grnNo,
  branchId,
  poReference,
  availablePos,
  supplierName,
  supplierCode,
  receiptTime,
  invoiceNo,
  createdBy,
  paymentTerm,
  paymentMethod,
  role,
  employeeBranchId = 'BR-01',
  readOnly = false,
  onBranchChange,
  onPoChange,
  onInvoiceNoChange,
  onPaymentTermChange,
  onPaymentMethodChange,
}) => {
  const isEmployee = role === 'employee';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Card Header Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          marginBottom: 16,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSpreadsheet size={16} color="#0d9488" />
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              margin: 0,
            }}
          >
            Thông tin chung phiếu nhập kho
          </h2>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Hình thức: <span style={{ color: '#0d9488', fontWeight: 700 }}>Nhập từ đơn PO</span>
        </div>
      </div>

      {/* Grid Fields */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px 20px',
        }}
      >
        {/* 1. Chi nhánh nhận */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <Building2 size={13} color="#64748b" />
            <span>Chi nhánh nhận:</span>
          </label>
          {isEmployee || readOnly ? (
            <div
              style={{
                height: 34,
                padding: '0 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {MOCK_GRN_BRANCHES.find((b) => b.id === (isEmployee ? employeeBranchId : branchId))?.name || branchId}
              </span>
              {isEmployee && (
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 4,
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    fontWeight: 700,
                  }}
                >
                  Cố định
                </span>
              )}
            </div>
          ) : (
            <select
              value={branchId}
              onChange={(e) => onBranchChange(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {MOCK_GRN_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Mã GRN */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <Receipt size={13} color="#64748b" />
            <span>Mã phiếu GRN:</span>
          </label>
          <input
            type="text"
            value={grnNo}
            readOnly
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#0f766e',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* 3. Đơn đặt hàng PO nguồn */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <Package size={13} color="#64748b" />
            <span>Đơn mua hàng PO gốc:</span>
          </label>
          {readOnly ? (
            <div
              style={{
                height: 34,
                padding: '0 10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12.5,
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {poReference}
            </div>
          ) : (
            <select
              value={poReference}
              onChange={(e) => onPoChange(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: poReference ? '1px solid #0d9488' : '1px solid #cbd5e1',
                fontSize: 12.5,
                fontWeight: 600,
                color: poReference ? '#0f766e' : '#334155',
                backgroundColor: poReference ? '#f0fdfa' : '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Chọn đơn đặt hàng PO --</option>
              {availablePos.map((po) => (
                <option key={po.poCode} value={po.poCode}>
                  {po.poCode} — {po.supplierName} ({po.branchId})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 4. Nhà cung cấp */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <Building2 size={13} color="#64748b" />
            <span>Nhà cung cấp:</span>
          </label>
          <div
            style={{
              height: 34,
              padding: '0 10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{supplierName || '— Chưa chọn PO —'}</span>
            {supplierCode && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                }}
              >
                {supplierCode}
              </span>
            )}
          </div>
        </div>

        {/* 5. Ngày giờ nhận hàng */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <Calendar size={13} color="#64748b" />
            <span>Ngày / giờ nhập kho:</span>
          </label>
          <input
            type="text"
            value={receiptTime}
            readOnly
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#334155',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* 6. Số hóa đơn / Phiếu giao hàng */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <FileCheck size={13} color="#64748b" />
            <span>Số hóa đơn / Phiếu NCC:</span>
          </label>
          <input
            type="text"
            value={invoiceNo}
            onChange={(e) => onInvoiceNoChange(e.target.value)}
            disabled={readOnly}
            placeholder="VD: INV-998822 hoặc số phiếu giao"
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#0f172a',
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* 7. Người lập phiếu */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <User size={13} color="#64748b" />
            <span>Người lập phiếu:</span>
          </label>
          <input
            type="text"
            value={createdBy}
            readOnly
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#334155',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* 8. Hạn thanh toán */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <CreditCard size={13} color="#64748b" />
            <span>Hạn thanh toán:</span>
          </label>
          <select
            value={paymentTerm}
            onChange={(e) => onPaymentTermChange(e.target.value as PaymentTerm)}
            disabled={readOnly}
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 500,
              color: '#0f172a',
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              outline: 'none',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            <option value="30">30 Ngày (Công nợ AP)</option>
            <option value="15">15 Ngày</option>
            <option value="0">Thanh toán ngay (0 Ngày)</option>
          </select>
        </div>

        {/* 9. Hình thức thanh toán */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 5,
            }}
          >
            <CreditCard size={13} color="#64748b" />
            <span>Hình thức thanh toán:</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
            disabled={readOnly}
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 500,
              color: '#0f172a',
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              outline: 'none',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            <option value="Credit">Công nợ (Credit AP)</option>
            <option value="Cash">Tiền mặt (Cash)</option>
            <option value="Bank">Chuyển khoản (Bank Transfer)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
