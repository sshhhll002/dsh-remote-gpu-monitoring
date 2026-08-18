/**
 * dsh-remote-gpu-monitoring — host half.
 *
 * Collects a cached GPU snapshot from SSH aliases (~/.ssh/config) and serves
 * it to the browser half over `/api/remote-gpu`, plus two model tools
 * (`gpu_overview`, `gpu_refresh`).
 *
 * Host discovery (row config `hosts`):
 *   - `'auto'` (default): parse ~/.ssh/config (with `Include`, glob and quote
 *     support) and watch every concrete alias; skip `Host *`-style patterns
 *     and `!` negations.
 *   - `string[]`: watch exactly the listed aliases.
 * Every discovered host starts selected; the panel's ⚙ view narrows the
 * watched set at runtime, and unselected hosts are not queried at all.
 *
 * Security model: only the Host process ever talks to the servers, through
 * the system `ssh` CLI with `BatchMode=yes` (no prompts), key auth only,
 * a single fixed READ-ONLY `nvidia-smi --query-gpu=…` command (no user input
 * reaches the remote side). Private keys are never read by this plugin —
 * connection details (HostName/User/Port/IdentityFile/…) always come from
 * the user's own ssh setup and are re-read on every probe.
 *
 * Overhead model: one shared cache for every browser session; per-host
 * ControlMaster socket reuse (no handshake per refresh); single-flight,
 * per-host staggering, and exponential backoff.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

export const inject = ['subprocess', 'timer', 'webServer', 'tools']

// ---- ssh config alias discovery ----
const GLOB_RE = /[*?]/
const splitTokens = (s) => (s.match(/"([^"]*)"|'([^']*)'|\S+/g) || []).map((t) => t.replace(/^["']|["']$/g, ''))
const isPattern = (t) => GLOB_RE.test(t) || t.startsWith('!')

function expandInclude(pattern, fromFile) {
  const abs = pattern.startsWith('/') ? pattern : resolve(dirname(fromFile), pattern)
  if (!GLOB_RE.test(abs)) return [abs]
  const dir = dirname(abs)
  const escaped = basename(abs).split('').map((ch) => (
    ch === '*' ? '.*' : ch === '?' ? '.' : ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  )).join('')
  const rx = new RegExp('^' + escaped + '$')
  let entries = []
  try { entries = readdirSync(dir) } catch { return [] }
  return entries
    .filter((e) => rx.test(e))
    .map((e) => join(dir, e))
    .filter((f) => { try { return statSync(f).isFile() } catch { return false } })
}

function discoverAliases() {
  const home = process.env.HOME
  if (!home) return []
  const seen = new Set()
  const aliases = []
  const walk = (file, depth) => {
    if (depth > 4 || seen.has(file)) return
    seen.add(file)
    let text
    try { text = readFileSync(file, 'utf8') } catch { return }
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (line === '' || line.startsWith('#')) continue
      const m = line.match(/^([A-Za-z]+)\s+(.+)$/)
      if (m === null) continue
      const keyword = m[1].toLowerCase()
      if (keyword === 'include') {
        for (const p of splitTokens(m[2])) for (const f of expandInclude(p, file)) walk(f, depth + 1)
      } else if (keyword === 'host') {
        for (const token of splitTokens(m[2])) if (!isPattern(token)) aliases.push(token)
      }
    }
  }
  walk(join(home, '.ssh', 'config'), 0)
  return [...new Set(aliases)]
}

export function apply(ctx, config = {}) {
  const CFG = {
    hosts: 'auto',
    intervalMs: 5000,
    sshTimeoutMs: 9000,
    busyMemPct: 80,
    busyUtilPct: 50,
    noGpuRetryMs: 300000,
    backoffBaseMs: 5000,
    maxBackoffMs: 60000,
    ...(config && typeof config === 'object' ? config : {}),
  }
  const hostList = Array.isArray(CFG.hosts)
    ? CFG.hosts.filter((a) => typeof a === 'string').map((a) => a.trim()).filter((a) => a !== '')
    : CFG.hosts === 'auto' ? discoverAliases() : []
  const REMOTE_CMD = "command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits || echo NO_NVIDIA_SMI"

  let sshPath = 'ssh'
  ctx.subprocess.resolveExecutable('ssh').then((p) => { if (typeof p === 'string' && p !== '') sshPath = p }).catch(() => {})

  // ---- pure helpers ----
  const toNum = (s) => {
    const t = String(s).trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const parseGpus = (text) => String(text).split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .flatMap((line) => {
      const p = line.split(',')
      if (p.length < 8) return []
      return [{
        index: Number(p[0]),
        name: p.slice(1, -6).join(',').trim(),
        memUsed: toNum(p[p.length - 6]),
        memTotal: toNum(p[p.length - 5]),
        util: toNum(p[p.length - 4]),
        temp: toNum(p[p.length - 3]),
        powerDraw: toNum(p[p.length - 2]),
        powerLimit: toNum(p[p.length - 1]),
      }]
    })
  const backoff = (fails) => Math.min(CFG.backoffBaseMs * 2 ** Math.min(fails, 4), CFG.maxBackoffMs)
  const shortName = (name) => String(name).replace(/^NVIDIA GeForce /, '').replace(/^NVIDIA /, '')
  const fmtPower = (d, l) => (d === null && l === null) ? 'N/A' : ((d === null ? '?' : d) + 'W' + (l !== null ? '/' + l + 'W' : ''))

  // ---- per-host state (plain data only) ----
  const hosts = new Map()
  hostList.forEach((alias, i) => {
    hosts.set(alias, { alias, status: 'pending', error: null, nextAt: Date.now() + i * 300, failCount: 0, inFlight: false, gpus: [] })
  })
  const selected = new Set(hostList)
  const selectHosts = (aliases) => {
    const next = new Set(aliases.filter((a) => hosts.has(a)))
    for (const a of next) if (!selected.has(a)) hosts.get(a).nextAt = 0
    selected.clear()
    for (const a of next) selected.add(a)
  }

  // ---- one read-only SSH probe ----
  async function probe(alias) {
    let proc
    try {
      proc = ctx.subprocess.spawn({
        argv: [sshPath, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5',
          '-o', 'ControlMaster=auto', '-o', 'ControlPath=/tmp/dsh-gpu-mux-%C',
          '-o', 'ControlPersist=300', '-o', 'ServerAliveInterval=30',
          '-o', 'LogLevel=ERROR', '-o', 'PreferredAuthentications=publickey',
          alias, REMOTE_CMD],
        cwd: '/tmp',
        stdio: { stdin: 'ignore', stdout: { maxBytes: 65536 }, stderr: { maxBytes: 8192 } },
        graceMs: 2000,
        env: { ...(process.env.HOME ? { HOME: process.env.HOME } : {}), LC_ALL: 'C' },
      })
    } catch (err) {
      return { kind: 'error', message: 'spawn-failed: ' + String(err && err.message || err) }
    }
    const kill = ctx.timeout(() => proc.terminate(), CFG.sshTimeoutMs)
    try {
      const outcome = await proc.done
      const out = proc.collected.stdout ? proc.collected.stdout.readFrom(0).text : ''
      const err = proc.collected.stderr ? proc.collected.stderr.readFrom(0).text : ''
      if (outcome.signal !== null) return { kind: 'error', message: 'timeout/killed: ' + outcome.signal }
      if (outcome.exitCode === 255) return { kind: 'error', message: (err || 'ssh connect failed').trim() || 'ssh exit 255' }
      if (out.indexOf('NO_NVIDIA_SMI') !== -1) return { kind: 'no-gpu' }
      if (outcome.exitCode !== 0 && outcome.exitCode !== null) return { kind: 'error', message: (err || 'exit ' + outcome.exitCode).trim() }
      return { kind: 'ok', gpus: parseGpus(out) }
    } catch (err) {
      return { kind: 'error', message: 'query-failed: ' + String(err && err.message || err) }
    } finally {
      kill()
    }
  }

  async function collect(alias) {
    const st = hosts.get(alias)
    if (st === undefined || st.inFlight) return
    st.inFlight = true
    const res = await probe(alias)
    st.inFlight = false
    const now = Date.now()
    if (res.kind === 'ok') {
      st.status = 'ok'; st.error = null; st.gpus = res.gpus; st.failCount = 0
      st.nextAt = now + CFG.intervalMs
    } else if (res.kind === 'no-gpu') {
      st.status = 'no-gpu'; st.error = null; st.gpus = []; st.failCount = 0
      st.nextAt = now + CFG.noGpuRetryMs
    } else {
      st.status = 'error'; st.error = String(res.message).slice(0, 200); st.gpus = []
      st.failCount += 1
      st.nextAt = now + backoff(st.failCount)
    }
  }

  // ---- snapshot (owned plain JSON) ----
  const toView = (g) => {
    const memPct = g.memTotal > 0 ? Math.round(g.memUsed * 100 / g.memTotal) : 0
    return {
      index: g.index, name: g.name, memUsed: g.memUsed, memTotal: g.memTotal, memPct,
      util: g.util, temp: g.temp, powerDraw: g.powerDraw, powerLimit: g.powerLimit,
      busy: memPct >= CFG.busyMemPct || g.util >= CFG.busyUtilPct,
    }
  }
  function snapshot() {
    const view = []
    const all = []
    for (const st of hosts.values()) {
      all.push({ alias: st.alias, status: st.status, selected: selected.has(st.alias) })
      if (!selected.has(st.alias)) continue
      const h = { alias: st.alias, status: st.status, error: st.error, gpus: [] }
      if (st.status === 'ok') h.gpus = st.gpus.map(toView)
      h.totalCount = h.gpus.length
      h.freeCount = h.gpus.filter((g) => !g.busy).length
      view.push(h)
    }
    return { updatedAt: Date.now(), hosts: view, all }
  }

  const gpuText = (g) => 'GPU' + g.index + ' ' + shortName(g.name) + ' ' + g.memUsed + '/' + g.memTotal + 'MiB util ' + g.util + '% temp ' + g.temp + 'C power ' + fmtPower(g.powerDraw, g.powerLimit)
  function summaryText() {
    const s = snapshot()
    const lines = s.hosts.map((h) => {
      if (h.status === 'ok') return h.alias + ': ' + h.freeCount + '/' + h.totalCount + ' free — ' + h.gpus.map(gpuText).join('; ')
      if (h.status === 'no-gpu') return h.alias + ': no GPU (nvidia-smi not found)'
      if (h.status === 'pending') return h.alias + ': waiting for first probe'
      return h.alias + ': ' + h.status + ' — ' + (h.error || '')
    })
    return 'Remote GPU monitoring overview (' + s.hosts.length + ' SSH hosts, cached, 5s refresh loop):\n' + lines.join('\n')
  }

  // ---- HTTP API for the browser half ----
  const reply = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/remote-gpu',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET') return reply(res, 200, snapshot())
        if (req.method === 'POST') {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          if (body && body.action === 'setHosts' && Array.isArray(body.aliases)) selectHosts(body.aliases.map(String))
          if (body && body.action === 'refresh') await Promise.all(Array.from(selected).map(collect))
          return reply(res, 200, snapshot())
        }
        return reply(res, 405, { error: 'method not allowed' })
      } catch (err) {
        return reply(res, 500, { error: String((err && err.message) || err) })
      }
    },
  })

  // ---- model tools ----
  ctx.tools.register({
    name: 'gpu_overview',
    description: 'Read the cached GPU status snapshot of the selected remote SSH servers (aliases from ~/.ssh/config). Shows per-GPU memory/utilization/temperature/power and free-card count per host. Zero SSH cost: reads the host-side 5s-refresh cache.',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async () => summaryText(),
  })
  ctx.tools.register({
    name: 'gpu_refresh',
    description: 'Force an immediate GPU status collection pass over the selected remote SSH servers (respects per-host single-flight), then return the fresh summary.',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async () => {
      await Promise.all(Array.from(selected).map(collect))
      return summaryText()
    },
  })

  // ---- collection loop (only selected hosts; single-flight inside collect) ----
  const tick = () => {
    const now = Date.now()
    for (const alias of selected) if (now >= hosts.get(alias).nextAt) collect(alias)
  }
  tick()
  ctx.interval(tick, 1000)
}
