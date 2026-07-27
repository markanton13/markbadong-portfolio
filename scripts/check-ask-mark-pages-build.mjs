import assert from 'node:assert/strict'
import {
  ASK_MARK_PRODUCTION_BUILD_MODE,
  PAGES_PRODUCTION_BRANCH,
  STATIC_BUILD_MODE,
  resolveAskMarkPagesBuild,
} from './lib/ask-mark-pages-build.mjs'

assert.equal(PAGES_PRODUCTION_BRANCH, 'main')

assert.deepEqual(resolveAskMarkPagesBuild({}), {
  isCloudflarePages: false,
  branch: '',
  isProductionBranch: false,
  mode: STATIC_BUILD_MODE,
})

assert.equal(
  resolveAskMarkPagesBuild({
    CF_PAGES: '0',
    CF_PAGES_BRANCH: 'main',
  }).mode,
  STATIC_BUILD_MODE,
)

assert.equal(
  resolveAskMarkPagesBuild({
    CF_PAGES: '1',
    CF_PAGES_BRANCH: 'feature/ask-mark-d1-foundation',
  }).mode,
  STATIC_BUILD_MODE,
)

assert.equal(
  resolveAskMarkPagesBuild({
    CF_PAGES: '1',
    CF_PAGES_BRANCH: ' main ',
  }).mode,
  ASK_MARK_PRODUCTION_BUILD_MODE,
)

assert.equal(
  resolveAskMarkPagesBuild({
    CF_PAGES: '1',
    CF_PAGES_BRANCH: 'Main',
  }).mode,
  STATIC_BUILD_MODE,
)

process.stdout.write(
  'Ask Mark Pages build selector checks passed: local and preview builds remain static-only, while Cloudflare Pages main uses the isolated production mode.\n',
)
