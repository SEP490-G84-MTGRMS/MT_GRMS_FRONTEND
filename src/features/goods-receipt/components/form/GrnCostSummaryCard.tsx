import type { FC } from 'react';
import { Calculator, FileText, Truck, Percent, ReceiptText } from 'lucide-react';
import type { GrnCostSummary } from '../../types/grn.types';

interface GrnCostSummaryCardProps {
  notes: string;
  costs: GrnCostSummary;
  readOnly?: boolean;
  onNotesChange: (val: string) => void;
  onLandedCostChange: (val: number) => void;
  onDiscountChange: (val: number) => void;
  onVatPercentChange: (val: number) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val);
};

export const GrnCostSummaryCard: FC<GrnCostSummaryCardProps> = ({
  notes,
  costs,
  readOnly = false,
  onNotesChange,
  onLandedCostChange,
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
      {/* Title */}
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
          Tổng tiền & Chi phí kèm theo (Landed Cost)
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
        {/* Left Column: Ghi chú nhập kho */}
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
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
            * Thông tin ghi chú sẽ được lưu vào lịch sử đối soát và hiển thị trên phiếu in.
          </div>
        </div>

        {/* Right Column: Bảng tính toán tài chính chi tiết */}
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
          {/* 1. Tổng tiền hàng */}
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

          {/* 2. Chi phí vận chuyển (Landed Cost) */}
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
              <Truck size={13} color="#64748b" />
              <span>Phí vận chuyển / bốc xếp (Landed Cost):</span>
            </div>
            {readOnly ? (
              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#0f172a' }}>
                +{formatCurrency(costs.landedCost)} VNĐ
              </span>
            ) : (
              <input
                type="number"
                min={0}
                step={5000}
                value={costs.landedCost}
                onChange={(e) => onLandedCostChange(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{
                  width: 120,
                  height: 28,
                  padding: '0 6px',
                  textAlign: 'right',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: 12,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* 3. Chiết khấu NCC */}
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
            {readOnly ? (
              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#dc2626' }}>
                -{formatCurrency(costs.discountAmount)} VNĐ
              </span>
            ) : (
              <input
                type="number"
                min={0}
                step={5000}
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
                  color: '#dc2626',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* 4. Thuế VAT */}
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
              {readOnly ? (
                <span style={{ fontSize: 12, color: '#475569' }}>({costs.vatPercent}%)</span>
              ) : (
                <select
                  value={costs.vatPercent}
                  onChange={(e) => onVatPercentChange(parseFloat(e.target.value) || 0)}
                  style={{
                    height: 28,
                    padding: '0 6px',
                    borderRadius: 5,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={0}>0% VAT</option>
                  <option value={5}>5% VAT</option>
                  <option value={8}>8% VAT</option>
                  <option value={10}>10% VAT</option>
                </select>
              )}
              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#0f172a' }}>
                +{formatCurrency(costs.vatAmount)} VNĐ
              </span>
            </div>
          </div>

          {/* Dòng phân cách Grand Total */}
          <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

          {/* 5. TỔNG GIÁ TRỊ PHIẾU NHẬP KHO */}
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
