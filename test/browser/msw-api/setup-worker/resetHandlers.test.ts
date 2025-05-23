import { http, HttpResponse } from 'msw'
import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  // Annotate global references to the worker and rest request handlers.
  export const msw: {
    worker: SetupWorkerApi
    http: typeof http
    HttpResponse: typeof HttpResponse
  }
}

const USE_EXAMPLE = new URL('./use.mocks.ts', import.meta.url)

test('removes all runtime request handlers when resetting without explicit next handlers', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(USE_EXAMPLE)

  await page.evaluate(() => {
    const { msw } = window

    // Add a request handler on runtime
    msw.worker.use(
      msw.http.post('/login', () => {
        return msw.HttpResponse.json({ accepted: true })
      }),
    )
  })

  // Request handlers added on runtime affect the network communication.
  const loginResponse = await fetch('/login', {
    method: 'POST',
  })
  const loginStatus = loginResponse.status()
  const loginBody = await loginResponse.json()
  expect(loginStatus).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Reset request handlers to initial handlers.
  await page.evaluate(() => {
    const { msw } = window

    msw.worker.resetHandlers()
  })

  // Any runtime request handlers are removed upon reset.
  const secondLoginResponse = await fetch('/login', {
    method: 'POST',
  })
  const secondLoginStatus = secondLoginResponse.status()
  expect(secondLoginStatus).toBe(404)

  // Initial request handlers (given to `setupWorker`) are not affected.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('replaces all handlers with the explicit next runtime handlers upon reset', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(USE_EXAMPLE)

  // Add a runtime request handler.
  await page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.http.post('/login', () => {
        return msw.HttpResponse.json({ accepted: true })
      }),
    )
  })

  // Reset request handlers with explicit next handlers.
  await page.evaluate(() => {
    const { msw } = window

    msw.worker.resetHandlers(
      msw.http.get('/products', () => {
        return msw.HttpResponse.json([1, 2, 3])
      }),
    )
  })

  // Any runtime request handlers must be removed.
  const loginResponse = await fetch('/login', {
    method: 'POST',
  })
  const secondLoginStatus = loginResponse.status()
  expect(secondLoginStatus).toBe(404)

  // Any initial request handler must be removed.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  expect(bookStatus).toEqual(404)

  // Should leave only explicit reset request handlers.
  const productsResponse = await fetch('/products')
  const productsStatus = productsResponse.status()
  const productsBody = await productsResponse.json()
  expect(productsStatus).toBe(200)
  expect(productsBody).toEqual([1, 2, 3])
})
