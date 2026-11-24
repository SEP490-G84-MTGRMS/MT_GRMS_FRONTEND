import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayslipPaymentModal } from '../components/payslip-management/PayslipPaymentModal';
import type { PayslipDetailedRecord } from '../types';

vi.mock('../api/payslipApi', () => ({
  payslipApi: {
    getPayslipById: vi.fn().mockResolvedValue(null),
    payPayslip: vi.fn().mockResolvedValue({}),
    advanceSalary: vi.fn().mockResolvedValue({}),
    batchPayPayslips: vi.fn().mockResolvedValue({}),
  },
  extractErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

vi.mock('../api/employeeApi', () => ({
  employeeApi: {
    getEmployeeById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../../cashbook/services/cashbookService', () => ({
  cashbookService: {
    getCashAccounts: vi.fn().mockResolvedValue([]),
  },
}));

const basePayslip: PayslipDetailedRecord = {
  id: 'ps-1',
  payslipCode: 'PL-2611-001',
  employeeId: 'emp-1',
  employeeCode: 'NV001',
  employeeName: 'Nguyễn Văn An',
  branchId: 'br-1',
  branchName: 'Chi nhánh Trung tâm',
  periodMonth: '2026-11',
  salaryType: 'MONTHLY',
  baseRate: 10000000,
  standardDays: 26,
  workedDays: 26,
  totalWorkHours: 208,
  otHours: 0,
  contractBaseSalary: 10000000,
  baseSalaryEarned: 10000000,
  overtimePay: 0,
  lunchAllowance: 0,
  travelAllowance: 0,
  totalEarnings: 10000000,
  socialInsurance: 0,
  advanceDeduction: 0,
  totalDeductions: 0,
  netSalary: 8500000,
  status: 'UNPAID',
  bankName: 'MB Bank',
  bankAccountNumber: '0987654321',
  bankAccountName: 'NGUYEN VAN AN',
};

describe('PayslipPaymentModal - VietQR Napas 247', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tự động render EmployeeVietQrCard và cập nhật số tiền QR động khi sửa số tiền chi', async () => {
    render(<PayslipPaymentModal isOpen onClose={vi.fn()} payslip={basePayslip} />);

    const card = await screen.findByTestId('employee-vietqr-card');
    expect(card).toBeDefined();

    const qrImg = screen.getByAltText('Mã VietQR chuyển khoản 0987654321') as HTMLImageElement;
    expect(qrImg.src).toContain('https://img.vietqr.io/image/MB-0987654321-compact2.png');
    expect(qrImg.src).toContain('amount=8500000');
    expect(qrImg.src).toContain('addInfo=TRA%20LUONG%20PL%202611%20001');

    const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '5000000' } });

    await waitFor(() => {
      const updatedImg = screen.getByAltText('Mã VietQR chuyển khoản 0987654321') as HTMLImageElement;
      expect(updatedImg.src).toContain('amount=5000000');
    });
  });

  it('không render EmployeeVietQrCard và hiện cảnh báo khi nhân viên chưa có STK', async () => {
    const noAccountPayslip: PayslipDetailedRecord = {
      ...basePayslip,
      bankAccountNumber: undefined,
    };

    render(<PayslipPaymentModal isOpen onClose={vi.fn()} payslip={noAccountPayslip} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Nhân viên chưa có số tài khoản ngân hàng/i)
      ).toBeDefined();
    });
    expect(screen.queryByTestId('employee-vietqr-card')).toBeNull();
  });

  it('hiển thị dropdown chọn nhanh ngân hàng Napas 247 khi tên ngân hàng không khớp', async () => {
    const unknownBankPayslip: PayslipDetailedRecord = {
      ...basePayslip,
      bankName: 'Ngan hang la',
    };

    render(<PayslipPaymentModal isOpen onClose={vi.fn()} payslip={unknownBankPayslip} />);

    const select = (await screen.findByLabelText('Chọn ngân hàng Napas 247')) as HTMLSelectElement;
    expect(select).toBeDefined();

    fireEvent.change(select, { target: { value: 'TCB' } });

    await waitFor(() => {
      const qrImg = screen.getByAltText('Mã VietQR chuyển khoản 0987654321') as HTMLImageElement;
      expect(qrImg.src).toContain('https://img.vietqr.io/image/TCB-0987654321-compact2.png');
    });
  });

  it('không render EmployeeVietQrCard khi chọn CASH hoặc ở chế độ isBatchMode', async () => {
    const { rerender } = render(<PayslipPaymentModal isOpen onClose={vi.fn()} payslip={basePayslip} />);
    await screen.findByTestId('employee-vietqr-card');

    const methodSelect = screen.getByDisplayValue('Chuyển khoản') as HTMLSelectElement;
    fireEvent.change(methodSelect, { target: { value: 'CASH' } });
    expect(screen.queryByTestId('employee-vietqr-card')).toBeNull();

    rerender(
      <PayslipPaymentModal
        isOpen
        onClose={vi.fn()}
        batchPayslips={[
          basePayslip,
          { ...basePayslip, id: 'ps-2', employeeCode: 'NV002', employeeName: 'Trần Thị Bình', netSalary: 4200000 },
        ]}
      />
    );
    expect(screen.queryByTestId('employee-vietqr-card')).toBeNull();
    expect(screen.getByText('Thanh toán hàng loạt chỉ áp dụng cho Tiền mặt.')).toBeDefined();
    expect(screen.getByTestId('batch-payslip-breakdown')).toBeDefined();
    expect(screen.getByText('Trần Thị Bình')).toBeDefined();
    expect(screen.getByText('4,200,000đ')).toBeDefined();
  });

  it('cảnh báo và chặn tạo phiếu chi nếu số tiền vượt quá tiền trong phiếu lương', async () => {
    const { payslipApi } = await import('../api/payslipApi');
    render(<PayslipPaymentModal isOpen onClose={vi.fn()} payslip={basePayslip} />);

    const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '9000000' } });

    expect(
      screen.getByText(/Số tiền chi \(9,000,000đ\) đang vượt quá số tiền trong phiếu lương \(8,500,000đ\)/i)
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Tạo phiếu chi/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/không được vượt quá số tiền trong phiếu lương \(8,500,000đ\)/i)
      ).toBeDefined();
    });
    expect(payslipApi.payPayslip).not.toHaveBeenCalled();
  });

  it('hiển thị ConfirmModal cảnh báo khóa tháng lương trước khi thanh toán lẻ và chỉ gọi API khi xác nhận', async () => {
    const { payslipApi } = await import('../api/payslipApi');
    const onPaymentSuccess = vi.fn();

    render(
      <PayslipPaymentModal
        isOpen
        onClose={vi.fn()}
        payslip={basePayslip}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Tạo phiếu chi/i }));

    expect(await screen.findByText('Xác nhận thanh toán lương')).toBeDefined();
    expect(screen.getByText(/khóa toàn bộ/i)).toBeDefined();
    expect(screen.getByText(/Chấm công \(FaceID, tự chấm công, chấm công thủ công\)/i)).toBeDefined();
    expect(screen.getByText(/Gửi và duyệt phiếu yêu cầu/i)).toBeDefined();
    expect(screen.getByText(/Tạo mới và chỉnh sửa lịch làm việc trong tháng/i)).toBeDefined();
    expect(payslipApi.payPayslip).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));

    await waitFor(() => {
      expect(payslipApi.payPayslip).toHaveBeenCalledWith(
        'ps-1',
        expect.objectContaining({ paymentMethod: 'VIETQR' })
      );
    });
    expect(onPaymentSuccess).toHaveBeenCalledWith('pay');
  });

  it('hiển thị ConfirmModal cảnh báo khóa tháng lương trước khi thanh toán hàng loạt', async () => {
    const { payslipApi } = await import('../api/payslipApi');
    const onPaymentSuccess = vi.fn();

    render(
      <PayslipPaymentModal
        isOpen
        onClose={vi.fn()}
        batchPayslips={[
          basePayslip,
          { ...basePayslip, id: 'ps-2', employeeCode: 'NV002', employeeName: 'Trần Thị Bình', netSalary: 4200000 },
        ]}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Tạo phiếu chi/i }));

    expect(await screen.findByText('Xác nhận thanh toán lương (2 nhân viên)')).toBeDefined();
    expect(screen.getByText(/Tạo mới và chỉnh sửa lịch làm việc trong tháng/i)).toBeDefined();
    expect(payslipApi.batchPayPayslips).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));

    await waitFor(() => {
      expect(payslipApi.batchPayPayslips).toHaveBeenCalledWith(
        expect.objectContaining({
          payslipIds: ['ps-1', 'ps-2'],
          paymentMethod: 'CASH',
        })
      );
    });
    expect(onPaymentSuccess).toHaveBeenCalledWith('pay');
  });
});
