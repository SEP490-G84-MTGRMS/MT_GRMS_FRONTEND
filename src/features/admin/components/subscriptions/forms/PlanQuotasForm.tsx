import React from 'react';
import type { PlanQuotaConfig, BackupFrequency } from '../../../types/plan.types';

interface PlanQuotasFormProps {
  quotas: PlanQuotaConfig;
  errors?: Record<string, string>;
  onChange: (quotas: Partial<PlanQuotaConfig>) => void;
}

export const PlanQuotasForm: React.FC<PlanQuotasFormProps> = ({
  quotas,
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
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            2. Hạn Mức Tài Nguyên Hệ Thống
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Giới hạn quy mô cửa hàng, nhân sự (-1 là không giới hạn) và lưu trữ dữ liệu đám mây
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Max Branches */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Số chi nhánh tối đa (-1 = Vô hạn) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={quotas.maxBranches}
              onChange={(e) => onChange({ maxBranches: Number(e.target.value) })}
              placeholder="1"
              style={{
                width: '100%',
                padding: '10px 48px 10px 14px',
                fontSize: '15px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: '9999px',
                border: `1px solid ${errors.maxBranches ? '#ef4444' : '#cbd5e1'}`,
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
                color: '#64748b',
              }}
            >
              cửa hàng
            </span>
          </div>
          {errors.maxBranches && (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.maxBranches}</p>
          )}
        </div>

        {/* Max Employees */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Số tài khoản nhân viên (-1 = Vô hạn) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={quotas.maxEmployees}
              onChange={(e) => onChange({ maxEmployees: Number(e.target.value) })}
              placeholder="3"
              style={{
                width: '100%',
                padding: '10px 48px 10px 14px',
                fontSize: '15px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: '9999px',
                border: `1px solid ${errors.maxEmployees ? '#ef4444' : '#cbd5e1'}`,
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
                color: '#64748b',
              }}
            >
              nhân sự
            </span>
          </div>
          {errors.maxEmployees && (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.maxEmployees}</p>
          )}
        </div>

        {/* Max Storage */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Dung lượng lưu trữ Cloud <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min={1}
              value={quotas.maxStorageGb || ''}
              onChange={(e) => onChange({ maxStorageGb: Math.max(1, Number(e.target.value)) })}
              placeholder="5"
              style={{
                width: '100%',
                padding: '10px 48px 10px 14px',
                fontSize: '15px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: '9999px',
                border: `1px solid ${errors.maxStorageGb ? '#ef4444' : '#cbd5e1'}`,
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
                color: '#64748b',
              }}
            >
              GB
            </span>
          </div>
          {errors.maxStorageGb && (
            <p style={{ margin: '4px 0 0 4px', fontSize: '12px', color: '#ef4444' }}>{errors.maxStorageGb}</p>
          )}
        </div>

        {/* Backup Frequency */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Tần suất sao lưu dự phòng
          </label>
          <select
            value={quotas.backupFrequency}
            onChange={(e) => onChange({ backupFrequency: e.target.value as BackupFrequency })}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="Daily">Hàng ngày (Daily Automated)</option>
            <option value="Weekly">Hàng tuần (Weekly Snapshot)</option>
            <option value="Hourly">Thời gian thực / Mỗi giờ (Hourly Sync)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
