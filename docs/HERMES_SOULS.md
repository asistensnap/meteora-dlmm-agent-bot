# Hermes Agent SOUL.md Profiles

This document describes the active Hermes Desktop SOUL.md setup for the four Telegram/Hermes profiles.

No MCP, gateway runtime, wallet, or trading execution configuration is required by this document.

## Active Hermes Desktop Paths

The active SOUL.md files live in Hermes Desktop profile folders:

```text
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-cimot\SOUL.md
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-cala\SOUL.md
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-lio\SOUL.md
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-konlin\SOUL.md
```

Hermes Desktop reads these profile prompts when the related profile/session/gateway is loaded.

After editing a SOUL.md file, reload the profile, restart the gateway, or restart Hermes Desktop if the new behavior is not visible.

## Repo Backup Copies

The repo stores backup/template copies here:

```text
hermes/souls/telegram-cimot-SOUL.md
hermes/souls/telegram-cala-SOUL.md
hermes/souls/telegram-lio-SOUL.md
hermes/souls/telegram-konlin-SOUL.md
```

These files are documentation and migration templates. The active files are still the Hermes Desktop profile files under `AppData\Local\hermes\profiles`.

## Agent Roles

## Model Behavior

The active model is controlled by Hermes Desktop profile/model settings.

SOUL.md does not hard-lock the runtime model. Each profile now says to follow the active Hermes Desktop profile model.

Default intent:

- `telegram-cimot`: no fixed model
- `telegram-lio`: DeepSeek-compatible operator model
- `telegram-cala`: DeepSeek-compatible screening model
- `telegram-konlin`: Claude-compatible analyst model

If EBBE changes the model in Hermes Desktop, the agent should keep its role and use the newly selected active model.

### Cimot

Profile:

```text
telegram-cimot
```

Purpose:

- General Hermes helper for EBBE.
- Separate Trade Claude MCP helper.
- PC operation and Hermes/Desktop guidance.
- Must stay separate from Meteora DLMM unless EBBE explicitly asks.

Safety:

- Do not touch Lio/Cala/Konlin unless explicitly asked.
- Do not touch MCP/TradingView/Claude MCP unless explicitly asked.
- Do not print secrets or execute trades.

### Lio

Profile:

```text
telegram-lio
```

Purpose:

- Meteora DLMM Operator / Orchestrator.
- Main Telegram gateway and workflow controller.
- Calls Cala for screening.
- Calls Konlin only for shortlisted candidates.
- Routes system/result/entry/trade-log/troubleshoot output.

Safety:

- Does not scan raw pools itself when Cala should handle screening.
- Does not do final Claude analysis when Konlin should handle it.
- Does not enable real execution from SOUL instructions alone.

### Cala

Profile:

```text
telegram-cala
```

Purpose:

- Meteora DLMM Screening / Scanner agent.
- Uses the active Hermes Desktop profile model.
- Default intent is a DeepSeek-compatible screening model.
- Filters, scores, and shortlists candidates.
- Applies local strategy selection: CURVE, SPOT, BID_ASK, AVOID.
- Applies EvilPanda screening rules when relevant.

Safety:

- Does not call Claude.
- Does not execute transactions.
- Does not ask for private keys.
- Returns compact structured output.

### Konlin

Profile:

```text
telegram-konlin
```

Purpose:

- Meteora DLMM Analyst agent.
- Uses the active Hermes Desktop profile model.
- Default intent is a Claude-compatible analyst model.
- Analyzes only shortlisted candidates from Cala/Lio.
- Validates strategy, allocation, range, confidence, and exit rule.
- Applies EvilPanda validation when relevant.

Safety:

- Does not scan all raw pools.
- Does not execute trades.
- Does not guarantee profit.
- Keeps output compact.

## Gbrain / Obsidian

The SOUL.md files know about the optional Gbrain memory layer:

```text
C:\Users\EBBE\Gbrain\gbrain
C:\Users\EBBE\.bun\bin\gbrain.exe
C:\Users\EBBE\.gbrain\brain.pglite
C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot
```

Use Gbrain as memory/context only. Do not import `.env`, wallet files, API keys, tokens, or logs containing secrets.

## Restore From Repo Template

If a Hermes Desktop SOUL.md gets damaged, copy from the repo backup.

PowerShell example:

```powershell
Copy-Item "C:\Users\EBBE\meteora-dlmm-agent-bot\hermes\souls\telegram-lio-SOUL.md" "C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-lio\SOUL.md" -Force
```

Repeat with the matching profile name.

## What This Does Not Do

This setup does not:

- start or stop gateways
- edit MCP configuration
- edit Telegram tokens
- edit wallet/private keys
- enable auto execution
- modify live trading code

It only defines the agent identities, role boundaries, memory behavior, and safety rules.
