import type { FC } from 'react';
import { OrderMatrixPage } from './OrderMatrixPage';

/**
 * Trang đặt hàng ma trận cho nhân viên — role/CN lấy từ user đăng nhập.
 */
export const EmployeeOrderMatrixPage: FC = () => {
  return <OrderMatrixPage />;
};

export default EmployeeOrderMatrixPage;
