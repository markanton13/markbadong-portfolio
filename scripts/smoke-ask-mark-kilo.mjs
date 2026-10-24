const confirmation = '--owner-authorized-synthetic-smoke'

if (!process.argv.includes(confirmation)) {
  console.error(
    `No request sent. Re-run only after separate owner authorization with ${confirmation}.`,
  )
  process.exitCode = 2
} else if (process.env.ASK_MARK_KILO_SMOKE_APPROVED !== 'YES') {
  console.error('No request sent. Set ASK_MARK_KILO_SMOKE_APPROVED=YES after owner authorization.')
  process.exitCode = 2
} else {
  const baseUrl = process.env.ASK_MARK_LOCAL_API_URL || 'http://127.0.0.1:8787'
  let url

  try {
    url = new URL(baseUrl)
  } catch {
    console.error('No request sent. The local API URL is invalid.')
    process.exitCode = 2
  }

  if (
    process.exitCode !== 2 &&
    (url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username ||
      url.password)
  ) {
    console.error('No request sent. The smoke test accepts loopback HTTP URLs only.')
    process.exitCode = 2
  }

  if (process.exitCode !== 2) {
    try {
      const response = await fetch(`${url.origin}/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Synthetic test: describe the approved MarkHQ operations project.',
          generative: true,
          contextKey: 'project.markhq',
        }),
        // Local diagnostic profile: 33s adapter deadline plus 4s for Worker/D1 overhead.
        signal: AbortSignal.timeout(37_000),
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        // The smoke test reports status only; never echo provider or server text.
      }

      console.log(`Local API status: ${response.status}`)
      console.log(`Synthetic Kilo response used: ${result?.mode === 'kilo-local'}`)
      if (!response.ok || result?.mode !== 'kilo-local') process.exitCode = 1
    } catch {
      console.error('Local synthetic smoke test failed; no request details were logged.')
      process.exitCode = 1
    }
  }
}
