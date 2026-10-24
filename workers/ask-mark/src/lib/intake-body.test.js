import assert from 'node:assert/strict'
import test from 'node:test'
import { INTAKE_BODY_MAX_BYTES } from './intake-validation.js'
import { readUtf8Body } from './intake-body.js'

function streamedRequest(chunks, contentLength) {
  let nextChunk = 0
  let cancelled = false
  let pullsAfterCancel = 0

  const headers = new Headers()

  if (contentLength !== undefined) {
    headers.set('content-length', contentLength)
  }

  const body = new ReadableStream(
    {
      pull(controller) {
        if (cancelled) {
          pullsAfterCancel += 1
          return
        }

        if (nextChunk >= chunks.length) {
          controller.close()
          return
        }

        controller.enqueue(chunks[nextChunk])
        nextChunk += 1
      },
      cancel() {
        cancelled = true
      },
    },
    { highWaterMark: 0 },
  )

  return {
    request: new Request('http://localhost/v1/intake/submissions', {
      method: 'POST',
      headers,
      body,
      duplex: 'half',
    }),
    wasCancelled: () => cancelled,
    pullsAfterCancel: () => pullsAfterCancel,
  }
}

async function expectError(result, status, code) {
  assert.equal(result.ok, false)
  assert.equal(result.response.status, status)
  const body = await result.response.json()
  assert.equal(body.error.code, code)
  return body
}

test('reads valid chunked UTF-8 when Content-Length is absent', async () => {
  const rawBody = '{"message":"Kamusta 🌿"}'
  const bytes = new TextEncoder().encode(rawBody)
  const emojiOffset = rawBody.indexOf('🌿')
  const splitOffset = new TextEncoder().encode(
    rawBody.slice(0, emojiOffset),
  ).byteLength + 2
  const stream = streamedRequest([
    bytes.slice(0, splitOffset),
    bytes.slice(splitOffset),
  ])

  const result = await readUtf8Body(stream.request)

  assert.deepEqual(result, { ok: true, rawBody })
  assert.equal(stream.wasCancelled(), false)
})

test('accepts exactly the configured byte limit', async () => {
  const rawBody = 'x'.repeat(INTAKE_BODY_MAX_BYTES)
  const stream = streamedRequest(
    [new TextEncoder().encode(rawBody)],
    `000${INTAKE_BODY_MAX_BYTES}`,
  )

  const result = await readUtf8Body(stream.request)

  assert.deepEqual(result, { ok: true, rawBody })
})

test('rejects and cancels a stream that exceeds the limit', async () => {
  const stream = streamedRequest([
    new Uint8Array(3_000),
    new Uint8Array(INTAKE_BODY_MAX_BYTES - 2_999),
    new Uint8Array(1),
  ])

  await expectError(
    await readUtf8Body(stream.request),
    413,
    'payload_too_large',
  )
  assert.equal(stream.wasCancelled(), true)
  assert.equal(stream.pullsAfterCancel(), 0)
})

test('does not trust an understated Content-Length', async () => {
  const stream = streamedRequest(
    [new Uint8Array(INTAKE_BODY_MAX_BYTES + 1)],
    '1',
  )

  await expectError(
    await readUtf8Body(stream.request),
    413,
    'payload_too_large',
  )
  assert.equal(stream.wasCancelled(), true)
})

test('uses the stream bound when Content-Length is malformed', async () => {
  const stream = streamedRequest(
    [new Uint8Array(INTAKE_BODY_MAX_BYTES + 1)],
    'not-a-length',
  )

  await expectError(
    await readUtf8Body(stream.request),
    413,
    'payload_too_large',
  )
  assert.equal(stream.wasCancelled(), true)
})

test('rejects an oversized declared length and cancels without reading', async () => {
  const stream = streamedRequest(
    [new TextEncoder().encode('small body')],
    String(INTAKE_BODY_MAX_BYTES + 1),
  )

  await expectError(
    await readUtf8Body(stream.request),
    413,
    'payload_too_large',
  )
  assert.equal(stream.wasCancelled(), true)
  assert.equal(stream.pullsAfterCancel(), 0)
})

test('rejects malformed UTF-8 across stream chunks', async () => {
  const stream = streamedRequest([
    new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3]),
    new Uint8Array([0x28, 0x22, 0x7d]),
  ])

  await expectError(
    await readUtf8Body(stream.request),
    400,
    'invalid_unicode',
  )
})

test('returns a safe error when the body stream fails', async () => {
  const requestBody = new ReadableStream({
    pull(controller) {
      controller.error(new Error('private stream detail'))
    },
    cancel() {},
  })
  const request = new Request('http://localhost/v1/intake/submissions', {
    method: 'POST',
    body: requestBody,
    duplex: 'half',
  })

  const result = await readUtf8Body(request)

  const responseBody = await expectError(result, 400, 'invalid_payload')
  assert.doesNotMatch(
    JSON.stringify(responseBody),
    /private stream detail/u,
  )
})
