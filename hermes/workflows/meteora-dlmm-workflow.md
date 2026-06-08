# Meteora DLMM Initial 3-Agent Workflow

Initial dummy workflow:

1. User sends `/workflow_test` to Lio at `@Liocala_bot`.
2. Lio calls Cala internally.
3. Cala returns dummy JSON candidates.
4. Lio calls Konlin with dummy top candidates.
5. Konlin returns dummy JSON analysis.
6. Lio sends final Telegram result.

Telegram identity separation:

- `LIO_TELEGRAM_BOT_USERNAME=@Liocala_bot`
- `CALA_TELEGRAM_BOT_USERNAME=@Calalio_bot`
- `KONLIN_TELEGRAM_BOT_USERNAME=@KOnlin_bot`
- `TELEGRAM_CHAT_ID` must be a numeric user/chat/group ID, not a bot username.

Safety:

- Real Meteora scan disabled in this initial workflow.
- Claude API calls disabled in this initial workflow.
- Wallet execution disabled.
- Auto entry disabled.
