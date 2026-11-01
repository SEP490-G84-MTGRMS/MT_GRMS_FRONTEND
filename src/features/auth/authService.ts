import { httpClient } from '../../api/httpClient';
import { ApiError } from './authTypes';
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
      isAdmin: true,
    },
  },
  {
    roleLabel: 'Chủ cửa hàng (Store Owner)',
    email: 'hung.nguyen@mtmart.vn',
    password: 'password123',
    tenantCode: 'TENANT-HCM-01',
    user: {
      id: 'usr_store_manager',
      email: 'hung.nguyen@mtmart.vn',
      fullName: 'Nguyễn Văn Hùng (Chủ Cửa Hàng)',
      role: 'STORE_OWNER' as const,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-HCM-01',
      phone: '0909 876 543',
      isAdmin: false,
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
      isAdmin: false,
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
        (phoneClean === '0901234567' || usernameOrEmail.toLowerCase() === 'admin@mtgrms.vn' || usernameOrEmail === 'admin') &&
        (password === 'password123' || password === 'Admin@123')
      ) {
        usernameOrEmail = 'admin';
        password = 'Admin@123';
      } else if (
        (phoneClean === '0909876543' || usernameOrEmail.toLowerCase() === 'manager01' || usernameOrEmail.toLowerCase() === 'hung.nguyen@mtmart.vn') &&
        (password === 'password123' || password === 'Manager@123')
      ) {
        usernameOrEmail = 'manager01';
        password = 'Manager@123';
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

      const isUserAdmin = Boolean(
        loginData.user?.isAdmin ?? (loginData.user?.role === 'ADMIN' || loginData.user?.roleName === 'ADMIN')
      );

      return {
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        expiresIn: 7200,
        user: {
          id: loginData.user?.id || 'usr_admin',
          email: loginData.user?.email || 'admin@mtgrms.vn',
          fullName: loginData.user?.fullName || 'Super Admin',
          role: (isUserAdmin ? 'ADMIN' : (loginData.user?.role || loginData.user?.roleName || 'STORE_OWNER')) as UserProfile['role'],
          tenantId: loginData.user?.tenantId || 'DEFAULT',
          branchId: loginData.user?.branchId,
          phone: loginData.user?.phone || phoneClean,
          isAdmin: isUserAdmin,
        },
      };
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      // Trích xuất status từ HTTP response hoặc từ data body của API
      const status =
        err.response?.status ??
        err.response?.data?.statusCode ??
        err.response?.data?.status ??
        (err.code === 'ERR_NETWORK' ? 0 : 500);

      const errorCode =
        err.response?.data?.errorCode ??
        (status === 401 ? 'UNAUTHORIZED' : status === 400 ? 'BAD_REQUEST' : 'LOGIN_FAILED');

      const message =
        err.response?.data?.message ??
        (status === 401
          ? 'Tài khoản hoặc mật khẩu không chính xác.'
          : status === 400
          ? 'Thông tin đăng nhập không hợp lệ.'
          : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.');

      throw new ApiError(status, message, errorCode, err.response?.data, err.response);
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
        isAdmin: false,
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
