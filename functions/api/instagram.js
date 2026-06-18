// Cloudflare Pages Function — cached proxy for the Behold Instagram feed.
//
// WHY: the site used to fetch Behold directly on every Home/Community page
// load. With statewide traffic that blew Behold's free monthly view cap. This
// function fetches Behold at most once per CACHE_TTL per edge location and
// serves every visitor from the edge cache, so Behold sees a tiny number of
// requests regardless of how many people visit.
//
// Served at:  /api/instagram   (the InstagramFeed component fetches this)

const FALLBACK_FEED_ID = 'YcAFUdHFHAb61hXirByX'
const CACHE_TTL = 21600 // seconds (6 hours). Increase to hit Behold even less.

export async function onRequest(context) {
  const cache = caches.default
  // Stable cache key so all requests share one cached copy.
  const cacheKey = new Request('https://cache.local/instagram-feed')

  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const feedId = (context.env && context.env.VITE_BEHOLD_FEED_ID) || FALLBACK_FEED_ID

  let body = '{"posts":[]}'
  let ok = false
  try {
    const upstream = await fetch(`https://feeds.behold.so/${feedId}`, {
      headers: { accept: 'application/json' },
    })
    if (upstream.ok) { body = await upstream.text(); ok = true }
  } catch (e) {
    // network/Behold error — fall through with the empty payload
  }

  const response = new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      // Only cache successful fetches; don't cache the empty fallback.
      'cache-control': ok ? `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}` : 'no-store',
    },
  })

  if (ok) context.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
