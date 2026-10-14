import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';
import { SupplierListPage, SupplierDetailPage, SupplierProductManagementPage } from '../features/supplier';
import { OrderMatrixPage, BranchOrderListPage, EmployeeOrderMatrixPage } from '../features/purchase-order';
import { ServiceExpensesPage } from '../features/service-expenses/pages/ServiceExpensesPage';
import { ProductListPage } from '../features/product';
import { CustomerManagementPage } from '../features/customer-crm';
import { StoreOwnerLayout } from '../layouts/StoreOwnerLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TenantManagementPage } from '../pages/admin/TenantManagementPage';
import { PosCheckoutPage, PosShiftPage, InventoryLookupPage, InvoiceManagementPage } from '../features/pos';
import { PromotionListPage, VoucherListPage, LoyaltyConfigPage } from '../features/promotion';

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
        path: 'products',
        element: <ProductListPage />,
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
      {
        path: 'promotions',
        element: <PromotionListPage />,
      },
      {
        path: 'vouchers',
        element: <VoucherListPage />,
      },
      {
        path: 'loyalty-config',
        element: <LoyaltyConfigPage />,
      },
      {
        path: 'inventory-lookup',
        element: <InventoryLookupPage />,
      },
      {
        path: 'orders',
        element: <InvoiceManagementPage />,
      },
      {
        path: 'invoices',
        element: <InvoiceManagementPage />,
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
        path: 'products',
        element: <ProductListPage />,
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
    path: '/products',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <ProductListPage />,
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
      {
        path: 'inventory-lookup',
        element: <InventoryLookupPage />,
      },
      {
        path: 'orders',
        element: <InvoiceManagementPage />,
      },
      {
        path: 'invoices',
        element: <InvoiceManagementPage />,
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
          {
            path: 'inventory-lookup',
            element: <InventoryLookupPage />,
          },
          {
            path: 'orders',
            element: <InvoiceManagementPage />,
          },
          {
            path: 'invoices',
            element: <InvoiceManagementPage />,
          },
        ],
      },
      {
        path: 'inventory-lookup',
        element: <InventoryLookupPage />,
      },
      {
        path: 'orders',
        element: <InvoiceManagementPage />,
      },
      {
        path: 'invoices',
        element: <InvoiceManagementPage />,
      },
      {
        path: 'purchase-orders',
        element: <StoreOwnerLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/employee/purchase-orders/create-matrix" replace />,
          },
          {
            path: 'create-matrix',
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
        path: 'login',
        element: <div className="text-gray-600 text-center">Trang Đăng nhập Hệ thống</div>,
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