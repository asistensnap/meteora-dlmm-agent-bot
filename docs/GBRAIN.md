# Gbrain Memory Setup

Gbrain is used as an optional local memory layer for Hermes agents and the Obsidian second brain.

This setup does not require changing Claude MCP, TradingView MCP, or any existing MCP configuration.

## Local Paths

Current Windows install paths:

```text
C:\Users\EBBE\Gbrain\gbrain
C:\Users\EBBE\.bun\bin\gbrain.exe
C:\Users\EBBE\.gbrain\brain.pglite
```

Primary Obsidian memory imported into Gbrain:

```text
C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot
```

Hermes profile skill files:

```text
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-cimot\skills\gbrain\SKILL.md
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-cala\skills\gbrain\SKILL.md
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-lio\skills\gbrain\SKILL.md
C:\Users\EBBE\AppData\Local\hermes\profiles\telegram-konlin\skills\gbrain\SKILL.md
```

## Current Mode

The local setup uses:

```text
search mode: conservative
embedding: deferred / not embedded
```

This is intentional for a light PC setup.

Use manual import/query first. Do not auto-start Gbrain on the desktop unless you intentionally want another always-running process.

## Activate Manually On Windows

Open PowerShell:

```powershell
$env:PATH='C:\Users\EBBE\.bun\bin;' + $env:PATH
gbrain --version
gbrain stats
```

Expected shape:

```text
gbrain 0.42.42.0
Pages: 33
Chunks: 53
Tags: 47
```

## Update Memory After Editing Obsidian

After editing Obsidian notes, run:

```powershell
$env:PATH='C:\Users\EBBE\.bun\bin;' + $env:PATH
gbrain import "C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot" --no-embed
gbrain stats
```

This updates Gbrain from the Obsidian project folder without embeddings.

## Query Memory

Examples:

```powershell
gbrain search "EvilPanda Strategy"
gbrain query "apa isi utama EvilPanda Strategy di project Meteora DLMM?"
gbrain query "apa langkah pindah project ke VPS?"
```

Because embeddings are deferred, retrieval is lighter and less semantic. This is fine for manual memory checks.

## Use From Hermes Desktop

Restart or reload Hermes Desktop after adding the `gbrain` skill folders.

Profiles with the skill:

- `telegram-cimot`
- `telegram-cala`
- `telegram-lio`
- `telegram-konlin`

Example prompts:

```text
Gunakan skill gbrain untuk membaca memory project Meteora DLMM.
```

```text
Lio, gunakan gbrain untuk cek memory EvilPanda Strategy.
```

```text
Cala, gunakan gbrain dan EvilPanda Strategy untuk review aturan screening.
```

```text
Konlin, gunakan gbrain untuk membaca Live Bot Memory dan Trade Log sebelum memberi analisis.
```

```text
Cimot, gunakan gbrain untuk membaca memory yang relevan, tapi jangan sentuh project Meteora kecuali diminta.
```

## Use From Telegram

If the Hermes Telegram gateway/profile is running, use natural language:

```text
Lio gunakan gbrain untuk cek memory EvilPanda Strategy
```

Or:

```text
Lio gunakan gbrain untuk cari memory tentang cara pindah ke VPS
```

A `/gbrain` slash command only works if the gateway command handler explicitly supports it. Natural language is the safest first test.

## Recommended Workflow

1. Write or update notes in Obsidian.
2. Save the notes.
3. Manually import Obsidian into Gbrain.
4. Ask Hermes/Codex to use Gbrain when memory is needed.

PowerShell:

```powershell
$env:PATH='C:\Users\EBBE\.bun\bin;' + $env:PATH
gbrain import "C:\Users\EBBE\Documents\Obsidian\Meteora Dlmm\Meteora DLMM Agent Bot" --no-embed
gbrain stats
```

## Better Desktop Setup

For this PC, keep Gbrain manual.

Reason:

- less background load
- avoids making Claude/Codex/Hermes feel heavy
- avoids accidental long-running daemons
- still gives memory when needed

For 24/7 live automation, use VPS later.

## New PC / Mac / Linux / VPS

Install Gbrain on another machine:

```bash
git clone https://github.com/garrytan/gbrain.git ~/gbrain
cd ~/gbrain
```

Install Bun from the official Bun installer, then:

```bash
bun install
bun link
gbrain --version
gbrain init --pglite --no-embedding
gbrain import "$HOME/Documents/Obsidian/Meteora Dlmm/Meteora DLMM Agent Bot" --no-embed
gbrain stats
```

Then copy or recreate the Hermes skill files for the relevant profiles.

## Optional Semantic Search Later

For stronger semantic search, configure an embedding provider later:

```text
OPENAI_API_KEY
ZEROENTROPY_API_KEY
VOYAGE_API_KEY
```

Do not store these keys in Obsidian or GitHub. Keep them in local env or the target machine's secret manager.

## Safety

Do not import:

- `.env`
- API keys
- wallet private keys
- Telegram bot tokens
- logs with secrets
- live database backups unless intended

Do not use this Gbrain setup as an execution trigger. It is memory/context only.
