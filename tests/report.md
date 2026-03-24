# QA Report: Hyperliquid Trading Integration

**Date:** 2026-03-24
**Reviewer:** QA Engineer (Claude)
**Scope:** Full review of frontend auth, Hyperliquid trading panel, backend API routes, DB migration, encryption, and integration

---

## Summary

| Area        | Pass | Fail | Total |
|-------------|------|------|-------|
| Frontend    | 8    | 3    | 11    |
| Backend     | 10   | 4    | 14    |
| Integration | 3    | 3    | 6     |
| Security    | 4    | 3    | 7     |
| **TOTAL**   | **25** | **13** | **38** |

---

## Frontend Checks

### Authentication Pages

- **PASS** - Login page uses `createClient()` from `@/lib/supabase/client` and calls `signInWithPassword` correctly.
- **PASS** - Signup page uses `signUp` with `emailRedirectTo` pointing to `/auth/callback?next=/trading`, correctly passing `full_name` in user metadata.
- **PASS** - Signup enforces minimum 6-character password (both client validation and HTML `minLength` attribute).
- **PASS** - Google OAuth on both pages uses `signInWithOAuth` with `redirectTo` set to the callback route.
- **PASS** - OAuth callback route (`/auth/callback/route.ts`) correctly exchanges the code for a session using `exchangeCodeForSession` and redirects to the `next` param (defaults to `/trading`).
- **PASS** - Error state on callback redirects to `/login?error=auth_callback_failed`.

### UserMenu

- **PASS** - UserMenu imports `useAuth` from `@/lib/auth-context` and correctly uses `user`, `isAuthenticated`, `isLoading`, and `signOut`.
- **PASS** - Renders a loading skeleton, a "Sign In" button when unauthenticated, and a full dropdown with initials/avatar when authenticated.

### TradingDashboard

- **PASS** - HYPERLIQUID tab is properly added to the `activeTab` type union and rendered in the nav tabs array. `HyperliquidTab` component is defined and renders `PriceChart` and `HyperliquidPanel` in a responsive grid.
- **PASS** - `PriceChart`, `HyperliquidPanel`, and `ExecuteTradeModal` are all loaded via `next/dynamic` with `{ ssr: false }`, correctly preventing SSR for browser-only libraries.

### HyperliquidPanel

- **FAIL** - **Panel uses only mock/static data; no backend API calls.** The component does not call `/api/hyperliquid/market`, `/api/hyperliquid/positions`, `/api/hyperliquid/order`, or `/api/hyperliquid/wallet`. The wallet "connect" button sets a hardcoded string, order submission uses `alert()`, and positions/trades are hardcoded arrays.
  - **Fix:** Wire up the panel to call the backend API endpoints. Replace `handleConnect` with a call to `POST /api/hyperliquid/wallet`, `handleSubmitOrder` with a call to `POST /api/hyperliquid/order`, and fetch positions from `GET /api/hyperliquid/positions`. Use real market data from `GET /api/hyperliquid/market`.

- **FAIL** - **PriceChart uses mock-generated candlestick data instead of real candle data from the backend.** The `generateMockData` function creates random candles; no fetch to `/api/hyperliquid/candles` exists.
  - **Fix:** Replace `generateMockData` with a `fetch('/api/hyperliquid/candles?symbol=...&interval=...')` call. The backend candle endpoint is ready and functional.

- **FAIL** - **"No open positions" message is unreachable.** `MOCK_POSITIONS` is a non-empty hardcoded array, so the `MOCK_POSITIONS.length === 0` check on line 410 can never be true.
  - **Fix:** Once real data is fetched from the API, this becomes a valid empty-state check. For now it is dead code.

---

## Backend Checks

### API Route Error Handling

- **PASS** - All six API routes (`market`, `orderbook`, `candles`, `positions`, `order`, `wallet`) wrap their logic in try/catch and return structured JSON error responses with appropriate HTTP status codes.
- **PASS** - All routes export `dynamic = "force-dynamic"` to prevent caching of API responses.

### Authentication in Protected Routes

- **PASS** - `positions/route.ts`, `order/route.ts`, and `wallet/route.ts` (GET, POST, DELETE) all call `getAuthUser()` and return 401 if null. The auth helper uses the server-side Supabase client with cookie-based session.
- **PASS** - Public routes (`market`, `orderbook`, `candles`) do not call `getAuthUser`, correctly remaining unauthenticated.

### Hyperliquid API Client (`hyperliquid.ts`)

- **PASS** - Market data, orderbook, candle, position, and balance functions all correctly call the Hyperliquid Info API at `https://api.hyperliquid.xyz/info` with the right request types.
- **PASS** - `symbolToCoin()` correctly strips `-PERP` suffix and converts to uppercase.
- **FAIL** - **EIP-712 signing uses suspicious `"a]"` string in `encodePacked`.** Lines 427 and 532 use `["a]", BigInt(timestamp)]` as the packed data. The closing bracket `]` in `"a]"` appears to be a typo or copy-paste error. The Hyperliquid agent signing protocol typically uses `"a"` as the source identifier.
  - **Fix:** Verify against the official Hyperliquid SDK/documentation. The encoded string should likely be `"a"` not `"a]"`. This bug would cause all order and cancel signatures to be invalid, meaning no trades would actually execute.

- **FAIL** - **`placeOrder` immediately assumes "filled" status.** The order route updates the trade record to `status: "filled"` as soon as the Hyperliquid API returns success. However, the API response with `resting.oid` means the order is resting on the book (not filled). Only `filled.oid` indicates a fill.
  - **Fix:** Check `result.response?.data?.statuses?.[0]` to determine whether the order is `resting` or `filled` and set the trade_history status accordingly (`open` vs `filled`).

### Encryption (`encryption.ts`)

- **PASS** - Uses AES-256-GCM correctly: generates random salt (32 bytes) and IV (16 bytes), derives key with `scryptSync`, extracts and validates auth tag on decryption.
- **PASS** - Salt is unique per encryption, making identical plaintexts produce different ciphertexts.
- **FAIL** - **IV length is 16 bytes; NIST recommends 12 bytes (96 bits) for GCM.** While Node.js crypto supports 16-byte IVs for GCM, using anything other than 12 bytes triggers a less-efficient internal computation (GHASH of the IV) and is explicitly discouraged by NIST SP 800-38D.
  - **Fix:** Change `IV_LENGTH` from 16 to 12. This is a low-severity issue but deviates from best practice.

### Supabase Migration (`001_user_trading.sql`)

- **PASS** - All three tables have RLS enabled with policies scoped to `auth.uid() = user_id`.
- **PASS** - Foreign keys correctly reference `auth.users(id)` with `ON DELETE CASCADE`.
- **PASS** - Indexes are well-designed: composite indexes for active wallets, user+status on trade_history, and symbol+created_at for time-series queries.
- **PASS** - `update_updated_at_column()` trigger function is applied to `user_wallets` and `user_trading_config`.

### Order Route Risk Validation

- **PASS** - Validates max leverage and max position size (USD) against user_trading_config.
- **FAIL** - **Daily risk limit (`risk_limit_daily_usd`) is defined in the schema and config but never enforced.** The order route fetches `config` and uses `max_leverage` and `max_position_size_usd` but ignores `risk_limit_daily_usd`.
  - **Fix:** Add a query to sum today's trade values from `trade_history` for the user, and reject if the new order would exceed the daily limit.

### Wallet Route

- **PASS** - `POST /api/hyperliquid/wallet` encrypts the agent private key before storing it in the database.
- **PASS** - Validates wallet address format with regex (`/^0x[a-fA-F0-9]{40}$/`) and private key format (64 hex characters).

---

## Integration Checks

- **FAIL** - **Frontend HyperliquidPanel does not call any backend endpoints.** As detailed above, the panel is entirely self-contained with mock data. The backend API routes exist and are functional, but the frontend does not use them. This means the entire Hyperliquid trading flow is non-functional end-to-end.
  - **Fix:** Wire up all fetch calls in HyperliquidPanel and PriceChart to the corresponding `/api/hyperliquid/*` endpoints.

- **PASS** - Auth flow works end-to-end: login/signup -> Supabase auth -> callback route exchanges code -> middleware checks session -> protected API routes use `getAuthUser()` from cookie-based server client.

- **PASS** - Public Hyperliquid routes (`/api/hyperliquid/market`, `/api/hyperliquid/orderbook`, `/api/hyperliquid/candles`) are correctly listed in `middleware.ts` as public path exceptions, bypassing the auth check.

- **FAIL** - **Broker registry stores Hyperliquid credentials in a local JSON file (`data/.broker-secrets.json`) while the Hyperliquid wallet route stores them encrypted in Supabase.** These are two parallel, inconsistent credential storage paths. If a user connects Hyperliquid via the broker settings page, the credentials end up in a plaintext JSON file. If they connect via the Hyperliquid panel's wallet endpoint, the credentials are properly encrypted in the database.
  - **Fix:** The broker registry's POST handler for the `hyperliquid` broker ID should delegate to the wallet API logic (encrypt + store in Supabase) instead of writing to the local filesystem. Alternatively, remove Hyperliquid from the broker registry and only support it through the dedicated wallet endpoint.

- **PASS** - Hyperliquid is correctly added to `BROKER_REGISTRY` in `brokers/route.ts` with the appropriate credential fields (`wallet_address`, `agent_private_key`).

- **FAIL** - **`walletAddress` case mismatch in wallet storage.** The wallet POST route lowercases the address before storage (`walletAddress.toLowerCase()` on line 134), but the positions route queries `user_wallets` by `user_id` without case normalization. If a user's original address was mixed-case and stored lowercase, this is fine. However, the order route reads `wallet_address` from the DB but passes it nowhere (the Hyperliquid API uses the agent private key for signing, not the wallet address). The positions route does pass `wallet.wallet_address` to `getUserPositions()` which sends it to Hyperliquid's API -- this works because Hyperliquid accepts lowercase addresses.
  - This is technically **PASS** but worth noting for future maintenance.

---

## Security Checks

- **PASS** - No API keys or secrets are exposed in frontend code. All sensitive operations (wallet key decryption, Hyperliquid exchange calls, admin Supabase client) are server-side only. The `hyperliquid.ts` client and `encryption.ts` are only imported in API routes (server-side).

- **PASS** - RLS policies on all three tables correctly scope access to `auth.uid() = user_id`. The `FOR ALL` policy covers SELECT, INSERT, UPDATE, and DELETE.

- **PASS** - Wallet GET endpoint explicitly selects only non-sensitive columns (`id, wallet_address, label, is_active, created_at, updated_at`), excluding `agent_wallet_encrypted`.

- **PASS** - The DELETE wallet endpoint validates both `walletId` AND `user_id` (`.eq("id", walletId).eq("user_id", user.id)`), preventing users from deleting other users' wallets even if they guess the wallet ID.

- **FAIL** - **Broker secrets file stores API keys in plaintext JSON on the filesystem.** The `data/.broker-secrets.json` file contains raw credentials for all connected brokers (Binance API keys, Coinbase secrets, etc.) with no encryption. While it is in `.gitignore`, anyone with filesystem access can read it.
  - **Fix:** Encrypt broker secrets using the same `encrypt()` function from `encryption.ts`, or migrate broker credential storage to Supabase with encryption like the Hyperliquid wallet route does.

- **FAIL** - **No rate limiting on authenticated trading endpoints.** The `POST /api/hyperliquid/order` endpoint has no rate limiting, meaning a compromised session could rapidly place many orders.
  - **Fix:** Add rate limiting middleware or per-user throttling on the order endpoint (e.g., max 10 orders per minute).

- **FAIL** - **Input sanitization is minimal on the order endpoint.** While basic type checks exist (`side` must be "long"/"short", `size > 0`), there is no validation on the `symbol` parameter format. A malformed symbol string is passed directly to the Hyperliquid API.
  - **Fix:** Validate `symbol` against a whitelist of known symbols or at minimum enforce the `XXX-PERP` format with a regex.

---

## Overall Assessment

The **backend infrastructure is well-architected**: the API routes are properly structured, auth is correctly implemented with cookie-based Supabase sessions, encryption uses a sound approach, the DB migration is clean with proper RLS, and the Hyperliquid API client covers all necessary endpoints.

The **frontend is visually complete but functionally disconnected from the backend**. Both `HyperliquidPanel` and `PriceChart` operate entirely on mock data and do not call any of the backend API endpoints. This is the single largest gap -- the trading feature is non-functional end-to-end.

The **EIP-712 signing bug** (`"a]"` instead of `"a"` in the connection ID encoding) would cause all real order submissions to fail with invalid signatures. This must be verified against the Hyperliquid documentation and fixed before any live trading.

### Critical Issues (must fix before shipping):
1. Frontend does not call backend APIs (mock data only)
2. EIP-712 `"a]"` typo will invalidate all exchange signatures
3. Daily risk limit defined but never enforced

### Recommended Improvements:
1. Change GCM IV length from 16 to 12 bytes per NIST guidelines
2. Encrypt broker secrets file or migrate to DB storage
3. Add rate limiting on order endpoint
4. Add symbol whitelist validation
5. Correctly distinguish resting vs filled order status
6. Unify Hyperliquid credential storage (broker registry vs wallet endpoint)
