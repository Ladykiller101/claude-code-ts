# Backend API Documentation — Hyperliquid Integration

## Environment Variables

Add these to `.env.local`:

```env
# Existing (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# New — required for wallet encryption
ENCRYPTION_SECRET=your-32-char-minimum-secret-here
```

## Database Schema

### Running Migrations

Apply the migration to your Supabase instance:

```bash
# Option 1: Via Supabase Dashboard
# Go to SQL Editor > paste contents of supabase/migrations/001_user_trading.sql > Run

# Option 2: Via Supabase CLI
supabase db push
```

### Tables

| Table | Purpose |
|---|---|
| `user_wallets` | Stores wallet connections with encrypted agent keys |
| `user_trading_config` | Per-user trading preferences and risk limits |
| `trade_history` | Full trade audit log |

All tables have RLS enabled — users can only access their own data.

---

## API Endpoints

### Public Endpoints (No Auth Required)

#### GET `/api/hyperliquid/market`

Get real-time market data for a perpetual.

```
GET /api/hyperliquid/market?symbol=BTC-PERP
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-PERP",
    "markPrice": 87234.5,
    "midPrice": 87230.0,
    "change24h": 2.34,
    "volume24h": 1523456789.0,
    "fundingRate": 0.0001,
    "openInterest": 456789012.0
  }
}
```

#### GET `/api/hyperliquid/orderbook`

Get L2 orderbook.

```
GET /api/hyperliquid/orderbook?symbol=BTC-PERP
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-PERP",
    "bids": [{ "price": 87230.0, "size": 1.5 }],
    "asks": [{ "price": 87235.0, "size": 0.8 }],
    "timestamp": 1711324800000
  }
}
```

#### GET `/api/hyperliquid/candles`

Get OHLCV candle data.

```
GET /api/hyperliquid/candles?symbol=BTC-PERP&interval=1h&limit=200
```

**Parameters:**
| Param | Required | Default | Values |
|---|---|---|---|
| symbol | Yes | — | e.g. `BTC-PERP` |
| interval | No | `1h` | `1m`, `5m`, `15m`, `1h`, `4h`, `1d` |
| limit | No | `200` | 1–1000 |
| startTime | No | auto | Unix ms |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "time": 1711324800000,
      "open": 87100.0,
      "high": 87400.0,
      "low": 87050.0,
      "close": 87234.5,
      "volume": 12345678.0
    }
  ]
}
```

---

### Authenticated Endpoints (Require Login)

All authenticated endpoints return `401` if not logged in.

#### GET `/api/hyperliquid/positions`

Get user's open positions and account balance.

```
GET /api/hyperliquid/positions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "symbol": "BTC-PERP",
        "side": "long",
        "size": 0.5,
        "entryPrice": 86500.0,
        "markPrice": 87234.5,
        "unrealizedPnl": 367.25,
        "leverage": 5,
        "liquidationPrice": 72000.0,
        "marginUsed": 8650.0
      }
    ],
    "balance": {
      "totalEquity": 25000.0,
      "availableBalance": 16350.0,
      "marginUsed": 8650.0,
      "unrealizedPnl": 367.25,
      "accountValue": 25000.0
    },
    "walletAddress": "0x..."
  }
}
```

#### POST `/api/hyperliquid/order`

Place an order on Hyperliquid.

```
POST /api/hyperliquid/order
Content-Type: application/json

{
  "symbol": "BTC-PERP",
  "side": "long",
  "size": 0.1,
  "orderType": "market",
  "leverage": 5
}
```

**Limit order:**
```json
{
  "symbol": "ETH-PERP",
  "side": "short",
  "size": 2.0,
  "price": 3300.0,
  "orderType": "limit",
  "leverage": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "123456",
    "symbol": "BTC-PERP",
    "side": "long",
    "size": 0.1,
    "price": 87234.5,
    "orderType": "market",
    "leverage": 5,
    "status": "filled",
    "tradeId": "uuid-..."
  }
}
```

**Error codes:**
| Code | Meaning |
|---|---|
| `NO_WALLET` | No wallet connected |
| `NO_AGENT_KEY` | Wallet missing agent private key |
| `LEVERAGE_EXCEEDED` | Requested leverage > user max |
| `POSITION_SIZE_EXCEEDED` | Position value > user limit |

#### GET `/api/hyperliquid/wallet`

List connected wallets.

```
GET /api/hyperliquid/wallet
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "uuid-...",
        "wallet_address": "0x...",
        "label": "Default",
        "is_active": true,
        "created_at": "2026-03-24T..."
      }
    ]
  }
}
```

#### POST `/api/hyperliquid/wallet`

Connect a Hyperliquid wallet.

```
POST /api/hyperliquid/wallet
Content-Type: application/json

{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "agentPrivateKey": "0xabcdef...",
  "label": "Trading Wallet"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet connected successfully",
  "data": {
    "wallet": {
      "id": "uuid-...",
      "walletAddress": "0x...",
      "label": "Trading Wallet",
      "isActive": true,
      "createdAt": "2026-03-24T..."
    }
  }
}
```

#### DELETE `/api/hyperliquid/wallet`

Disconnect a wallet.

```
DELETE /api/hyperliquid/wallet
Content-Type: application/json

{ "walletId": "uuid-..." }
```

---

### Broker Registry

Hyperliquid is registered in the broker list:

```
GET /api/trading/brokers
```

Returns Hyperliquid with `id: "hyperliquid"`, `category: "crypto"`.
