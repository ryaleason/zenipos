export type UmkmStatus = "active" | "inactive";

export interface AdminUmkmItem {
  umkm_id: string;
  umkm_name: string;
  owner_name: string;
  phone: string;
  address: string | null;
  status: UmkmStatus;
  active_until: string;
  is_expired: boolean;
  total_products: number;
  total_sales_count: number;
  total_sales_amount: number;
  created_at: string;
  updated_at: string;
  owner_profile_id?: string;
  owner_email?: string;
  days_remaining?: number;
}

export interface AdminSummaryStats {
  totalUmkm: number;
  activeUmkm: number;
  expiringSoonUmkm: number;
  expiredUmkm: number;
}

export interface AdminSummaryData {
  stats: AdminSummaryStats;
  umkmList: AdminUmkmItem[];
}

export interface AdminActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}
