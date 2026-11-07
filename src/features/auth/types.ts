export type UserRole = "admin" | "owner" | "cashier";

export interface UserProfile {
  id: string;
  umkm_id: string | null;
  role: UserRole;
  full_name: string;
  must_change_password: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}
