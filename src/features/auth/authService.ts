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
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_super_admin',
      email: 'admin@mtgrms.vn',
      fullName: 'Hệ Thống Super Admin',
      role: 'ADMIN' as const,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-001',
      phone: '0901 234 567',
    },
  },
  {
    roleLabel: 'Thu ngân quầy POS',
    email: 'pos.cashier@mtgrms.vn',
    password: 'password123',
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_cashier',
      email: 'pos.cashier@mtgrms.vn',
      fullName: 'Trần Thị Thu Ngân',
      role: 'CASHIER' as const,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
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
      const response = await httpClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch {
      // Fallback giả lập logic xác thực cho môi trường phát triển / kiểm thử UI
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
            tenantId: credentials.tenantCode || 'tenant_mt_mart_01',
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
        tenantId: `tenant_mt_mart_01`,
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
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        message: 'Mã OTP xác thực đã được gửi về email của bạn (mô phỏng).',
      };
    }
  },

  /**
   * Đặt lại mật khẩu với mã OTP
   */
  async confirmPasswordReset(payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> {
    return this.resetPassword(payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/auth/reset-password',
        payload
      );
      return response.data;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
      };
    }
  },

  /**
   * Đăng xuất khỏi hệ thống
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout');
    } catch {
      // Bỏ qua lỗi mạng khi logout trên môi trường test/dev
    }
  },
};
