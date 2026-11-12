// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '../HomePage/HomePage';
import { RegisterPage } from './RegisterPage';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { SubscriptionCheckoutModal } from '../store/components/SubscriptionCheckoutModal';
import { TrialStatusBanner } from '../store/components/TrialStatusBanner';
import { INITIAL_STORE_INFO, SUBSCRIPTION_PLANS } from '../store/storeData';
import { authService } from '../../features/auth/authService';
import { storeApi } from '../store/api/storeApi';
import { useAuthStore } from '../../stores/useAuthStore';

describe('homepage trial onboarding UI & flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
    });
  });

  it('HomePage CTA dẫn tới /auth/register?intent=trial và không hiển thị 14 ngày', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/register" element={<div data-testid="register-route">Register</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText(/14 ngày/i)).not.toBeInTheDocument();
    const trialButtons = screen.getAllByRole('button', { name: /Dùng thử miễn phí 3 ngày/i });
    expect(trialButtons.length).toBeGreaterThan(0);
    fireEvent.click(trialButtons[0]);
    expect(screen.getByTestId('register-route')).toBeInTheDocument();
  });

  it('RegisterPage giữ dữ liệu form khi OTP lỗi, gửi đúng intent và điều hướng sau commit', async () => {
    const sendOtpSpy = vi.spyOn(authService, 'sendRegistrationOtp').mockResolvedValue({
      success: true,
      message: 'ok',
      maskedEmail: 't***@gmail.com',
      expiresInSeconds: 300,
      isRealEmailSent: false,
      devOtpCode: '654321',
      challengeId: 'ch-test-1',
    });
    const registerSpy = vi.spyOn(authService, 'register')
      .mockRejectedValueOnce(new Error('Mã OTP không chính xác'))
      .mockResolvedValueOnce({
        accessToken: 'jwt',
        refreshToken: 'ref',
        expiresIn: 7200,
        user: {
          id: 'usr-1',
          fullName: 'Nguyễn Văn A',
          email: 'test@gmail.com',
          role: 'STORE_OWNER',
          tenantId: 't-1',
          isAdmin: false,
        },
      });

    render(
      <MemoryRouter initialEntries={['/auth/register?intent=trial']}>
        <Routes>
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/store-owner/dashboard" element={<div data-testid="dashboard-route">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Dùng thử miễn phí 3 ngày/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/72 giờ bắt đầu ngay khi đăng ký thành công/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Họ và tên đại diện/i), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(screen.getByLabelText(/Tên cửa hàng/i), { target: { value: 'Tạp hóa A' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: '0981234567' } });
    fireEvent.change(screen.getByLabelText(/Email nhận mã OTP/i), { target: { value: 'test@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'Password@123' } });
    fireEvent.change(screen.getByLabelText(/Xác nhận lại mật khẩu/i), { target: { value: 'Password@123' } });

    fireEvent.click(screen.getByRole('button', { name: /ĐĂNG KÝ MỞ CỬA HÀNG NGAY/i }));

    await waitFor(() => {
      expect(sendOtpSpy).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@gmail.com',
        startTrial: true,
      }));
    });

    // Nhập OTP qua 6 ô input trong RegistrationOtpModal
    const digitInputs = await screen.findAllByLabelText(/Chữ số OTP thứ/i);
    '654321'.split('').forEach((d, idx) => {
      fireEvent.change(digitInputs[idx], { target: { value: d } });
    });

    const confirmOtpBtn = screen.getByRole('button', { name: /XÁC NHẬN MÃ OTP & MỞ CỬA HÀNG/i });
    fireEvent.click(confirmOtpBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mã OTP không chính xác/i)).toBeInTheDocument();
    });
    // Form vẫn giữ nguyên dữ liệu sau khi lỗi OTP
    expect((screen.getByLabelText(/Tên cửa hàng/i) as HTMLInputElement).value).toBe('Tạp hóa A');

    // Thử lại OTP
    fireEvent.click(confirmOtpBtn);
    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Khởi tạo cửa hàng thành công/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Vào trang Quản trị cửa hàng/i }));
    expect(screen.getByTestId('dashboard-route')).toBeInTheDocument();
  });

  it('RegisterPage thường (/auth/register) gửi startTrial=false và điều hướng sang chọn gói', async () => {
    const sendOtpSpy = vi.spyOn(authService, 'sendRegistrationOtp').mockResolvedValue({
      success: true,
      message: 'ok',
      maskedEmail: 'n***@gmail.com',
      expiresInSeconds: 300,
      isRealEmailSent: false,
      devOtpCode: '112233',
      challengeId: 'ch-std-1',
    });
    const registerSpy = vi.spyOn(authService, 'register').mockResolvedValue({
      accessToken: 'jwt',
      refreshToken: 'ref',
      expiresIn: 7200,
      user: {
        id: 'usr-2',
        fullName: 'Nguyễn Văn B',
        email: 'noplan@gmail.com',
        role: 'STORE_OWNER',
        tenantId: 't-2',
        isAdmin: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/register']}>
        <Routes>
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/store-owner/subscriptions" element={<div data-testid="subs-route">Subscriptions</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText(/72 giờ bắt đầu ngay/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Họ và tên đại diện/i), { target: { value: 'Nguyễn Văn B' } });
    fireEvent.change(screen.getByLabelText(/Tên cửa hàng/i), { target: { value: 'Tạp hóa B' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: '0987654321' } });
    fireEvent.change(screen.getByLabelText(/Email nhận mã OTP/i), { target: { value: 'noplan@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'Password@123' } });
    fireEvent.change(screen.getByLabelText(/Xác nhận lại mật khẩu/i), { target: { value: 'Password@123' } });

    fireEvent.click(screen.getByRole('button', { name: /ĐĂNG KÝ MỞ CỬA HÀNG NGAY/i }));
    await waitFor(() => expect(sendOtpSpy).toHaveBeenCalledWith(expect.objectContaining({ startTrial: false })));

    const digitInputs = await screen.findAllByLabelText(/Chữ số OTP thứ/i);
    '112233'.split('').forEach((d, idx) => fireEvent.change(digitInputs[idx], { target: { value: d } }));
    fireEvent.click(screen.getByRole('button', { name: /XÁC NHẬN MÃ OTP & MỞ CỬA HÀNG/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ startTrial: false, challengeId: 'ch-std-1' }));
      expect(screen.getByRole('button', { name: /Chọn gói dịch vụ/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Chọn gói dịch vụ/i }));
    expect(screen.getByTestId('subs-route')).toBeInTheDocument();
  });

  it('ProtectedRoute giữ người dùng NO_PLAN ở màn hình theo quyền nhưng phủ lớp tối + ổ khóa nhắc cần mua gói (chưa đăng nhập vẫn đẩy về login)', async () => {
    const loginCheck = render(
      <MemoryRouter initialEntries={['/store-owner/dashboard']}>
        <Routes>
          <Route
            path="/store-owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                <div data-testid="dash-unauth">Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    loginCheck.unmount();

    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'usr-1',
        fullName: 'Owner',
        email: 'owner@test.vn',
        role: 'STORE_OWNER',
        tenantId: 't-1',
        isAdmin: false,
      },
    });

    vi.spyOn(storeApi, 'getTrialStatus').mockResolvedValueOnce({
      success: true,
      message: '',
      data: { state: 'ELIGIBLE', isNoPlan: true, destination: 'CONFIRM' },
    });

    render(
      <MemoryRouter initialEntries={['/store-owner/dashboard']}>
        <Routes>
          <Route
            path="/store-owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                <div data-testid="dash-content">Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/store-owner/subscriptions"
            element={
              <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                <div data-testid="subs-page">Subscriptions</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dash-content')).toBeInTheDocument();
      expect(screen.getByTestId('subscription-lock-overlay')).toBeInTheDocument();
    });
    expect(screen.getByText(/Cần mua gói để sử dụng dịch vụ/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chọn \/ Mua gói dịch vụ/i }));
    await waitFor(() => {
      expect(screen.getByTestId('subs-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('subscription-lock-overlay')).not.toBeInTheDocument();
  });

  it('SubscriptionCheckoutModal hỗ trợ Escape, aria dialog và không báo thành công giả khi backend lỗi', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const trialPlan = SUBSCRIPTION_PLANS.find((p) => p.code === 'TRIAL')!;

    vi.spyOn(storeApi, 'activateTrial').mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: 'TRIAL_ALREADY_USED', detail: 'Tài khoản đã sử dụng gói dùng thử.' },
      },
    });

    render(
      <SubscriptionCheckoutModal
        plan={trialPlan}
        storeInfo={INITIAL_STORE_INFO}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Kích hoạt dùng thử 3 ngày/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/đã sử dụng gói dùng thử/i);
    });
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TrialStatusBanner hiển thị nhãn tiếng Việt cho ELIGIBLE/ACTIVE/EXPIRED/PAID và không lộ enum nội bộ', () => {
    const { rerender, container } = render(
      <TrialStatusBanner trialStatus={{ state: 'ELIGIBLE', destination: 'CONFIRM' }} onStartTrial={vi.fn()} />,
    );
    expect(screen.getAllByText(/Dùng thử miễn phí 3 ngày/i).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/NO_PLAN|REVIEW_REQUIRED|ELIGIBLE/);

    rerender(
      <TrialStatusBanner
        trialStatus={{ state: 'ACTIVE', planCode: 'TRIAL', trialExpiresAt: '2026-11-15T10:00:00Z', destination: 'DASHBOARD' }}
      />,
    );
    expect(screen.getByText(/Gói dùng thử 3 ngày đang hoạt động/i)).toBeInTheDocument();

    rerender(<TrialStatusBanner trialStatus={{ state: 'EXPIRED', destination: 'SUBSCRIPTIONS' }} />);
    expect(screen.getByText(/Thời gian dùng thử 3 ngày đã kết thúc/i)).toBeInTheDocument();

    rerender(<TrialStatusBanner trialStatus={{ state: 'PAID', planCode: 'STANDARD', destination: 'DASHBOARD' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ProtectedRoute giữ STORE_OWNER ở route được phép khi EXPIRED, hiện tấm phủ khóa + CTA gia hạn, và mở khóa tại /store-owner/subscriptions', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'usr-owner-exp',
        fullName: 'Owner Expired',
        email: 'owner-exp@test.vn',
        role: 'STORE_OWNER',
        tenantId: 't-exp-1',
        isAdmin: false,
      },
    });

    vi.spyOn(storeApi, 'getTrialStatus').mockResolvedValue({
      success: true,
      message: '',
      data: { state: 'EXPIRED', isExpired: true, destination: 'SUBSCRIPTIONS' },
    });

    render(
      <MemoryRouter initialEntries={['/store-owner/dashboard']}>
        <Routes>
          <Route
            path="/store-owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                <div data-testid="dash-content">Dashboard Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/store-owner/subscriptions"
            element={
              <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                <div data-testid="subs-page">Subscriptions Billing Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dash-content')).toBeInTheDocument();
      expect(screen.getByTestId('subscription-lock-overlay')).toBeInTheDocument();
    });

    expect(screen.getByText(/Gói dịch vụ đã hết hạn/i)).toBeInTheDocument();
    const renewBtn = screen.getByRole('button', { name: /Thanh toán \/ Gia hạn gói/i });
    fireEvent.click(renewBtn);

    await waitFor(() => {
      expect(screen.getByTestId('subs-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('subscription-lock-overlay')).not.toBeInTheDocument();
  });

  it('ProtectedRoute cho phép CASHIER vào /employee/pos khi EXPIRED nhưng phủ khóa nhắc liên hệ Chủ cửa hàng (không có nút thanh toán)', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'usr-staff-exp',
        fullName: 'Cashier Expired',
        email: 'cashier-exp@test.vn',
        role: 'CASHIER',
        tenantId: 't-exp-1',
        isAdmin: false,
      },
    });

    vi.spyOn(storeApi, 'getSubscriptionAccessStatus').mockResolvedValue({
      success: true,
      message: '',
      data: { state: 'EXPIRED', isExpired: true, destination: 'SUBSCRIPTIONS' },
    });

    render(
      <MemoryRouter initialEntries={['/employee/pos']}>
        <Routes>
          <Route
            path="/employee/pos"
            element={
              <ProtectedRoute allowedRoles={['CASHIER', 'STAFF', 'STORE_OWNER']}>
                <div data-testid="pos-content">POS Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pos-content')).toBeInTheDocument();
      expect(screen.getByTestId('subscription-lock-overlay')).toBeInTheDocument();
    });

    expect(screen.getByText(/Vui lòng liên hệ Chủ cửa hàng/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán \/ Gia hạn gói/i })).not.toBeInTheDocument();
  });

  it('ProtectedRoute lập tức phủ khóa khi nhận sự kiện subscription-required (HTTP 403 SUBSCRIPTION_REQUIRED)', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'usr-owner-live',
        fullName: 'Owner Live',
        email: 'owner-live@test.vn',
        role: 'STORE_OWNER',
        tenantId: 't-live-1',
        isAdmin: false,
      },
    });

    vi.spyOn(storeApi, 'getTrialStatus').mockResolvedValue({
      success: true,
      message: '',
      data: { state: 'ACTIVE', isExpired: false, destination: 'DASHBOARD' },
    });

    render(
      <MemoryRouter initialEntries={['/store-owner/dashboard']}>
        <Routes>
          <Route
            path="/store-owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                <div data-testid="dash-live">Live Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dash-live')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('subscription-lock-overlay')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('subscription-required', {
          detail: { message: 'Gói dịch vụ đã hết hạn sử dụng.' },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('subscription-lock-overlay')).toBeInTheDocument();
    });
    expect(screen.getByText(/Gói dịch vụ đã hết hạn sử dụng/i)).toBeInTheDocument();
  });
});
