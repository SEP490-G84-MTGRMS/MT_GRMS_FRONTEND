import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MasterLayout } from '../layouts/MasterLayout';
import { PosLayout } from '../layouts/PosLayout';
import { WebStoreLayout } from '../layouts/WebStoreLayout';
import { AuthLayout } from '../layouts/AuthLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: <MasterLayout />,
    children: [
      {
        index: true,
        element: <div className="text-gray-600">Trang Bảng điều khiển Quản trị (Dashboard)</div>,
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
]);
