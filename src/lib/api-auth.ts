import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Get the authenticated user from the current request cookies.
 * Returns the Supabase user object or null if not authenticated.
 *
 * Usage in API routes:
 *   const user = await getAuthUser();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getAuthUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns user or throws a structured error.
 * Convenience wrapper when you always need an authenticated user.
 */
export async function requireAuthUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
