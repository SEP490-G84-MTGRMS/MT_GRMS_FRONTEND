import React from 'react';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { History } from 'lucide-react';

interface PlanChangelogCardProps {
  plan: SubscriptionPlan;
}

export const PlanChangelogCard: React.FC<PlanChangelogCardProps> = ({ plan }) => {
  const changelog = [
    {
      date: plan.updatedAt || '15/01/2026',
      author: 'Super Admin',
      content: `Cập nhật cấu hình định ngạch tài nguyên: ${plan.quotas.maxStorageGb} GB storage, sao lưu ${plan.quotas.backupFrequency}.`,
    },
    {
      date: '01/06/2025',
      author: 'System Auto',
      content: 'Đồng bộ tính năng VietQR Động và Cảnh báo Date FEFO vào gói tiêu chuẩn.',
    },
    {
      date: plan.createdAt || '01/01/2025',
      author: 'Super Admin',
      content: `Khởi tạo gói cước ${plan.code} (${plan.name}) ban hành trên hệ thống MT-GRMS.`,
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
        padding: '20px 22px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14.5,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <History size={17} color="var(--blue-primary)" />
        <span>B. Nhật ký Thay đổi Phiên bản Gói</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {changelog.map((log, idx) => (
          <div
            key={idx}
            style={{
              paddingBottom: idx < changelog.length - 1 ? 12 : 0,
              borderBottom: idx < changelog.length - 1 ? '1px dashed #e2e8f0' : 'none',
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {log.date}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {log.author}
              </span>
            </div>
            <div style={{ color: '#475569', lineHeight: 1.45 }}>
              {log.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
