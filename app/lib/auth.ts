export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthUser {
  user_id?: number | string;
  email?: string;
  fio?: string;
  position?: string;
  jti?: string;
  [key: string]: unknown;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody {
  fio: string;
  email: string;
  password: string;
  position: string;
}

export interface AuthActionResponse {
  success: boolean;
  message: string;
  user?: AuthUser | null;
  revoked?: boolean;
}

export interface SessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  refreshed?: boolean;
  reason?: string;
  error?: string;
}
