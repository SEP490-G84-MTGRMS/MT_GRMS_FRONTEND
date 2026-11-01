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
  phone?: string;
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
    phone: user.phone,
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
    roleLabel: 'Chủ cửa hàng (Store Owner - Được phép bán nợ)',
    username: 'chucuahang',
    email: 'chucuahang@mtmart.vn',
    password: '123456',
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_store_owner',
      email: 'chucuahang@mtmart.vn',
      fullName: 'Trần Văn Chủ (Chủ cửa hàng)',
      role: 'STORE_OWNER' as const,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-HCM-01',
      phone: '0901 234 567',
    },
  },
  {
    roleLabel: 'Nhân viên thu ngân (Cashier - Ẩn nút bán nợ)',
    username: 'nhanvien',
    email: 'nhanvien@mtmart.vn',
    password: '123456',
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_staff_cashier',
      email: 'nhanvien@mtmart.vn',
      fullName: 'Lê Thị Thu Ngân (Nhân viên bán hàng)',
      role: 'CASHIER' as const,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-HCM-01',
      phone: '0988 765 432',
    },
  },
  {
    roleLabel: 'Chủ Cửa Hàng Khác (Tenant B - Cửa Hàng An Khang)',
    username: 'chucuahang2',
    email: 'chucuahang2@ankhang.vn',
    password: '123456',
    tenantCode: 'tenant_ankhang_02',
    user: {
      id: 'usr_owner_ankhang_02',
      email: 'chucuahang2@ankhang.vn',
      fullName: 'Hoàng Văn An (Chủ tiệm An Khang)',
      role: 'STORE_OWNER' as const,
      tenantId: 'tenant_ankhang_02',
      tenantName: 'Cửa Hàng Thực Phẩm Sạch An Khang',
      branchId: 'BR-AK-01',
      phone: '0912 888 999',
    },
  },
  {
    roleLabel: 'Chủ chuỗi / Super Admin',
    username: 'admin',
    email: 'admin@mtgrms.vn',
    password: 'password123',
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_super_admin',
      email: 'admin@mtgrms.vn',
      fullName: 'Hệ Thống Super Admin',
      role: 'ADMIN' as const,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Bán Lẻ Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-001',
      phone: '0901 234 567',
    },
  },
  {
    roleLabel: 'Thu ngân quầy POS',
    username: 'poscashier',
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
      const response = await httpClient.post<ApiResponse<BackendLoginPayload>>('/auth/login', {
        usernameOrEmail: credentials.email.trim(),
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
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message);
      }

      // Fallback giả lập logic xác thực cho môi trường phát triển / kiểm thử UI
      const cleanInput = credentials.email.trim().toLowerCase();
      const phoneClean = cleanInput.replace(/\s+/g, '');
      const foundDemo = DEMO_ACCOUNTS.find(
        acc =>
          (acc.username && acc.username.toLowerCase() === cleanInput) ||
          acc.email.toLowerCase() === cleanInput ||
          (acc.user.phone && acc.user.phone.replace(/\s+/g, '') === phoneClean)
      );

      const defaultUser: UserProfile = foundDemo
        ? foundDemo.user
        : {
            id: `usr_${Date.now()}`,
            email: cleanInput,
            fullName: cleanInput.includes('@') ? cleanInput.split('@')[0] : 'Chủ Cửa Hàng',
            role: cleanInput.includes('nhanvien') ? 'CASHIER' : 'STORE_OWNER',
            tenantId: credentials.tenantCode || 'tenant_mt_mart_01',
            tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
          };

      // Mô phỏng độ trễ mạng nhẹ (200ms) để hiện loading button sắc nét
      await new Promise(resolve => setTimeout(resolve, 200));

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
      const cleanStoreSlug = (payload.storeName || 'tiemmoi')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 20);
      const newTenantId = `tenant_${cleanStoreSlug}_${Date.now().toString(36)}`;
      const newUser: UserProfile = {
        id: `usr_new_${Date.now()}`,
        email: payload.email || `${payload.phone}@mtgrms.vn`,
        fullName: payload.fullName,
        role: 'STORE_OWNER',
        tenantId: newTenantId,
        tenantName: payload.storeName,
        phone: payload.phone,
      };

      localStorage.setItem('tenant_id', newTenantId);

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
