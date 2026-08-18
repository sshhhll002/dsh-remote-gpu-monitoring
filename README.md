# dsh-remote-gpu-monitoring

<p align="center">
  <img alt="GitHub release" src="https://img.shields.io/github/v/release/sshhhll002/dsh-remote-gpu-monitoring">
  <img alt="License" src="https://img.shields.io/github/license/sshhhll002/dsh-remote-gpu-monitoring">
  <img alt="dsh-plugin" src="https://img.shields.io/badge/dsh-plugin-available-2563eb">
</p>

A **remote multi-server GPU status board** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web: one glance at every GPU server you can reach over SSH, right from the sidebar — a collapsible panel plus agent tools.

```
● Remote GPU · 3/4 free                (sidebar foot entry, collapsible)
  ┌────────────────────────────────────────┐
  │ Remote GPU                  [⚙][↻][✕]  │
  │ ● gpu-a                       1/1 free │
  │   GPU0 RTX 4090  22.7/24.0G  0% 32°C 58W│
  │ ● gpu-b                      0/2 free │
  │   GPU0 RTX 3090  23.5/24.0G 11% 52°C 96W│
  │   GPU1 RTX A6000 10.0/48.0G  2% 40°C 45W│
  └────────────────────────────────────────┘
```

## Why this exists

Watching a fleet usually means ssh-ing into each box and running `nvidia-smi` by hand. This plugin turns that into one live board shared by every browser session, with a cached snapshot the model can answer from — so "which server has a free card?" is one tool call, not seven SSH round-trips.

## Features

- **One board, every server** — a fixed read-only `nvidia-smi` query per host: per-card model, memory, utilization, temperature, and power draw, color-coded by thresholds. Mixed-GPU servers are fine — every card is labeled individually.
- **Zero configuration** — on startup it parses `~/.ssh/config` (`Include`, globs, quoted aliases) and watches every concrete alias; `Host *` patterns and `!` negations are skipped.
- **Per-server selection** — the ⚙ view lists every discovered host; unchecked servers disappear from the board and stop being collected immediately.
- **Safe by design** — only the Host process ever opens SSH: `BatchMode=yes`, public-key only, one fixed read-only command. No user input ever reaches the remote side, and there is no arbitrary-command tool. Private keys never leave your `~/.ssh/config` / agent.
- **Cheap by design** — one shared host-side cache for every browser session; per-host `ControlMaster` socket reuse (no handshake per refresh); single-flight, staggered collection, and exponential backoff.
- **Agent tools** — `gpu_overview` (cached snapshot, zero SSH cost) and `gpu_refresh` (immediate collection pass).

## Install

```sh
dsh plugin --profile web add github:sshhhll002/dsh-remote-gpu-monitoring   # from GitHub
dsh plugin --profile web add dsh-remote-gpu-monitoring                     # from npm, once published
dsh --profile web                                                          # restart dsh, then refresh the page
```

The plugin is enabled by installation: being in the profile's bundle list is the switch. Restart once, then the sidebar entry, panel, and tools come up with the app.

## How it works

```
browser panel ──GET/POST /api/remote-gpu──▶ host cache ◀──ssh── your servers
                                             (ControlMaster, fixed read-only
                                              nvidia-smi, 5s refresh)
```

- The **Host process** is the only thing that ever talks to the servers; every browser session reads the same cached snapshot.
- Per-host `ControlMaster` sockets persist between refreshes, so a 5s tick is a trivial exec over an existing connection, not a handshake.
- Connection details (HostName, port, key, jump hosts) always come from your `~/.ssh/config` and are re-read on every probe; only the *list of aliases* is discovered once at startup.
- The panel's only write is the selection set; unselected hosts stop being queried altogether.

## Configuration

Everything below is optional. The row ships with `hosts: 'auto'` (discover every concrete alias in `~/.ssh/config`). To watch an explicit list instead, override the row in your profile's `cordis.patch.yml`:

```yaml
- id: remote-gpu-monitoring
  name: dsh-remote-gpu-monitoring
  config:
    hosts: ['gpu-a', 'gpu-b', 'train-01']
```

All row-config keys merge over the defaults:

| Key | Default | Meaning |
| --- | --- | --- |
| `hosts` | `'auto'` | `'auto'` = every concrete alias in `~/.ssh/config`, or a `string[]` of aliases |
| `intervalMs` | `5000` | per-host collection interval |
| `sshTimeoutMs` | `9000` | per-probe timeout |
| `busyMemPct` | `80` | memory % at/above which a card counts as busy |
| `busyUtilPct` | `50` | utilization % at/above which a card counts as busy |
| `noGpuRetryMs` | `300000` | how often a GPU-less host is re-probed |
| `backoffBaseMs` / `maxBackoffMs` | `5000` / `60000` | failure backoff ramp |

## Requirements

- Servers reachable through the **system `ssh` client** with key auth (i.e. `ssh <alias> …` works without a password prompt), aliases in `~/.ssh/config`.
- `nvidia-smi` on each GPU server. Hosts without it are detected and hidden from the board (re-probed periodically).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| A host shows a red error line | The panel prints the exact ssh error. Verify `ssh <alias> 'nvidia-smi'` works non-interactively from the machine running dsh. |
| A host is labeled `no GPU` | `nvidia-smi` is not installed there, or that alias is not a GPU box. Uncheck it in ⚙; it is re-probed every 5 minutes. |
| A new alias does not appear | Discovery runs at startup — restart dsh after editing `~/.ssh/config`. |
| The panel is empty | No concrete aliases were discovered; check that `~/.ssh/config` exists and has `Host` entries (patterns like `Host *` are ignored by design). |
| Changes don't show up | Plugin-set and configuration changes apply on dsh restart, then refresh the page. |

## Development

There is deliberately **no build step**: `index.js` is the host half (plain ESM, exports `inject` + `apply`), `client.js` is the prebuilt `__ModuleLoader__` factory bundle (requires only `react`). Edit either file, restart dsh, refresh.

## Uninstall / update

```sh
dsh plugin --profile web update dsh-remote-gpu-monitoring   # pull a newer version
dsh plugin --profile web remove dsh-remote-gpu-monitoring   # uninstall
```

## Security notes

- The remote command is fixed: `nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits`. It is read-only and never built from user input.
- The plugin reads no private keys and stores no credentials — it delegates everything to your existing ssh setup.
- Optional hardening: restrict the key on each server to exactly this query:
  `command="nvidia-smi --query-gpu=... ",restrict ssh-ed25519 AAAA...`

## License

MIT
