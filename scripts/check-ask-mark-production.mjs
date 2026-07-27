import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const baselinePath = path.join(
  root,
  "workers",
  "ask-mark",
  "production-baseline.json",
)

const baseline = JSON.parse(await readFile(baselinePath, "utf8"))
const timeoutMs = 10_000
const cliArguments = process.argv.slice(2)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function valueLabel(value) {
  return value === null || value === undefined
    ? "none"
    : String(value)
}

async function request(
  url,
  options = {},
  expectedStatuses = [200],
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    const text = await response.text()

    assert(
      expectedStatuses.includes(response.status),
      url + " returned " + response.status +
        "; expected " + expectedStatuses.join(" or ") + ".",
    )

    return { response, text }
  } finally {
    clearTimeout(timer)
  }
}

async function jsonRequest(
  url,
  options = {},
  expectedStatuses = [200],
) {
  const result = await request(url, options, expectedStatuses)
  let body = null

  try {
    body = result.text ? JSON.parse(result.text) : null
  } catch {
    throw new Error(
      url + " returned invalid JSON: " + result.text.slice(0, 200),
    )
  }

  return { ...result, body }
}

async function query(message, expectedStatuses = [200]) {
  return jsonRequest(
    baseline.worker.baseUrl + "/v1/query",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseline.pages.customDomain,
      },
      body: JSON.stringify({ message }),
    },
    expectedStatuses,
  )
}

async function checkPages() {
  const urls = [
    baseline.pages.deploymentUrl,
    baseline.pages.pagesUrl,
    baseline.pages.customDomain,
  ]

  for (const url of urls) {
    const result = await request(url)
    const contentType = result.response.headers.get("content-type") || ""

    assert(
      contentType.toLowerCase().includes("text/html"),
      url + " did not return HTML.",
    )

    console.log("PASS Pages HTTP 200: " + url)
  }
}

async function checkProductionBundle() {
  const deploymentRoot = new URL(
    baseline.pages.customDomain.replace(/\/+$/, "") + "/",
  )
  const htmlResult = await request(deploymentRoot.href)
  const scriptPattern = /<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/gi
  const scriptSources = [...htmlResult.text.matchAll(scriptPattern)]
    .map((match) => match[1])
    .map((source) => new URL(source, deploymentRoot))
    .filter((url) => url.origin === deploymentRoot.origin)

  const entryUrl = scriptSources.find((url) =>
    /\/assets\/main-[A-Za-z0-9_-]+\.js$/.test(url.pathname),
  )

  assert(entryUrl, "Production entry bundle was not found.")

  const entryResult = await request(entryUrl.href)
  const askMarkMatches = [
    ...entryResult.text.matchAll(
      /assets\/AskMarkAssistant-[A-Za-z0-9_-]+\.js/g,
    ),
  ]
  const askMarkPaths = [
    ...new Set(askMarkMatches.map((match) => match[0])),
  ]

  assert(
    askMarkPaths.length === 1,
    "Expected one Ask Mark chunk; found " + askMarkPaths.length + ".",
  )

  const askMarkUrl = new URL(askMarkPaths[0], deploymentRoot)
  const askMarkResult = await request(askMarkUrl.href)

  assert(
    askMarkResult.text.includes(baseline.worker.baseUrl),
    "Production Worker URL is absent from the Ask Mark chunk.",
  )
  assert(
    !askMarkResult.text.includes(baseline.boundaries.previewWorkerUrl),
    "Full preview Worker URL leaked into the production chunk.",
  )

  console.log("PASS production Ask Mark chunk: " + askMarkUrl.href)
}

async function checkHealthAndBootstrap() {
  const health = await jsonRequest(
    baseline.worker.baseUrl + "/v1/health",
  )

  assert(health.body?.ok === true, "Health response was not ok.")
  assert(
    health.body?.service === "ask-mark",
    "Unexpected Worker service.",
  )
  assert(
    health.body?.status === "healthy",
    "Production Worker is not healthy.",
  )
  assert(
    health.body?.apiVersion === baseline.worker.apiVersion,
    "Unexpected API version: " + valueLabel(health.body?.apiVersion),
  )
  assert(
    health.body?.mode === baseline.worker.mode,
    "Unexpected Worker mode: " + valueLabel(health.body?.mode),
  )
  assert(
    health.body?.release?.id === baseline.worker.release.id,
    "Unexpected active release.",
  )
  assert(
    health.body?.release?.number === baseline.worker.release.number,
    "Unexpected release number.",
  )
  assert(
    health.body?.release?.knowledgeCount ===
      baseline.worker.release.knowledgeCount,
    "Unexpected knowledge count.",
  )
  assert(
    health.body?.release?.seedVersion ===
      baseline.worker.release.seedVersion,
    "Unexpected seed version.",
  )

  const bootstrap = await jsonRequest(
    baseline.worker.baseUrl + "/v1/bootstrap",
  )

  assert(bootstrap.body?.ok === true, "Bootstrap response was not ok.")
  assert(
    Array.isArray(bootstrap.body?.projects),
    "Bootstrap projects are missing.",
  )
  assert(
    bootstrap.body.projects.some(
      (project) => project.key === "project.markhq",
    ),
    "Bootstrap is missing MarkHQ.",
  )

  console.log("PASS Worker health and bootstrap")
}

async function checkCors() {
  const approved = await request(
    baseline.worker.baseUrl + "/v1/query",
    {
      method: "OPTIONS",
      headers: {
        Origin: baseline.pages.customDomain,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    },
    [204],
  )

  assert(
    approved.response.headers.get("access-control-allow-origin") ===
      baseline.pages.customDomain,
    "Approved origin did not receive exact CORS permission.",
  )

  const blocked = await request(
    baseline.worker.baseUrl + "/v1/query",
    {
      method: "OPTIONS",
      headers: {
        Origin: baseline.boundaries.unapprovedOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    },
    [204, 403],
  )

  const blockedAllowOrigin = blocked.response.headers.get(
    "access-control-allow-origin",
  )

  assert(
    blockedAllowOrigin !== "*" &&
      blockedAllowOrigin !== baseline.boundaries.unapprovedOrigin,
    "Unapproved origin received CORS permission.",
  )

  console.log("PASS approved and unapproved CORS boundaries")
}

function assertSafeUnsupported(body, label) {
  const safeMatchedBoundary =
    body?.matched === true &&
    ["unsupported_boundary", "privacy_boundary"].includes(
      body?.item?.kind,
    )
  const safeFallback =
    body?.matched === false && body?.item === null

  assert(
    body?.ok === true && (safeMatchedBoundary || safeFallback),
    label + " did not return a safe boundary or fallback.",
  )
}

async function checkQueries() {
  const markHq = await query("Tell me about MarkHQ.")

  assert(markHq.body?.matched === true, "MarkHQ did not match.")
  assert(
    markHq.body?.item?.key === "project.markhq",
    "MarkHQ matched the wrong item.",
  )
  assert(
    markHq.body?.actions?.some(
      (action) => action.href === "/projects/markhq",
    ),
    "MarkHQ project action is missing.",
  )

  const privacy = await query(
    "What is Mark's exact home address and private phone number?",
  )

  assert(
    privacy.body?.item?.key === "boundary.private",
    "Private-details request missed the privacy boundary.",
  )
  assert(
    !/\b09\d{9}\b/.test(JSON.stringify(privacy.body)),
    "Privacy response exposed a Philippine mobile number.",
  )

  const noWeb = await query(
    "Search the live web and find current job openings for Mark today.",
  )
  assertSafeUnsupported(noWeb.body, "No-web request")

  const unsupported = await query(
    "What is the weather in Tokyo right now?",
  )
  assertSafeUnsupported(unsupported.body, "Unrelated request")

  const invalid = await query("", [400])
  assert(
    invalid.body?.ok === false,
    "Empty-message validation did not return an error body.",
  )

  console.log("PASS grounded, privacy, no-web, and fallback queries")
}

async function run() {
  assert(
    cliArguments.length === 0,
    "Authenticated mode is planned but not implemented in this public-only checkpoint.",
  )

  console.log("Checking Ask Mark production public baseline...")
  console.log("Baseline schema: " + baseline.schemaVersion)
  console.log("Production commit: " + baseline.repository.commit)
  console.log("")

  await checkPages()
  await checkProductionBundle()
  await checkHealthAndBootstrap()
  await checkCors()
  await checkQueries()

  console.log("")
  console.log("Ask Mark production public checks passed.")
}

run().catch((error) => {
  console.error("")
  console.error(
    "Ask Mark production public check failed: " + error.message,
  )
  process.exitCode = 1
})
