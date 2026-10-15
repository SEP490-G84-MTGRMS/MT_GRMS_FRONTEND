import type { FC } from 'react';
import { Sliders, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const TaxRateSettingsView: FC = () => {
  return (
    <div className="tax-table-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #E2E8F0', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(15, 118, 110, 0.1)', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sliders size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Biểu thuế suất & Ngành nghề Hộ kinh doanh
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Căn cứ Danh mục ngành nghề Phụ lục I ban hành kèm theo Thông tư số 40/2021/TT-BTC
            </p>
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: '#F0FDFA', color: '#0F766E', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #CCFBF1' }}>
          <ShieldCheck size={16} />
          Áp dụng từ 01/08/2021
        </div>
      </div>

      {/* Main Rates Table */}
      <div className="tax-table-wrapper" style={{ marginBottom: 24 }}>
        <table className="tax-table">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>NGÀNH NGHỀ KINH DOANH</th>
              <th style={{ textAlign: 'center', width: '14%' }}>THUẾ SUẤT GTGT</th>
              <th style={{ textAlign: 'center', width: '14%' }}>THUẾ SUẤT TNCN</th>
              <th style={{ textAlign: 'center', width: '14%' }}>TỔNG NGHĨA VỤ</th>
              <th style={{ width: '20%' }}>GHI CHÚ ÁP DỤNG</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#F0FDFA' }}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 800, color: '#0F766E', fontSize: '0.92rem' }}>
                    1. Phân phối, cung cấp hàng hóa
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#0F766E', color: '#ffffff', fontSize: '0.7rem', fontWeight: 700 }}>
                    <CheckCircle2 size={12} />
                    Tiệm tạp hóa
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
                  Bán buôn, bán lẻ hàng hóa tiêu dùng, thực phẩm khô, bánh kẹo, hóa mỹ phẩm
                </div>
              </td>
              <td style={{ textAlign: 'center', fontWeight: 800, color: '#0D9488', fontSize: '1rem' }}>
                1.0%
              </td>
              <td style={{ textAlign: 'center', fontWeight: 800, color: '#8B5CF6', fontSize: '1rem' }}>
                0.5%
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 8, background: 'rgba(15, 118, 110, 0.15)', color: '#0F766E', fontWeight: 900, fontSize: '1.05rem' }}>
                  1.5%
                </span>
              </td>
              <td style={{ fontSize: '0.82rem', color: '#334155' }}>
                Tính trên doanh thu xuất kho & hóa đơn bán lẻ POS
              </td>
            </tr>

            <tr>
              <td>
                <div style={{ fontWeight: 700, color: '#1E293B' }}>
                  2. Dịch vụ, xây dựng không bao thầu NVL
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  Dịch vụ sửa chữa nhỏ, sơ chế gói quà, cho thuê kệ hàng
                </div>
              </td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>5.0%</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>2.0%</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: '#334155' }}>7.0%</td>
              <td style={{ fontSize: '0.82rem', color: '#64748B' }}>Dịch vụ kèm theo</td>
            </tr>

            <tr>
              <td>
                <div style={{ fontWeight: 700, color: '#1E293B' }}>
                  3. Sản xuất, vận tải, dịch vụ có gắn với hàng hóa
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  Giao hàng tận nơi có tính phí, đóng gói thành phẩm
                </div>
              </td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>3.0%</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>1.5%</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: '#334155' }}>4.5%</td>
              <td style={{ fontSize: '0.82rem', color: '#64748B' }}>Dịch vụ giao vận</td>
            </tr>

            <tr>
              <td>
                <div style={{ fontWeight: 700, color: '#1E293B' }}>
                  4. Hoạt động kinh doanh khác
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  Thu nhập nhượng quyền, hoa hồng đại lý vé/thẻ cào
                </div>
              </td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>2.0%</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>1.0%</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: '#334155' }}>3.0%</td>
              <td style={{ fontSize: '0.82rem', color: '#64748B' }}>Hoạt động phát sinh</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Threshold policy note */}
      <div style={{ padding: '16px 20px', borderRadius: 16, background: '#F0FDFA', border: '1px solid #CCFBF1', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Info size={20} color="#0F766E" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.84rem', color: '#134E4A', lineHeight: 1.6 }}>
          <strong style={{ display: 'block', fontWeight: 800, color: '#0F766E', marginBottom: 2 }}>
            Quy định ngưỡng doanh thu miễn thuế dưới 100.000.000 VNĐ / năm:
          </strong>
          Cá nhân, hộ kinh doanh có doanh thu từ hoạt động sản xuất kinh doanh trong năm dương lịch từ 100 triệu đồng trở xuống thuộc diện không phải nộp thuế GTGT và không phải nộp thuế TNCN theo quy định tại Điều 4 Thông tư số 40/2021/TT-BTC. Khi doanh thu vượt 100 triệu, toàn bộ doanh thu phát sinh trong năm đều phải tính và kê khai nghĩa vụ nộp thuế theo biểu tỷ lệ trên.
        </div>
      </div>
    </div>
  );
};
