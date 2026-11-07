import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";

export interface CurrentUserProfile {
  id: string;
  email: string;
  role: "admin" | "owner" | "cashier";
  fullName: string;
  mustChangePassword: boolean;
  isActive: boolean;
  umkmId: string | null;
  umkmName: string;
}

/**
 * Get authenticated user from session, memoized per request with React.cache()
 */
export const getSessionUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Get profile and store details in a single query, memoized per request with React.cache()
 * Prevents multiple duplicate HTTP roundtrips between layout and page actions.
 */
export const getCurrentUserProfile = cache(async (): Promise<CurrentUserProfile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      full_name,
      must_change_password,
      is_active,
      umkm_id,
      umkm:umkm_id ( name )
    `)
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const umkmData = profile.umkm as unknown as { name?: string } | null;

  return {
    id: profile.id,
    email: user.email || "",
    role: profile.role,
    fullName: profile.full_name,
    mustChangePassword: profile.must_change_password,
    isActive: profile.is_active,
    umkmId: profile.umkm_id,
    umkmName: umkmData?.name || "ZeniPOS",
  };
});
