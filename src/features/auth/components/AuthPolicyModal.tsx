import type { FC } from 'react';
import { X, ShieldCheck, Lock } from 'lucide-react';

export type AuthPolicyDocType = 'terms' | 'privacy';

interface AuthPolicyModalProps {
  docType: AuthPolicyDocType | null;
  onClose: () => void;
  onAccept?: () => void;
}

export const AuthPolicyModal: FC<AuthPolicyModalProps> = ({
  docType,
  onClose,
  onAccept,
}) => {
  if (!docType) return null;

  const isTerms = docType === 'terms';

  return (
    <div
      className="store-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 1400,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isTerms ? 'Điều khoản sử dụng' : 'Chính sách bảo mật'}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 20px 44px rgba(15, 23, 42, 0.18)',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0066FF',
              }}
            >
              {isTerms ? <ShieldCheck size={18} /> : <Lock size={18} />}
            </span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              {isTerms ? 'Điều khoản sử dụng THViet / MT-GRMS' : 'Chính sách bảo mật dữ liệu'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: '20px 22px',
            maxHeight: '62vh',
            overflowY: 'auto',
            fontSize: 13.5,
            lineHeight: 1.65,
            color: '#334155',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {isTerms ? (
            <>
              <div>
                <strong style={{ color: '#0F172A' }}>1. Phạm vi dịch vụ:</strong> Nền tảng THViet (MT-GRMS) cung cấp giải pháp quản lý bán hàng POS, tồn kho theo lô FEFO, công nợ, sổ quỹ và đa chi nhánh cho tiệm tạp hóa và siêu thị mini theo mô hình Multi-Tenant SaaS.
              </div>
              <div>
                <strong style={{ color: '#0F172A' }}>2. Trách nhiệm tài khoản:</strong> Chủ cửa hàng chịu trách nhiệm bảo mật thông tin đăng nhập, mã OTP xác thực và phân quyền nhân viên đúng vai trò vận hành tại cửa hàng.
              </div>
              <div>
                <strong style={{ color: '#0F172A' }}>3. Gói cước & Thanh toán:</strong> Các gói dịch vụ trả phí và tiện ích mở rộng được niêm yết minh bạch trên trang Quản lý gói, thanh toán tự động qua Ví gian hàng VietQR Napas247.
              </div>
            </>
          ) : (
            <>
              <div>
                <strong style={{ color: '#0F172A' }}>1. Quyền sở hữu dữ liệu:</strong> Toàn bộ dữ liệu hàng hóa, hóa đơn, doanh thu, giá vốn và sổ nợ khách hàng thuộc quyền sở hữu riêng biệt của từng gian hàng.
              </div>
              <div>
                <strong style={{ color: '#0F172A' }}>2. Cô lập dữ liệu đa gian hàng:</strong> Hệ thống áp dụng cơ chế cô lập dữ liệu Multi-Tenancy nghiêm ngặt, mã hóa mật khẩu một chiều và truyền tải phiên qua HttpOnly Cookies an toàn.
              </div>
              <div>
                <strong style={{ color: '#0F172A' }}>3. Cam kết không chia sẻ:</strong> Chúng tôi cam kết không cung cấp, mua bán hay chia sẻ dữ liệu kinh doanh của cửa hàng cho bất kỳ bên thứ ba nào khi chưa có sự đồng ý hợp pháp của Chủ gian hàng.
              </div>
            </>
          )}
        </div>

        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 9999,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              style={{
                padding: '8px 20px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tôi đã đọc và đồng ý
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
