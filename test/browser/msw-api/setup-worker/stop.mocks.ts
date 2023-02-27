import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()

// @ts-ignore
window.msw = {
  worker,
}
