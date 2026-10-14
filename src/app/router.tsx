import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';
import { SupplierListPage, SupplierDetailPage, SupplierProductManagementPage } from '../features/supplier';
import { OrderMatrixPage, BranchOrderListPage, EmployeeOrderMatrixPage } from '../features/purchase-order';
import { ServiceExpensesPage } from '../features/service-expenses/pages/ServiceExpensesPage';
import { CustomerManagementPage } from '../features/customer-crm';
import { StoreOwnerLayout } from '../layouts/StoreOwnerLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TenantManagementPage } from '../pages/admin/TenantManagementPage';
import { SubscriptionPlanPage } from '../pages/admin/SubscriptionPlanPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../pages/auth';
import { PosCheckoutPage, PosShiftPage } from '../features/pos';

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
        path: 'subscriptions',
        element: <SubscriptionPlanPage />,
      },
      {
        path: 'plans',
        element: <SubscriptionPlanPage />,
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
        path: 'purchase-orders',
        element: <BranchOrderListPage />,
      },
      {
        path: 'purchase-orders/branches',
        element: <BranchOrderListPage />,
      },
      {
        path: 'purchase-orders/create-matrix',
        element: <OrderMatrixPage />,
      },
      {
        path: 'purchase-orders/employee-matrix',
        element: <EmployeeOrderMatrixPage />,
      },
      {
        path: 'expenses',
        element: <ServiceExpensesPage />,
      },
      {
        path: 'customers',
        element: <CustomerManagementPage />,
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
        path: 'purchase-orders',
        element: <BranchOrderListPage />,
      },
      {
        path: 'purchase-orders/branches',
        element: <BranchOrderListPage />,
      },
      {
        path: 'purchase-orders/create-matrix',
        element: <OrderMatrixPage />,
      },
      {
        path: 'purchase-orders/employee-matrix',
        element: <EmployeeOrderMatrixPage />,
      },
      {
        path: 'expenses',
        element: <ServiceExpensesPage />,
      },
      {
        path: 'customers',
        element: <CustomerManagementPage />,
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
        path: 'purchase-orders',
        element: <Navigate to="/store-owner/purchase-orders/branches" replace />,
      },
      {
        path: 'purchase-orders/branches',
        element: <Navigate to="/store-owner/purchase-orders/branches" replace />,
      },
      {
        path: 'purchase-orders/create-matrix',
        element: <OrderMatrixPage />,
      },
      {
        path: 'expenses',
        element: <Navigate to="/store-owner/expenses" replace />,
      },
      {
        path: 'customers',
        element: <Navigate to="/store-owner/customers" replace />,
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
      {
        path: 'customers',
        element: <Navigate to="/store-owner/customers" replace />,
      },
    ],
  },
  {
    path: '/customers',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <CustomerManagementPage />,
      },
    ],
  },
  {
    path: '/pos',
    element: <PosLayout />,
    children: [
      {
        index: true,
        element: <PosCheckoutPage />,
      },
      {
        path: 'shift',
        element: <PosShiftPage />,
      },
    ],
  },
  {
    path: '/employee',
    children: [
      {
        index: true,
        element: <Navigate to="/employee/pos" replace />,
      },
      {
        path: 'pos',
        element: <PosLayout />,
        children: [
          {
            index: true,
            element: <PosCheckoutPage />,
          },
          {
            path: 'shift',
            element: <PosShiftPage />,
          },
        ],
      },
      {
        element: <StoreOwnerLayout />,
        children: [
          {
            path: 'purchase-orders/create-matrix',
            element: <EmployeeOrderMatrixPage />,
          },
        ],
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
  {
    path: '/branch',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/branch/purchase-orders/create-matrix" replace />,
      },
      {
        path: 'purchase-orders/create-matrix',
        element: <EmployeeOrderMatrixPage />,
      },
    ],
  },
]);
