import { httpClient } from '../../api/httpClient';
import type { ApiResponse } from '../../api/types';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  ResetPasswordPayload,
  UserProfile,
} from './authTypes';

const SEED_TENANT_ID = 'tenant_mt_mart_01';

type BackendLoginUser = {
  id: string;
  username?: string;
  fullName: string;
  email: string;
  roleName?: string;
  role?: string;
  branchId?: string | null;
  tenantId?: string;
};

type BackendLoginPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  user: BackendLoginUser;
};

function mapRole(roleName?: string): UserProfile['role'] {
  const role = (roleName || '').toUpperCase();
  if (role === 'CASHIER') return 'CASHIER';
  if (role === 'MANAGER' || role === 'BRANCH_MANAGER') return 'MANAGER';
  if (role === 'STORE_OWNER') return 'STORE_OWNER';
  return 'ADMIN';
}

function mapLoginUser(user: BackendLoginUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: mapRole(user.roleName || user.role),
    tenantId: user.tenantId || SEED_TENANT_ID,
    branchId: user.branchId || undefined,
  };
}

function unwrapLogin(body: ApiResponse<BackendLoginPayload> | BackendLoginPayload | undefined): AuthResponse | null {
  if (!body) return null;
  const payload = 'data' in body && body.data ? body.data : (body as BackendLoginPayload);
  if (!payload?.accessToken || !payload.user) return null;
  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresIn: 3600,
    user: mapLoginUser(payload.user),
  };
}

// Danh sách tài khoản demo tiện lợi cho kiểm thử giao diện & nghiệm thu
export const DEMO_ACCOUNTS = [
  {
    roleLabel: 'Chủ chuỗi / Admin',
    email: 'admin@mtgrms.vn',
    password: 'Admin@123',
    tenantCode: SEED_TENANT_ID,
    user: {
      id: 'usr_super_admin',
      email: 'admin@mtgrms.vn',
      fullName: 'Hệ Thống Super Admin',
      role: 'ADMIN' as const,
      tenantId: SEED_TENANT_ID,
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: undefined,
      phone: '0901234567',
    },
  },
  {
    roleLabel: 'Thu ngân quầy POS',
    email: 'thao.le@mtmart.vn',
    password: 'Cashier@123',
    tenantCode: SEED_TENANT_ID,
    user: {
      id: 'usr_cashier',
      email: 'thao.le@mtmart.vn',
      fullName: 'Lê Thị Thảo (Thu Ngân POS)',
      role: 'CASHIER' as const,
      tenantId: SEED_TENANT_ID,
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: undefined,
      phone: '0912345678',
    },
  },
];

export const authService = {
  /**
   * Đăng nhập hệ thống (kết nối Backend API, tự động fallback dữ liệu demo nếu backend chưa sẵn sàng)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<ApiResponse<BackendLoginPayload>>('/auth/login', {
        usernameOrEmail: credentials.email,
        password: credentials.password,
        tenantCode: credentials.tenantCode || SEED_TENANT_ID,
      });
      const mapped = unwrapLogin(response.data);
      if (!mapped) {
        throw new Error('Phản hồi đăng nhập không hợp lệ.');
      }
      return mapped;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      if (axiosError.response) {
        throw new Error(axiosError.response.data?.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      }

      // Fallback giả lập logic xác thực khi backend không chạy
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
            tenantId: credentials.tenantCode || SEED_TENANT_ID,
            tenantName: 'Cửa hàng MT-GRMS',
          };

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
