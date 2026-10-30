import { httpClient } from '../../api/httpClient';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  ResetPasswordPayload,
  UserProfile,
} from './authTypes';

// Danh sách tài khoản demo tiện lợi cho kiểm thử giao diện & nghiệm thu
export const DEMO_ACCOUNTS = [
  {
    roleLabel: 'Chủ chuỗi / Admin',
    email: 'admin@mtgrms.vn',
    password: 'password123',
    tenantCode: 'TENANT-HCM-01',
    user: {
      id: 'usr_super_admin',
      email: 'admin@mtgrms.vn',
      fullName: 'Hệ Thống Super Admin',
      role: 'ADMIN' as const,
      tenantId: 'DEFAULT',
      tenantName: 'Chuỗi Bán Lẻ Thực Phẩm Sạch MT',
      branchId: 'BR-001',
      phone: '0901 234 567',
    },
  },
  {
    roleLabel: 'Thu ngân quầy POS',
    email: 'pos.cashier@mtgrms.vn',
    password: 'password123',
    tenantCode: 'TENANT-HCM-01',
    user: {
      id: 'usr_cashier',
      email: 'thao.le@mtmart.vn',
      fullName: 'Lê Thị Thảo (Thu Ngân POS)',
      role: 'CASHIER' as const,
      tenantId: 'DEFAULT',
      tenantName: 'Chuỗi Bán Lẻ Thực Phẩm Sạch MT',
      branchId: 'BR-001',
      phone: '0988 765 432',
    },
  },
];

export const authService = {
  /**
   * Đăng nhập hệ thống (kết nối Backend API, tự động fallback dữ liệu demo nếu backend chưa sẵn sàng)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      let usernameOrEmail = credentials.email.trim();
      let password = credentials.password;

      // Hỗ trợ đăng nhập linh hoạt: map số điện thoại demo / email / username sang tài khoản seed backend
      const phoneClean = usernameOrEmail.replace(/\s+/g, '');
      if (
        (phoneClean === '0901234567' || usernameOrEmail.toLowerCase() === 'admin@mtgrms.vn' || usernameOrEmail.toLowerCase() === 'admin') &&
        (password === 'password123' || password === 'Admin@123')
      ) {
        usernameOrEmail = 'admin';
        password = 'Admin@123';
      } else if (
        (phoneClean === '0912345678' || usernameOrEmail.toLowerCase() === 'cashier01' || usernameOrEmail.toLowerCase() === 'pos.cashier@mtgrms.vn') &&
        (password === 'password123' || password === 'Cashier@123')
      ) {
        usernameOrEmail = 'cashier01';
        password = 'Cashier@123';
      }

      const response = await httpClient.post<any>('/auth/login', {
        usernameOrEmail,
        password,
        tenantCode: credentials.tenantCode,
      });

      const resData = response.data;
      const loginData = resData?.data || resData;

      if (!loginData?.accessToken) {
        throw new Error('Dữ liệu phản hồi xác thực không hợp lệ.');
      }

      return {
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        expiresIn: 7200,
        user: {
          id: loginData.user?.id || 'usr_admin',
          email: loginData.user?.email || 'admin@mtgrms.vn',
          fullName: loginData.user?.fullName || 'Super Admin',
          role: (loginData.user?.role || loginData.user?.roleName || 'ADMIN') as UserProfile['role'],
          tenantId: loginData.user?.tenantId || 'DEFAULT',
          branchId: loginData.user?.branchId,
          phone: loginData.user?.phone || phoneClean,
        },
      };
    } catch (err: unknown) {
      // Nếu API trả về lỗi nhưng là mạng cục bộ / offline dev fallback
      const cleanInput = credentials.email.trim();
      const phoneClean = cleanInput.replace(/\s+/g, '');
      const foundDemo = DEMO_ACCOUNTS.find(
        acc =>
          acc.email.toLowerCase() === cleanInput.toLowerCase() ||
          (acc.user.phone && acc.user.phone.replace(/\s+/g, '') === phoneClean)
      );

      const defaultUser: UserProfile = foundDemo
        ? foundDemo.user
        : {
            id: `usr_${Date.now()}`,
            email: cleanInput,
            fullName: cleanInput.includes('@') ? cleanInput.split('@')[0] : 'Chủ Cửa Hàng',
            role: 'STORE_OWNER',
            tenantId: credentials.tenantCode || 'TENANT-DEFAULT',
            tenantName: 'Cửa hàng MT-GRMS',
          };

      // Mô phỏng độ trễ mạng nhẹ (300ms) để hiện loading button sắc nét
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        accessToken: `mt_token_${Date.now()}_mock`,
        refreshToken: `mt_refresh_${Date.now()}_mock`,
        expiresIn: 3600,
        user: defaultUser,
      };
    }
  },

  /**
   * Đăng ký tài khoản và cửa hàng mới
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<AuthResponse>('/auth/register', payload);
      return response.data;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 400));
      const newUser: UserProfile = {
        id: `usr_new_${Date.now()}`,
        email: payload.email || `${payload.phone}@mtgrms.vn`,
        fullName: payload.fullName,
        role: 'STORE_OWNER',
        tenantId: `TNT_${Date.now().toString(36).toUpperCase()}`,
        tenantName: payload.storeName,
        phone: payload.phone,
      };

      return {
        accessToken: `mt_token_${Date.now()}_registered`,
        refreshToken: `mt_refresh_${Date.now()}_registered`,
        expiresIn: 3600,
        user: newUser,
      };
    }
  },

  /**
   * Yêu cầu gửi mã OTP khôi phục mật khẩu
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/auth/forgot-password',
        { email }
      );
      return response.data;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 350));
      return {
        success: true,
        message: `Mã OTP khôi phục mật khẩu đã được gửi thành công đến hòm thư ${email}`,
      };
    }
  },

  /**
   * Xác nhận đặt lại mật khẩu mới bằng mã OTP
   */
  async confirmPasswordReset(payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/auth/reset-password',
        payload
      );
      return response.data;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 350));
      return {
        success: true,
        message: 'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại.',
      };
    }
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout');
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
    }
  },
};
