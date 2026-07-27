import { build } from 'vite'
import {
  resolveAskMarkPagesBuild,
} from './lib/ask-mark-pages-build.mjs'

const selection = resolveAskMarkPagesBuild(process.env)
const context = selection.isCloudflarePages
  ? 'cloudflare-pages'
  : 'local'
const branch = selection.branch || '(none)'

process.stdout.write(
  '[pages-build] context=' +
    context +
    ' branch=' +
    branch +
    ' vite-mode=' +
    selection.mode +
    '\n',
)

await build({
  mode: selection.mode,
})
