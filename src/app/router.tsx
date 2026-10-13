import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';
import { SupplierListPage, SupplierDetailPage, SupplierProductManagementPage } from '../features/supplier';
import { ServiceExpensesPage } from '../features/service-expenses/pages/ServiceExpensesPage';
import { StoreOwnerLayout } from '../layouts/StoreOwnerLayout';
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
    element: <StoreOwnerLayout />,
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
      {
        path: 'suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'suppliers/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'suppliers/:id',
        element: <SupplierDetailPage />,
      },
      {
        path: 'suppliers/:id/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'expenses',
        element: <ServiceExpensesPage />,
      },
    ],
  },
  {
    path: '/store-owner',
    element: <StoreOwnerLayout />,
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
        path: 'suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'suppliers/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'suppliers/:id',
        element: <SupplierDetailPage />,
      },
      {
        path: 'suppliers/:id/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'expenses',
        element: <ServiceExpensesPage />,
      },
    ],
  },
  {
    path: '/dashboard',
    element: <StoreOwnerLayout />,
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
        path: 'suppliers/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'suppliers/:id',
        element: <SupplierDetailPage />,
      },
      {
        path: 'suppliers/:id/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'expenses',
        element: <Navigate to="/store-owner/expenses" replace />,
      },
    ],
  },
  {
    path: '/suppliers',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <SupplierListPage />,
      },
      {
        path: 'products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: ':id',
        element: <SupplierDetailPage />,
      },
      {
        path: ':id/products',
        element: <SupplierProductManagementPage />,
      },
      {
        path: 'expenses',
        element: <Navigate to="/store-owner/expenses" replace />,
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
