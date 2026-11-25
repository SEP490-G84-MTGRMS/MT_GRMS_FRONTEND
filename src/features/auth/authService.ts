import { httpClient } from '../../api/httpClient';
import {
  ApiError,
  UserRoleEnum,
  type UserRole,
  type UserRoleType,
  type AuthResponse,
  type LoginCredentials,
  type SendLoginOtpResult,
  type VerifyLoginOtpPayload,
  type RegisterPayload,
  type SendRegistrationOtpPayload,
  type SendRegistrationOtpResult,
  type ResetPasswordPayload,
  type ChangePasswordPayload,
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
  isTwoFactorEnabled?: boolean;
};

function mapRole(roleName?: string): UserRole {
  const role = (roleName || '').trim().toUpperCase();
  if (role === 'ADMIN') return UserRoleEnum.ADMIN;
  if (role === 'STORE_OWNER') return UserRoleEnum.STORE_OWNER;
  if (role === 'STAFF') return UserRoleEnum.STAFF;
  throw new ApiError(403, 'Vai trò tài khoản không hợp lệ. Vui lòng đăng nhập lại.', 'INVALID_ROLE');
}

function mapLoginUser(user: BackendLoginUser): UserProfile {
  const isUserAdmin = Boolean(
    user.isAdmin ?? (user.role === 'ADMIN' || user.roleName === 'ADMIN')
  );
  const resolvedRole = isUserAdmin ? UserRoleEnum.ADMIN : mapRole(user.roleName || user.role);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: resolvedRole,
    userRole: resolvedRole as UserRoleType,
    tenantId: user.tenantId || SEED_TENANT_ID,
    branchId: user.branchId || undefined,
    phone: user.phone,
    isAdmin: isUserAdmin,
    isTwoFactorEnabled: typeof user.isTwoFactorEnabled === 'boolean' ? user.isTwoFactorEnabled : false,
  };
}

export function unwrapLogin(body: any): AuthResponse | null {
  if (!body) return null;
  const payload = 'data' in body && body.data ? body.data : body;
  const rawUser = payload?.user || payload;
  if (!rawUser?.id && !rawUser?.username && !rawUser?.email) return null;
  return {
    accessToken: payload?.accessToken || '',
    refreshToken: payload?.refreshToken,
    expiresIn: 7200,
    user: mapLoginUser(rawUser),
  };
}

export const mapAuthProblemMessage = (
  code?: string,
  fallbackMessage?: string,
): string => {
  const normalized = (code || '').toUpperCase();
  const map: Record<string, string> = {
    OTP_REQUIRED: 'Vui lòng nhập mã xác thực OTP đã gửi tới email của bạn.',
    OTP_EXPIRED: 'Mã xác thực OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu gửi lại mã mới.',
    OTP_INVALID: 'Mã xác thực Email OTP không chính xác. Vui lòng kiểm tra lại.',
    OTP_ATTEMPTS_EXCEEDED: 'Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.',
    OTP_ALREADY_USED: 'Mã OTP này đã được sử dụng hoặc đang được xử lý.',
    OTP_INTENT_MISMATCH: 'Thông tin luồng đăng ký đã thay đổi. Vui lòng yêu cầu gửi lại mã OTP mới.',
    OTP_FINGERPRINT_MISMATCH: 'Thông tin cửa hàng/liên hệ đã thay đổi sau khi nhận OTP. Vui lòng gửi lại mã mới.',
    OTP_EMAIL_MISMATCH: 'Email đăng ký không khớp với yêu cầu OTP ban đầu.',
    RATE_LIMIT_EXCEEDED: 'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng thử lại sau ít phút.',
    EMAIL_UNAVAILABLE: 'Hệ thống gửi email OTP tạm thời gián đoạn. Vui lòng thử lại sau.',
    IDEMPOTENCY_PAYLOAD_MISMATCH: 'Thông tin đăng ký đã thay đổi so với lần gửi trước. Vui lòng thử lại.',
    IDEMPOTENCY_IN_PROGRESS: 'Yêu cầu đăng ký đang được xử lý. Vui lòng chờ trong giây lát.',
    CURRENT_PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu hiện tại.',
    INVALID_CURRENT_PASSWORD: 'Mật khẩu hiện tại không chính xác.',
    PASSWORD_SAME_AS_OLD: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
    WEAK_PASSWORD: 'Mật khẩu mới phải có 8–64 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.',
  };
  return map[normalized] || fallbackMessage || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
};

export const authService = {
  /**
   * Đăng nhập hệ thống qua Backend API
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const usernameOrEmail = credentials.email.trim();
      const password = credentials.password;

      const response = await httpClient.post<any>('/auth/login', {
        usernameOrEmail,
        password,
        tenantCode: credentials.tenantCode,
      });

      const unwrap = unwrapLogin(response.data);
      if (unwrap) {
        if (unwrap.user?.tenantId) {
          localStorage.setItem('tenant_id', unwrap.user.tenantId);
        }
        return unwrap;
      }

      throw new Error('Dữ liệu phản hồi xác thực không hợp lệ.');
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
   * Bước 1 Đăng nhập 2FA: Kiểm tra thông tin tài khoản/mật khẩu và gửi mã OTP 6 chữ số qua Email
   */
  async sendLoginOtp(credentials: LoginCredentials): Promise<SendLoginOtpResult> {
    try {
      const usernameOrEmail = credentials.email.trim();
      const password = credentials.password;

      const response = await httpClient.post<any>('/auth/login/send-otp', {
        usernameOrEmail,
        password,
        tenantCode: credentials.tenantCode,
      });

      const raw = response.data?.data || response.data;
      return {
        requiresOtp: Boolean(raw?.requiresOtp ?? true),
        user: raw?.user,
        tempToken: raw?.tempToken || '',
        maskedEmail: raw?.maskedEmail || usernameOrEmail,
        targetEmail: raw?.targetEmail || usernameOrEmail,
        expiresInSeconds: raw?.expiresInSeconds || 300,
        isRealEmailSent: Boolean(raw?.isRealEmailSent),
        message: response.data?.message || raw?.message || 'Đã gửi mã xác thực OTP qua Email.',
        devOtpCode: raw?.devOtpCode ?? null,
      };
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
        (status === 401 ? 'UNAUTHORIZED' : status === 400 ? 'BAD_REQUEST' : 'LOGIN_OTP_SEND_FAILED');

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
   * Bước 2 Đăng nhập 2FA: Xác thực mã OTP 6 chữ số từ Email và hoàn tất đăng nhập
   */
  async verifyLoginOtp(payload: VerifyLoginOtpPayload): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<any>('/auth/login/verify-otp', payload);
      const unwrap = unwrapLogin(response.data);
      if (unwrap) {
        if (unwrap.user?.tenantId) {
          localStorage.setItem('tenant_id', unwrap.user.tenantId);
        }
        return unwrap;
      }

      throw new Error('Dữ liệu phản hồi xác thực không hợp lệ.');
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
        (status === 401 ? 'UNAUTHORIZED' : status === 400 ? 'BAD_REQUEST' : 'VERIFY_OTP_FAILED');

      const message =
        err.response?.data?.message ??
        (status === 400
          ? 'Mã xác thực Email OTP không chính xác hoặc đã hết hạn.'
          : 'Không thể xác thực mã OTP. Vui lòng thử lại.');

      throw new ApiError(status, message, errorCode, err.response?.data, err.response);
    }
  },

  async getTwoFactorStatus(): Promise<{ enabled: boolean; maskedEmail: string; isEmailVerified: boolean }> {
    const response = await httpClient.get<any>('/auth/me/2fa');
    return response.data?.data || response.data;
  },

  async requestTwoFactorChallenge(enabled: boolean, currentPassword: string) {
    const response = await httpClient.post<any>('/auth/me/2fa/challenge', { enabled, currentPassword });
    return response.data?.data || response.data;
  },

  async confirmTwoFactorChallenge(challengeToken: string, otpCode: string) {
    const response = await httpClient.post<any>('/auth/me/2fa/confirm', { challengeToken, otpCode });
    return response.data?.data || response.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string; user?: UserProfile }> {
    try {
      const response = await httpClient.post<any>('/auth/me/change-password', payload);
      const unwrap = unwrapLogin(response.data);
      const message =
        response.data?.message ||
        'Đổi mật khẩu thành công. Các phiên đăng nhập cũ trên thiết bị khác đã được thu hồi.';
      return {
        message,
        user: unwrap?.user,
      };
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      const data = err.response?.data;
      const status =
        err.response?.status ??
        data?.statusCode ??
        data?.status ??
        (err.code === 'ERR_NETWORK' ? 0 : 500);

      const errorCode =
        data?.code ??
        data?.errorCode ??
        (status === 400 ? 'BAD_REQUEST' : 'CHANGE_PASSWORD_FAILED');

      const rawMessage =
        data?.detail ??
        data?.message ??
        data?.title ??
        (status === 0
          ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.'
          : 'Không thể đổi mật khẩu. Vui lòng thử lại.');

      const message = mapAuthProblemMessage(errorCode, rawMessage);
      throw new ApiError(status, message, errorCode, data, err.response);
    }
  },

  /**
   * Kiểm tra trùng email/số điện thoại và gửi mã xác thực Email OTP kích hoạt đăng ký cửa hàng
   */
  async sendRegistrationOtp(payload: SendRegistrationOtpPayload): Promise<SendRegistrationOtpResult> {
    try {
      const response = await httpClient.post<any>('/auth/register/send-otp', payload);
      const raw = response.data?.data || response.data;
      return {
        success: Boolean(raw?.success ?? true),
        message: response.data?.message || raw?.message || 'Đã gửi mã xác thực OTP đến hộp thư email của bạn.',
        maskedEmail: raw?.maskedEmail || payload.email,
        expiresInSeconds: raw?.expiresInSeconds || 300,
        isRealEmailSent: Boolean(raw?.isRealEmailSent),
        devOtpCode: raw?.devOtpCode ?? null,
        challengeId: raw?.challengeId ?? null,
      };
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      const data = err.response?.data;
      const status =
        err.response?.status ??
        data?.statusCode ??
        data?.status ??
        (err.code === 'ERR_NETWORK' ? 0 : 500);

      const errorCode =
        data?.code ??
        data?.errorCode ??
        (status === 400 ? 'BAD_REQUEST' : 'SEND_OTP_FAILED');

      const rawMessage =
        data?.detail ??
        data?.message ??
        data?.title ??
        (status === 400
          ? 'Địa chỉ email hoặc số điện thoại không hợp lệ hoặc đã tồn tại trên hệ thống.'
          : err.message || 'Không thể gửi mã xác thực Email OTP. Vui lòng kiểm tra lại kết nối.');

      const message = mapAuthProblemMessage(errorCode, rawMessage);
      throw new ApiError(status, message, errorCode, data, err.response);
    }
  },

  /**
   * Đăng ký tài khoản và cửa hàng mới
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<any>('/auth/register', payload, {
        headers: { 'Idempotency-Key': payload.idempotencyKey },
      });

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

      const data = err.response?.data;
      const status =
        err.response?.status ??
        data?.statusCode ??
        data?.status ??
        (err.code === 'ERR_NETWORK' ? 0 : 500);

      const errorCode =
        data?.code ??
        data?.errorCode ??
        (status === 400 ? 'BAD_REQUEST' : 'REGISTER_FAILED');

      const rawMessage =
        data?.detail ??
        data?.message ??
        data?.title ??
        (status === 400
          ? 'Thông tin đăng ký không hợp lệ hoặc số điện thoại/email đã tồn tại.'
          : err.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.');

      const message = mapAuthProblemMessage(errorCode, rawMessage);
      throw new ApiError(status, message, errorCode, data, err.response);
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
   * Lấy thông tin tài khoản hiện tại từ HttpOnly Cookie
   */
  async getMe(): Promise<UserProfile> {
    try {
      const response = await httpClient.get<any>('/auth/me');
      const unwrap = unwrapLogin(response.data);
      if (!unwrap?.user) {
        throw new Error('Chưa xác thực danh tính.');
      }
      if (unwrap.user.tenantId) {
        localStorage.setItem('tenant_id', unwrap.user.tenantId);
      }
      return unwrap.user;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      const status = err.response?.status ?? 401;
      const message = err.response?.data?.message || 'Chưa đăng nhập hoặc phiên đã hết hạn.';
      throw new ApiError(status, message, 'UNAUTHORIZED', err.response?.data, err.response);
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
    } finally {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('access_token');
    }
  },
};
