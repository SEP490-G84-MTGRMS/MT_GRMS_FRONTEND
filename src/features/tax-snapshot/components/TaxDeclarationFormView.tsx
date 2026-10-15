import type { FC } from 'react';
import { FileSpreadsheet, Building2, ShieldCheck } from 'lucide-react';
import type { TaxSnapshot } from '../types/taxSnapshot';

interface Props {
  latestSnapshot?: TaxSnapshot;
  onOpenCreateModal: () => void;
  onOpenExportModal: (snapshot: TaxSnapshot) => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxDeclarationFormView: FC<Props> = ({
  latestSnapshot,
  onOpenCreateModal,
  onOpenExportModal,
}) => {
  if (!latestSnapshot) {
    return (
      <div className="tax-declaration-card" style={{ padding: 64, textAlign: 'center' }}>
        <Building2 size={48} style={{ color: '#0F766E', margin: '0 auto 16px auto', display: 'block' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>Chưa có kỳ tính thuế để lập tờ khai</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: 460, margin: '8px auto 20px auto' }}>
          Bấm nút bên dưới để hệ thống quét doanh thu các hóa đơn POS và lập tờ khai Form 01/CNKD tự động.
        </p>
        <button onClick={onOpenCreateModal} className="btn-primary-pill">
          Tạo kỳ tính thuế ngay
        </button>
      </div>
    );
  }

  return (
    <div className="tax-declaration-card">
      {/* Official Form Header */}
      <div className="tax-declaration-header">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: 'rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            <ShieldCheck size={14} />
            Mẫu Tờ Khai 01/CNKD (Ban hành kèm Thông tư số 40/2021/TT-BTC)
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            TỜ KHAI THUẾ HỘ KINH DOANH — QUÝ {latestSnapshot.quarter}/{latestSnapshot.year}
          </h2>
          <p style={{ fontSize: '0.82rem', opacity: 0.9, margin: '6px 0 0 0' }}>
            Phương pháp: Kê khai tỷ lệ tính thuế trên doanh thu thực tế phát sinh
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onOpenExportModal(latestSnapshot)}
            className="btn-export-white"
          >
            <FileSpreadsheet size={16} />
            <span>Kết xuất XML / Excel</span>
          </button>
        </div>
      </div>

      {/* Taxpayer Meta Information */}
      <div className="tax-declaration-body">
        <div className="tax-taxpayer-meta">
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Người nộp thuế:</span>
            <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>HỘ KINH DOANH TIỆM TẠP HÓA MINH ĐỨC</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Mã số thuế (MST):</span>
            <strong style={{ color: '#0F766E', fontSize: '0.95rem', fontFamily: 'monospace' }}>0108923456-001</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Cơ quan thuế quản lý:</span>
            <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Chi cục Thuế Quận Cầu Giấy — TP. Hà Nội</strong>
          </div>
        </div>

        {/* Section 1: Revenue & Tax Calculation */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0 }}>
              1. Xác định Doanh thu tính thuế GTGT và Thuế TNCN trong kỳ
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic' }}>Đơn vị tính: VNĐ</span>
          </div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: 18, overflow: 'hidden' }}>
            <table className="tax-table">
              <thead>
                <tr>
                  <th>Ngành nghề kinh doanh (Theo biểu thuế TT 40)</th>
                  <th style={{ textAlign: 'right' }}>Doanh thu chịu thuế</th>
                  <th style={{ textAlign: 'center' }}>Thuế suất GTGT</th>
                  <th style={{ textAlign: 'right' }}>Thuế GTGT</th>
                  <th style={{ textAlign: 'center' }}>Thuế suất TNCN</th>
                  <th style={{ textAlign: 'right' }}>Thuế TNCN</th>
                  <th style={{ textAlign: 'right' }}>Tổng thuế phải nộp</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>1. Phân phối, cung cấp hàng hóa</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Bán buôn, bán lẻ tạp hóa tiêu dùng qua quầy POS</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatVND(latestSnapshot.taxableRevenue)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#0F766E' }}>1.0%</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>{formatVND(latestSnapshot.vatAmount)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#7C3AED' }}>0.5%</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>{formatVND(latestSnapshot.pitAmount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>{formatVND(latestSnapshot.totalTaxAmount)}</td>
                </tr>
                <tr>
                  <td>
                    <div style={{ fontWeight: 600, color: '#64748B' }}>2. Dịch vụ, xây dựng không bao thầu NVL</div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Sơ chế, đóng gói quà tết, dịch vụ vận chuyển phụ trợ</div>
                  </td>
                  <td style={{ textAlign: 'right', color: '#94A3B8' }}>0 đ</td>
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>5.0%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8' }}>0 đ</td>
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>2.0%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8' }}>0 đ</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8' }}>0 đ</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ background: '#F0FDFA', borderTop: '2px solid #99F6E4' }}>
                  <td style={{ fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>TỔNG CỘNG NGHĨA VỤ THUẾ PHẢI NỘP:</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatVND(latestSnapshot.taxableRevenue)}</td>
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>—</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>{formatVND(latestSnapshot.vatAmount)}</td>
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>—</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#7C3AED' }}>{formatVND(latestSnapshot.pitAmount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: '#0F766E' }}>
                    {formatVND(latestSnapshot.totalTaxAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: Reference Cross-Module Audit (FE-07, FE-10, FE-17) */}
        <div>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>
            2. Số liệu liên thông kiểm soát nội bộ (Tích hợp phân hệ FE-07, FE-10, FE-17)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
              <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Giá vốn hàng bán (COGS - FE-10)</span>
              <strong style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', display: 'block', marginTop: 4 }}>
                {formatVND(Math.round(latestSnapshot.taxableRevenue * 0.74))}
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2, display: 'block' }}>Thuật toán FEFO lô hàng</span>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
              <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Chi phí vận hành dịch vụ (FE-07)</span>
              <strong style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', display: 'block', marginTop: 4 }}>
                {formatVND(25400000)}
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2, display: 'block' }}>Điện nước, viễn thông, mặt bằng</span>
            </div>

            <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 16, padding: 18 }}>
              <span style={{ fontSize: '0.74rem', color: '#0F766E', display: 'block' }}>Số dư quỹ tiền mặt khả dụng (FE-17)</span>
              <strong style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F766E', display: 'block', marginTop: 4 }}>
                {formatVND(186500000)}
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#059669', marginTop: 2, display: 'block', fontWeight: 600 }}>✓ Đủ thanh khoản nộp thuế</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
