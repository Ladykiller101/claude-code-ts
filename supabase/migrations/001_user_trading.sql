-- Migration: User Trading Schema for Hyperliquid Integration
-- Created: 2026-03-24

-- User wallet connections (Hyperliquid agent wallets)
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  agent_wallet_encrypted TEXT, -- encrypted agent private key
  label TEXT DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);

-- User trading preferences
CREATE TABLE user_trading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_leverage INTEGER DEFAULT 1,
  max_leverage INTEGER DEFAULT 10,
  risk_limit_daily_usd NUMERIC DEFAULT 1000,
  max_position_size_usd NUMERIC DEFAULT 5000,
  auto_trade_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade history
CREATE TABLE trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'long' or 'short'
  order_type TEXT NOT NULL, -- 'market', 'limit'
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  filled_price NUMERIC,
  leverage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, filled, cancelled, failed
  pnl NUMERIC,
  fees NUMERIC,
  hyperliquid_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_active ON user_wallets(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX idx_trade_history_status ON trade_history(user_id, status);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol, created_at DESC);

-- RLS policies
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trading_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wallets" ON user_wallets
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own config" ON user_trading_config
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own trades" ON trade_history
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_trading_config_updated_at
  BEFORE UPDATE ON user_trading_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
