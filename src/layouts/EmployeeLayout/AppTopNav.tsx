import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CameraOff,
  Bell,
  LogOut,
  MessageCircle,
  ChevronDown,
  X,
  Upload,
  CheckCircle2,
  Store,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

/* ─── Brand Logo SVG ─── */
const BrandLogo: FC = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
    <path
      d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
      fill="url(#navBrandGradEmp)"
    />
    <path
      d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
      fill="#14B8A6"
      fillOpacity="0.9"
    />
    <circle cx="14" cy="22" r="3.5" fill="#FFFFFF" />
    <defs>
      <linearGradient
        id="navBrandGradEmp"
        x1="4"
        y1="2"
        x2="24"
        y2="31"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0F766E" />
        <stop offset="1" stopColor="#115E59" />
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Modal Gửi yêu cầu Chấm công (Sự cố FaceID) ─── */
interface FaceCheckInRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
  employeeCode?: string;
  branchName?: string;
}

const FaceCheckInRequestModal: FC<FaceCheckInRequestModalProps> = ({
  isOpen,
  onClose,
  employeeName = 'Nhân viên',
  employeeCode = 'NV001',
  branchName = 'Chi nhánh trung tâm',
}) => {
  const [shiftName, setShiftName] = useState('Ca sáng (06:00 - 14:00)');
  const [issueType, setIssueType] = useState('FACE_NOT_MATCH');
  const [workDate, setWorkDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [actualCheckInTime, setActualCheckInTime] = useState('06:05');
  const [reason, setReason] = useState('');
  const [imageEvidence, setImageEvidence] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageEvidence(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do giải trình sự cố.');
      return;
    }

    setIsSubmitting(true);
    // Giả lập lưu request ngoại lệ chấm công cho chủ cửa hàng duyệt
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
        setReason('');
        setImageEvidence(null);
      }, 1500);
    }, 700);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          width: '100%',
          maxWidth: 580,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CameraOff size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                Yêu cầu Chấm công (Sự cố FaceID)
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
                Gửi yêu cầu giải trình điểm danh khi không thể check-in bằng khuôn mặt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSubmitted ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={54} color="#0F766E" style={{ margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              Gửi yêu cầu chấm công thành công!
            </h4>
            <p style={{ fontSize: 13.5, color: '#64748B', maxWidth: 400, margin: '0 auto' }}>
              Yêu cầu của bạn đã được chuyển tới Chủ cửa hàng / Quản lý để xét duyệt và chấm công trực tiếp theo quy định.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Box hướng dẫn quy tắc BR-03 */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Info size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, color: '#1E40AF', lineHeight: 1.5 }}>
                  <strong>Quy định nghiệp vụ (BR-03):</strong> Khi camera quầy gặp sự cố hoặc điểm nhận diện FaceID không khớp (&lt; 85%), nhân viên gửi giải trình kèm giờ có mặt thực tế để Chủ cửa hàng duyệt và chấm công trực tiếp.
                </div>
              </div>

              {/* Thông tin nhân viên */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Nhân viên
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${employeeName} (${employeeCode})`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F1F5F9',
                      fontSize: 13,
                      color: '#475569',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Chi nhánh làm việc
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={branchName}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F1F5F9',
                      fontSize: 13,
                      color: '#475569',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Ngày và Ca làm việc */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Ngày làm việc *
                  </label>
                  <input
                    type="date"
                    required
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Ca làm việc *
                  </label>
                  <select
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Ca sáng (06:00 - 14:00)">Ca sáng (06:00 - 14:00)</option>
                    <option value="Ca chiều (14:00 - 22:00)">Ca chiều (14:00 - 22:00)</option>
                    <option value="Ca đêm (22:00 - 06:00)">Ca đêm (22:00 - 06:00)</option>
                    <option value="Ca hành chính (08:00 - 17:00)">Ca hành chính (08:00 - 17:00)</option>
                  </select>
                </div>
              </div>

              {/* Loại sự cố và Giờ check-in thực tế */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Nguyên nhân không thể FaceID *
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="FACE_NOT_MATCH">Không nhận diện được khuôn mặt (Độ khớp &lt; 85%)</option>
                    <option value="CAMERA_OFFLINE">Camera POS quầy mất kết nối / hỏng</option>
                    <option value="LIGHTING_ISSUE">Góc camera quầy bị lóa sáng / tối</option>
                    <option value="SYSTEM_ERROR">Ứng dụng điểm danh báo lỗi kết nối máy chủ</option>
                    <option value="OTHER">Lý do khác</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Giờ có mặt thực tế *
                  </label>
                  <input
                    type="time"
                    required
                    value={actualCheckInTime}
                    onChange={(e) => setActualCheckInTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Lý do chi tiết */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Giải trình chi tiết sự cố *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Đã đứng trước camera tại quầy thu ngân lúc 06:05 nhưng camera báo lỗi không nhận diện được góc mặt..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Đính kèm ảnh bằng chứng */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Hình ảnh bằng chứng (ảnh tại quầy hoặc màn hình lỗi - Tùy chọn)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {imageEvidence ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={imageEvidence}
                      alt="Ảnh bằng chứng"
                      style={{
                        width: 120,
                        height: 90,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageEvidence(null)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 6,
                      border: '1px dashed #94A3B8',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={16} />
                    <span>Tải ảnh bằng chứng lên</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 4px rgba(15, 118, 110, 0.25)',
                }}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu duyệt'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ─── Main Employee Top Navigation Component ─── */
export const AppTopNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showFaceCheckInModal, setShowFaceCheckInModal] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // Close account menu on click outside or Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isScheduleActive =
    location.pathname === '/employee/schedule' ||
    location.pathname === '/employees/schedule' ||
    location.pathname.startsWith('/employee/schedule');

  const isAttendanceActive =
    location.pathname === '/employee/attendance' ||
    location.pathname === '/employees/attendance' ||
    location.pathname.startsWith('/employee/attendance');

  return (
    <>
      <nav
        className="topnav-primary"
        style={{
          backgroundColor: '#0F766E', // Gam màu chủ đạo chuẩn MT-GRMS
          borderBottom: '1px solid #115E59',
          position: 'sticky',
          top: 0,
          zIndex: 200,
          boxShadow: '0 2px 10px rgba(15, 118, 110, 0.2)',
        }}
        aria-label="Điều hướng Cổng Nhân Viên"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 52,
            padding: '0 24px',
            gap: 16,
            boxSizing: 'border-box',
          }}
        >
          {/* Brand Logo & Name */}
          <Link
            to="/employee/schedule"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              flexShrink: 0,
              marginRight: 12,
            }}
          >
            <BrandLogo />
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                }}
              >
                MT-GRMS
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Cổng Nhân Viên
              </div>
            </div>
          </Link>

          {/* Vertical Divider */}
          <div
            style={{
              width: 1,
              height: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            }}
          />

          {/* Menus List for Employee */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              height: 52,
              gap: 4,
              flex: 1,
            }}
          >
            {/* 1. Xem lịch làm việc */}
            <NavLink
              to="/employee/schedule"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                height: '100%',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isScheduleActive ? 700 : 500,
                color: '#ffffff',
                backgroundColor: isScheduleActive
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'transparent',
                borderBottom: isScheduleActive
                  ? '3px solid #FCD34D' // Highlight vàng nổi bật
                  : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                if (!isScheduleActive)
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                if (!isScheduleActive)
                  e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Calendar size={17} color="currentColor" />
              <span>Xem lịch làm việc</span>
            </NavLink>

            {/* 2. Bảng chấm công & điểm danh */}
            <NavLink
              to="/employee/attendance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                height: '100%',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isAttendanceActive ? 700 : 500,
                color: '#ffffff',
                backgroundColor: isAttendanceActive
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'transparent',
                borderBottom: isAttendanceActive
                  ? '3px solid #FCD34D'
                  : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                if (!isAttendanceActive)
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                if (!isAttendanceActive)
                  e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Clock size={17} color="currentColor" />
              <span>Bảng chấm công</span>
            </NavLink>
          </div>

          {/* Right Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            {/* Nút chính: Gửi yêu cầu Chấm công (Sự cố FaceID) */}
            <button
              type="button"
              onClick={() => setShowFaceCheckInModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                backgroundColor: '#F59E0B', // Màu cam vàng cảnh báo / ngoại lệ
                border: 'none',
                color: '#78350F',
                padding: '7px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FBBF24';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F59E0B';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Nhấn để gửi yêu cầu chấm công khi không thể nhận diện khuôn mặt tại quầy"
            >
              <CameraOff size={16} strokeWidth={2.2} />
              <span>Báo lỗi FaceID / Yêu cầu chấm công</span>
            </button>

            {/* Hỗ trợ */}
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 20,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() =>
                alert('Tổng đài hỗ trợ nhân viên MT-GRMS: 1900 6522 (8h00 - 22h00 hàng ngày)')
              }
              title="Tổng đài CSKH: 1900 6522"
            >
              <MessageCircle size={15} strokeWidth={2} />
              <span>Hỗ trợ</span>
            </button>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              }}
            />

            {/* Notification Bell */}
            <button
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                color: '#ffffff',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Thông báo"
            >
              <Bell size={16} strokeWidth={2} />
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                }}
              />
            </button>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 20,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: '#14B8A6',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {user?.fullName?.charAt(0).toUpperCase() || 'N'}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#ffffff',
                      maxWidth: 120,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.fullName || 'Nhân viên'}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#CCFBF1',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {user?.role || 'EMPLOYEE'}
                  </div>
                </div>
                <ChevronDown size={14} color="#ffffff" />
              </button>

              {/* Account Dropdown Menu */}
              {accountMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 240,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #E2E8F0',
                    padding: '8px 0',
                    zIndex: 250,
                  }}
                >
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                      {user?.fullName || 'Nhân viên'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {user?.email || 'nhanvien@mt-grms.vn'}
                    </div>
                    {user?.tenantName && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#0F766E',
                          fontWeight: 600,
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Store size={12} />
                        <span>{user.tenantName}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '4px 0' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFaceCheckInModal(true);
                        setAccountMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '9px 16px',
                        border: 'none',
                        background: 'none',
                        fontSize: 13,
                        color: '#B45309',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEF3C7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <CameraOff size={16} />
                      <span>Gửi yêu cầu FaceID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/employee/schedule');
                        setAccountMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '9px 16px',
                        border: 'none',
                        background: 'none',
                        fontSize: 13,
                        color: '#334155',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Calendar size={16} />
                      <span>Lịch làm việc của tôi</span>
                    </button>
                  </div>

                  <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '9px 16px',
                      border: 'none',
                      background: 'none',
                      fontSize: 13,
                      color: '#EF4444',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Modal gửi yêu cầu Chấm công (Sự cố FaceID) */}
      <FaceCheckInRequestModal
        isOpen={showFaceCheckInModal}
        onClose={() => setShowFaceCheckInModal(false)}
        employeeName={user?.fullName || 'Nhân viên'}
        employeeCode={user?.email ? user.email.split('@')[0].toUpperCase() : 'NV001'}
        branchName={user?.tenantName || 'Chi nhánh trung tâm'}
      />
    </>
  );
};

export default AppTopNav;

