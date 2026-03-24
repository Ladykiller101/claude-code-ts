# AI Fintech Trader - Comprehensive Test Plan

**Project:** AIFred Trading Platform - "One For All" Unified Trading
**Date:** 2026-03-24
**Author:** QA Engineer
**Scope:** Authentication system, Hyperliquid DEX integration, unified trading platform

---

## Existing Codebase Summary

Before detailing the test plan, here is what already exists:

- **Auth:** Supabase-based auth with login/signup/logout/forgot-password/reset-password flows. Middleware at `src/middleware.ts` protects all routes except public ones. Auth context in `src/lib/auth-context.tsx` manages client-side state.
- **Trading:** Dashboard at `src/app/trading/page.tsx` loading `TradingDashboard` component. Broker registry at `src/app/api/trading/brokers/route.ts` supports Binance, Coinbase, Kraken, Bybit, Alpaca, OANDA (active) and IB, MetaTrader, Bloomberg (coming soon). Credentials stored in local JSON files on disk.
- **API Routes:** `/api/trading/` (GET trading data), `/api/trading/brokers` (GET/POST), `/api/trading/execute`, `/api/trading/controls`, `/api/trading/performance`.
- **Security concern:** Broker credentials stored as plain JSON on filesystem (`data/.broker-secrets.json`) with no encryption and no per-user isolation.

---

## 1. Authentication Tests

### 1.1 User Registration

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| AUTH-REG-01 | Sign up with valid email and password | User created in Supabase auth + profile row created, returns `{ success: true }` | P0 |
| AUTH-REG-02 | Sign up with duplicate email | Returns 409 with "Cet email est deja utilise" | P0 |
| AUTH-REG-03 | Sign up with missing email | Returns 400 with validation error | P0 |
| AUTH-REG-04 | Sign up with missing password | Returns 400 with validation error | P0 |
| AUTH-REG-05 | Sign up with weak password (< 6 chars) | Returns 400, Supabase rejects weak password | P1 |
| AUTH-REG-06 | Sign up with full_name and role metadata | Profile created with correct full_name and role | P1 |
| AUTH-REG-07 | Sign up when profile creation fails | User still created in auth; AuthProvider fallback handles missing profile | P2 |
| AUTH-REG-08 | OAuth registration (if implemented) | User redirected to provider, callback creates session + profile | P1 |

### 1.2 User Login

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| AUTH-LOGIN-01 | Login with valid credentials | Returns 200, sets auth cookies, returns redirect path | P0 |
| AUTH-LOGIN-02 | Login with wrong password | Returns 401 with "Mot de passe incorrect" and code WRONG_PASSWORD | P0 |
| AUTH-LOGIN-03 | Login with non-existent email | Returns 404 with code USER_NOT_FOUND | P0 |
| AUTH-LOGIN-04 | Login with missing email or password | Returns 400 | P0 |
| AUTH-LOGIN-05 | Login sets correct cookie attributes | Cookies have path="/", sameSite="lax", secure in production, httpOnly=false | P1 |
| AUTH-LOGIN-06 | Login redirect: client role goes to /portal | User with role starting with "client_" redirected to /portal | P1 |
| AUTH-LOGIN-07 | Login redirect: admin role goes to /dashboard | User with non-client role redirected to /dashboard | P1 |
| AUTH-LOGIN-08 | Login creates profile if missing | When profile row does not exist, login upserts one | P1 |

### 1.3 User Logout

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| AUTH-LOGOUT-01 | Logout clears server-side cookies via POST /api/auth/logout | Auth cookies removed from response | P0 |
| AUTH-LOGOUT-02 | Logout clears client-side Supabase session | `supabase.auth.signOut()` called | P0 |
| AUTH-LOGOUT-03 | Logout redirects to /login via hard navigation | `window.location.href` set to "/login" | P0 |
| AUTH-LOGOUT-04 | Logout when server logout fails | Client-side still clears session and redirects (graceful degradation) | P1 |

### 1.4 Session Persistence

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| AUTH-SESS-01 | Refresh page after login | User remains authenticated (cookies persist) | P0 |
| AUTH-SESS-02 | Auth loading timeout | If auth check takes > 5s, loading state is forced to false | P1 |
| AUTH-SESS-03 | Auth state change listener | When session changes (e.g., token refresh), profile is re-fetched | P1 |
| AUTH-SESS-04 | Expired session | Middleware redirects to /login for page requests, returns 401 for API requests | P0 |

### 1.5 Protected Route Access

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| AUTH-ROUTE-01 | Access /dashboard without auth | Redirected to /login | P0 |
| AUTH-ROUTE-02 | Access /trading without auth | Redirected to /login | P0 |
| AUTH-ROUTE-03 | Access /api/trading/brokers without auth | Returns 401 JSON `{ error: "Non autorise" }` | P0 |
| AUTH-ROUTE-04 | Access /login while authenticated | Page loads (no forced redirect, per current middleware) | P2 |
| AUTH-ROUTE-05 | Access /api/auth/login without auth | Passes through (public route) | P0 |
| AUTH-ROUTE-06 | Access /api/webhooks/* without auth | Passes through (public route) | P0 |
| AUTH-ROUTE-07 | Static assets (_next/static, images) bypass middleware | Assets load without auth check | P1 |

### 1.6 Multi-User Isolation

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| AUTH-ISO-01 | User A's broker connections not visible to User B | Each user sees only their own connected brokers | P0 |
| AUTH-ISO-02 | User A's API credentials not accessible by User B | Credentials are scoped per user | P0 |
| AUTH-ISO-03 | User A's trading data isolated from User B | Trading history, positions, PnL are per-user | P0 |
| AUTH-ISO-04 | Profile data isolation via Supabase RLS | Users can only read/update their own profile | P1 |

**NOTE:** Current broker storage (`data/broker-connections.json`, `data/.broker-secrets.json`) is NOT per-user. This is a critical gap that must be addressed.

---

## 2. Hyperliquid DEX Integration Tests

### 2.1 API Connection

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| HL-CONN-01 | Connect with valid Hyperliquid API key and secret | Connection established, status "connected" | P0 |
| HL-CONN-02 | Connect with invalid API key | Returns error, status remains "disconnected" | P0 |
| HL-CONN-03 | Connect with expired/revoked key | Meaningful error message returned | P1 |
| HL-CONN-04 | Verify Hyperliquid appears in broker registry | Hyperliquid listed with correct metadata (category: "crypto", required credentials) | P0 |
| HL-CONN-05 | Disconnect Hyperliquid | Connection removed, status set to "disconnected" | P1 |
| HL-CONN-06 | Re-connect after disconnect | New credentials saved, connection re-established | P1 |

### 2.2 Order Placement

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| HL-ORDER-01 | Place market buy order | Order executed, fill price and quantity returned | P0 |
| HL-ORDER-02 | Place market sell order | Order executed, fill price and quantity returned | P0 |
| HL-ORDER-03 | Place limit buy order | Order created with specified price, status "open" | P0 |
| HL-ORDER-04 | Place limit sell order | Order created with specified price, status "open" | P0 |
| HL-ORDER-05 | Place order with insufficient balance | Returns error with clear message | P0 |
| HL-ORDER-06 | Place order with invalid symbol | Returns 400 error | P1 |
| HL-ORDER-07 | Place order with zero or negative quantity | Returns validation error | P1 |
| HL-ORDER-08 | Place order when not connected to Hyperliquid | Returns error "Not connected to Hyperliquid" | P0 |
| HL-ORDER-09 | Cancel open limit order | Order cancelled, removed from open orders | P1 |
| HL-ORDER-10 | Place leveraged order (if supported) | Leverage applied, margin requirements validated | P1 |

### 2.3 Position Management

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| HL-POS-01 | Retrieve open positions | Returns list with symbol, size, entry price, unrealized PnL | P0 |
| HL-POS-02 | Close position fully | Position closed, realized PnL calculated | P0 |
| HL-POS-03 | Close position partially | Remaining position updated correctly | P1 |
| HL-POS-04 | Position PnL updates in real-time | WebSocket updates reflect current mark price | P1 |
| HL-POS-05 | No positions returns empty array | API returns `[]`, UI shows "No open positions" | P1 |

### 2.4 Balance and Portfolio

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| HL-BAL-01 | Retrieve account balance | Returns available balance, margin used, equity | P0 |
| HL-BAL-02 | Balance updates after trade | Balance reflects trade cost/proceeds | P0 |
| HL-BAL-03 | Portfolio breakdown by asset | Shows allocation percentages and values per asset | P1 |

### 2.5 WebSocket Real-Time Data

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| HL-WS-01 | Subscribe to price feed | Real-time price updates received for subscribed symbols | P1 |
| HL-WS-02 | Subscribe to order updates | Order fill/cancel notifications received | P1 |
| HL-WS-03 | WebSocket reconnection on disconnect | Auto-reconnects within 5 seconds | P2 |
| HL-WS-04 | WebSocket cleanup on component unmount | Connection properly closed, no memory leaks | P2 |

### 2.6 Error Handling

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| HL-ERR-01 | Network timeout during order placement | Timeout error surfaced to user, no duplicate orders | P0 |
| HL-ERR-02 | Hyperliquid API rate limit hit | Rate limit error displayed, retry after delay | P1 |
| HL-ERR-03 | Hyperliquid API returns 500 | Generic error shown, logged server-side | P1 |
| HL-ERR-04 | Malformed API response | Graceful handling, no crash | P1 |
| HL-ERR-05 | Simultaneous order requests | No race conditions, all orders processed correctly | P2 |

---

## 3. Frontend Tests

### 3.1 Login/Signup Pages

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| FE-AUTH-01 | Login page renders form with email and password fields | Fields present with correct types, placeholders | P0 |
| FE-AUTH-02 | Login form shows loading spinner on submit | Button disabled, text changes to "Connexion..." | P1 |
| FE-AUTH-03 | Login form displays error message on failure | Red error banner with server error message | P0 |
| FE-AUTH-04 | Signup page renders with name, email, password fields | All fields present | P0 |
| FE-AUTH-05 | Forgot password link navigates to /forgot-password | Correct navigation | P1 |
| FE-AUTH-06 | "Creer un compte" link navigates to /signup | Correct navigation | P1 |

### 3.2 Trading Dashboard

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| FE-DASH-01 | Dashboard loads with loading spinner initially | Shows "LOADING SYSTEMS..." animation | P1 |
| FE-DASH-02 | Dashboard renders equity curve chart | Recharts AreaChart renders with data | P0 |
| FE-DASH-03 | Dashboard shows summary stats (PnL, win rate, trades) | Stats cards display correct values | P0 |
| FE-DASH-04 | Dashboard shows user-specific data only | Data fetched with user's auth context | P0 |
| FE-DASH-05 | Execute Trade modal opens and closes | Modal triggered by button, closes on X or escape | P1 |
| FE-DASH-06 | Settings link navigates to /trading/settings | Correct routing | P1 |

### 3.3 Hyperliquid Trading Panel

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| FE-HL-01 | Hyperliquid connection panel shows in broker list | Listed with correct name, description, and credential fields | P0 |
| FE-HL-02 | Credential form validates required fields | Submit disabled until all required fields filled | P1 |
| FE-HL-03 | Connection status indicator updates | Green for connected, gray for disconnected, red for error | P1 |
| FE-HL-04 | Trade form shows Hyperliquid-supported pairs | Correct symbols listed in dropdown | P0 |
| FE-HL-05 | Order type selector (market/limit) changes form | Limit shows price field, market does not | P1 |
| FE-HL-06 | Trade execution shows confirmation | Success toast/notification after order placed | P1 |

### 3.4 Responsive Design

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| FE-RESP-01 | Dashboard renders on mobile (375px width) | All content visible, charts resize, no horizontal scroll | P1 |
| FE-RESP-02 | Dashboard renders on tablet (768px width) | Layout adapts appropriately | P2 |
| FE-RESP-03 | Login page renders on mobile | Form usable, inputs not cut off | P1 |
| FE-RESP-04 | Trading panel usable on mobile | Order form accessible, buttons tappable | P2 |

### 3.5 Error States

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| FE-ERR-01 | Trading data fetch fails (404) | Shows message: "Trading data not found" | P0 |
| FE-ERR-02 | Trading data fetch fails (500) | Shows generic error with retry option | P0 |
| FE-ERR-03 | Broker list fetch fails | Error state shown in broker panel | P1 |
| FE-ERR-04 | ErrorBoundary catches component crash | `src/app/error.tsx` renders fallback UI | P1 |
| FE-ERR-05 | Global error boundary works | `src/app/global-error.tsx` catches root-level errors | P2 |

---

## 4. Backend / API Tests

### 4.1 API Endpoints

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| API-01 | GET /api/trading returns trading data | 200 with JSON trading data when data file exists | P0 |
| API-02 | GET /api/trading returns 404 when no data file | 404 with helpful error message | P1 |
| API-03 | GET /api/trading/brokers returns broker list | 200 with array of broker definitions + connection status | P0 |
| API-04 | POST /api/trading/brokers with valid credentials | 200 with success message and accountInfo | P0 |
| API-05 | POST /api/trading/brokers with missing brokerId | 400 error | P0 |
| API-06 | POST /api/trading/brokers with unknown brokerId | 400 "Unknown broker" | P1 |
| API-07 | POST /api/trading/brokers for comingSoon broker | 400 "coming soon" | P1 |
| API-08 | POST /api/trading/brokers with missing required credentials | 400 listing missing fields | P0 |
| API-09 | POST /api/trading/execute places trade | 200 with execution confirmation | P0 |
| API-10 | GET /api/trading/performance returns metrics | 200 with performance data | P1 |
| API-11 | GET /api/trading/controls returns trading controls | 200 with control settings | P1 |
| API-12 | POST /api/auth/signup creates user | 200 with user id and email | P0 |
| API-13 | POST /api/auth/login sets cookies and returns redirect | 200 with cookies set | P0 |
| API-14 | POST /api/auth/logout clears cookies | 200, cookies cleared | P0 |

### 4.2 Auth Middleware

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| MW-01 | Authenticated request to protected page | Request passes through | P0 |
| MW-02 | Unauthenticated request to protected page | 302 redirect to /login | P0 |
| MW-03 | Unauthenticated request to /api/* | 401 JSON response, no redirect | P0 |
| MW-04 | Request to public route (/, /login, /signup, etc.) | No auth check, passes through | P0 |
| MW-05 | Request to /api/auth/* routes | No auth check, passes through | P0 |
| MW-06 | Request to /api/webhooks/* routes | No auth check, passes through | P0 |
| MW-07 | Middleware refreshes Supabase token via cookie | Cookies updated if token was refreshed | P1 |

### 4.3 Credential Storage

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| CRED-01 | Credentials never returned in GET /api/trading/brokers | Response contains no api_key or api_secret values | P0 |
| CRED-02 | Credentials stored separately from connection metadata | broker-connections.json has no credential fields | P0 |
| CRED-03 | Credentials encrypted at rest (REQUIRED for production) | Secrets file encrypted or stored in secure vault | P0 |
| CRED-04 | Credentials scoped per user (REQUIRED for multi-user) | Each user's credentials stored under their user ID | P0 |

**CRITICAL FINDING:** Current implementation stores secrets in plain JSON on the filesystem with no encryption and no per-user scoping. This must be fixed before production.

### 4.4 Rate Limiting

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| RATE-01 | Rapid login attempts (> 10/min) | Rate limited, returns 429 | P1 |
| RATE-02 | Rapid trade execution requests | Rate limited per user | P1 |
| RATE-03 | Rapid broker connection attempts | Rate limited | P2 |

### 4.5 CORS Configuration

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| CORS-01 | API request from allowed origin | Response includes correct CORS headers | P1 |
| CORS-02 | API request from disallowed origin | Request rejected or no CORS headers | P1 |
| CORS-03 | Preflight OPTIONS request | Returns 200 with correct Allow headers | P2 |

---

## 5. Integration Tests

### 5.1 Full User Flow

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| INT-01 | Sign up -> Login -> Access dashboard | User created, logged in, dashboard loads with user data | P0 |
| INT-02 | Login -> Connect Hyperliquid -> See balance | Credentials saved, connection established, balance displayed | P0 |
| INT-03 | Login -> Connect Hyperliquid -> Place market trade -> See updated positions | Trade executed, position appears, balance updated | P0 |
| INT-04 | Login -> Connect Hyperliquid -> Place limit order -> Cancel order | Order created then cancelled | P1 |
| INT-05 | Login -> View trading performance -> Check equity curve | Performance data loads, chart renders with historical data | P1 |
| INT-06 | Login -> Go to settings -> Update trading controls | Controls saved and applied | P1 |
| INT-07 | Login -> Logout -> Attempt to access /trading | Redirected to /login | P0 |

### 5.2 Multi-User Scenarios

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| INT-MULTI-01 | User A connects Binance, User B connects Hyperliquid | Each sees only their own broker | P0 |
| INT-MULTI-02 | User A places trade, User B checks positions | User B sees no positions from User A | P0 |
| INT-MULTI-03 | Two users logged in simultaneously | Independent sessions, no data leakage | P0 |
| INT-MULTI-04 | User A's session expires while User B is active | Only User A redirected, User B unaffected | P1 |

---

## 6. Security Tests

### 6.1 API Key Exposure

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| SEC-KEY-01 | Check API responses for leaked credentials | No API keys, secrets, or tokens in any response body | P0 |
| SEC-KEY-02 | Check browser network tab during trading flow | No credentials visible in request/response payloads | P0 |
| SEC-KEY-03 | Check page source / JS bundles for hardcoded keys | No secrets in client-side JavaScript | P0 |
| SEC-KEY-04 | Environment variables not exposed to client | Only NEXT_PUBLIC_* vars accessible client-side | P0 |
| SEC-KEY-05 | .broker-secrets.json not served by web server | Direct URL access returns 404 | P0 |

### 6.2 SQL Injection

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| SEC-SQL-01 | Login with SQL injection in email field | Supabase parameterized query prevents injection | P0 |
| SEC-SQL-02 | Signup with SQL injection in full_name | Input sanitized or parameterized | P0 |
| SEC-SQL-03 | Broker connection with injection in credentials | No database query executed with raw credential values | P1 |

### 6.3 XSS Prevention

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| SEC-XSS-01 | Login error message with HTML/script payload | React escapes output, no script execution | P0 |
| SEC-XSS-02 | User full_name with script tag | Name displayed safely (escaped) in dashboard | P0 |
| SEC-XSS-03 | Trading data with malicious content | Chart labels and values properly escaped | P1 |

### 6.4 CSRF Protection

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| SEC-CSRF-01 | POST /api/auth/login from external origin | Rejected or requires valid session token | P1 |
| SEC-CSRF-02 | POST /api/trading/execute from external origin | Rejected without valid auth cookies | P0 |
| SEC-CSRF-03 | SameSite cookie attribute set correctly | Cookies set with SameSite=Lax (verified in AUTH-LOGIN-05) | P1 |

### 6.5 Credential Encryption

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| SEC-ENC-01 | Broker credentials encrypted at rest | Secrets file not readable as plain text | P0 |
| SEC-ENC-02 | Encryption key not stored alongside encrypted data | Key in environment variable or vault, not in data/ directory | P0 |
| SEC-ENC-03 | Supabase service role key not in client bundle | SUPABASE_SERVICE_ROLE_KEY only used server-side | P0 |

---

## 7. Pre-existing Issues Found During Codebase Review

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Broker credentials stored as **plain text JSON** on filesystem | CRITICAL | `src/app/api/trading/brokers/route.ts` lines 193-205 |
| 2 | **No per-user isolation** for broker connections - all users share one file | CRITICAL | `src/app/api/trading/brokers/route.ts` lines 179-191 |
| 3 | Trading data read from local JSON file, not from database | HIGH | `src/app/api/trading/route.ts` |
| 4 | No Hyperliquid broker in the BROKER_REGISTRY | HIGH | `src/app/api/trading/brokers/route.ts` lines 28-155 |
| 5 | Login route sets `httpOnly: false` on auth cookies | MEDIUM | `src/app/api/auth/login/route.ts` line 125 |
| 6 | No rate limiting on any API endpoint | MEDIUM | All API routes |
| 7 | `/api/dashboard` and `/api/google/drive/sync` are public (no auth) | LOW | `src/middleware.ts` line 39-40 |
| 8 | Duplicate files with " 2" suffix throughout codebase | LOW | Multiple locations |

---

## 8. Test Execution Strategy

### Tools
- **Unit tests:** Vitest or Jest with React Testing Library
- **API tests:** Vitest or supertest for route handlers
- **E2E tests:** Playwright or Cypress
- **Security tests:** Manual + OWASP ZAP for automated scanning

### Environments
- **Local:** `npm run dev` on localhost:3000 with test Supabase project
- **Staging:** Vercel preview deployment with staging Supabase
- **Production:** Smoke tests only after deployment

### Test Data
- Test Supabase project with seed users (admin, client, trader roles)
- Hyperliquid testnet API keys for safe order testing
- Mock trading data JSON for dashboard tests

### Priority Execution Order
1. **P0 (Blocking):** Must pass before any release - auth flows, credential security, data isolation, core trading
2. **P1 (Important):** Should pass before release - error handling, edge cases, UI states
3. **P2 (Nice to have):** Can be deferred - responsive design edge cases, WebSocket reconnection

---

## 9. Acceptance Criteria for New Features

### User Login System
- [ ] Users can register, login, and logout
- [ ] Sessions persist across page refreshes
- [ ] Protected routes redirect unauthenticated users
- [ ] Each user sees only their own data (broker connections, trades, performance)

### Hyperliquid DEX Integration
- [ ] Hyperliquid appears in broker registry with correct credential requirements
- [ ] Users can connect/disconnect Hyperliquid accounts
- [ ] Market and limit orders can be placed
- [ ] Open positions and balances are displayed
- [ ] Real-time price updates work via WebSocket
- [ ] Error states are handled gracefully

### Unified Trading Platform
- [ ] Multiple brokers can be connected simultaneously
- [ ] Trading dashboard aggregates data across brokers
- [ ] Broker credentials are encrypted at rest
- [ ] Credentials stored per-user in database (not filesystem)
