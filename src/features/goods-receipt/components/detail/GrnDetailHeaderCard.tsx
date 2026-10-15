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
  Truck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { GrnStatus, PaymentTerm } from '../../types/grn.types';

interface GrnDetailHeaderCardProps {
  grnNo: string;
  branchName: string;
  branchCode?: string;
  supplierName: string;
  supplierCode: string;
  poReference: string;
  receiverName: string;
  status: GrnStatus;
  goodsTotal: number;
  landedCost: number;
  discount: number;
  vatPercent: number;
  grandTotal: number;
  paymentTerm?: PaymentTerm;
  receiptTime?: string;
  invoiceNo?: string;
  isConfirmationMode?: boolean;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
};

const getPaymentTermLabel = (term?: PaymentTerm): string => {
  switch (term) {
    case '15':
    case 'CREDIT_15':
      return 'Công nợ 15 ngày (Credit 15 days)';
    case '30':
    case 'CREDIT_30':
      return 'Công nợ 30 ngày (Credit 30 days)';
    case 'CREDIT_45':
      return 'Công nợ 45 ngày (Credit 45 days)';
    case '0':
    case 'CASH_ON_DELIVERY':
      return 'Thanh toán khi nhận hàng (COD)';
    case 'ADVANCE_PAID':
      return 'Đã thanh toán trước (Paid in Advance)';
    default:
      return 'Công nợ 30 ngày (Credit 30 days)';
  }
};

export const GrnDetailHeaderCard: FC<GrnDetailHeaderCardProps> = ({
  grnNo,
  branchName,
  supplierName,
  supplierCode,
  poReference,
  receiverName,
  status,
  goodsTotal,
  landedCost,
  discount,
  grandTotal,
  paymentTerm = 'CREDIT_30',
  receiptTime = '26/09/2026 14:00',
  invoiceNo = 'HD-20260926-08',
  isConfirmationMode = false,
}) => {
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
            Thông tin chung phiếu nhập kho &amp; Tổng tiền
          </h2>
        </div>

        {/* Right side: Type badge & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Hình thức: <span style={{ color: '#0d9488', fontWeight: 700 }}>Nhập từ đơn PO</span>
          </div>

          <div>
            {isConfirmationMode ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                }}
              >
                <Clock size={12} />
                <span>DRAFT ➔ CONFIRMED</span>
              </span>
            ) : status === 'CONFIRMED' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                }}
              >
                <CheckCircle2 size={12} />
                <span>CONFIRMED</span>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                }}
              >
                {status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Fields (4 columns matching GrnFormHeaderCard) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px 20px',
          marginBottom: 16,
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
          <div
            style={{
              height: 34,
              padding: '0 10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>{branchName}</span>
          </div>
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
              backgroundColor: '#f0fdfa',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 3. Đơn mua hàng gốc PO */}
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
            <span>Đơn mua hàng gốc (PO):</span>
          </label>
          <div
            style={{
              height: 34,
              padding: '0 10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              fontSize: 12.5,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{poReference}</span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#1e40af',
                backgroundColor: '#dbeafe',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              Liên kết PO
            </span>
          </div>
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
            <Truck size={13} color="#64748b" />
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
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{supplierName}</span>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                backgroundColor: '#e2e8f0',
                color: '#475569',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              {supplierCode}
            </span>
          </div>
        </div>

        {/* 5. Thời gian nhận hàng */}
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
            <span>Thời gian nhận hàng:</span>
          </label>
          <div
            style={{
              height: 34,
              padding: '0 10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12.5,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>{receiptTime}</span>
          </div>
        </div>

        {/* 6. Người kiểm đếm / Thủ kho */}
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
            <span>Người kiểm đếm / duyệt:</span>
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
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>{receiverName || 'Đức.DM (Thủ kho)'}</span>
          </div>
        </div>

        {/* 7. Hóa đơn VAT / Phiếu giao hàng */}
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
            <span>Số hóa đơn / Phiếu giao NCC:</span>
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
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>{invoiceNo}</span>
          </div>
        </div>

        {/* 8. Điều khoản thanh toán */}
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
            <span>Điều khoản thanh toán:</span>
          </label>
          <div
            style={{
              height: 34,
              padding: '0 10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12.5,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>{getPaymentTermLabel(paymentTerm)}</span>
          </div>
        </div>
      </div>

      {/* Financial Summary Sub-card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          backgroundColor: '#f8fafc',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
          <div>
            <span style={{ color: '#64748b' }}>Tiền hàng: </span>
            <strong style={{ color: '#1e293b' }}>{formatCurrency(goodsTotal)}</strong>
          </div>
          <div style={{ color: '#cbd5e1' }}>|</div>
          <div>
            <span style={{ color: '#64748b' }}>Phí VC (Landed Cost): </span>
            <strong style={{ color: '#d97706' }}>+{formatCurrency(landedCost)}</strong>
          </div>
          {discount > 0 && (
            <>
              <div style={{ color: '#cbd5e1' }}>|</div>
              <div>
                <span style={{ color: '#64748b' }}>Chiết khấu: </span>
                <strong style={{ color: '#dc2626' }}>-{formatCurrency(discount)}</strong>
              </div>
            </>
          )}
        </div>

        {/* Grand Total AP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <CreditCard size={16} color="#0f766e" />
          <span style={{ fontWeight: 700, color: '#334155' }}>TỔNG CÔNG NỢ (AP):</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#0f766e',
              backgroundColor: '#ccfbf1',
              padding: '3px 10px',
              borderRadius: 6,
              border: '1px solid #99f6e4',
            }}
          >
            {formatCurrency(grandTotal)}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>({getPaymentTermLabel(paymentTerm)})</span>
        </div>
      </div>
    </div>
  );
};
