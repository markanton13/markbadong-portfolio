const foundationResponse = Object.freeze({
  service: 'ask-mark',
  phase: 'd1-foundation',
  status: 'not-serving-public-endpoints',
})

export default {
  fetch() {
    return Response.json(foundationResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  },
}
