import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const root = path.resolve(here, '..', '..')
export const worker = path.join(root, 'workers', 'ask-mark')
export const config = path.join(worker, 'wrangler.jsonc')
export const database = 'ask-mark-knowledge-local'
const cli = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

export function fail(message, details = '') {
  if (details) console.error(details.trim())
  throw new Error(message)
}

export function run(args, capture = false) {
  if (!existsSync(cli)) fail('Wrangler is not installed. Run npm install first.')
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  if (result.error) fail(result.error.message)
  if (result.status !== 0) fail(`Wrangler exited with ${result.status}.`,
    `${result.stdout || ''}\n${result.stderr || ''}`)
  return result.stdout || ''
}

export function localArgs(state) {
  return [database, '--local', '--persist-to', state, '--config', config]
}

export function migrate(state) {
  run(['d1', 'migrations', 'apply', ...localArgs(state)])
}

export function query(state, sql) {
  const parsed = JSON.parse(run(['d1','execute',...localArgs(state),
    '--command',sql.replace(/\s+/g,' ').trim(),'--json','--yes'], true))
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) { const found = visit(item); if (found) return found }
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value.results) && value.results[0]) return value.results[0]
      for (const item of Object.values(value)) { const found = visit(item); if (found) return found }
    }
    return null
  }
  return visit(parsed)
}
