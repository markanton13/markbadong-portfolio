import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wranglerCli = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

function fail() {
  console.error('The local Ask Mark Worker launcher received invalid settings.')
  process.exit(2)
}

const settingsArgIndex = process.argv.indexOf('--settings')
const encodedSettings = process.argv[settingsArgIndex + 1]
if (settingsArgIndex < 0 || !encodedSettings) fail()

let settings
try {
  settings = JSON.parse(Buffer.from(encodedSettings, 'base64').toString('utf8'))
} catch {
  fail()
}

if (
  typeof settings?.state !== 'string' || !path.isAbsolute(settings.state) ||
  typeof settings?.config !== 'string' || !path.isAbsolute(settings.config) ||
  typeof settings?.pidFile !== 'string' || !path.isAbsolute(settings.pidFile) ||
  path.basename(settings.pidFile) !== 'worker.child.pid' ||
  settings?.port !== 8787
) {
  fail()
}

const worker = spawn(
  process.execPath,
  [
    wranglerCli,
    'dev',
    '--local',
    '--persist-to',
    settings.state,
    '--config',
    settings.config,
    '--ip',
    '127.0.0.1',
    '--port',
    String(settings.port),
  ],
  {
    cwd: root,
    windowsHide: true,
    env: {
      ...process.env,
      CI: '1',
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_WRITE_LOGS: 'false',
    },
    stdio: 'inherit',
  },
)

if (worker.pid) {
  try {
    writeFileSync(settings.pidFile, String(worker.pid), { flag: 'wx' })
  } catch {
    worker.kill()
    console.error('The local Worker process identity could not be recorded safely.')
    process.exitCode = 1
  }
}

worker.once('error', () => {
  console.error('Wrangler could not start the local Ask Mark Worker.')
  process.exitCode = 1
})
worker.once('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1)
})
