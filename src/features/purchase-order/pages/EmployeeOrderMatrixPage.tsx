import type { FC } from 'react';
import { OrderMatrixPage } from './OrderMatrixPage';

/**
 * Trang Lập đề xuất đặt hàng theo Ma trận (Dành cho Nhân viên Chi nhánh)
 * Kết nối 100% với Backend API qua OrderMatrixPage (forcedRole="EMPLOYEE")
 */
export const EmployeeOrderMatrixPage: FC = () => {
  return <OrderMatrixPage forcedRole="EMPLOYEE" />;
};

export default EmployeeOrderMatrixPage;
