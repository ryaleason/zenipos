import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const { pathname } = request.nextUrl;

  const createRedirect = (path: string) => {
    url.pathname = path;
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/ganti-password") ||
    pathname.startsWith("/kasir") ||
    pathname.startsWith("/produk") ||
    pathname.startsWith("/stok") ||
    pathname.startsWith("/pengeluaran") ||
    pathname.startsWith("/laporan") ||
    pathname.startsWith("/pengaturan");

  // Unauthenticated user attempting to access protected route
  if (!user) {
    if (isProtectedPath) {
      return createRedirect("/login");
    }
    return supabaseResponse;
  }

  // Query authenticated user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password, is_active")
    .eq("id", user.id)
    .single();

  // If profile is inactive, force sign out and redirect to login
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return createRedirect("/login");
  }

  const mustChangePassword = profile?.must_change_password ?? false;
  const isAdmin = profile?.role === "admin";
  const defaultDestination = isAdmin ? "/admin" : "/dashboard";

  // Forced password change flow
  if (mustChangePassword) {
    if (pathname !== "/ganti-password") {
      return createRedirect("/ganti-password");
    }
    return supabaseResponse;
  }

  // Already changed password but visiting /ganti-password
  if (pathname === "/ganti-password") {
    return createRedirect(defaultDestination);
  }

  // Authenticated user visiting /login
  if (pathname === "/login") {
    return createRedirect(defaultDestination);
  }

  // Admin route protection: only users with role === 'admin' can access /admin
  if (pathname.startsWith("/admin") && !isAdmin) {
    return createRedirect("/dashboard");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
