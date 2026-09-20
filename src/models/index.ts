// Common Data Models and Types

export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'FINANCE' | 'VENDOR' | 'CUSTOMER' | 'USER' | 'user' | 'admin' | 'guest';
  phone?: string;
  profile_id?: string;
  vendor_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
