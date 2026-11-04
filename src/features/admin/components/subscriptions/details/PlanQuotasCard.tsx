import React from 'react';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { Database } from 'lucide-react';

interface PlanQuotasCardProps {
  plan: SubscriptionPlan;
}

export const PlanQuotasCard: React.FC<PlanQuotasCardProps> = ({ plan }) => {
  const quotas = [
    {
      label: 'Số Chi nhánh bán lẻ (Max Branches)',
      quota: plan.quotas.maxBranches === -1 ? 'Không giới hạn (~)' : `${plan.quotas.maxBranches} chi nhánh`,
      policy: plan.quotas.maxBranches === -1 ? 'Không áp dụng giới hạn' : `Chặn tạo chi nhánh thứ ${plan.quotas.maxBranches + 1} (Yêu cầu nâng gói)`,
      note: plan.quotas.maxBranches === -1 ? 'Phù hợp mô hình chuỗi phân phối lớn' : `Bao gồm 1 trụ sở chính + ${Math.max(0, plan.quotas.maxBranches - 1)} điểm bán`,
    },
    {
      label: 'Số Tài khoản Nhân viên (Max Staff)',
      quota: plan.quotas.maxEmployees === -1 ? 'Không giới hạn (~)' : `${plan.quotas.maxEmployees} tài khoản`,
      policy: plan.quotas.maxEmployees === -1 ? 'Không áp dụng giới hạn' : 'Chặn tạo thêm tài khoản nhân viên mới',
      note: 'Phân quyền: Quản lý, Thu ngân quầy, Nhân viên thủ kho',
    },
    {
      label: 'Dung lượng CSDL & Ảnh (Storage Quota)',
      quota: `${plan.quotas.maxStorageGb} GB`,
      policy: 'Cảnh báo email ở mức 80%, soft-lock ở 100%',
      note: 'Lưu trữ dữ liệu hóa đơn, lịch sử tồn kho & media sản phẩm',
    },
    {
      label: 'Hạn mức Đơn hàng / Giao dịch POS',
      quota: 'Không giới hạn',
      policy: 'Không áp dụng giới hạn',
      note: 'Đảm bảo vận hành liên tục cho quầy thanh toán tiệm tạp hóa',
    },
    {
      label: 'Tần suất Sao lưu Tự động (Backup)',
      quota: plan.quotas.backupFrequency === 'Hourly' ? 'Mỗi giờ (Hourly)' : plan.quotas.backupFrequency === 'Daily' ? 'Hàng ngày (Daily)' : 'Hàng tuần (Weekly)',
      policy: 'Tự động sao lưu định kỳ vào đám mây',
      note: 'Lưu trữ snapshot dự phòng 30 ngày an toàn tuyệt đối',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
        padding: '22px 24px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <Database size={18} color="var(--blue-primary)" />
        <span>2. Hạn mức Kỹ thuật & Định mức Tài nguyên Cấp phép (Resource Quotas)</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 14px' }}>Loại Tài Nguyên</th>
              <th style={{ textAlign: 'left', padding: '10px 14px' }}>Định Mức Cho Phép</th>
              <th style={{ textAlign: 'left', padding: '10px 14px' }}>Chính Sách Khi Vượt Ngưỡng</th>
              <th style={{ textAlign: 'left', padding: '10px 14px' }}>Ghi Chú Kỹ Thuật</th>
            </tr>
          </thead>
          <tbody>
            {quotas.map((q, idx) => (
              <tr key={idx}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {q.label}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-primary)' }}>
                  {q.quota}
                </td>
                <td style={{ padding: '10px 14px', color: '#475569' }}>
                  {q.policy}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                  {q.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
