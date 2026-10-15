import type { FC } from 'react';
import {
  FileText,
  Building2,
  Truck,
  Layers,
  UserCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
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
  isConfirmationMode?: boolean;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
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
  receiptTime,
  isConfirmationMode = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#0f766e" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
            Thông tin chung & Tổng tiền hóa đơn (General Info & Invoice Total)
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {isConfirmationMode ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
              }}
            >
              <Clock size={13} />
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
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
              }}
            >
              <CheckCircle2 size={13} />
              <span>CONFIRMED (Đã hoàn tất nhập kho)</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
              }}
            >
              <span>{status}</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid General Info */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          fontSize: 13,
          color: '#334155',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Receipt size={15} color="#64748b" />
          <span>Mã GRN:</span>
          <strong style={{ color: '#0f766e', fontSize: 14 }}>{grnNo}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Building2 size={15} color="#64748b" />
          <span>Chi nhánh:</span>
          <strong style={{ color: '#1e293b' }}>{branchName}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Truck size={15} color="#64748b" />
          <span>Nhà cung cấp:</span>
          <strong style={{ color: '#1e293b' }}>
            {supplierName} ({supplierCode})
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={15} color="#64748b" />
          <span>Mã đơn PO:</span>
          <strong style={{ color: '#2563eb' }}>{poReference}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserCheck size={15} color="#64748b" />
          <span>Người duyệt / Thủ kho:</span>
          <strong style={{ color: '#1e293b' }}>{receiverName || 'Đức.DM (Thủ kho)'}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={15} color="#64748b" />
          <span>Thời gian nhận:</span>
          <span style={{ color: '#475569' }}>{receiptTime || '26/09/2026 14:00'}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 12, marginTop: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            backgroundColor: '#f8fafc',
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Sub Financial metrics */}
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
            <span style={{ fontWeight: 600, color: '#334155' }}>TỔNG CÔNG NỢ (AP):</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#0f766e',
                backgroundColor: '#ccfbf1',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #99f6e4',
              }}
            >
              {formatCurrency(grandTotal)}
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>({getPaymentTermLabel(paymentTerm)})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
