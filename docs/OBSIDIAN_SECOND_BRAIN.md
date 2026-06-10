# Obsidian Second Brain

This project keeps runtime configuration in `.env` and long-term memory in Obsidian.

Do not commit secrets, wallet keys, API keys, or private Telegram tokens to Obsidian or GitHub.

## Recommended Vault Placement

On the current Windows PC:

```text
C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot
```

On a new Windows PC, create the same folder or choose your own Obsidian vault and copy the project notes there.

On macOS/Linux, use any Obsidian vault path, for example:

```text
~/Documents/Obsidian/Meteora Dlmm/Meteora DLMM Agent Bot
```

## AI-Ready Folder Structure

Use this structure inside the Obsidian project folder:

```text
00 Inbox
01 Ideas
02 Projects
03 Research
04 Workflows
05 Prompts
06 Mistakes
07 Decisions
08 People Companies
09 Writing Voice
10 Archive
11 Live Memory
```

## Required Core Notes

Create or keep these notes:

```text
00 - Meteora DLMM Agent Bot Index.md
10 - Second Brain Dashboard.md
16 - EvilPanda Strategy.md
19 - AI Ready Second Brain.md
20 - Live Bot Memory.md
21 - Decision Log.md
22 - Mistake Log.md
23 - Prompt Library.md
24 - Weekly Review.md
25 - Trade Log Memory.md
26 - EvilPanda Skill Placement.md
```

## Live Memory Rules

When the system is live, write important events to Obsidian:

- startup/shutdown
- mode changes
- scan results
- Cala screening decisions
- Konlin analysis decisions
- entry plans
- opened positions
- closed positions
- PnL positive/negative
- Telegram/gateway/model/RPC errors
- broken rules
- lessons learned

Use:

```text
20 - Live Bot Memory.md
25 - Trade Log Memory.md
21 - Decision Log.md
22 - Mistake Log.md
```

## Graph View

Every note should include:

```yaml
tags:
  - meteora-dlmm
```

Use links such as:

```md
Related: [[16 - EvilPanda Strategy]] [[20 - Live Bot Memory]] [[25 - Trade Log Memory]]
```

Graph View filters:

```text
tag:#meteora-dlmm
```

For live/trade memory only:

```text
tag:#live-memory OR tag:#trade-log
```

## AI Review Prompts

Use these prompts with Codex/Claude after pointing them at the Obsidian project folder:

```text
Read the Meteora DLMM Agent Bot Obsidian notes.
Find repeated patterns in my decisions, mistakes, trade logs, and strategy notes.
Give the next safest action.
```

```text
Read EvilPanda Strategy, Live Bot Memory, and Trade Log Memory.
Check whether the latest closed position followed the strategy.
List rule violations and lessons.
```

## What Not To Store

Never store:

- private keys
- seed phrases
- `.env`
- API keys
- bot tokens
- real wallet export files

Keep secrets only in local `.env` or the target machine's secure secret manager.
