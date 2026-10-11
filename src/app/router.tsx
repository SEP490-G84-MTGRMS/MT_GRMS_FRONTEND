import { createBrowserRouter } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';
import { SupplierListPage, SupplierDetailPage } from '../features/supplier';

import { AdminLayout } from '../layouts/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TenantManagementPage } from '../pages/admin/TenantManagementPage';

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
    path: '/store-owner',
    element: <AdminLayout />,
    children: [
      {
        path: 'suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'suppliers/:id',
        element: <SupplierDetailPage />,
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
      {
        path: 'suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'suppliers/:id',
        element: <SupplierDetailPage />,
      },
    ],
  },
  {
    path: '/suppliers',
    element: <SupplierListPage />,
  },
  {
    path: '/suppliers/:id',
    element: <SupplierDetailPage />,
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
        path: 'login',
        element: <div className="text-gray-600 text-center">Trang Đăng nhập Hệ thống</div>,
      },
    ],
  },
]);
