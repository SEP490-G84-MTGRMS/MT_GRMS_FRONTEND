import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Bell,
  LogOut,
  MessageCircle,
  ChevronDown,
  Store,
  FileText,
  FilePlus,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ApprovalRequestsModal } from '../../features/employee/components/ApprovalRequestsModal';
import { CreateScheduleRequestModal } from '../../features/employee/components/CreateScheduleRequestModal';
import { scheduleApprovalApi } from '../../features/employee/api/scheduleApprovalApi';
import { scheduleApi } from '../../features/employee/api/scheduleApi';

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

/* ─── Main Employee Top Navigation Component ─── */
export const AppTopNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showApprovalRequestsModal, setShowApprovalRequestsModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [hasActiveCheckInToday, setHasActiveCheckInToday] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const isOwnerOrAdmin = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  const syncTodayAttendanceStatus = useCallback(() => {
    if (!user || isOwnerOrAdmin) {
      setHasActiveCheckInToday(false);
      return;
    }
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayIso = `${yyyy}-${mm}-${dd}`;
    scheduleApi
      .getRawMySchedules(todayIso, todayIso)
      .then((list) => {
        const checkedIn = list.some(
          (s) => Boolean(s.checkInTime) && !s.checkOutTime && s.status !== 'Cancelled'
        );
        setHasActiveCheckInToday(checkedIn);
      })
      .catch(() => {
        // Giữ nguyên trạng thái hiện tại nếu mất mạng tạm thời
      });
  }, [user, isOwnerOrAdmin]);

  useEffect(() => {
    syncTodayAttendanceStatus();
    const handleAttendanceUpdated = () => syncTodayAttendanceStatus();
    window.addEventListener('pos-attendance-updated', handleAttendanceUpdated);
    return () => {
      window.removeEventListener('pos-attendance-updated', handleAttendanceUpdated);
    };
  }, [syncTodayAttendanceStatus, location.pathname]);

  const fetchPendingCount = useCallback(() => {
    if (isOwnerOrAdmin) {
      scheduleApprovalApi
        .getPendingRequests()
        .then((res) => setPendingApprovalCount(res.total || 0))
        .catch(() => setPendingApprovalCount(0));
    }
  }, [isOwnerOrAdmin]);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

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

  const isPayrollActive =
    location.pathname === '/employee/payroll' ||
    location.pathname === '/employees/payroll' ||
    location.pathname.startsWith('/employee/payroll');

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

            {/* 3. Phiếu lương của tôi */}
            <NavLink
              to="/employee/payroll"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                height: '100%',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isPayrollActive ? 700 : 500,
                color: '#ffffff',
                backgroundColor: isPayrollActive
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'transparent',
                borderBottom: isPayrollActive
                  ? '3px solid #FCD34D'
                  : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                if (!isPayrollActive)
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                if (!isPayrollActive)
                  e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FileText size={17} color="currentColor" />
              <span>Phiếu lương của tôi</span>
            </NavLink>

            {/* 4. Làm đơn (Xin nghỉ, Đổi ca, Sự cố FaceID, Làm thêm OT) */}
            <button
              type="button"
              onClick={() => setShowCreateRequestModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                height: '100%',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: showCreateRequestModal ? 700 : 500,
                color: '#ffffff',
                backgroundColor: showCreateRequestModal
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'transparent',
                border: 'none',
                borderBottom: showCreateRequestModal
                  ? '3px solid #FCD34D'
                  : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!showCreateRequestModal)
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                if (!showCreateRequestModal)
                  e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Gửi phiếu yêu cầu (Xin nghỉ phép, Đổi ca, Sự cố FaceID, Làm thêm giờ OT)"
            >
              <FilePlus size={17} color="currentColor" />
              <span>Làm đơn</span>
            </button>

            {/* 5. Vào màn hình Bán hàng POS (hiển thị ngay khi nhân viên đã chấm công vào ca hôm nay) */}
            {hasActiveCheckInToday && (
              <button
                type="button"
                onClick={() => navigate('/employee/pos')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: 'auto 0 auto 8px',
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid #FDE68A',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
                }}
                title="Mở giao diện Bán hàng POS tại quầy"
              >
                <Store size={16} />
                <span>Vào màn hình Bán hàng POS</span>
              </button>
            )}
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
              onClick={() => {
                if (isOwnerOrAdmin) {
                  setShowApprovalRequestsModal(true);
                }
              }}
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
              title={isOwnerOrAdmin ? `Có ${pendingApprovalCount} yêu cầu chờ duyệt` : "Thông báo"}
            >
              <Bell size={16} strokeWidth={2} />
              {pendingApprovalCount > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #0F766E',
                  }}
                >
                  {pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}
                </span>
              ) : null}
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
                    {user?.role || 'STAFF'}
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

      {/* Modal duyệt yêu cầu (Dành cho Quản lý / Chủ cửa hàng) */}
      <ApprovalRequestsModal
        isOpen={showApprovalRequestsModal}
        onClose={() => setShowApprovalRequestsModal(false)}
        onSuccess={fetchPendingCount}
      />

      {/* Modal Làm đơn cho nhân viên (Nghỉ phép, Đổi ca, Sự cố FaceID, Làm thêm OT) */}
      <CreateScheduleRequestModal
        isOpen={showCreateRequestModal}
        onClose={() => setShowCreateRequestModal(false)}
        schedule={null}
      />
    </>
  );
};

export default AppTopNav;

