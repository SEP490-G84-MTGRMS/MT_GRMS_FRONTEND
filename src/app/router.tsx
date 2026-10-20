import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { HomePage } from '../pages/HomePage';
import { StoreOwnerLayout } from '../layouts/StoreOwnerLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { StoreOwnerDashboardPage } from '../features/store-owner-dashboard/pages/StoreOwnerDashboardPage';
import { TenantManagementPage } from '../pages/admin/TenantManagementPage';
// 1. Supplier Feature
import {
  SupplierListPage,
  SupplierDetailPage,
  SupplierProductManagementPage,
} from '../features/supplier';

// 2. Purchase Orders Feature
import {
  OrderMatrixPage,
  BranchOrderListPage,
  EmployeeOrderMatrixPage,
  SupplierOrderDispatchHubPage,
  StoreOwnerPurchaseOrderListPage,
} from '../features/purchase-order';

// 2b. Goods Receipt Feature (FE-05 / UI-05-03)
import {
  GoodsReceiptListPage,
  GoodsReceiptFormPage,
  GoodsReceiptDetailPage,
} from '../features/goods-receipt';

// 2c. Batch & Expiry Feature (FE-02 / UI-02-01)
import { BatchListPage } from '../features/batch';

// 3. Service Expenses Feature (FE-07)
import { ServiceExpensesPage } from '../features/service-expenses/pages/ServiceExpensesPage';

// 4. Customer CRM Feature (FE-08)
import { CustomerManagementPage } from '../features/customer-crm';

// 5. Product Management Feature (FE-01)
import { ProductListPage } from '../features/product';

// 6. Transfer Feature (FE-15)
import {
  TransferListPage,
  CreateTransferPage,
  ReceiveTransferPage,
  TransferDetailPage,
} from '../features/transfer';

// 7. Employee Management Feature
import {
  EmployeeListPage,
  WorkSchedulePage,
  AttendancePage,
  PayslipManagementPage,
} from '../features/employee';

// 8. Promotions Feature
import {
  PromotionListPage,
  VoucherListPage,
  LoyaltyConfigPage,
} from '../features/promotion';

// 9. POS Feature
import {
  PosCheckoutPage,
  PosShiftPage,
  InventoryLookupPage,
  InvoiceManagementPage,
} from '../features/pos';

// 10. Subscriptions & Auth Features
import { SubscriptionPlanPage } from '../pages/admin/SubscriptionPlanPage';
import { SubscriptionPlanDetailPage } from '../pages/admin/SubscriptionPlanDetailPage';
import { SubscriptionPlanCreatePage } from '../pages/admin/SubscriptionPlanCreatePage';
import { SubscriptionPlanEditPage } from '../pages/admin/SubscriptionPlanEditPage';
import { TenantDetailPage } from '../pages/admin/TenantDetailPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../pages/auth';

// 11. Accounting & Finance Features (FE-10, FE-17, FE-19)
import { ReportsPnlDashboardPage } from '../features/reports-pnl';
import { CashbookPage } from '../features/cashbook';
import { TaxSnapshotPage } from '../features/tax-snapshot';
import { StoreSettingsHubPage } from '../pages/store/StoreSettingsHubPage';
import { AccountManagementPage } from '../pages/store/AccountManagementPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },

  // ─── ADMIN PORTAL (/admin) ───
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
      {
        path: 'tenants/:id',
        element: <TenantDetailPage />,
      },
      // ─── Chuyển hướng các nghiệp vụ bán lẻ cửa hàng sang /store-owner ───
      {
        path: 'transfers',
        element: <Navigate to="/store-owner/transfers" replace />,
      },
      {
        path: 'transfers/*',
        element: <Navigate to="/store-owner/transfers" replace />,
      },
      {
        path: 'suppliers',
        element: <Navigate to="/store-owner/suppliers" replace />,
      },
      {
        path: 'suppliers/*',
        element: <Navigate to="/store-owner/suppliers" replace />,
      },
      {
        path: 'products',
        element: <Navigate to="/store-owner/products" replace />,
      },
      {
        path: 'products/*',
        element: <Navigate to="/store-owner/products" replace />,
      },
      {
        path: 'subscriptions',
        element: <SubscriptionPlanPage />,
      },
      {
        path: 'subscriptions/create',
        element: <SubscriptionPlanCreatePage />,
      },
      {
        path: 'subscriptions/:id',
        element: <SubscriptionPlanDetailPage />,
      },
      {
        path: 'subscriptions/:id/edit',
        element: <SubscriptionPlanEditPage />,
      },
      {
        path: 'subscriptions/edit/:id',
        element: <SubscriptionPlanEditPage />,
      },
      {
        path: 'plans',
        element: <SubscriptionPlanPage />,
      },
      {
        path: 'plans/create',
        element: <SubscriptionPlanCreatePage />,
      },
      {
        path: 'plans/:id',
        element: <SubscriptionPlanDetailPage />,
      },
      {
        path: 'plans/:id/edit',
        element: <SubscriptionPlanEditPage />,
      },
      {
        path: 'plans/edit/:id',
        element: <SubscriptionPlanEditPage />,
      },
      {
        path: 'purchase-orders/*',
        element: <Navigate to="/store-owner/purchase-orders/branches" replace />,
      },
      {
        path: 'goods-receipts/*',
        element: <Navigate to="/store-owner/goods-receipts" replace />,
      },
      {
        path: 'batches/*',
        element: <Navigate to="/store-owner/batches" replace />,
      },
      {
        path: 'expiry/*',
        element: <Navigate to="/store-owner/batches" replace />,
      },
      {
        path: 'expenses/*',
        element: <Navigate to="/store-owner/expenses" replace />,
      },
      {
        path: 'customers/*',
        element: <Navigate to="/store-owner/customers" replace />,
      },
      {
        path: 'employees/*',
        element: <Navigate to="/store-owner/employees" replace />,
      },
      {
        path: 'promotions/*',
        element: <Navigate to="/store-owner/promotions" replace />,
      },
      {
        path: 'vouchers/*',
        element: <Navigate to="/store-owner/vouchers" replace />,
      },
      {
        path: 'reports/pnl',
        element: <Navigate to="/store-owner/reports/pnl" replace />,
      },
      {
        path: 'cashbook',
        element: <Navigate to="/store-owner/cashbook" replace />,
      },
      {
        path: 'cashbook/*',
        element: <Navigate to="/store-owner/cashbook" replace />,
      },
      {
        path: 'tax-snapshots',
        element: <Navigate to="/store-owner/tax-snapshots" replace />,
      },
      {
        path: 'tax-snapshots/*',
        element: <Navigate to="/store-owner/tax-snapshots" replace />,
      },
      {
        path: 'loyalty-config',
        element: <Navigate to="/store-owner/loyalty-config" replace />,
      },
      {
        path: 'inventory-lookup',
        element: <Navigate to="/store-owner/inventory-lookup" replace />,
      },
      {
        path: 'orders',
        element: <Navigate to="/store-owner/invoices" replace />,
      },
      {
        path: 'invoices',
        element: <Navigate to="/store-owner/invoices" replace />,
      },
    ],
  },

  // ─── STORE OWNER PORTAL (/store-owner) ───
  {
    path: '/store-owner',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <StoreOwnerDashboardPage />,
      },
      {
        path: 'dashboard',
        element: <StoreOwnerDashboardPage />,
      },
      {
        path: 'products',
        element: <ProductListPage />,
      },
      {
        path: 'transfers',
        element: <TransferListPage />,
      },
      {
        path: 'transfers/create',
        element: <CreateTransferPage />,
      },
      {
        path: 'transfers/:id',
        element: <TransferDetailPage />,
      },
      {
        path: 'transfers/:id/receive',
        element: <ReceiveTransferPage />,
      },
      {
        path: 'subscriptions',
        element: <StoreSettingsHubPage />,
      },
      {
        path: 'subscriptions/*',
        element: <StoreSettingsHubPage />,
      },
      {
        path: 'settings',
        element: <StoreSettingsHubPage />,
      },
      {
        path: 'settings/*',
        element: <StoreSettingsHubPage />,
      },
      {
        path: 'account',
        element: <AccountManagementPage />,
      },
      {
        path: 'account/*',
        element: <AccountManagementPage />,
      },
      {
        path: 'profile',
        element: <Navigate to="/store-owner/account?tab=account-profile" replace />,
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
        path: 'purchase-orders/list',
        element: <StoreOwnerPurchaseOrderListPage />,
      },
      {
        path: 'goods-receipts',
        element: <GoodsReceiptListPage defaultRole="store_owner" />,
      },
      {
        path: 'goods-receipts/create',
        element: <GoodsReceiptFormPage defaultRole="store_owner" />,
      },
      {
        path: 'goods-receipts/:id/edit',
        element: <GoodsReceiptFormPage defaultRole="store_owner" />,
      },
      {
        path: 'goods-receipts/:id',
        element: <GoodsReceiptDetailPage defaultRole="store_owner" />,
      },
      {
        path: 'goods-receipts/:id/confirm',
        element: <GoodsReceiptDetailPage defaultRole="store_owner" />,
      },
      {
        path: 'purchase-orders/receipts',
        element: <GoodsReceiptListPage defaultRole="store_owner" />,
      },
      {
        path: 'batches',
        element: <BatchListPage defaultRole="store_owner" />,
      },
      {
        path: 'expiry',
        element: <BatchListPage defaultRole="store_owner" />,
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
        path: 'reports/pnl',
        element: <ReportsPnlDashboardPage />,
      },
      {
        path: 'cashbook',
        element: <CashbookPage />,
      },
      {
        path: 'tax-snapshots',
        element: <TaxSnapshotPage />,
      },
      {
        path: 'employees',
        element: <EmployeeListPage />,
      },
      {
        path: 'employees/schedule',
        element: <WorkSchedulePage />,
      },
      {
        path: 'employees/attendance',
        element: <AttendancePage />,
      },
      {
        path: 'employees/payroll',
        element: <PayslipManagementPage />,
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

  // ─── DASHBOARD ALIAS (/dashboard) ───
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
        path: 'transfers',
        element: <TransferListPage />,
      },
      {
        path: 'transfers/create',
        element: <CreateTransferPage />,
      },
      {
        path: 'transfers/:id',
        element: <TransferDetailPage />,
      },
      {
        path: 'transfers/:id/receive',
        element: <ReceiveTransferPage />,
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
        element: <CustomerManagementPage />,
      },
      {
        path: 'employees',
        element: <EmployeeListPage />,
      },
      {
        path: 'employees/schedule',
        element: <WorkSchedulePage />,
      },
      {
        path: 'employees/attendance',
        element: <AttendancePage />,
      },
      {
        path: 'employees/payroll',
        element: <PayslipManagementPage />,
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
      {
        path: 'cashbook',
        element: <Navigate to="/store-owner/cashbook" replace />,
      },
    ],
  },

  // ─── SHORTCUTS TOP-LEVEL ROUTES ───
  // Products
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

  // Transfers
  {
    path: '/transfers',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <TransferListPage />,
      },
      {
        path: 'create',
        element: <CreateTransferPage />,
      },
      {
        path: ':id',
        element: <TransferDetailPage />,
      },
      {
        path: ':id/receive',
        element: <ReceiveTransferPage />,
      },
    ],
  },

  // Employees
  {
    path: '/employees',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <EmployeeListPage />,
      },
      {
        path: 'schedule',
        element: <WorkSchedulePage />,
      },
      {
        path: 'attendance',
        element: <AttendancePage />,
      },
      {
        path: 'payroll',
        element: <PayslipManagementPage />,
      },
    ],
  },

  // Customers
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

  // Suppliers
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
    ],
  },

  // Expenses (FE-07)
  {
    path: '/expenses',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <ServiceExpensesPage />,
      },
    ],
  },

  // Tax Snapshots (FE-19)
  {
    path: '/tax-snapshots',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <TaxSnapshotPage />,
      },
    ],
  },

  // Cashbook (FE-17)
  {
    path: '/cashbook',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <CashbookPage />,
      },
    ],
  },

  // Promotions
  {
    path: '/promotions',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
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
    ],
  },

  // ─── POS SYSTEM (/pos) ───
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

  // ─── EMPLOYEE APP (/employee) ───
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

  // ─── WEB STORE (/store) ───
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

  // ─── AUTHENTICATION (/auth) ───
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

  // ─── BRANCH PORTAL (/branch) ───
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
      {
        path: 'goods-receipts',
        element: <GoodsReceiptListPage defaultRole="employee" />,
      },
      {
        path: 'goods-receipts/create',
        element: <GoodsReceiptFormPage defaultRole="employee" />,
      },
      {
        path: 'goods-receipts/:id/edit',
        element: <GoodsReceiptFormPage defaultRole="employee" />,
      },
      {
        path: 'goods-receipts/:id',
        element: <GoodsReceiptDetailPage defaultRole="employee" />,
      },
      {
        path: 'goods-receipts/:id/confirm',
        element: <GoodsReceiptDetailPage defaultRole="employee" />,
      },
    ],
  },

  // ─── GOODS RECEIPTS SHORTCUTS ───
  {
    path: '/goods-receipts',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <GoodsReceiptListPage defaultRole="store_owner" />,
      },
      {
        path: 'create',
        element: <GoodsReceiptFormPage defaultRole="store_owner" />,
      },
      {
        path: ':id/edit',
        element: <GoodsReceiptFormPage defaultRole="store_owner" />,
      },
      {
        path: ':id',
        element: <GoodsReceiptDetailPage defaultRole="store_owner" />,
      },
      {
        path: ':id/confirm',
        element: <GoodsReceiptDetailPage defaultRole="store_owner" />,
      },
    ],
  },
  {
    path: '/employee/goods-receipts',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <GoodsReceiptListPage defaultRole="employee" />,
      },
      {
        path: 'create',
        element: <GoodsReceiptFormPage defaultRole="employee" />,
      },
      {
        path: ':id/edit',
        element: <GoodsReceiptFormPage defaultRole="employee" />,
      },
      {
        path: ':id',
        element: <GoodsReceiptDetailPage defaultRole="employee" />,
      },
      {
        path: ':id/confirm',
        element: <GoodsReceiptDetailPage defaultRole="employee" />,
      },
    ],
  },

  // ─── BATCH & EXPIRY MANAGEMENT SHORTCUTS (FE-02) ───
  {
    path: '/batches',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <BatchListPage defaultRole="store_owner" />,
      },
    ],
  },
  {
    path: '/expiry',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <BatchListPage defaultRole="store_owner" />,
      },
    ],
  },
  {
    path: '/employee/batches',
    element: <StoreOwnerLayout />,
    children: [
      {
        index: true,
        element: <BatchListPage defaultRole="employee" />,
      },
    ],
  },

  // Catch-all fallback
  {
    path: '*',
    element: <Navigate to="/store-owner/dashboard" replace />,
  },
]);

export default router;
