export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STORE_OWNER';
  tenantId: string;
  tenantName?: string;
  branchId?: string;
  phone?: string;
  avatarUrl?: string;
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
}

export interface AuthResponse {
  accessToken: string;
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
