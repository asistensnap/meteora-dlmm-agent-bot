CREATE TABLE IF NOT EXISTS pool_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  pair TEXT NOT NULL,
  tvl REAL NOT NULL,
  volume_24h REAL NOT NULL,
  fee_24h REAL NOT NULL,
  fee_tvl_ratio_24h REAL NOT NULL,
  apr_24h REAL,
  farm_apy REAL,
  bin_step REAL,
  pool_created_at TEXT,
  local_strategy TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  score INTEGER NOT NULL,
  classification TEXT NOT NULL,
  raw_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claude_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  pair TEXT NOT NULL,
  decision TEXT NOT NULL,
  strategy TEXT NOT NULL,
  range_recommendation TEXT NOT NULL,
  max_allocation TEXT NOT NULL,
  main_reason TEXT NOT NULL,
  exit_rule TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  raw_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  pair TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  confidence INTEGER,
  telegram_message_id INTEGER
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_timestamp TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  pair TEXT NOT NULL,
  strategy TEXT NOT NULL,
  range_recommendation TEXT NOT NULL,
  score_at_entry INTEGER NOT NULL,
  confidence_at_entry INTEGER NOT NULL,
  status TEXT NOT NULL,
  result_1h TEXT,
  result_4h TEXT,
  result_24h TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS trade_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opened_at TEXT,
  closed_at TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  pair TEXT NOT NULL,
  strategy TEXT NOT NULL,
  range_recommendation TEXT,
  entry_value_usd REAL,
  exit_value_usd REAL,
  pnl_usd REAL NOT NULL,
  pnl_percent REAL,
  pnl_status TEXT NOT NULL,
  exit_reason TEXT NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  raw_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
