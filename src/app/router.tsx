import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';
import { SupplierListPage, SupplierDetailPage, SupplierProductManagementPage } from '../features/supplier';
import { OrderMatrixPage, BranchOrderListPage, EmployeeOrderMatrixPage, SupplierOrderDispatchHubPage } from '../features/purchase-order';
import { ServiceExpensesPage } from '../features/service-expenses/pages/ServiceExpensesPage';
import { CustomerManagementPage } from '../features/customer-crm';
import { StoreOwnerLayout } from '../layouts/StoreOwnerLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TenantManagementPage } from '../pages/admin/TenantManagementPage';

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
        path: 'purchase-orders/dispatch-hub',
        element: <SupplierOrderDispatchHubPage />,
      },
      {
        path: 'purchase-orders/cutoff-hub',
        element: <SupplierOrderDispatchHubPage />,
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
        path: 'purchase-orders/dispatch-hub',
        element: <SupplierOrderDispatchHubPage />,
      },
      {
        path: 'purchase-orders/cutoff-hub',
        element: <SupplierOrderDispatchHubPage />,
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
  {
    path: '/employee',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/employee/purchase-orders/create-matrix" replace />,
      },
      {
        path: 'purchase-orders/create-matrix',
        element: <EmployeeOrderMatrixPage />,
      },
    ],
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