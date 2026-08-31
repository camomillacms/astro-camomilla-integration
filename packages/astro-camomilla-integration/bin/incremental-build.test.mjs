#!/usr/bin/env node
/** Self-check for the incremental-build logic. Run: `node bin/incremental-build.test.mjs`. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  computeRebuild,
  decideFull,
  emit,
  makeTarget,
  openLog,
  pathToFile,
  runShell
} from './incremental-build.mjs'

// pathToFile — root, nested, language-prefixed
assert.equal(pathToFile('/'), 'index.html')
assert.equal(pathToFile('/it/'), 'it/index.html')
assert.equal(pathToFile('/it/about/'), 'it/about/index.html')
assert.equal(pathToFile('/about'), 'about/index.html')

// computeRebuild — new + changed rebuild; vanished path is a deletion; unchanged skipped
{
  const prev = { '/': 'h0', '/it/about/': 'hA', '/gone/': 'hG' }
  const current = [
    { path: '/', hash: 'h0' }, //         unchanged  → not rebuilt
    { path: '/it/about/', hash: 'hA2' }, // changed   → rebuilt
    { path: '/new/', hash: 'hN' } //       new        → rebuilt
  ]
  const { rebuild, deletions, manifest } = computeRebuild(prev, current)
  assert.deepEqual(rebuild.sort(), ['/it/about/', '/new/'])
  assert.deepEqual(deletions, ['/gone/']) // dropped from the feed → delete file
  assert.deepEqual(manifest, { '/': 'h0', '/it/about/': 'hA2', '/new/': 'hN' })
}

// decideFull — returns the REASON (or '' for incremental) so the event stream
// can answer "why did it rebuild everything?".
assert.equal(decideFull(null, 'fp1', 'e1', false), 'no_prev_state')
assert.equal(decideFull({ fp: 'fp1', epoch: 'e1' }, 'fp2', 'e1', false), 'fingerprint_changed')
assert.equal(decideFull({ fp: 'fp1', epoch: 'e1' }, 'fp1', 'e2', false), 'epoch_changed')
assert.equal(decideFull({ fp: 'fp1', epoch: 'e1' }, 'fp1', 'e1', true), 'force_full')
assert.equal(decideFull({ fp: 'fp1', epoch: 'e1' }, 'fp1', 'e1', false), '')
// null fingerprint (no git/lockfile) must not spuriously force a full build
assert.equal(decideFull({ fp: null, epoch: null }, null, null, false), '')
// Callers do `const full = !!reason` — pin that contract, not just the strings.
assert.equal(!!decideFull({ fp: 'fp1', epoch: 'e1' }, 'fp1', 'e1', false), false)
assert.equal(!!decideFull(null, null, null, false), true)

// Deploy adapter (real filesystem) — the merge-vs-replace + orphan-delete
// semantics that keep non-rebuilt pages' hashed assets alive (asset-hashing
// hazard). volume target.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-build-'))
  const publishDir = path.join(root, 'published')
  const distDir = path.join(root, 'dist')
  const w = (base, rel, body) => {
    const f = path.join(base, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, body)
  }
  const exists = (rel) => fs.existsSync(path.join(publishDir, rel))
  const target = makeTarget({ publishDir, target: 'volume' })

  // Prior published tree: two pages + a shared hashed asset.
  w(publishDir, 'index.html', 'home v1')
  w(publishDir, 'old/index.html', 'old page')
  w(publishDir, '_astro/app.AAAA.css', 'old css')

  // Incremental build rebuilt only the home page (+ a NEW hashed asset), and
  // /old/ was unpublished (deletion).
  w(distDir, 'index.html', 'home v2')
  w(distDir, '_astro/app.BBBB.css', 'new css')
  target.publishIncremental(distDir, ['/old/'])

  assert.equal(
    fs.readFileSync(path.join(publishDir, 'index.html'), 'utf8'),
    'home v2',
    'rebuilt page overwritten'
  )
  assert.ok(exists('_astro/app.AAAA.css'), 'OLD asset kept — non-rebuilt pages still reference it')
  assert.ok(exists('_astro/app.BBBB.css'), 'new asset added')
  assert.ok(!exists('old/index.html'), 'orphaned (unpublished) page deleted')

  // Redirects (nginx map) + state round-trip.
  target.writeRedirects([{ from: '/gone/', to: '/here/', status: 301 }])
  assert.match(
    fs.readFileSync(path.join(publishDir, 'redirects.map'), 'utf8'),
    /"\/gone\/" "\/here\/";/
  )
  target.writeState({ fp: 'x', epoch: 'e', manifest: { '/': 'h' } })
  assert.equal(target.readState().fp, 'x', 'state round-trips')

  // Full build REPLACES the tree (asset GC): old assets gone.
  const distFull = path.join(root, 'distFull')
  w(distFull, 'index.html', 'home v3')
  w(distFull, '_astro/app.CCCC.css', 'gc css')
  const inoBefore = fs.statSync(publishDir).ino
  target.publishFull(distFull)
  assert.ok(exists('_astro/app.CCCC.css'), 'full: new asset present')
  assert.ok(!exists('_astro/app.AAAA.css'), 'full: stale asset GCed')
  assert.ok(!exists('_astro/app.BBBB.css'), 'full: stale asset GCed')
  // The publish dir is a docker volume MOUNT POINT in the volume target;
  // unlinking it throws EBUSY in the container (a temp dir here would let it
  // pass silently). Same inode ⇒ we emptied it rather than recreating it.
  assert.equal(
    fs.statSync(publishDir).ino,
    inoBefore,
    'full: publish dir emptied in place, never unlinked (mount point)'
  )

  fs.rmSync(root, { recursive: true, force: true })
}

// Structured events — the JSONL sink must be parseable and ordered, pruning
// must keep the NEWEST runs, and the deploy commands' secrets must never reach
// the file (sync/purge routinely carry credentials).
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-log-'))
  process.env.CAMOMILLA_LOG_DIR = dir

  // Seed more than the cap; names sort oldest-first like the real ones do.
  for (let i = 0; i < 55; i++) {
    fs.writeFileSync(path.join(dir, `2020-01-01T00-00-${String(i).padStart(2, '0')}-old.jsonl`), '')
  }

  openLog()

  const survivors = fs.readdirSync(dir).filter((f) => f.includes('-old'))
  assert.equal(survivors.length, 50, 'pruning keeps exactly the cap')
  assert.ok(survivors.includes('2020-01-01T00-00-54-old.jsonl'), 'newest survived')
  assert.ok(!survivors.includes('2020-01-01T00-00-00-old.jsonl'), 'oldest pruned')

  emit('build.started', { a: 1 }, 'human line')
  emit('decision', { full: false })
  runShell('echo rsync --password=hunter2 site', {}, 'sync')

  // Read AFTER emitting: openLog only computes the path, appendFileSync creates it.
  const file = fs.readdirSync(dir).find((f) => f.endsWith('.jsonl') && !f.includes('-old'))
  assert.ok(file, 'a new run file was written')
  const lines = fs
    .readFileSync(path.join(dir, file), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l)) // throws if any line is not valid JSON

  assert.deepEqual(
    lines.map((l) => l.seq),
    [0, 1, 2, 3],
    'seq is monotonic (runShell emits started + finished)'
  )
  assert.ok(
    lines.every((l) => l.v === 1 && l.ts && l.runId && l.event),
    'envelope is complete on every line'
  )
  assert.equal(lines[0].event, 'build.started')
  assert.equal(lines[0].msg, 'human line')

  const raw = fs.readFileSync(path.join(dir, file), 'utf8')
  assert.ok(!raw.includes('hunter2'), 'SECRET must not be persisted to the log file')
  assert.equal(lines[2].data.argv0, 'echo', 'only argv[0] of a deploy command is kept')

  delete process.env.CAMOMILLA_LOG_DIR
  fs.rmSync(dir, { recursive: true, force: true })
}

// The CLI guard must survive being invoked through a symlink: that is how pnpm
// installs this package (node_modules/<pkg> → node_modules/.pnpm/…), and a
// guard that fails there makes `pnpm generate` exit 0 having built nothing.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'camomilla-cli-'))
  const real = path.join(dir, 'real.mjs')
  const link = path.join(dir, 'link.mjs')
  // Mirrors the guard in incremental-build.mjs; running it through the symlink
  // must report the same answer as running the file directly.
  fs.writeFileSync(
    real,
    [
      "import fs from 'node:fs'",
      "import { pathToFileURL } from 'node:url'",
      'const ran = import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href',
      'console.log(ran ? "RAN" : "SKIPPED")'
    ].join('\n')
  )
  const run = (entry) => execFileSync(process.execPath, [entry], { encoding: 'utf8' }).trim()

  fs.symlinkSync(real, link)
  assert.equal(run(real), 'RAN', 'guard fires when invoked directly')
  assert.equal(run(link), 'RAN', 'guard fires when invoked through a symlink (pnpm layout)')

  fs.rmSync(dir, { recursive: true, force: true })
}

console.log('ok — incremental-build logic (pure + deploy fs + events + cli guard)')
