import React, { useState } from 'react';

export interface DenominationItem {
  value: number;
  label: string;
}

export const DENOMINATIONS: DenominationItem[] = [
  { value: 500000, label: '500.000 đ' },
  { value: 200000, label: '200.000 đ' },
  { value: 100000, label: '100.000 đ' },
  { value: 50000, label: '50.000 đ' },
  { value: 20000, label: '20.000 đ' },
  { value: 10000, label: '10.000 đ' },
];

export interface DenominationCounterProps {
  onTotalCalculated: (total: number, counts: Record<number, number>, coins: number) => void;
  initialCounts?: Record<number, number>;
  initialCoins?: number;
}

export const DenominationCounter: React.FC<DenominationCounterProps> = ({
  onTotalCalculated,
  initialCounts = {},
  initialCoins = 0,
}) => {
  const [counts, setCounts] = useState<Record<number, number>>({
    500000: initialCounts[500000] || 0,
    200000: initialCounts[200000] || 0,
    100000: initialCounts[100000] || 0,
    50000: initialCounts[50000] || 0,
    20000: initialCounts[20000] || 0,
    10000: initialCounts[10000] || 0,
  });

  const [coins, setCoins] = useState<number>(initialCoins);

  const calculateTotal = (currentCounts: Record<number, number>, currentCoins: number) => {
    let sum = currentCoins;
    for (const d of DENOMINATIONS) {
      sum += (currentCounts[d.value] || 0) * d.value;
    }
    return sum;
  };

  const handleCountChange = (val: number, delta: number) => {
    const nextCount = Math.max(0, (counts[val] || 0) + delta);
    const updated = { ...counts, [val]: nextCount };
    setCounts(updated);
    onTotalCalculated(calculateTotal(updated, coins), updated, coins);
  };

  const handleDirectInput = (val: number, text: string) => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    const updated = { ...counts, [val]: Math.max(0, parsed) };
    setCounts(updated);
    onTotalCalculated(calculateTotal(updated, coins), updated, coins);
  };

  const handleCoinsChange = (text: string) => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    setCoins(parsed);
    onTotalCalculated(calculateTotal(counts, parsed), counts, parsed);
  };

  const total = calculateTotal(counts, coins);

  return (
    <div className="denomination-counter" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '340px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        {DENOMINATIONS.map((d) => {
          const count = counts[d.value] || 0;
          const subtotal = count * d.value;

          return (
            <div
              key={d.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ minWidth: '100px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{d.label}</span>
              </div>

              {/* Counter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleCountChange(d.value, -1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#374151',
                  }}
                >
                  -
                </button>

                <input
                  type="text"
                  inputMode="numeric"
                  value={count === 0 ? '' : count}
                  placeholder="0"
                  onChange={(e) => handleDirectInput(d.value, e.target.value)}
                  style={{
                    width: '54px',
                    height: '36px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    fontWeight: 700,
                    outline: 'none',
                    color: '#0F766E',
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleCountChange(d.value, 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#374151',
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ minWidth: '130px', textAlign: 'right' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F766E' }}>
                  {subtotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          );
        })}

        {/* Small coins / lẻ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ minWidth: '100px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>Tiền lẻ (&lt; 10.000)</span>
          </div>

          <div style={{ flex: 1, maxWidth: '160px', marginLeft: 'auto', marginRight: '16px' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0 đ"
              value={coins === 0 ? '' : coins.toLocaleString('vi-VN')}
              onChange={(e) => handleCoinsChange(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                textAlign: 'right',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                color: '#374151',
              }}
            />
          </div>

          <div style={{ minWidth: '110px', textAlign: 'right' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>
              {coins.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* Total Bar */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px 20px',
          borderRadius: '10px',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#065F46' }}>Tổng tiền kiểm đếm thực tế:</span>
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#047857' }}>
          {total.toLocaleString('vi-VN')} đ
        </span>
      </div>
    </div>
  );
};
