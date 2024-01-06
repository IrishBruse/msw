import { urlFromRequestOrCache } from './urlFromRequestOrCache'

/**
 * Returns a relative URL if the given request URL is relative to the current origin.
 * Otherwise returns an absolute URL.
 */
export function getPublicUrlFromRequest(request: Request): string {
  if (typeof location === 'undefined') {
    return request.url
  }

  const url = urlFromRequestOrCache(request)

  return url.origin === location.origin
    ? url.pathname
    : url.origin + url.pathname
}
