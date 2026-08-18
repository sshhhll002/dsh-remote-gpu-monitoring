# dsh-remote-gpu-monitoring

> Repository: https://github.com/sshhhll002/dsh-remote-gpu-monitoring

A **remote multi-server GPU status board** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web: one glance at every GPU server you can reach over SSH, right from the sidebar — with a collapsible panel and agent tools.

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

## Features

- **One board, every server** — a fixed read-only `nvidia-smi` query per host: per-card model, memory, utilization, temperature, and power draw, color-coded by thresholds. Mixed-GPU servers are fine — every card is labeled individually.
- **Safe by design** — only the Host process ever opens SSH: `BatchMode=yes`, public-key only, one fixed read-only command (no user input ever reaches the remote side), default-deny host list. Private keys never leave your `~/.ssh/config` / agent.
- **Cheap by design** — one shared host-side cache for every browser session; per-host `ControlMaster` socket reuse (no handshake per refresh); single-flight, staggered collection, and exponential backoff; unselected hosts are not queried at all.
- **Per-server selection** — the ⚙ view lists every discovered host; unchecked servers disappear from the board and stop being collected.
- **Agent tools** — `gpu_overview` (cached snapshot, zero SSH cost) and `gpu_refresh` (immediate collection pass) so the model can answer "which server has a free card?"

## Install

```sh
dsh plugin --profile web add github:sshhhll002/dsh-remote-gpu-monitoring   # from GitHub
dsh plugin --profile web add dsh-remote-gpu-monitoring                     # from npm, once published
dsh --profile web                                                          # restart dsh, then refresh the page
```

That's it — **no configuration file required**. On startup the plugin parses your `~/.ssh/config` (with `Include`, glob and quote support) and watches every concrete alias, skipping `Host *`-style patterns and `!` negations. Every discovered host starts selected; use the ⚙ view in the panel to narrow the watched set at runtime — unselected hosts stop being collected immediately. (Editing `~/.ssh/config` afterwards takes effect on the next dsh restart, since discovery runs at startup.)

Prefer an explicit list instead of auto-discovery? Override the row in your profile's `cordis.patch.yml`:

```yaml
- id: remote-gpu-monitoring
  name: dsh-remote-gpu-monitoring
  config:
    hosts: ['gpu-a', 'gpu-b', 'train-01']
```

All row-config keys are optional and merged over the defaults:

| Key | Default | Meaning |
| --- | --- | --- |
| `hosts` | `'auto'` | `'auto'` = every concrete alias in `~/.ssh/config`, or a `string[]` of aliases to watch |
| `intervalMs` | `5000` | per-host collection interval |
| `sshTimeoutMs` | `9000` | per-probe timeout |
| `busyMemPct` | `80` | memory % at/above which a card counts as busy |
| `busyUtilPct` | `50` | utilization % at/above which a card counts as busy |
| `noGpuRetryMs` | `300000` | how often a GPU-less host is re-probed |
| `backoffBaseMs` / `maxBackoffMs` | `5000` / `60000` | failure backoff ramp |

## Requirements

- Servers reachable through the **system `ssh` client** with key auth (`BatchMode` works), aliases in `~/.ssh/config`.
- `nvidia-smi` on each GPU server. Hosts without it are detected and hidden from the board (re-probed periodically).

## Security notes

- The remote command is fixed: `nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits`. It is read-only and never built from user input.
- The plugin reads no private keys and stores no credentials — it delegates everything to your existing ssh setup.
- Optional hardening: restrict the key on each server to exactly this query:
  `command="nvidia-smi --query-gpu=... ",restrict ssh-ed25519 AAAA...`

## License

MIT
