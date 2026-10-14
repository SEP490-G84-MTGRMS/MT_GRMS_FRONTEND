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
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--blue-light, #f0f6ff)',
            color: 'var(--blue-primary, #0066ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            1. Thông Tin Nhận Diện & Định Giá
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Mã định danh, tên hiển thị, phí niêm yết và chu kỳ thanh toán
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Plan Code */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Mã gói dịch vụ <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            disabled={isEdit}
            value={code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            placeholder="VD: PRO_MAX, STARTER..."
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
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
          {errors.code ? (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.code}</p>
          ) : (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#94a3b8' }}>
              {isEdit ? 'Mã gói là khóa duy nhất, không thể chỉnh sửa sau khi tạo' : 'Dạng in hoa, viết liền, không dấu'}
            </p>
          )}
        </div>

        {/* Plan Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Tên thương mại gói <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="VD: Gói Siêu Thị Mini Đa Chi Nhánh..."
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '9999px',
              border: `1px solid ${errors.name ? '#ef4444' : '#cbd5e1'}`,
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.name && (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.name}</p>
          )}
        </div>

        {/* Monthly Price */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Giá cước theo tháng (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
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
                padding: '10px 48px 10px 14px',
                fontSize: '15px',
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
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              đ/tháng
            </span>
          </div>
          {errors.monthlyPrice && (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.monthlyPrice}</p>
          )}
        </div>

        {/* Yearly Price */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Giá cước theo năm (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
          </label>
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
                padding: '10px 48px 10px 14px',
                fontSize: '15px',
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
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              đ/năm
            </span>
          </div>
          {errors.yearlyPrice ? (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.yearlyPrice}</p>
          ) : monthlyPrice > 0 && yearlyPrice > 0 ? (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#16a34a' }}>
              Ưu đãi: Tiết kiệm {Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100))}% so với mua lẻ từng tháng
            </p>
          ) : null}
        </div>

        {/* Status Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Trạng thái mở bán
          </label>
          <select
            value={status}
            onChange={(e) => onChange({ status: e.target.value as PlanStatus })}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
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
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
          Mô tả gói dịch vụ & Điểm nổi bật
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Mô tả nhóm đối tượng khách hàng mục tiêu, quy mô khuyến nghị..."
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
};
