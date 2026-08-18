/**
 * dsh-remote-gpu-monitoring — client half (prebuilt factory-form bundle).
 *
 * This file is the final artifact served at /plugins/dsh-remote-gpu-monitoring/client.js.
 * It registers a lazy-CJS factory with the shell module table; the factory
 * returns the client plugin surface (`apply` / `inject`). Only the platform
 * module `react` is required, everything else arrives through cordis services.
 */
window.__ModuleLoader__.load({ id: 'dsh-remote-gpu-monitoring', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;

const React = require('react')

;(function injectStyles() {
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-remote-gpu-monitoring'
  tag.textContent = `
.dsh-rgpu-layer { flex: none; display: flex; align-items: center; width: 100%; height: 49px; margin: 8px 0 0; }
.dsh-rgpu-layer-narrow { width: 36px; height: 36px; margin: 0; }
.dsh-rgpu-trig { display: inline-flex; align-items: center; gap: 8px; width: 100%; height: 49px; padding: 0 8px 0 6px; border: none; border-radius: 12px; background: transparent; color: var(--dsw-alias-label-primary, #1f2328); font-family: inherit; font-size: 14px; cursor: pointer; overflow: hidden; }
.dsh-rgpu-trig:hover { background: var(--dsw-alias-interactive-bg-hover-solid, rgba(0,0,0,.06)); }
.dsh-rgpu-trig-open { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.08)); }
.dsh-rgpu-layer-narrow .dsh-rgpu-trig { justify-content: center; gap: 0; width: 36px; height: 36px; padding: 0; border-radius: 50%; }
.dsh-rgpu-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-rgpu-count { flex: none; margin-left: auto; color: var(--dsw-alias-label-tertiary, #6b7280); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; }
.dsh-rgpu-panel { position: fixed; left: 12px; bottom: 128px; z-index: 30; display: flex; flex-direction: column; width: 420px; max-width: calc(100vw - 24px); max-height: 60vh; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1, #e5e7eb); border-radius: 12px; background: var(--dsw-alias-bg-base, #ffffff); color: var(--dsw-alias-label-primary, #1f2328); box-shadow: var(--dsw-shadow-lv2, 0 12px 32px rgba(0,0,0,.18)); font: 12px/1.5 system-ui, -apple-system, sans-serif; }
.dsh-rgpu-head { flex: none; display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 10px 12px; box-sizing: border-box; border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb); }
.dsh-rgpu-title { flex: 1 1 auto; font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary, #1f2328); }
.dsh-rgpu-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-tertiary, #6b7280); cursor: pointer; font-size: 13px; line-height: 1; }
.dsh-rgpu-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); color: var(--dsw-alias-label-secondary, #4b5563); }
.dsh-rgpu-btn-on { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); color: var(--dsw-alias-label-secondary, #4b5563); }
.dsh-rgpu-body { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 12px 12px; }
.dsh-rgpu-hint { margin: 4px 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #6b7280); }
.dsh-rgpu-errline { color: var(--dsw-alias-state-error-primary, #dc2626); margin-top: 4px; font-size: 11px; }
.dsh-rgpu-host { margin-top: 6px; }
.dsh-rgpu-host + .dsh-rgpu-host { padding-top: 5px; border-top: 1px dashed var(--dsw-alias-border-l2, #e5e7eb); }
.dsh-rgpu-hostline { display: flex; align-items: center; gap: 6px; }
.dsh-rgpu-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.dsh-rgpu-dot-ok { background: #22c55e; }
.dsh-rgpu-dot-no-gpu { background: #94a3b8; }
.dsh-rgpu-dot-err { background: #ef4444; }
.dsh-rgpu-dot-pending { background: #f59e0b; }
.dsh-rgpu-alias { font-weight: 600; flex: 1 1 auto; }
.dsh-rgpu-free { color: var(--dsw-alias-label-primary, #1f2328); font-variant-numeric: tabular-nums; }
.dsh-rgpu-note { margin-left: auto; color: var(--dsw-alias-label-tertiary, #6b7280); font-size: 11px; }
.dsh-rgpu-note-err { color: var(--dsw-alias-state-error-primary, #dc2626); }
.dsh-rgpu-gpuline { display: flex; align-items: baseline; gap: 8px; margin-top: 3px; padding-left: 8px; font-variant-numeric: tabular-nums; font-size: 11px; }
.dsh-rgpu-idx { color: var(--dsw-alias-label-tertiary, #6b7280); flex: 0 0 32px; }
.dsh-rgpu-modelname { color: var(--dsw-alias-label-tertiary, #6b7280); flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-rgpu-mem { flex: 0 0 86px; white-space: nowrap; color: var(--dsw-alias-label-tertiary, #6b7280); }
.dsh-rgpu-util { flex: 0 0 32px; text-align: right; }
.dsh-rgpu-temp { flex: 0 0 38px; text-align: right; }
.dsh-rgpu-pw { flex: 0 0 42px; text-align: right; color: var(--dsw-alias-label-tertiary, #6b7280); }
.dsh-rgpu-lv-lo { color: #16a34a; }
.dsh-rgpu-lv-mid { color: #b45309; }
.dsh-rgpu-lv-warm { color: #ea580c; }
.dsh-rgpu-lv-hi { color: #dc2626; }
.dsh-rgpu-srv { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 8px; margin-top: 4px; border: none; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary, #1f2328); font: inherit; cursor: pointer; text-align: left; }
.dsh-rgpu-srv:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }
.dsh-rgpu-srv:active { background: var(--dsw-alias-interactive-bg-hover-solid, rgba(0,0,0,.08)); }
.dsh-rgpu-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border: 1px solid var(--dsw-alias-border-l2, #d1d5db); border-radius: 5px; font-size: 11px; line-height: 1; color: var(--dsw-alias-label-secondary, #4b5563); flex: 0 0 auto; }
.dsh-rgpu-srv-on .dsh-rgpu-check { background: var(--dsw-alias-state-business-primary, #2563eb); border-color: var(--dsw-alias-state-business-primary, #2563eb); color: #ffffff; }
.dsh-rgpu-foot { margin-top: 6px; padding-top: 4px; border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb); color: var(--dsw-alias-label-tertiary, #6b7280); font-size: 10px; display: flex; justify-content: space-between; }
`
  document.head.appendChild(tag)
})()

const h = React.createElement
const LEVEL = (v) => (v >= 85 ? 'hi' : v >= 50 ? 'mid' : 'lo')
const TEMP_LEVEL = (t) => (t >= 85 ? 'hi' : t >= 75 ? 'warm' : t >= 60 ? 'mid' : 'lo')
const SHORT = (name) => String(name).replace(/^NVIDIA GeForce /, '').replace(/^NVIDIA /, '')
const GB = (m) => (m === null ? '?' : (m / 1024).toFixed(1) + 'G')
const WATT = (d) => (d === null ? 'N/A' : d + 'W')
const DOT = (s) => 'dsh-rgpu-dot dsh-rgpu-dot-' + s

const api = async (body) => {
  const res = await fetch('/api/remote-gpu', body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

exports.inject = ['slots', 'timer']

exports.apply = function (ctx) {
  const slots = ctx.slots

  const store = { open: false, wide: true, view: 'board', snap: null, err: null, refreshing: false, lastToggle: null, subs: new Set() }
  const emit = () => { for (const f of store.subs) f() }
  function useStore() {
    const [, setTick] = React.useState(0)
    React.useEffect(() => {
      const force = () => setTick((t) => t + 1)
      store.subs.add(force)
      return () => { store.subs.delete(force) }
    }, [])
    return store
  }
  const summarize = (snap) => {
    const hosts = (snap && snap.hosts) || []
    const free = hosts.reduce((a, x) => a + (x.freeCount || 0), 0)
    const total = hosts.reduce((a, x) => a + (x.totalCount || 0), 0)
    return { hosts, free, total }
  }

  function GpuIcon() {
    return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', 'aria-hidden': 'true' },
      h('rect', { x: 4.2, y: 4.2, width: 7.6, height: 7.6, rx: 1.2 }),
      h('rect', { x: 6.8, y: 6.8, width: 2.4, height: 2.4, rx: 0.4 }),
      h('path', { d: 'M8 1.6v2.6M8 11.8v2.6M1.6 8h2.6M11.8 8h2.6' }),
    )
  }
  function GearIcon() {
    return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', 'aria-hidden': 'true' },
      h('path', { d: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11' }),
      h('circle', { cx: 6, cy: 4.5, r: 1.8, fill: 'var(--dsw-alias-bg-base, #ffffff)' }),
      h('circle', { cx: 10.5, cy: 8, r: 1.8, fill: 'var(--dsw-alias-bg-base, #ffffff)' }),
      h('circle', { cx: 7.5, cy: 11.5, r: 1.8, fill: 'var(--dsw-alias-bg-base, #ffffff)' }),
    )
  }

  function FooterTrigger(props) {
    const st = useStore()
    st.wide = !!(props && props.wide)
    React.useEffect(() => {
      let alive = true
      let inflight = false
      const poll = async () => {
        if (inflight) return
        if (document.hidden) return
        inflight = true
        try {
          const s = await api()
          if (alive) { store.snap = s; store.err = null; emit() }
        } catch (e) {
          if (alive) { store.err = String((e && e.message) || e); emit() }
        } finally {
          inflight = false
        }
      }
      poll()
      const dispose = ctx.interval(poll, 5000)
      return () => { alive = false; dispose() }
    }, [])

    const s = summarize(st.snap)
    return h('div', { className: 'dsh-rgpu-layer' + (st.wide ? '' : ' dsh-rgpu-layer-narrow') },
      h('button', {
        type: 'button',
        className: 'dsh-rgpu-trig' + (st.open ? ' dsh-rgpu-trig-open' : ''),
        title: 'Remote GPU status',
        'aria-expanded': st.open,
        onClick: () => { st.open = !st.open; if (st.open) st.view = 'board'; emit() },
      },
        h(GpuIcon),
        st.wide ? h('span', { className: 'dsh-rgpu-label' }, 'Remote GPU') : null,
        st.wide && st.snap ? h('span', { className: 'dsh-rgpu-count' }, s.free + '/' + s.total + ' free') : null,
      ),
    )
  }

  function OverlayPanel() {
    const st = useStore()
    if (!st.open) return null
    const s = summarize(st.snap)
    const all = (st.snap && st.snap.all) || []

    const closePanel = () => { st.open = false; st.view = 'board'; st.lastToggle = null; emit() }
    const toggleView = () => { st.view = st.view === 'board' ? 'servers' : 'board'; st.lastToggle = null; emit() }
    const refresh = async () => {
      if (st.refreshing) return
      st.refreshing = true
      emit()
      try {
        st.snap = await api({ action: 'refresh' })
        st.err = null
      } catch (e) {
        st.err = String((e && e.message) || e)
      } finally {
        st.refreshing = false
        emit()
      }
    }
    const toggleHost = async (alias) => {
      st.lastToggle = 'switching ' + alias + ' …'
      emit()
      try {
        const aliases = all.filter((x) => x.selected !== (x.alias === alias)).map((x) => x.alias)
        st.snap = await api({ action: 'setHosts', aliases })
        st.err = null
        const row = st.snap.all.find((x) => x.alias === alias)
        st.lastToggle = alias + ' ' + (row && row.selected ? 'selected' : 'unselected')
      } catch (e) {
        st.err = String((e && e.message) || e)
        st.lastToggle = 'FAILED: ' + st.err
      }
      emit()
    }

    const iconButton = (title, onClick, active, content) => h('button', {
      type: 'button', className: 'dsh-rgpu-btn' + (active ? ' dsh-rgpu-btn-on' : ''), title, onClick,
    }, content)

    const gpuRow = (g) => h('div', { key: g.index, className: 'dsh-rgpu-gpuline' },
      h('span', { className: 'dsh-rgpu-idx' }, 'GPU' + g.index),
      h('span', { className: 'dsh-rgpu-modelname', title: g.name }, SHORT(g.name)),
      h('span', { className: 'dsh-rgpu-mem dsh-rgpu-lv-' + LEVEL(g.memPct) }, GB(g.memUsed) + '/' + GB(g.memTotal)),
      h('span', { className: 'dsh-rgpu-util dsh-rgpu-lv-' + LEVEL(g.util) }, g.util + '%'),
      h('span', { className: 'dsh-rgpu-temp dsh-rgpu-lv-' + TEMP_LEVEL(g.temp) }, g.temp + '°C'),
      h('span', { className: 'dsh-rgpu-pw' }, WATT(g.powerDraw)),
    )
    const hostBlock = (x) => h('div', { key: x.alias, className: 'dsh-rgpu-host' },
      h('div', { className: 'dsh-rgpu-hostline' },
        h('span', { className: DOT(x.status) }),
        h('span', { className: 'dsh-rgpu-alias' }, x.alias),
        h('span', { className: 'dsh-rgpu-free' }, x.freeCount + '/' + x.totalCount + ' free'),
      ),
      x.gpus.map(gpuRow),
    )
    const errBlock = (x) => h('div', { key: x.alias, className: 'dsh-rgpu-host' },
      h('div', { className: 'dsh-rgpu-hostline' },
        h('span', { className: DOT('err') }),
        h('span', { className: 'dsh-rgpu-alias' }, x.alias),
        h('span', { className: 'dsh-rgpu-note dsh-rgpu-note-err' }, x.error || 'error'),
      ),
    )
    const serverRow = (x) => h('button', {
      key: x.alias, type: 'button',
      className: 'dsh-rgpu-srv' + (x.selected ? ' dsh-rgpu-srv-on' : ''),
      onClick: () => toggleHost(x.alias),
    },
      h('span', { className: 'dsh-rgpu-check' }, x.selected ? '✓' : ''),
      h('span', { className: DOT(x.status) }),
      h('span', { className: 'dsh-rgpu-alias' }, x.alias),
      h('span', { className: 'dsh-rgpu-note' }, x.status === 'no-gpu' ? 'no GPU' : x.status === 'error' ? 'error' : ''),
    )

    const okHosts = s.hosts.filter((x) => x.status === 'ok')
    const errHosts = s.hosts.filter((x) => x.status === 'error')
    const anyPending = s.hosts.some((x) => x.status === 'pending')

    const body = st.view === 'servers'
      ? h('div', { className: 'dsh-rgpu-body' },
        h('p', { className: 'dsh-rgpu-hint' }, 'Choose which servers appear in the board'),
        st.err ? h('div', { className: 'dsh-rgpu-errline' }, 'Error: ' + st.err) : null,
        st.lastToggle ? h('div', { className: 'dsh-rgpu-hint' }, st.lastToggle) : null,
        all.map(serverRow),
      )
      : h('div', { className: 'dsh-rgpu-body' },
        st.err ? h('div', { className: 'dsh-rgpu-errline' }, 'RPC error: ' + st.err) : null,
        s.hosts.length === 0 ? h('div', { className: 'dsh-rgpu-hint' }, 'No server selected — open Servers to choose') : null,
        anyPending && okHosts.length === 0 ? h('div', { className: 'dsh-rgpu-hint' }, 'Collecting first samples…') : null,
        okHosts.map(hostBlock),
        errHosts.map(errBlock),
        st.snap ? h('div', { className: 'dsh-rgpu-foot' },
          h('span', null, 'Updated ' + new Date(st.snap.updatedAt).toLocaleTimeString()),
          h('span', null, 'auto refresh 5s'),
        ) : null,
      )

    return h('div', { className: 'dsh-rgpu-panel' },
      h('header', { className: 'dsh-rgpu-head' },
        h('span', { className: 'dsh-rgpu-title' }, st.view === 'board' ? 'Remote GPU' : 'Servers'),
        iconButton('Choose servers', toggleView, st.view === 'servers', h(GearIcon)),
        iconButton('Refresh now', refresh, false, st.refreshing ? '⋯' : '↻'),
        iconButton('Close', closePanel, false, '✕'),
      ),
      body,
    )
  }

  slots.inject('sidebar.footer.action', () => slots.register(
    { name: 'sidebar.footer.action', id: 'dsh-rgpu', order: 10, label: 'Remote GPU' },
    (props) => h(FooterTrigger, { wide: props ? props.wide : false }),
  ))
  slots.inject('shell.overlay', () => slots.register(
    { name: 'shell.overlay', id: 'dsh-rgpu-panel', order: 100, label: 'Remote GPU panel' },
    () => h(OverlayPanel),
  ))
}

return module.exports; } });
