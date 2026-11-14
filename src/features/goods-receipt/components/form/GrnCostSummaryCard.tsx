import type { FC } from 'react';
import { Calculator, FileText, Percent, ReceiptText } from 'lucide-react';
import type { GrnCostSummary } from '../../types/grn.types';

interface GrnCostSummaryCardProps {
  notes: string;
  costs: GrnCostSummary;
  readOnly?: boolean;
  onNotesChange: (val: string) => void;
  onDiscountChange: (val: number) => void;
  onVatPercentChange: (val: number) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val);
};

/** Dùng cho màn chi tiết GRN — form create/confirm dùng GrnFormFooter. */
export const GrnCostSummaryCard: FC<GrnCostSummaryCardProps> = ({
  notes,
  costs,
  readOnly = false,
  onNotesChange,
  onDiscountChange,
  onVatPercentChange,
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          marginBottom: 16,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Calculator size={16} color="#0d9488" />
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
          Tổng tiền phiếu nhập kho
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px 32px',
          alignItems: 'start',
        }}
      >
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              marginBottom: 6,
            }}
          >
            <FileText size={13} color="#64748b" />
            <span>Ghi chú nhập kho:</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={readOnly}
            placeholder="Ghi chú tình trạng xe giao, nhiệt độ bảo quản, lý do nếu có hàng móp méo / sai lệch..."
            rows={4}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#0f172a',
              backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              color: '#475569',
            }}
          >
            <span>Tổng tiền hàng (thực nhận):</span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a', fontSize: 13 }}>
              {formatCurrency(costs.goodsTotal)} VNĐ
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Percent size={13} color="#64748b" />
              <span>Chiết khấu từ NCC:</span>
            </div>
            <input
              type="number"
              min={0}
              step={5000}
              disabled={readOnly}
              value={costs.discountAmount}
              onChange={(e) => onDiscountChange(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{
                width: 120,
                height: 28,
                padding: '0 6px',
                textAlign: 'right',
                borderRadius: 5,
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: 12,
                color: readOnly ? '#64748b' : '#dc2626',
                backgroundColor: readOnly ? '#f1f5f9' : '#ffffff',
                cursor: readOnly ? 'not-allowed' : 'text',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ReceiptText size={13} color="#64748b" />
              <span>Thuế VAT:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={costs.vatPercent}
                disabled={readOnly}
                onChange={(e) => onVatPercentChange(parseFloat(e.target.value) || 0)}
                style={{
                  height: 28,
                  padding: '0 6px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  color: readOnly ? '#64748b' : '#334155',
                  backgroundColor: readOnly ? '#f1f5f9' : '#ffffff',
                  outline: 'none',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                }}
              >
                <option value={0}>0% VAT</option>
                <option value={5}>5% VAT</option>
                <option value={8}>8% VAT</option>
                <option value={10}>10% VAT</option>
              </select>
              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#0f172a' }}>
                +{formatCurrency(costs.vatAmount)} VNĐ
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            <span style={{ textTransform: 'uppercase' }}>TỔNG GIÁ TRỊ PHIẾU:</span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#0d9488',
                fontFamily: 'monospace',
              }}
            >
              {formatCurrency(costs.grandTotal)} VNĐ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
