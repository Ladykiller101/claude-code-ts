import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPositions, getUserBalance } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";

/**
 * GET /api/hyperliquid/positions
 *
 * Returns the authenticated user's open positions and account balance.
 * Requires authentication. Reads wallet address from user_wallets table.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get user's active wallet — use admin client to bypass RLS
    const { data: wallet, error: walletError } = await admin
      .from("user_wallets")
      .select("wallet_address")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        {
          error: "No active wallet found. Connect a wallet first.",
          code: "NO_WALLET",
        },
        { status: 404 }
      );
    }

    // Fetch positions and balance in parallel
    const [positions, balance] = await Promise.all([
      getUserPositions(wallet.wallet_address),
      getUserBalance(wallet.wallet_address),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        positions,
        balance,
        walletAddress: wallet.wallet_address,
      },
    });
  } catch (error) {
    console.error("Positions error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch positions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
