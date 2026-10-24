import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../index.js'

test('intake and private moderation paths stay disabled without local flags', async () => {
  let databaseCalls = 0
  const env = {
    ASK_MARK_DB: {
      prepare() {
        databaseCalls += 1
        throw new Error('Disabled routes must not access D1.')
      },
    },
  }

  for (const [method, pathname] of [
    ['POST', '/v1/intake/submissions'],
    ['GET', '/v1/admin/intake/submissions'],
    [
      'GET',
      '/v1/admin/intake/submissions/submission_private_123/actions',
    ],
  ]) {
    const response = await worker.fetch(
      new Request(`http://localhost${pathname}`, { method }),
      env,
    )
    const body = await response.json()

    assert.equal(response.status, 404)
    assert.equal(body.error.code, 'not_found')
  }

  assert.equal(databaseCalls, 0)
})
