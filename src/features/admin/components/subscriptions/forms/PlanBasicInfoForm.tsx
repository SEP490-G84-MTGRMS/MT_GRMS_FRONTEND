import React from 'react';
import type { PlanStatus } from '../../../types/plan.types';

interface PlanBasicInfoFormProps {
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: PlanStatus;
  description: string;
  isEdit?: boolean;
  errors?: Record<string, string>;
  onChange: (fields: Partial<{
    code: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    status: PlanStatus;
    description: string;
  }>) => void;
}

export const PlanBasicInfoForm: React.FC<PlanBasicInfoFormProps> = ({
  code,
  name,
  monthlyPrice,
  yearlyPrice,
  status,
  description,
  isEdit = false,
  errors = {},
  onChange,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border-light, #e2e8f0)',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 1px 4px rgba(0, 30, 90, 0.03)',
      }}
    >
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'var(--blue-light, #f0f6ff)',
            color: 'var(--blue-primary, #0066ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
            1. Thông Tin Nhận Diện & Định Giá
          </h3>
        </div>
      </div>

      {/* Grid Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px 14px' }}>
        {/* Plan Code */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Mã gói <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {isEdit && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Khóa duy nhất</span>}
          </div>
          <input
            type="text"
            disabled={isEdit}
            value={code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            placeholder="VD: PLAN_PRO..."
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '13px',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontWeight: 600,
              borderRadius: '9999px',
              border: `1px solid ${errors.code ? '#ef4444' : '#cbd5e1'}`,
              background: isEdit ? '#f8fafc' : '#ffffff',
              color: isEdit ? '#64748b' : '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.code && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#ef4444' }}>{errors.code}</p>}
        </div>

        {/* Plan Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
            Tên thương mại <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="VD: Gói Siêu Thị Mini..."
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '9999px',
              border: `1px solid ${errors.name ? '#ef4444' : '#cbd5e1'}`,
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.name && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#ef4444' }}>{errors.name}</p>}
        </div>

        {/* Monthly Price */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
            Giá cước tháng <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min={0}
              step={10000}
              value={monthlyPrice || ''}
              onChange={(e) => onChange({ monthlyPrice: Math.max(0, Number(e.target.value)) })}
              placeholder="0"
              style={{
                width: '100%',
                padding: '6px 42px 6px 12px',
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: '9999px',
                border: `1px solid ${errors.monthlyPrice ? '#ef4444' : '#cbd5e1'}`,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              đ/th
            </span>
          </div>
          {errors.monthlyPrice && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#ef4444' }}>{errors.monthlyPrice}</p>}
        </div>

        {/* Yearly Price */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Giá cước năm <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {monthlyPrice > 0 && yearlyPrice > 0 && (
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                Giảm {Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100))}%
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min={0}
              step={100000}
              value={yearlyPrice || ''}
              onChange={(e) => onChange({ yearlyPrice: Math.max(0, Number(e.target.value)) })}
              placeholder="0"
              style={{
                width: '100%',
                padding: '6px 42px 6px 12px',
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: '9999px',
                border: `1px solid ${errors.yearlyPrice ? '#ef4444' : '#cbd5e1'}`,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              đ/năm
            </span>
          </div>
          {errors.yearlyPrice && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#ef4444' }}>{errors.yearlyPrice}</p>}
        </div>

        {/* Status Dropdown */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
            Trạng thái mở bán
          </label>
          <select
            value={status}
            onChange={(e) => onChange({ status: e.target.value as PlanStatus })}
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: status === 'Active' ? '#16a34a' : '#64748b',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="Active">🟢 Đang hoạt động (Mở bán công khai)</option>
            <option value="Inactive">⚪ Tạm ngưng mở bán (Ẩn khỏi bảng giá)</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div style={{ marginTop: '10px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
          Mô tả gói dịch vụ & Khách hàng mục tiêu
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Mô tả nhóm quy mô cửa hàng, khuyến nghị sử dụng..."
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '12.5px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
};
