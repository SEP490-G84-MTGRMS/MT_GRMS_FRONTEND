import React, { useState, useEffect } from 'react';

export interface MoneyInputProps {
  value: number;
  onChange: (val: number) => void;
  max?: number;
  min?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  showWords?: boolean;
  error?: string;
}

/**
 * Convert integer money number to Vietnamese words
 */
export function numberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Không đồng';
  if (num < 0) return 'Số tiền âm';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroupThree(n: number, isLast: boolean): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const d = n % 10;
    let res = '';

    if (h > 0 || !isLast) {
      res += `${digits[h]} trăm `;
    }

    if (t > 1) {
      res += `${digits[t]} mươi `;
      if (d === 1) res += 'mốt ';
      else if (d === 5) res += 'lăm ';
      else if (d > 0) res += `${digits[d]} `;
    } else if (t === 1) {
      res += 'mười ';
      if (d === 5) res += 'lăm ';
      else if (d > 0) res += `${digits[d]} `;
    } else {
      if (d > 0 && (h > 0 || !isLast)) {
        res += `lẻ ${digits[d]} `;
      } else if (d > 0) {
        res += `${digits[d]} `;
      }
    }

    return res.trim();
  }

  const groups: number[] = [];
  let temp = Math.floor(num);
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp > 0) {
      const read = readGroupThree(grp, i === groups.length - 1);
      result += `${read} ${units[i]} `;
    }
  }

  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  max,
  min = 0,
  placeholder = '0',
  disabled = false,
  className = '',
  label,
  showWords = true,
  error,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value ? value.toLocaleString('vi-VN') : ''
  );

  useEffect(() => {
    setDisplayValue(value ? value.toLocaleString('vi-VN') : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    let num = parseInt(raw, 10);
    if (isNaN(num)) num = 0;

    if (max !== undefined && num > max) {
      num = max;
    }
    if (min !== undefined && num < min) {
      num = min;
    }

    onChange(num);
    setDisplayValue(num ? num.toLocaleString('vi-VN') : '');
  };

  const isExceededMax = max !== undefined && value >= max;

  return (
    <div className={`money-input-wrapper ${className}`} style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '6px',
            color: '#1F2937',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '12px 48px 12px 16px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#0F766E',
            backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
            border: error
              ? '2px solid #DC2626'
              : isExceededMax
              ? '2px solid #D97706'
              : '2px solid #E5E7EB',
            borderRadius: '8px',
            outline: 'none',
            textAlign: 'right',
            boxSizing: 'border-box',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '15px',
            fontWeight: 600,
            color: '#6B7280',
            pointerEvents: 'none',
          }}
        >
          đ
        </span>
      </div>

      {showWords && value > 0 && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '13px',
            color: '#4B5563',
            fontStyle: 'italic',
            lineHeight: 1.4,
            paddingLeft: '2px',
          }}
        >
          ✍️ Bằng chữ: <strong>{numberToVietnameseWords(value)}</strong>
        </div>
      )}

      {isExceededMax && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#B45309',
            fontWeight: 600,
          }}
        >
          ⚠️ Đã khóa mức tối đa ({max?.toLocaleString('vi-VN')} đ) để bảo đảm không âm công nợ.
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#DC2626',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
