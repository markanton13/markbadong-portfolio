import { INTAKE_BODY_MAX_BYTES } from './intake-validation.js'
import { errorResponse } from './responses.js'

const utf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
})

function contentLengthExceedsLimit(request) {
  const contentLength = request.headers.get('content-length')

  if (!contentLength || !/^\d+$/u.test(contentLength)) {
    return false
  }

  const normalizedLength = contentLength.replace(/^0+/u, '') || '0'

  if (normalizedLength.length > String(INTAKE_BODY_MAX_BYTES).length) {
    return true
  }

  return Number(normalizedLength) > INTAKE_BODY_MAX_BYTES
}

function tooLarge(request) {
  return {
    ok: false,
    response: errorResponse(
      request,
      413,
      'payload_too_large',
      `Request bodies are limited to ${INTAKE_BODY_MAX_BYTES} bytes.`,
    ),
  }
}

function unreadable(request) {
  return {
    ok: false,
    response: errorResponse(
      request,
      400,
      'invalid_payload',
      'The request body could not be read.',
    ),
  }
}

async function cancelReader(reader) {
  if (!reader) return

  try {
    await reader.cancel()
  } catch {
    // Cancellation is best effort; never replace the safe client error.
  }
}

export async function readUtf8Body(request) {
  let reader
  let reachedEnd = false

  try {
    if (!request.body) {
      return {
        ok: true,
        rawBody: '',
      }
    }

    reader = request.body.getReader()

    if (contentLengthExceedsLimit(request)) {
      await cancelReader(reader)
      return tooLarge(request)
    }

    const chunks = []
    let totalBytes = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        reachedEnd = true
        break
      }

      if (!(value instanceof Uint8Array)) {
        await cancelReader(reader)
        return unreadable(request)
      }

      if (
        value.byteLength >
        INTAKE_BODY_MAX_BYTES - totalBytes
      ) {
        await cancelReader(reader)
        return tooLarge(request)
      }

      chunks.push(value)
      totalBytes += value.byteLength
    }

    const bodyBytes = new Uint8Array(totalBytes)
    let offset = 0

    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset)
      offset += chunk.byteLength
    }

    try {
      return {
        ok: true,
        rawBody: utf8Decoder.decode(bodyBytes),
      }
    } catch {
      return {
        ok: false,
        response: errorResponse(
          request,
          400,
          'invalid_unicode',
          'The request body must contain valid UTF-8.',
        ),
      }
    }
  } catch {
    if (reader && !reachedEnd) {
      await cancelReader(reader)
    }

    return unreadable(request)
  } finally {
    if (reader) {
      try {
        reader.releaseLock()
      } catch {
        // A pending or failed stream must not change the response contract.
      }
    }
  }
}
