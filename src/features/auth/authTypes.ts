export const UserRoleEnum = {
  ADMIN: 'ADMIN',
  STORE_OWNER: 'STORE_OWNER',
  STAFF: 'STAFF',
} as const;

// Alias tương thích ngược với SystemRoles
export const SystemRoles = UserRoleEnum;

export type UserRoleType = (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
export type SystemRole = UserRoleType;
export type UserRole = UserRoleType | 'MANAGER' | 'CASHIER' | 'EMPLOYEE';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  userRole?: UserRoleType;
  tenantId: string;
  tenantName?: string;
  branchId?: string;
  phone?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantCode?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  storeName: string;
  phone: string;
  email?: string;
  password: string;
  agreeTerms: boolean;
  otpCode?: string;
}

export interface SendRegistrationOtpPayload {
  phone: string;
  storeName?: string;
  fullName?: string;
  email?: string;
}

export interface SendRegistrationOtpResult {
  success: boolean;
  message: string;
  maskedPhone: string;
  expiresInSeconds: number;
  isRealSmsSent: boolean;
  devOtpCode?: string | null;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user: UserProfile;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otpCode: string;
  newPassword: string;
}

export class ApiError extends Error {
  status: number;
  statusCode: number;
  errorCode?: string;
  data?: any;
  response?: any;

  constructor(status: number, message: string, errorCode?: string, data?: any, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusCode = status;
    this.errorCode = errorCode;
    this.data = data;
    this.response = response;
  }
}
