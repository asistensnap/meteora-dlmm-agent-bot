# DLMM Manual Scan Workflow

/scan_now -> Operator -> Screening Agent -> Claude Analyst if candidates exist -> Telegram alert -> SQLite -> paper trading.

Operator must never call Claude for empty candidate lists and must never send more than MAX_CLAUDE_POOL_COUNT pools.
