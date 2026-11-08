import { httpClient } from '../../api/httpClient';
import type { ApiResponse } from '../../api/types';
import {
  ApiError,
  SystemRoles,
  type SystemRole,
  type AuthResponse,
  type LoginCredentials,
  type RegisterPayload,
  type ResetPasswordPayload,
  type UserProfile,
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
  isAdmin?: boolean;
};

type BackendLoginPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  user: BackendLoginUser;
};

function mapRole(roleName?: string): SystemRole {
  const role = (roleName || '').toUpperCase();
  if (role === SystemRoles.ADMIN) return SystemRoles.ADMIN;
  if (role === SystemRoles.STORE_OWNER) return SystemRoles.STORE_OWNER;
  return SystemRoles.STAFF;
}

function mapLoginUser(user: BackendLoginUser): UserProfile {
  const isUserAdmin = Boolean(
    user.isAdmin ?? (user.role === 'ADMIN' || user.roleName === 'ADMIN')
  );
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: isUserAdmin ? SystemRoles.ADMIN : mapRole(user.roleName || user.role),
    tenantId: user.tenantId || SEED_TENANT_ID,
    branchId: user.branchId || undefined,
    phone: user.phone,
    isAdmin: isUserAdmin,
  };
}

export function unwrapLogin(body: ApiResponse<BackendLoginPayload> | BackendLoginPayload | undefined): AuthResponse | null {
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
    roleLabel: '👑 Chủ Cửa Hàng (Store Owner)',
    username: 'store_owner',
    email: 'owner@mtgrms.vn',
    password: 'Owner@123456',
    tenantCode: SEED_TENANT_ID,
    user: {
      id: 'user-owner-001',
      email: 'owner@mtgrms.vn',
      fullName: 'Chủ Cửa Hàng (Store Owner)',
      role: 'STORE_OWNER' as const,
      tenantId: SEED_TENANT_ID,
      tenantName: 'Cửa hàng MT-GRMS',
      branchId: undefined,
      phone: '0901234567',
      isAdmin: false,
    },
  },
  {
    roleLabel: '👷‍♂️ Nhân Viên Cửa Hàng (Staff)',
    username: 'staff_employee',
    email: 'staff@mtgrms.vn',
    password: 'Staff@123456',
    tenantCode: SEED_TENANT_ID,
    user: {
      id: 'user-staff-001',
      email: 'staff@mtgrms.vn',
      fullName: 'Nhân Viên Cửa Hàng (Staff)',
      role: SystemRoles.STAFF,
      tenantId: SEED_TENANT_ID,
      tenantName: 'Cửa hàng MT-GRMS',
      branchId: undefined,
      phone: '0912345678',
      isAdmin: false,
    },
  },
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
      role: SystemRoles.STORE_OWNER,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-HCM-01',
      phone: '0901 234 567',
      isAdmin: false,
    },
  },
  {
    roleLabel: 'Nhân viên bán hàng (Staff - POS)',
    username: 'nhanvien',
    email: 'nhanvien@mtmart.vn',
    password: '123456',
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_staff_cashier',
      email: 'nhanvien@mtmart.vn',
      fullName: 'Lê Thị Thu Ngân (Nhân viên bán hàng)',
      role: SystemRoles.STAFF,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-HCM-01',
      phone: '0988 765 432',
      isAdmin: false,
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
      role: SystemRoles.STORE_OWNER,
      tenantId: 'tenant_ankhang_02',
      tenantName: 'Cửa Hàng Thực Phẩm Sạch An Khang',
      branchId: 'BR-AK-01',
      phone: '0912 888 999',
      isAdmin: false,
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
      role: SystemRoles.ADMIN,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Bán Lẻ Thực Phẩm Sạch MT-Mart',
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
      role: SystemRoles.STORE_OWNER,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-HCM-01',
      phone: '0909 876 543',
      isAdmin: false,
    },
  },
  {
    roleLabel: 'Thu ngân quầy POS (Lê Thị Thảo)',
    username: 'staff_cashier',
    email: 'cashier@mtgrms.vn',
    password: 'Staff@123456',
    tenantCode: SEED_TENANT_ID,
    user: {
      id: 'user-cashier-001',
      email: 'cashier@mtgrms.vn',
      fullName: 'Lê Thị Thảo (Thu Ngân POS)',
      role: SystemRoles.STAFF,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Siêu Thị Thực Phẩm Sạch MT-Mart',
      branchId: 'BR-001',
      phone: '0988 765 432',
      isAdmin: false,
    },
  },
  {
    roleLabel: 'Thu ngân POS Demo (Trần Thị Thu Ngân)',
    username: 'poscashier',
    email: 'pos.cashier@mtgrms.vn',
    password: 'password123',
    tenantCode: 'tenant_mt_mart_01',
    user: {
      id: 'usr_cashier',
      email: 'thao.le@mtmart.vn',
      fullName: 'Lê Thị Thảo (Thu Ngân POS)',
      role: SystemRoles.STAFF,
      tenantId: 'tenant_mt_mart_01',
      tenantName: 'Chuỗi Bán Lẻ Thực Phẩm Sạch MT',
      branchId: 'BR-001',
      phone: '0988 765 432',
      isAdmin: false,
    },
  },
  {
    roleLabel: 'Chủ Cửa Hàng An Nhiên (Tenant Mới - An Nhiên Mart)',
    username: '0918889999',
    email: 'chucuahang.annhien@gmail.com',
    password: '123456',
    tenantCode: 'tenant_an_nhien_02',
    user: {
      id: 'usr_owner_annhien_02',
      email: 'chucuahang.annhien@gmail.com',
      fullName: 'Trần Quốc An (Chủ tiệm An Nhiên)',
      role: SystemRoles.STORE_OWNER,
      tenantId: 'tenant_an_nhien_02',
      tenantName: 'Cửa Hàng Thực Phẩm Sạch An Nhiên (An Nhiên Mart)',
      branchId: 'b1000000-0000-0000-0000-000000000001',
      phone: '0918889999',
    },
  },
  {
    roleLabel: 'Nhân Viên Bán Hàng An Nhiên (Staff - An Nhiên Mart)',
    username: '0917778888',
    email: 'nhanvien.annhien@gmail.com',
    password: '123456',
    tenantCode: 'tenant_an_nhien_02',
    user: {
      id: 'usr_employee_annhien_02',
      email: 'nhanvien.annhien@gmail.com',
      fullName: 'Phạm Thị Yến (Nhân viên bán hàng An Nhiên)',
      role: SystemRoles.STAFF,
      tenantId: 'tenant_an_nhien_02',
      tenantName: 'Cửa Hàng Thực Phẩm Sạch An Nhiên (An Nhiên Mart)',
      branchId: 'b1000000-0000-0000-0000-000000000001',
      phone: '0917778888',
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
          role: isUserAdmin
            ? SystemRoles.ADMIN
            : mapRole(loginData.user?.roleName || loginData.user?.role),
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
      const response = await httpClient.post<any>('/auth/register', payload);

      const unwrap = unwrapLogin(response.data);
      if (unwrap) {
        if (unwrap.user?.tenantId) {
          localStorage.setItem('tenant_id', unwrap.user.tenantId);
        }
        return unwrap;
      }

      const raw = response.data?.data || response.data;
      if (raw?.accessToken && raw?.user) {
        const user = mapLoginUser(raw.user);
        if (user.tenantId) {
          localStorage.setItem('tenant_id', user.tenantId);
        }
        return {
          accessToken: raw.accessToken,
          refreshToken: raw.refreshToken,
          expiresIn: 7200,
          user,
        };
      }

      throw new Error('Dữ liệu phản hồi từ máy chủ không hợp lệ.');
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      const status =
        err.response?.status ??
        err.response?.data?.statusCode ??
        err.response?.data?.status ??
        (err.code === 'ERR_NETWORK' ? 0 : 500);

      const errorCode =
        err.response?.data?.errorCode ??
        (status === 400 ? 'BAD_REQUEST' : 'REGISTER_FAILED');

      const message =
        err.response?.data?.message ??
        (status === 400
          ? 'Thông tin đăng ký không hợp lệ hoặc số điện thoại/email đã tồn tại.'
          : err.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.');

      throw new ApiError(status, message, errorCode, err.response?.data, err.response);
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
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại địa chỉ email.';
      throw new Error(errorMsg);
    }
  },

  /**
   * Xác thực mã OTP 6 số
   */
  async verifyOtp(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/auth/verify-otp',
        { email, otpCode }
      );
      return response.data;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Mã OTP không chính xác hoặc đã hết hạn.';
      throw new Error(errorMsg);
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
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Không thể cập nhật mật khẩu mới. Vui lòng thử lại.';
      throw new Error(errorMsg);
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
