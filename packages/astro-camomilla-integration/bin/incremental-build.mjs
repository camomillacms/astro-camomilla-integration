#!/usr/bin/env node
/**
 * Incremental static build + deploy driver for @camomillacms/astro-integration.
 *
 * Flow (see README "Static / JAMStack mode"):
 *   0. materialise any due scheduled publishes  (POST pages-router/publish-due)
 *   1. read previous build state from the published tree
 *   2. fetch the content-hash manifest           (GET  pages-router/changes)
 *   3. decide full vs incremental (frontend fingerprint / global epoch / --full)
 *   4. astro build (full = all paths; incremental = only changed-hash paths)
 *   5. publish: full → replace the tree; incremental → merge + delete orphans
 *   6. write redirects (nginx map or _redirects) and, for external targets,
 *      sync + purge
 *   7. persist new state ONLY on success (idempotent: a crash re-runs the same
 *      set next time — renders are pure)
 *
 * The rebuild AUTHORITY is the per-URL content hash, never a timestamp: a
 * djsuperadmin edit that bumps no page timestamp still changes the hash. Global
 * inputs (menus, global content) move the `epoch` instead → full rebuild.
 *
 * Config is env-driven; see `readConfig()`.
 */
import { execSync, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const STATE_FILE = '.camomilla-build-state.json'

// ---------------------------------------------------------------------------
// Structured events. One emitter, two sinks, so they can never drift:
//
//   stdout — the human line, byte-identical to before. The backoffice
//            websocket scrapes this, so its format is a compatibility surface.
//   file   — one JSON line per event, for consumers that arrive late (cron
//            builds, a webhook trigger, an audit).
//
// NOT stderr: the backoffice spawns `docker exec -t`, and a TTY merges stderr
// into stdout — JSON on stderr would be ansi-converted and broadcast to
// browsers as garbage.
// ---------------------------------------------------------------------------

const RUN_ID = randomUUID().slice(0, 8)
const STARTED_AT = Date.now()
const KEEP_RUNS = 50

let logFile = null
let seq = 0
let terminated = false

/** Per-run log file. Deliberately NOT inside publishDir: that tree is emptied
 *  by publishFull, served by nginx, and synced to the CDN. */
export function openLog() {
  const dir = process.env.CAMOMILLA_LOG_DIR || '.camomilla-builds'
  try {
    fs.mkdirSync(dir, { recursive: true })
    const old = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .sort()
      .slice(0, -KEEP_RUNS)
    for (const f of old) fs.rmSync(path.join(dir, f), { force: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    logFile = path.join(dir, `${stamp}-${RUN_ID}.jsonl`)
  } catch (e) {
    // A build log that cannot be written must never fail the build.
    console.error(`[camomilla] build log disabled (${e.message})`)
  }
}

export function emit(event, data = {}, msg = '', level = 'info') {
  if (msg) console.log(`[camomilla] ${msg}`)
  if (!logFile) return
  try {
    const line = {
      v: 1,
      ts: new Date().toISOString(),
      runId: RUN_ID,
      seq: seq++,
      level,
      event,
      msg,
      data
    }
    fs.appendFileSync(logFile, JSON.stringify(line) + '\n')
  } catch {
    /* never fatal */
  }
}

/** Counts are authoritative; the array is a sample. Thousands of paths fanned
 *  out to every websocket client is not a feature. */
const sample = (arr) => arr.slice(0, 100)

// ---------------------------------------------------------------------------
// Pure logic (unit-tested in incremental-build.test.mjs)
// ---------------------------------------------------------------------------

/** Public path → output file, e.g. `/it/about/` → `it/about/index.html`, `/` → `index.html`. */
export function pathToFile(publicPath) {
  const slug = publicPath.replace(/^\/+|\/+$/g, '')
  return slug ? `${slug}/index.html` : 'index.html'
}

/**
 * Diff the previous manifest against the current hash list.
 * `rebuild` = paths whose hash changed or is new; `deletions` = paths that
 * disappeared (unpublish / trash / rename-orphan — a positive feed can't
 * express these, but the manifest diff catches them). `manifest` = the new
 * full snapshot to persist.
 */
export function computeRebuild(prevManifest, currentUrls) {
  const manifest = Object.fromEntries(currentUrls.map((u) => [u.path, u.hash]))
  const currentPaths = new Set(currentUrls.map((u) => u.path))
  const rebuild = currentUrls.filter((u) => prevManifest[u.path] !== u.hash).map((u) => u.path)
  const deletions = Object.keys(prevManifest).filter((p) => !currentPaths.has(p))
  return { rebuild, deletions, manifest }
}

/** Why this build must be full, as a short reason code — or `''` for
 *  incremental. Returning the reason (rather than a boolean) keeps it in the
 *  event stream: "why did it rebuild everything?" is the first question anyone
 *  asks. Truthiness is preserved, so callers do `const full = !!reason`. */
export function decideFull(prevState, fp, epoch, forceFull) {
  if (forceFull) return 'force_full'
  if (!prevState) return 'no_prev_state'
  if (fp && prevState.fp !== fp) return 'fingerprint_changed'
  if (epoch != null && prevState.epoch !== epoch) return 'epoch_changed'
  return ''
}

// ---------------------------------------------------------------------------
// Config + small helpers
// ---------------------------------------------------------------------------

function readConfig(argv) {
  const env = process.env
  const server = env.CAMOMILLA_SERVER
  if (!server) fail('CAMOMILLA_SERVER is required (the camomilla base URL).')
  return {
    server: server.replace(/\/+$/, ''),
    distDir: env.CAMOMILLA_DIST_DIR || 'dist',
    publishDir: env.CAMOMILLA_PUBLISH_DIR || 'dist-published',
    target: env.CAMOMILLA_DEPLOY_TARGET || 'volume',
    buildToken: env.CAMOMILLA_BUILD_TOKEN || '',
    syncCmd: env.CAMOMILLA_DEPLOY_SYNC_CMD || '',
    purgeCmd: env.CAMOMILLA_DEPLOY_PURGE_CMD || '',
    forceFull: argv.includes('--full')
  }
}

function fail(msg) {
  emit('build.failed', { durationMs: Date.now() - STARTED_AT, error: msg }, '', 'error')
  terminated = true
  console.error(`[camomilla] ${msg}`)
  process.exit(1)
}

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url} → ${res.status}`)
  return res.json()
}

/** Best-effort fingerprint of the frontend build inputs: git HEAD + lockfile.
 *  When neither is available, returns null (code-change detection off — rely on
 *  the explicit "Full rebuild" trigger). */
function frontendFingerprint() {
  const parts = []
  try {
    parts.push(
      execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim()
    )
  } catch {
    /* git absent — fall through to the lockfile */
  }
  for (const lock of ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']) {
    if (fs.existsSync(lock)) {
      parts.push(createHash('sha1').update(fs.readFileSync(lock)).digest('hex'))
      break
    }
  }
  if (!parts.length) return null
  return createHash('sha1').update(parts.join('|')).digest('hex')
}

// ---------------------------------------------------------------------------
// Deploy target — a local published tree, optionally synced to a remote CDN.
// volume:   nginx serves the tree; redirects.map (nginx include).
// external: same local tree, then a user sync command pushes it; _redirects
//           (Netlify/Cloudflare style) + an optional purge command.
// ---------------------------------------------------------------------------

export function makeTarget(cfg) {
  const dir = cfg.publishDir
  const isExternal = cfg.target === 'external'

  const readState = () => {
    const p = path.join(dir, STATE_FILE)
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
  }

  const publishFull = (distDir) => {
    fs.mkdirSync(dir, { recursive: true })
    // Empty the CONTENTS, never unlink `dir` itself: on the volume target it is
    // a docker volume mount point, and rmdir on a mount point fails EBUSY
    // (`force` only swallows ENOENT). Removing it would also detach the volume.
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true })
    }
    fs.cpSync(distDir, dir, { recursive: true })
  }

  const publishIncremental = (distDir, deletions) => {
    fs.mkdirSync(dir, { recursive: true })
    fs.cpSync(distDir, dir, { recursive: true, force: true }) // merge, never delete assets
    for (const publicPath of deletions) {
      const file = path.join(dir, pathToFile(publicPath))
      fs.rmSync(file, { force: true })
    }
  }

  /** Returns the filename written, for the event stream. */
  const writeRedirects = (redirects) => {
    if (isExternal) {
      // _redirects: `from to status`
      const body = redirects.map((r) => `${r.from} ${r.to} ${r.status}`).join('\n') + '\n'
      fs.writeFileSync(path.join(dir, '_redirects'), body)
      return '_redirects'
    }
    // nginx map fragment: `include`d inside a `map $uri $redirect { ... }`.
    const body = redirects.map((r) => `"${r.from}" "${r.to}";`).join('\n') + '\n'
    fs.writeFileSync(path.join(dir, 'redirects.map'), body)
    return 'redirects.map'
  }

  const writeState = (state) => {
    fs.writeFileSync(path.join(dir, STATE_FILE), JSON.stringify(state, null, 2))
  }

  // Push to the remote CDN + purge. No-op for the volume target (nginx serves
  // the tree directly, so overwriting a file IS the purge).
  const finalize = (changedPaths) => {
    if (!isExternal) return
    if (cfg.syncCmd) runShell(cfg.syncCmd, { CAMOMILLA_PUBLISH_DIR: dir }, 'sync')
    else {
      emit(
        'sync.skipped',
        { reason: 'no_sync_cmd' },
        'external target: CAMOMILLA_DEPLOY_SYNC_CMD unset — nothing pushed.',
        'warn'
      )
    }
    if (cfg.purgeCmd && changedPaths.length) {
      runShell(
        cfg.purgeCmd,
        { CAMOMILLA_PURGE_PATHS: changedPaths.join(' '), CAMOMILLA_PUBLISH_DIR: dir },
        'purge'
      )
    }
  }

  return { readState, publishFull, publishIncremental, writeRedirects, writeState, finalize }
}

// ponytail: user-supplied deploy commands run through the shell (they may pipe /
// glob). That is the user's own command, not attacker input — documented.
//
// Only argv[0] reaches the persisted log: sync/purge commands routinely carry
// credentials (`rsync --password=…`, signed URLs). The operator still sees the
// full line on stdout, exactly as before; the on-disk file does not keep it.
export function runShell(cmd, extraEnv, event) {
  const argv0 = cmd.split(/\s+/)[0]
  console.log(`[camomilla] $ ${cmd}`)
  emit(`${event}.started`, { argv0 })
  const t = Date.now()
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit', env: { ...process.env, ...extraEnv } })
  if (r.status !== 0) {
    emit(
      `${event}.failed`,
      { argv0, exitCode: r.status, durationMs: Date.now() - t },
      `${event} failed (${r.status})`,
      'error'
    )
    throw new Error(`command failed (${r.status}): ${cmd}`)
  }
  emit(`${event}.finished`, { argv0, durationMs: Date.now() - t })
}

/**
 * Build in-process via astro's programmatic API.
 *
 * Why not spawn `astro build`: a child process forced the path allowlist
 * through the environment, which capped it at ARG_MAX (~25k paths) and gave us
 * an exit code instead of an error. In-process we get the real exception, and
 * the allowlist is no longer size-bounded.
 *
 * The allowlist still travels via ``process.env`` even in-process: astro loads
 * ``staticPaths.ts`` from a Rollup-bundled copy through a native ``import()``,
 * so a module-level variable set here would NOT be the one it reads. Vite keeps
 * ``process.env`` live for the SSR environment, so this is the channel that
 * actually crosses — and ``staticPaths.ts`` needs no change.
 */
async function runAstroBuild(cfg, allowlist) {
  const mode = allowlist ? 'incremental' : 'full'
  const pages = allowlist?.length ?? null
  const t = Date.now()
  emit(
    'astro.started',
    { mode, pages },
    allowlist ? `astro build (incremental: ${pages} pages)` : 'astro build (full)'
  )

  process.env.CAMOMILLA_MODE = 'static'
  if (allowlist) process.env.CAMOMILLA_PATHS = JSON.stringify(allowlist)
  else delete process.env.CAMOMILLA_PATHS // full build fetches every public URL

  try {
    // astro's build() throws; its process.exit() calls live in the CLI wrapper,
    // never on this path. No custom logger: astro's default writes to this
    // process's stdout, which is what the backoffice websocket already scrapes
    // (colour included — under `docker exec -t` the pty keeps isatty true).
    const { build } = await import('astro')
    await build({ root: process.cwd(), outDir: path.resolve(cfg.distDir), logLevel: 'info' })
  } catch (e) {
    emit(
      'astro.failed',
      { mode, pages, durationMs: Date.now() - t, error: e.message, component: e.id ?? null },
      `astro build failed: ${e.message}`,
      'error'
    )
    throw e
  } finally {
    // Load-bearing, not hygiene: runShell spawns the deploy commands with the
    // whole env, so a large allowlist left behind turns a good build into E2BIG.
    delete process.env.CAMOMILLA_PATHS
  }

  emit(
    'astro.finished',
    { mode, pages, durationMs: Date.now() - t },
    `astro build ok (${((Date.now() - t) / 1000).toFixed(1)}s)`
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  openLog()
  emit(
    'build.started',
    {
      argv: process.argv.slice(2),
      pid: process.pid,
      node: process.version,
      cwd: process.cwd(),
      trigger: process.env.CAMOMILLA_BUILD_TRIGGER || 'cli',
      user: process.env.CAMOMILLA_BUILD_USER || null
    },
    'build started'
  )

  const cfg = readConfig(process.argv.slice(2))
  emit('config.resolved', {
    server: cfg.server,
    distDir: cfg.distDir,
    publishDir: cfg.publishDir,
    target: cfg.target,
    forceFull: cfg.forceFull,
    // Booleans only — these values carry credentials.
    hasBuildToken: !!cfg.buildToken,
    hasSyncCmd: !!cfg.syncCmd,
    hasPurgeCmd: !!cfg.purgeCmd
  })
  const target = makeTarget(cfg)

  // Step 0 — apply due scheduled publishes (no cron in manual-trigger setups).
  if (cfg.buildToken) {
    const t = Date.now()
    try {
      const r = await fetchJson(`${cfg.server}/api/camomilla/pages-router/publish-due`, {
        method: 'POST',
        headers: { Authorization: `Token ${cfg.buildToken}` }
      })
      emit(
        'sweep.finished',
        { published: r.published, durationMs: Date.now() - t },
        `scheduled-publish sweep: ${r.published} published`
      )
    } catch (e) {
      emit(
        'sweep.failed',
        { error: e.message, durationMs: Date.now() - t },
        `scheduled-publish sweep failed (continuing): ${e.message}`,
        'warn'
      )
    }
  } else {
    emit(
      'sweep.skipped',
      { reason: 'no_build_token' },
      'scheduled-publish sweep skipped (no CAMOMILLA_BUILD_TOKEN).'
    )
  }

  // Step 1-2 — previous state + current content-hash manifest.
  const prevState = target.readState()
  const tFeed = Date.now()
  const feed = await fetchJson(`${cfg.server}/api/camomilla/pages-router/changes`)
  const fp = frontendFingerprint()
  emit('changes.fetched', {
    durationMs: Date.now() - tFeed,
    urlCount: feed.urls.length,
    redirectCount: feed.redirects.length,
    epoch: feed.epoch,
    serverTime: feed.server_time
  })
  const { rebuild, deletions, manifest } = computeRebuild(prevState?.manifest || {}, feed.urls)

  // Step 3 — decide.
  const reason = decideFull(prevState, fp, feed.epoch, cfg.forceFull)
  const full = !!reason
  emit('decision', {
    full,
    reason: reason || 'content_changed',
    epoch: feed.epoch,
    prevEpoch: prevState?.epoch ?? null,
    fp,
    prevFp: prevState?.fp ?? null,
    rebuildCount: rebuild.length,
    deletionCount: deletions.length,
    rebuild: sample(rebuild),
    deletions: sample(deletions)
  })

  if (!full && !rebuild.length && !deletions.length) {
    // Still refresh redirects (cheap, keeps 301s current) and exit.
    target.writeRedirects(feed.redirects)
    emit(
      'build.finished',
      {
        status: 'succeeded',
        skipped: true,
        durationMs: Date.now() - STARTED_AT,
        urlCount: feed.urls.length
      },
      'nothing changed — skipping build.'
    )
    terminated = true
    return
  }

  // Step 4 — build.
  await runAstroBuild(cfg, full ? null : rebuild)

  // Step 5-6 — publish + redirects + remote sync/purge.
  const tPub = Date.now()
  if (full) {
    target.publishFull(cfg.distDir)
    emit(
      'publish.finished',
      { mode: 'full', durationMs: Date.now() - tPub },
      'publishing full tree (replace).'
    )
  } else {
    target.publishIncremental(cfg.distDir, deletions)
    emit(
      'publish.finished',
      {
        mode: 'incremental',
        rebuilt: rebuild.length,
        deleted: deletions.length,
        durationMs: Date.now() - tPub
      },
      `publishing ${rebuild.length} changed, deleting ${deletions.length}.`
    )
  }
  const redirectsFile = target.writeRedirects(feed.redirects)
  emit('redirects.written', { count: feed.redirects.length, file: redirectsFile })
  target.finalize([...(full ? Object.keys(manifest) : rebuild), ...deletions])

  // Step 7 — persist state only after a clean deploy.
  target.writeState({ fp, epoch: feed.epoch, server_time: feed.server_time, manifest })
  emit('state.written', { urlCount: Object.keys(manifest).length, epoch: feed.epoch, fp })
  emit(
    'build.finished',
    {
      status: 'succeeded',
      full,
      skipped: false,
      durationMs: Date.now() - STARTED_AT,
      urlCount: Object.keys(manifest).length,
      rebuilt: full ? null : rebuild.length,
      deleted: deletions.length,
      target: cfg.target
    },
    `done (${full ? 'full' : 'incremental'}). ${Object.keys(manifest).length} live URLs.`
  )
  terminated = true
}

// Run only as a CLI, not when imported by the test.
//
// Both sides must be realpaths: node resolves `import.meta.url` through
// symlinks but leaves `process.argv[1]` as typed, so under pnpm — where
// node_modules/<pkg> links into node_modules/.pnpm/ — the naive
// `file://${process.argv[1]}` never matches and the CLI exits 0 having done
// nothing at all. `pathToFileURL` also encodes spaces, which the template
// literal did not.
const invokedAsCli = (() => {
  try {
    return import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href
  } catch {
    return false
  }
})()

if (invokedAsCli) {
  // Exactly one terminal event per run, whatever happens. `stopBuild` in the
  // backoffice signals the process group, so the signal path is reachable; the
  // exit hook catches anything that bypasses main()'s catch. A log file with no
  // terminal line therefore means SIGKILL.
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      emit(
        'build.interrupted',
        { signal: sig, durationMs: Date.now() - STARTED_AT },
        `interrupted (${sig})`,
        'warn'
      )
      terminated = true
      process.exit(130)
    })
  }
  process.on('exit', (code) => {
    if (!terminated) {
      emit('build.failed', { exitCode: code, durationMs: Date.now() - STARTED_AT }, '', 'error')
    }
  })
  main().catch((e) => fail(e.stack || e.message))
}
