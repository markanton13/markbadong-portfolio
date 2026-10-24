import assert from 'node:assert/strict'

const ATTEMPT_LIMIT = 20
const ACCEPTED_LIMIT = 5
const ACCEPTED_BATCH_STATEMENTS = 4
const DUPLICATE_BATCH_STATEMENTS_BEFORE_FAILURE = 2

function simulateBucket(outcomes) {
  let chargedAttempts = 0
  let accepted = 0
  let acceptedStatements = 0
  let duplicateFailedStatements = 0
  let overLimitReads = 0

  for (const outcome of outcomes) {
    if (chargedAttempts >= ATTEMPT_LIMIT) {
      overLimitReads += 1
      continue
    }

    chargedAttempts += 1
    if (outcome === 'accepted' && accepted < ACCEPTED_LIMIT) {
      accepted += 1
      acceptedStatements += ACCEPTED_BATCH_STATEMENTS
    } else if (outcome === 'duplicate') {
      // Existing accepted-counter upsert runs, then the unique submission
      // insert fails; D1 batch rollback means neither statement persists.
      duplicateFailedStatements += DUPLICATE_BATCH_STATEMENTS_BEFORE_FAILURE
    }
  }

  return {
    chargedAttempts,
    accepted,
    attemptBucketWrites: chargedAttempts,
    acceptedBatchStatements: acceptedStatements,
    duplicateFailedStatements,
    durableWriteStatements: chargedAttempts + acceptedStatements,
    overLimitReads,
  }
}

const scenarios = [
  ['20 malformed/rejected attempts', simulateBucket(Array(20).fill('rejected'))],
  ['5 accepted plus 15 pre-storage rejects', simulateBucket([
    ...Array(5).fill('accepted'),
    ...Array(15).fill('rejected'),
  ])],
  ['5 accepted plus 15 duplicates', simulateBucket([
    ...Array(5).fill('accepted'),
    ...Array(15).fill('duplicate'),
  ])],
  ['20 allowed duplicates plus 80 over-limit retries', simulateBucket([
    ...Array(20).fill('duplicate'),
    ...Array(80).fill('duplicate'),
  ])],
]

assert.deepEqual(scenarios[0][1], {
  chargedAttempts: 20,
  accepted: 0,
  attemptBucketWrites: 20,
  acceptedBatchStatements: 0,
  duplicateFailedStatements: 0,
  durableWriteStatements: 20,
  overLimitReads: 0,
})
assert.equal(scenarios[1][1].durableWriteStatements, 40)
assert.equal(scenarios[2][1].duplicateFailedStatements, 30)
assert.equal(scenarios[2][1].accepted, 5)
assert.equal(scenarios[3][1].attemptBucketWrites, 20)
assert.equal(scenarios[3][1].overLimitReads, 80)

for (const [label, result] of scenarios) {
  console.log(`${label}: ${JSON.stringify(result)}`)
}
console.log('Distinct-source scale: 1,000 independent one-request sources require 1,000 attempt writes; if accepted, up to 4,000 additional accepted-batch statements (5,000 total logical write statements). This is not a global cap.')
