import { rest, HttpResponse } from 'msw'

/**
 * Response body generic.
 */
rest.get<never, never, { id: number }>('/user', () => {
  return HttpResponse.json({ id: 1 })
})

rest.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error String not assignable to number
  () => HttpResponse.json({ id: 'invalid' }),
)

rest.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error Missing property "id"
  () => HttpResponse.json({}),
)

rest.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error Unknown property "invalid"
  () => HttpResponse.json({ id: 1, invalid: true }),
)

//
//
//

rest.get<never, never, { postCount: number }>('/user', (req, res, ctx) => {
  // @ts-expect-error `session` property is not defined on the request body type.
  req.body.session

  res(
    // @ts-expect-error JSON doesn't match given response body generic type.
    ctx.json({ unknown: true }),
  )

  res(
    // @ts-expect-error value types do not match
    ctx.json({ postCount: 'this is not a number' }),
  )

  return res(ctx.json({ postCount: 2 }))
})

rest.post<// @ts-expect-error `null` is not a valid request body type.
null>('/submit', () => null)

rest.get<
  any,
  // @ts-expect-error `null` is not a valid response body type.
  null
>('/user', () => null)

rest.get<never, never, { label: boolean }>('/user', (req, res, ctx) =>
  // allow ResponseTransformer to contain a more specific type
  res(ctx.json({ label: true })),
)

rest.get<never, never, string | string[]>('/user', (req, res, ctx) =>
  // allow ResponseTransformer to return a narrower type than a given union
  res(ctx.json('hello')),
)

rest.head('/user', (req) => {
  // @ts-expect-error GET requests cannot have body.
  req.body.toString()
})

rest.head<string>('/user', (req) => {
  // @ts-expect-error GET requests cannot have body.
  req.body.toString()
})

rest.get('/user', (req) => {
  // @ts-expect-error GET requests cannot have body.
  req.body.toString()
})

rest.get<string>('/user', (req) => {
  // @ts-expect-error GET requests cannot have body.
  req.body.toString()
})

rest.post<{ userId: string }>('/user', (req) => {
  req.body.userId.toUpperCase()
})
