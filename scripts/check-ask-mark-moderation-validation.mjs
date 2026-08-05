import assert from 'node:assert/strict'
import {
  MODERATION_BODY_MAX_BYTES,
  MODERATION_DEFAULT_LIMIT,
  ModerationRequestError,
  encodeModerationCursor,
  isValidModerationSubmissionId,
  parseModerationQueueQuery,
  readModerationActionRequest,
} from '../workers/ask-mark/src/lib/moderation-validation.js'

async function expectError(
  promiseOrFunction,
  code,
  status,
) {
  let error

  try {
    if (typeof promiseOrFunction === 'function') {
      await promiseOrFunction()
    } else {
      await promiseOrFunction
    }
  } catch (caught) {
    error = caught
  }

  assert.ok(
    error instanceof ModerationRequestError,
    `Expected ModerationRequestError for ${code}.`,
  )
  assert.equal(error.code, code)
  assert.equal(error.status, status)
}

assert.equal(
  isValidModerationSubmissionId(
    'submission_123e4567-e89b-12d3-a456-426614174000',
  ),
  true,
)
assert.equal(
  isValidModerationSubmissionId('../submission_bad'),
  false,
)

const cursor = encodeModerationCursor({
  createdAt: '2026-08-04T00:00:00.000Z',
  id: 'submission_cursor-001',
})

const parsedQuery = parseModerationQueueQuery(
  new URL(
    'https://example.test/v1/admin/intake/submissions?' +
      new URLSearchParams({
        status: 'approved',
        type: 'question',
        language: 'taglish',
        limit: '50',
        cursor,
      }),
  ),
)

assert.deepEqual(parsedQuery, {
  status: 'approved',
  type: 'question',
  language: 'taglish',
  limit: 50,
  cursor: {
    createdAt: '2026-08-04T00:00:00.000Z',
    id: 'submission_cursor-001',
  },
})

assert.deepEqual(
  parseModerationQueueQuery(
    'https://example.test/v1/admin/intake/submissions',
  ),
  {
    status: 'pending_review',
    type: null,
    language: null,
    limit: MODERATION_DEFAULT_LIMIT,
    cursor: null,
  },
)

for (const [url, code] of [
  [
    'https://example.test/v1/admin/intake/submissions?other=x',
    'unknown_query_parameter',
  ],
  [
    'https://example.test/v1/admin/intake/submissions?status=public',
    'invalid_status',
  ],
  [
    'https://example.test/v1/admin/intake/submissions?type=contact_request',
    'invalid_submission_type',
  ],
  [
    'https://example.test/v1/admin/intake/submissions?language=auto',
    'invalid_language',
  ],
  [
    'https://example.test/v1/admin/intake/submissions?limit=0',
    'invalid_limit',
  ],
  [
    'https://example.test/v1/admin/intake/submissions?limit=51',
    'invalid_limit',
  ],
  [
    'https://example.test/v1/admin/intake/submissions?cursor=bad',
    'invalid_cursor',
  ],
]) {
  await expectError(
    () => parseModerationQueueQuery(url),
    code,
    400,
  )
}

const validActionRequest = new Request(
  'https://example.test/v1/admin/intake/submissions/submission_valid/actions',
  {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/json; charset="utf-8"',
    },
    body: JSON.stringify({
      action: 'approve',
      expectedStatus: 'pending_review',
      expectedUpdatedAt:
        '2026-08-04T00:00:00.000Z',
      reasonCode: 'useful_question',
      note: '  Verify\tthis\r\nbefore curation.  ',
    }),
  },
)

assert.deepEqual(
  await readModerationActionRequest(
    validActionRequest,
  ),
  {
    action: 'approve',
    expectedStatus: 'pending_review',
    expectedUpdatedAt:
      '2026-08-04T00:00:00.000Z',
    reasonCode: 'useful_question',
    note: 'Verify this\nbefore curation.',
  },
)

function actionRequest(
  body,
  contentType = 'application/json',
) {
  return new Request(
    'https://example.test/v1/admin/intake/submissions/submission_valid/actions',
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body:
        typeof body === 'string'
          ? body
          : JSON.stringify(body),
    },
  )
}

const baseAction = {
  action: 'reject',
  expectedStatus: 'pending_review',
  expectedUpdatedAt:
    '2026-08-04T00:00:00.000Z',
  reasonCode: 'not_actionable',
}

await expectError(
  readModerationActionRequest(
    actionRequest(baseAction, 'text/plain'),
  ),
  'unsupported_media_type',
  415,
)

await expectError(
  readModerationActionRequest(
    actionRequest('{invalid'),
  ),
  'invalid_json',
  400,
)

await expectError(
  readModerationActionRequest(
    actionRequest({
      ...baseAction,
      extra: true,
    }),
  ),
  'unknown_field',
  400,
)

await expectError(
  readModerationActionRequest(
    actionRequest({
      ...baseAction,
      action: 'publish',
    }),
  ),
  'invalid_action',
  400,
)

await expectError(
  readModerationActionRequest(
    actionRequest({
      ...baseAction,
      reasonCode: 'useful_question',
    }),
  ),
  'invalid_reason_code',
  400,
)

await expectError(
  readModerationActionRequest(
    actionRequest({
      ...baseAction,
      expectedUpdatedAt: 'not-a-date',
    }),
  ),
  'invalid_timestamp',
  400,
)

await expectError(
  readModerationActionRequest(
    actionRequest({
      ...baseAction,
      note: 'a'.repeat(1001),
    }),
  ),
  'note_too_long',
  400,
)

await expectError(
  readModerationActionRequest(
    actionRequest({
      ...baseAction,
      note: 'unsafe\u0000note',
    }),
  ),
  'invalid_note',
  400,
)

await expectError(
  readModerationActionRequest(
    new Request(
      'https://example.test/v1/admin/intake/submissions/submission_valid/actions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(
            MODERATION_BODY_MAX_BYTES + 1,
          ),
        },
        body: JSON.stringify(baseAction),
      },
    ),
  ),
  'payload_too_large',
  413,
)

console.log(
  [
    'Ask Mark moderation validation checks passed:',
    'strict queue filters and keyset cursor parsing,',
    'exact action payloads, media type and byte limits,',
    'action-specific reason codes, ISO concurrency tokens,',
    'Unicode-safe private-note normalization, and unknown-field rejection.',
  ].join(' '),
)
