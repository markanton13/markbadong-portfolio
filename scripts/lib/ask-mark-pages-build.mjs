export const PAGES_PRODUCTION_BRANCH = 'main'
export const STATIC_BUILD_MODE = 'production'
export const ASK_MARK_PRODUCTION_BUILD_MODE = 'askmark-production'

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function resolveAskMarkPagesBuild(
  environment = process.env,
) {
  const isCloudflarePages =
    normalizeValue(environment.CF_PAGES) === '1'
  const branch = normalizeValue(environment.CF_PAGES_BRANCH)
  const isProductionBranch =
    isCloudflarePages && branch === PAGES_PRODUCTION_BRANCH

  return {
    isCloudflarePages,
    branch,
    isProductionBranch,
    mode: isProductionBranch
      ? ASK_MARK_PRODUCTION_BUILD_MODE
      : STATIC_BUILD_MODE,
  }
}
