import React from 'react';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { ShieldCheck, Check, X } from 'lucide-react';

interface PlanFeaturesCardProps {
  plan: SubscriptionPlan;
}

export const PlanFeaturesCard: React.FC<PlanFeaturesCardProps> = ({ plan }) => {
  const featureList = [
    {
      stt: 1,
      name: 'Bán hàng POS & Quét mã Barcode',
      enabled: plan.features.barcodeScanning,
      desc: 'Giao diện thu ngân siêu tốc, tương thích đầu đọc mã vạch USB và camera POS, in hóa đơn nhiệt.',
    },
    {
      stt: 2,
      name: 'Quản lý Hạn dùng FEFO 3 mức màu',
      enabled: plan.features.fefoExpiryAlert,
      desc: 'Quản lý lô date, tự động ưu tiên xuất lô cận hạn trước, cảnh báo 3 cấp độ xanh / cam / đỏ.',
    },
    {
      stt: 3,
      name: 'Quy đổi Đa đơn vị tính (Thùng/Lon)',
      enabled: plan.features.multiUnitConversion,
      desc: 'Hỗ trợ bán sỉ và bán lẻ đa quy cách đóng gói (thùng, lốc, lon, gói) liên kết tồn kho quy chuẩn.',
    },
    {
      stt: 4,
      name: 'VietQR Động Khớp Tiền Tự Động',
      enabled: plan.features.vietQrDynamic,
      desc: 'Sinh mã QR ngân hàng theo từng đơn hàng với số tiền chính xác, không cần nhập tay tiền chuyển.',
    },
    {
      stt: 5,
      name: 'Sổ Ghi Nợ Zalo & Bán Ghi Nợ',
      enabled: plan.features.debtZaloBook,
      desc: 'Quản lý hạn mức nợ của khách quen tiệm, tạo và gửi tin nhắn sao kê công nợ tự động qua Zalo.',
    },
    {
      stt: 6,
      name: 'Báo Cáo Tài Chính & Sổ Quỹ P&L',
      enabled: plan.features.financialReporting,
      desc: 'Sổ quỹ tiền mặt, tài khoản ngân hàng, báo cáo dòng tiền và kết quả kinh doanh lãi lỗ chuyên sâu.',
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
        <ShieldCheck size={18} color="var(--blue-primary)" />
        <span>3. Ma trận Phân quyền & 6 Module Tính năng Tích hợp (Feature Matrix)</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 50, padding: '10px 8px' }}>STT</th>
              <th style={{ textAlign: 'left', width: 260, padding: '10px 14px' }}>Module Nghiệp Vụ</th>
              <th style={{ textAlign: 'center', width: 130, padding: '10px 14px' }}>Trạng Thái</th>
              <th style={{ textAlign: 'left', padding: '10px 14px' }}>Mô Tả Quyền Hạn Trong Gói</th>
            </tr>
          </thead>
          <tbody>
            {featureList.map((f) => (
              <tr key={f.stt}>
                <td style={{ textAlign: 'center', padding: '10px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {f.stt}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {f.name}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                  {f.enabled ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      <Check size={12} strokeWidth={3} /> Kích hoạt
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                      }}
                    >
                      <X size={12} strokeWidth={2.5} /> Chưa mở
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 14px', color: '#475569', lineHeight: 1.45 }}>
                  {f.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
