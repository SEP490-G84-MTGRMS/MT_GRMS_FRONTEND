import type { FC } from 'react';
import { ExternalLink, ShieldCheck, Info } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const SepayVisualGuide: FC<Props> = ({ compact }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Cẩm nang hướng dẫn cấu hình kết nối SePay
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Các bước thiết lập tài khoản ngân hàng và Webhook tự động nhận tiền VietQR Napas 247
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderRadius: 8,
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e3a8a',
          fontSize: 12.5,
          lineHeight: 1.5,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        <Info size={18} style={{ flexShrink: 0, marginTop: 1, color: '#2563eb' }} />
        <span>
          Làm theo 5 bước bên dưới để hoàn tất tích hợp SePay. Tiền khách chuyển khoản sẽ được bắn thẳng vào tài
          khoản ngân hàng của bạn ngay lập tức với chi phí 0đ phí trung gian.
        </span>
      </div>

      {/* Bước 1 & Bước 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div
          style={{
            padding: 14,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
              ① Tạo và xác minh tài khoản SePay
            </div>
            <a
              href="https://my.sepay.vn"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: '#0284c7',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              my.sepay.vn <ExternalLink size={13} />
            </a>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
            Truy cập <code>my.sepay.vn</code>, đăng ký/đăng nhập và hoàn tất thông tin công ty. Không chia sẻ mật
            khẩu hoặc mã OTP cho người khác.
          </div>
        </div>

        <div
          style={{
            padding: 14,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
            ② Liên kết tài khoản ngân hàng nhận tiền
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
            Vào menu <b>Ngân hàng → Thêm tài khoản</b>, chọn ngân hàng của bạn và làm theo hướng dẫn liên kết.
            Kiểm tra tài khoản có trạng thái <b>Hoạt động</b>.
          </div>
        </div>
      </div>

      {/* Bước 3: Ảnh thật trang API Access của SePay */}
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
            ③ Tạo API Token để hệ thống đồng bộ tài khoản
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>Cấu hình Công ty / API Access</span>
        </div>

        <div style={{ padding: 14, backgroundColor: '#f8fafc', minWidth: 0 }}>
          <svg
            viewBox="0 455 260 305"
            role="img"
            aria-label="Menu Cấu hình Công ty và API Access trên SePay"
            style={{
              width: '100%',
              maxWidth: 260,
              display: 'block',
              margin: '0 auto 10px',
              borderRadius: 7,
              border: '1px solid #cbd5e1',
            }}
          >
            <image href="/guides/sepay-api-access.png" width="1707" height="876" />
            <path
              d="M 200 515 L 150 497 M 150 497 L 160 507 M 150 497 L 164 493 M 200 710 L 130 733 M 130 733 L 142 723 M 130 733 L 145 735"
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="205" y="520" fill="white" stroke="#b91c1c" strokeWidth="3" paintOrder="stroke" fontSize="20" fontWeight="bold">
              1
            </text>
            <text x="205" y="714" fill="white" stroke="#b91c1c" strokeWidth="3" paintOrder="stroke" fontSize="20" fontWeight="bold">
              2
            </text>
          </svg>
          <svg
            viewBox="460 145 1040 255"
            role="img"
            aria-label="Trang API Access, mũi tên chỉ nút Thêm API và sao chép token"
            style={{ width: '100%', display: 'block', borderRadius: 7, border: '1px solid #cbd5e1' }}
          >
            <image href="/guides/sepay-api-access.png" width="1707" height="876" />
            <path
              d="M 1360 215 L 1410 190 M 1410 190 L 1393 192 M 1410 190 L 1402 204 M 735 295 L 660 291 M 660 291 L 675 282 M 660 291 L 675 300"
              fill="none"
              stroke="#dc2626"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="1335" y="225" fill="#b91c1c" fontSize="24" fontWeight="bold">
              3
            </text>
            <text x="745" y="302" fill="#b91c1c" fontSize="24" fontWeight="bold">
              4
            </text>
          </svg>
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 6,
              fontSize: 12,
              color: '#92400e',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            ① Mở <b>Cấu hình Công ty</b> → ② chọn <b>API Access</b> → ③ bấm <b>+ Thêm API</b>, đặt tên và chọn{' '}
            <b>Hoạt động</b> → ④ sao chép Token rồi dán vào ô <b>API Token SePay</b> khi kết nối. Giữ Token bí mật như
            mật khẩu.
          </div>
        </div>
      </div>

      {/* Bước 4: Ảnh thật trang Webhooks của SePay */}
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
            ④ Tạo Webhook thông báo giao dịch tiền vào
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>Webhooks / + Thêm webhook</span>
        </div>

        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdfa', borderBottom: '1px solid #ccfbf1' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', marginBottom: 4 }}>
            Đường dẫn Webhook URL chính thức (Copy và dán vào ô "URL Webhook" trên SePay):
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              padding: '8px 12px',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12.5,
            }}
          >
            <span style={{ wordBreak: 'break-all', userSelect: 'all' }}>https://thviet.store/api/payments/sepay-webhook</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText('https://thviet.store/api/payments/sepay-webhook');
              }}
              style={{
                backgroundColor: '#0d9488',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Sao chép URL
            </button>
          </div>
        </div>

        <div style={{ padding: 14, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, width: '100%', minWidth: 0 }}>
            <figure style={{ margin: 0, minWidth: 0 }}>
              <svg
                viewBox="0 365 260 140"
                role="img"
                aria-label="Menu Tích hợp WebHooks trên SePay"
                style={{
                  width: '100%',
                  maxWidth: 260,
                  display: 'block',
                  margin: '0 auto 10px',
                  borderRadius: 7,
                  border: '1px solid #cbd5e1',
                }}
              >
                <image href="/guides/sepay-webhooks.png" width="1707" height="876" />
                <path
                  d="M 215 470 L 180 441 M 180 441 L 194 444 M 180 441 L 185 455"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="220" y="478" fill="white" stroke="#b91c1c" strokeWidth="3" paintOrder="stroke" fontSize="20" fontWeight="bold">
                  1
                </text>
              </svg>
              <svg
                viewBox="260 145 1440 170"
                role="img"
                aria-label="Trang Webhooks, mũi tên chỉ nút Thêm webhook"
                style={{ width: '100%', display: 'block', borderRadius: 7, border: '1px solid #cbd5e1' }}
              >
                <image href="/guides/sepay-webhooks.png" width="1707" height="876" />
                <path
                  d="M 1480 280 L 1575 245 M 1575 245 L 1555 244 M 1575 245 L 1562 261"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="1450" y="290" fill="#b91c1c" fontSize="30" fontWeight="bold">
                  2
                </text>
              </svg>
              <figcaption style={{ marginTop: 5, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>
                A. Mở danh sách và bấm “Thêm webhook”
              </figcaption>
            </figure>
            <figure style={{ margin: 0, minWidth: 0 }}>
              <svg
                viewBox="1007 0 700 876"
                role="img"
                aria-label="Form Thêm Webhook, mũi tên chỉ URL và nút Tiếp theo"
                style={{ width: '100%', maxWidth: 520, display: 'block', margin: '0 auto', borderRadius: 7, border: '1px solid #cbd5e1' }}
              >
                <image href="/guides/sepay-add-webhook.png" width="1707" height="876" />
                <path
                  d="M 1540 250 L 1490 286 M 1490 286 L 1508 284 M 1490 286 L 1497 270 M 1510 790 L 1590 835 M 1590 835 L 1571 833 M 1590 835 L 1582 818"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="1545" y="250" fill="#b91c1c" fontSize="24" fontWeight="bold">
                  3
                </text>
                <text x="1480" y="790" fill="#b91c1c" fontSize="24" fontWeight="bold">
                  4
                </text>
              </svg>
              <figcaption style={{ marginTop: 5, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>
                B. Hoàn thành lần lượt Cơ bản → Tài khoản → Bảo mật → Cảnh báo
              </figcaption>
            </figure>
          </div>
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              fontSize: 12,
              color: '#065f46',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            ① Chọn <b>Tích hợp WebHooks</b> → ② bấm <b>+ Thêm webhook</b> → ③ nhập tên webhook bất kỳ, dán URL{' '}
            <code>https://thviet.store/api/payments/sepay-webhook</code>, chọn sự kiện <b>Tiền vào</b> và định dạng{' '}
            <b>JSON</b> → ④ bấm <b>Tiếp theo</b>. Sau đó tích chọn tài khoản ngân hàng của chi nhánh, phương thức bảo mật <b>API Key</b> (dán mã xác thực được cấp), kiểm tra rồi bấm <b>Thêm</b>.
          </div>
        </div>
      </div>

      {/* Bước 5 */}
      <div
        style={{
          padding: 14,
          border: '1px solid #99f6e4',
          borderRadius: 8,
          backgroundColor: '#f0fdfa',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={18} color="#0f766e" />
          <span>⑤ Kích hoạt VietQR và phân bổ két / chi nhánh</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
          Sau khi kết nối SePay thành công, trạng thái tài khoản sẽ chuyển sang <b>● SePay đã kết nối</b>. Bạn có thể
          kích hoạt nhận VietQR tự động cho từng chi nhánh hoặc toàn hệ thống tại quầy thu ngân POS.
        </div>
      </div>
    </div>
  );
};
