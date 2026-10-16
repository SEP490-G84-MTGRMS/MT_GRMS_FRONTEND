import type { FC } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  TruckIcon,
  PackageIcon,
  DashboardIcon,
  HomeIcon,
  BellIcon,
} from '../../features/admin/components';

export const StoreOwnerTopbar: FC = () => {
  return (
    <header
      style={{
        height: 68,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0, 40, 120, 0.04)',
        gap: 24,
      }}
    >
      {/* Left: Brand + Horizontal Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexShrink: 0 }}>
        {/* Brand Link */}
        <Link
          to="/store-owner/suppliers"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
          title="MT-GRMS Store Owner Management"
        >
          <div
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
                fill="url(#brandBlueGradStoreReact)"
              />
              <path
                d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
                fill="#00C2FF"
                fillOpacity="0.9"
              />
              <circle cx="14" cy="22" r="3.5" fill="#FFFFFF" />
              <defs>
                <linearGradient
                  id="brandBlueGradStoreReact"
                  x1="4"
                  y1="2"
                  x2="24"
                  y2="31"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#0066FF" />
                  <stop offset="1" stopColor="#003D99" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              MT-GRMS
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--blue-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}
            >
              Store Owner
            </span>
          </div>
        </Link>

        {/* Vertical Divider */}
        <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-light)' }} />

        {/* Horizontal Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavLink
            to="/store-owner/suppliers"
            end
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 700 : 600,
              backgroundColor: isActive ? 'var(--blue-primary)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              boxShadow: isActive ? '0 4px 14px rgba(0, 102, 255, 0.28)' : 'none',
              transition: 'all 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
                <TruckIcon size={17} />
                <span>Nhà cung cấp</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 102, 255, 0.12)',
                    color: isActive ? '#ffffff' : 'var(--blue-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  18 NCC
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/store-owner/suppliers/products"
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 700 : 600,
              backgroundColor: isActive ? 'var(--blue-primary)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              boxShadow: isActive ? '0 4px 14px rgba(0, 102, 255, 0.28)' : 'none',
              transition: 'all 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
                <PackageIcon size={17} />
                <span>Sản phẩm NCC</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(2, 132, 199, 0.12)',
                    color: isActive ? '#ffffff' : '#0284c7',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Master
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/admin/dashboard"
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 700 : 600,
              backgroundColor: isActive ? 'var(--blue-primary)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              boxShadow: isActive ? '0 4px 14px rgba(0, 102, 255, 0.28)' : 'none',
              transition: 'all 0.15s ease',
            })}
          >
            <DashboardIcon size={17} />
            <span>Tổng quan Nền tảng</span>
          </NavLink>
        </nav>
      </div>

      {/* Right: Tenant Pill + Status + Subscriptions Badge + User Profile + Home button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Tenant Info Pill Link */}
        <Link
          to="/store-owner/subscriptions?tab=store-info"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--bg-soft-blue)',
            border: '1px solid var(--border-light)',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text-main)',
            textDecoration: 'none',
            transition: 'border-color 0.15s ease',
          }}
          title="Xem & chỉnh sửa thông tin gian hàng"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue-primary)' }}>
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
          </svg>
          <span>Chuỗi Siêu thị Mini Minh Đức</span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--green-money)',
              display: 'inline-block',
            }}
            title="Đang hoạt động"
          />
        </Link>

        {/* Subscription Plan & Expiry Pill */}
        <Link
          to="/store-owner/subscriptions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: '#FFF0F0',
            border: '1px solid #FFD6D6',
            color: '#FF3B30',
            fontSize: 12,
            fontWeight: 700,
            textDecoration: 'none',
          }}
          title="Gói dịch vụ: Còn 3 ngày dùng thử. Bấm để nâng cấp!"
        >
          <span>Gói dùng thử: 3 ngày</span>
        </Link>

        {/* Notification Bell */}
        <button
          type="button"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--bg-soft-blue)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: 'var(--text-muted)',
          }}
          title="Thông báo hệ thống"
        >
          <BellIcon size={18} color="var(--text-muted)" />
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--red-accent)',
              border: '1.5px solid #ffffff',
            }}
          />
        </button>

        {/* Profile Pill Link */}
        <Link
          to="/store-owner/subscriptions?tab=account-profile"
          className="admin-profile-pill"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          title="Tài khoản cá nhân"
        >
          <div
            className="admin-avatar"
            style={{ background: 'linear-gradient(135deg, #0066FF, #00C2FF)' }}
          >
            NL
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              Nhật Long
            </span>
            <span style={{ fontSize: 11, color: 'var(--blue-primary)', fontWeight: 600 }}>
              Admin Chuỗi
            </span>
          </div>
        </Link>

        {/* Return to Home link */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            backgroundColor: 'var(--blue-light)',
            border: '1px solid var(--blue-border)',
            color: 'var(--blue-primary)',
            borderRadius: 'var(--radius-pill)',
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
          title="Về Trang Chủ Giới Thiệu"
        >
          <HomeIcon size={15} />
          <span>Trang Chủ</span>
        </Link>
      </div>
    </header>
  );
};
