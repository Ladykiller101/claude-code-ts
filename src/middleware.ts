import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Fully public routes — never require auth check
  if (
    pathname === "/" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/google/drive/sync") ||
    pathname.startsWith("/api/hyperliquid/market") ||
    pathname.startsWith("/api/hyperliquid/orderbook") ||
    pathname.startsWith("/api/hyperliquid/candles") ||
    pathname.startsWith("/api/trading/performance") ||
    pathname.startsWith("/api/trading/brokers") ||
    pathname.startsWith("/api/trading/controls") ||
    pathname === "/api/trading"
  ) {
    return supabaseResponse;
  }

  // Auth-gated routes and login/signup pages both need user check
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in — allow login/signup pages
    if (isAuthPage) {
      return supabaseResponse;
    }
    // API routes get 401 JSON instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in — redirect away from login/signup to trading
  if (isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/trading";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
