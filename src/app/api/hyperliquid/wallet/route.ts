import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";
import { getUserBalance } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";

/**
 * GET /api/hyperliquid/wallet
 *
 * Get the authenticated user's connected wallets.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: wallets, error } = await admin
      .from("user_wallets")
      .select("id, wallet_address, label, is_active, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch wallets" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { wallets: wallets || [] } });
  } catch (error) {
    console.error("Wallet GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hyperliquid/wallet
 *
 * Connect a Hyperliquid wallet with an agent private key.
 * Encrypts the agent key before storing.
 *
 * Body: {
 *   walletAddress: string,      // The main wallet address (0x...)
 *   agentPrivateKey: string,    // The agent wallet private key
 *   label?: string              // Optional label for the wallet
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress, agentPrivateKey, label } = body as {
      walletAddress: string;
      agentPrivateKey: string;
      label?: string;
    };

    // Validate inputs
    if (!walletAddress || !agentPrivateKey) {
      return NextResponse.json(
        { error: "walletAddress and agentPrivateKey are required" },
        { status: 400 }
      );
    }

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format. Must be a valid Ethereum address (0x...)" },
        { status: 400 }
      );
    }

    // Basic private key validation (64 hex chars, with or without 0x prefix)
    const keyHex = agentPrivateKey.replace(/^0x/, "");
    if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
      return NextResponse.json(
        { error: "Invalid agent private key format. Must be 64 hex characters." },
        { status: 400 }
      );
    }

    // Verify the wallet exists on Hyperliquid by fetching balance
    try {
      await getUserBalance(walletAddress);
    } catch {
      // Don't block on this — new wallets may have no history
      console.warn(
        `Could not verify wallet ${walletAddress} on Hyperliquid (may be new)`
      );
    }

    // Encrypt the agent private key
    let encryptedKey: string;
    try {
      encryptedKey = encrypt(agentPrivateKey);
    } catch (err) {
      console.error("Encryption error:", err);
      return NextResponse.json(
        {
          error: "Failed to encrypt agent key. Ensure ENCRYPTION_SECRET is configured.",
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    // Deactivate all other wallets for this user (only one active at a time)
    await admin
      .from("user_wallets")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Upsert the wallet (update if same address exists, insert otherwise)
    const { data: wallet, error: upsertError } = await admin
      .from("user_wallets")
      .upsert(
        {
          user_id: user.id,
          wallet_address: walletAddress.toLowerCase(),
          agent_wallet_encrypted: encryptedKey,
          label: label || "Default",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,wallet_address" }
      )
      .select("id, wallet_address, label, is_active, created_at")
      .single();

    if (upsertError) {
      console.error("Wallet upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save wallet connection" },
        { status: 500 }
      );
    }

    // Also create default trading config if it doesn't exist
    await admin.from("user_trading_config").upsert(
      {
        user_id: user.id,
        default_leverage: 1,
        max_leverage: 10,
        risk_limit_daily_usd: 1000,
        max_position_size_usd: 5000,
        auto_trade_enabled: false,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({
      success: true,
      message: "Wallet connected successfully",
      data: {
        wallet: {
          id: wallet.id,
          walletAddress: wallet.wallet_address,
          label: wallet.label,
          isActive: wallet.is_active,
          createdAt: wallet.created_at,
        },
      },
    });
  } catch (error) {
    console.error("Wallet POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to connect wallet",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/hyperliquid/wallet
 *
 * Disconnect a wallet.
 * Body: { walletId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { walletId } = body as { walletId: string };

    if (!walletId) {
      return NextResponse.json(
        { error: "walletId is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to disconnect wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Wallet disconnected",
    });
  } catch (error) {
    console.error("Wallet DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect wallet" },
      { status: 500 }
    );
  }
}
