import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Info, RotateCcw, Check, Percent } from 'lucide-react';

interface TaxRateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRates: {
    customVatRate?: number | null;
    customPitRate?: number | null;
    vatReductionPercentage?: number | null;
    applyVatReduction2026?: boolean;
  };
  onSave: (rates: {
    customVatRate?: number | null;
    customPitRate?: number | null;
    vatReductionPercentage?: number | null;
    applyVatReduction2026?: boolean;
  }) => void;
  onResetToDefault: () => void;
}

export const TaxRateConfigModal: React.FC<TaxRateConfigModalProps> = ({
  isOpen,
  onClose,
  currentRates,
  onSave,
  onResetToDefault,
}) => {
  const [vatRate, setVatRate] = useState<string>('1.0');
  const [isVatReduced, setIsVatReduced] = useState<boolean>(false);
  const [vatReductionPct, setVatReductionPct] = useState<string>('20');
  const [pitRate, setPitRate] = useState<string>('0.5');

  // Synchronize internal state when modal opens or currentRates changes
  useEffect(() => {
    if (isOpen) {
      setVatRate(
        currentRates.customVatRate != null
          ? String(currentRates.customVatRate)
          : '1.0'
      );
      setIsVatReduced(Boolean(currentRates.applyVatReduction2026));
      setVatReductionPct(
        currentRates.vatReductionPercentage != null
          ? String(currentRates.vatReductionPercentage)
          : '20'
      );
      setPitRate(
        currentRates.customPitRate != null
          ? String(currentRates.customPitRate)
          : '0.5'
      );
    }
  }, [isOpen, currentRates]);

  if (!isOpen) return null;

  const numVatRate = parseFloat(vatRate) || 0;
  const numReductionPct = parseFloat(vatReductionPct) || 0;
  const effectiveVatRate = isVatReduced
    ? Math.round(numVatRate * (1 - numReductionPct / 100) * 10000) / 10000
    : numVatRate;

  const handleSave = () => {
    const parsedVat = parseFloat(vatRate);
    const parsedPit = parseFloat(pitRate);
    const parsedReductionPct = parseFloat(vatReductionPct);

    const isVatCustom = !isNaN(parsedVat) && parsedVat !== 1.0;
    const isPitCustom = !isNaN(parsedPit) && parsedPit !== 0.5;
    const isReductionCustom = !isNaN(parsedReductionPct) && parsedReductionPct !== 20.0;

    onSave({
      customVatRate: isVatCustom ? parsedVat : undefined,
      customPitRate: isPitCustom ? parsedPit : undefined,
      vatReductionPercentage: isReductionCustom ? parsedReductionPct : undefined,
      applyVatReduction2026: isVatReduced,
    });
    onClose();
  };

  const handleReset = () => {
    setVatRate('1.0');
    setIsVatReduced(false);
    setVatReductionPct('20');
    setPitRate('0.5');
    onResetToDefault();
    onClose();
  };

  return (
    <div className="tax-modal-backdrop">
      <div className="tax-modal-card" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="tax-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#CCFBF1',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Cấu Hình Thuế Suất Tham Khảo
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                Thiết lập tham số tính toán ước tính nghĩa vụ thuế hộ kinh doanh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tax-btn-icon-dismiss"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="tax-modal-body" style={{ gap: 18 }}>
          {/* Legal Note Alert */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <Info size={18} style={{ color: '#0F766E', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.78rem', color: '#134E4A', lineHeight: 1.5 }}>
              <strong>Căn cứ mặc định theo Luật định:</strong> Nghị định 68/2026/NĐ-CP, Nghị định 141/2026/NĐ-CP và Thông tư 152/2025/TT-BTC.
              <br />
              • Bán lẻ hàng hóa: GTGT <strong>1.0%</strong>, TNCN <strong>0.5%</strong> (tính trên phần vượt 1 tỷ).
              <br />
              Chỉ thay đổi khi có thông báo chính thức từ Cơ quan Thuế địa bàn.
            </div>
          </div>

          {/* Form Group 1: VAT Base Rate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
              1. Thuế suất GTGT bán lẻ gốc (%)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <Percent
                  size={15}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                (Mặc định: <strong>1.0%</strong>)
              </span>
            </div>
          </div>

          {/* Form Group 2: VAT Reduction Policy (NQ 204) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>
                  2. Chính sách giảm thuế GTGT (Nghị quyết 204/2025/QH15)
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                  Áp dụng giảm tỷ lệ thuế GTGT cho nhóm hàng hóa tiêu dùng đủ điều kiện
                </p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isVatReduced}
                  onChange={(e) => setIsVatReduced(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#0F766E', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isVatReduced ? '#0F766E' : '#64748B' }}>
                  {isVatReduced ? 'Đang bật' : 'Tắt'}
                </span>
              </label>
            </div>

            {isVatReduced && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 8,
                  borderTop: '1px dashed #CBD5E1',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>Mức giảm:</span>
                <div style={{ position: 'relative', width: 90 }}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={vatReductionPct}
                    onChange={(e) => setVatReductionPct(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 24px 4px 8px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Percent
                    size={13}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: '#0F766E', fontWeight: 700 }}>
                  → Thuế suất thực tế áp dụng: {effectiveVatRate}%
                </span>
              </div>
            )}
          </div>

          {/* Form Group 3: PIT Rate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
              3. Thuế suất TNCN bán lẻ theo tỷ lệ doanh thu (%)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={pitRate}
                  onChange={(e) => setPitRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <Percent
                  size={15}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                (Mặc định: <strong>0.5%</strong>)
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748B' }}>
              Chỉ tính trên phần doanh thu lũy kế vượt ngưỡng 1 tỷ VNĐ (theo NĐ 141/2026/NĐ-CP).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="tax-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Mặc định luật định</span>
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#F1F5F9',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#0F766E',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
              }}
            >
              <Check size={16} />
              <span>Lưu & Áp dụng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
