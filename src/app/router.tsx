import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';

import { AdminLayout } from '../layouts/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TenantManagementPage } from '../pages/admin/TenantManagementPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../pages/auth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'tenants',
        element: <TenantManagementPage />,
      },
    ],
  },
  {
    path: '/dashboard',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'tenants',
        element: <TenantManagementPage />,
      },
    ],
  },
  {
    path: '/pos',
    element: <PosLayout />,
    children: [
      {
        index: true,
        element: <div className="p-4 text-emerald-400">Màn hình Quầy Bán hàng POS Checkout</div>,
      },
    ],
  },
  {
    path: '/store',
    element: <WebStoreLayout />,
    children: [
      {
        index: true,
        element: <div className="text-gray-600">Gian hàng trực tuyến Mini Web Store</div>,
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
    ],
  },
  // Đường dẫn rút gọn tiện dụng
  {
    path: '/login',
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: '/register',
    element: <Navigate to="/auth/register" replace />,
  },
  {
    path: '/forgot-password',
    element: <Navigate to="/auth/forgot-password" replace />,
  },
]);
