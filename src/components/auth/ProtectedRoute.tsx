import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    const currentPath = location.pathname + location.search;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(currentPath)}`} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const rawRole = (user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
    const isAllowed =
      normalizedAllowed.includes(rawRole) ||
      (Boolean(user.isAdmin) && normalizedAllowed.includes('ADMIN'));

    if (!isAllowed) {
      // Nếu là Employee cố tình truy cập vào các trang StoreOwner/Admin -> chuyển hướng về POS
      if (rawRole === 'EMPLOYEE' || rawRole === 'CASHIER' || rawRole === 'STAFF') {
        return <Navigate to="/employee/pos" replace />;
      }

      // Nếu là StoreOwner cố tình truy cập /admin -> chuyển về StoreOwner Dashboard
      return <Navigate to="/store-owner/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
