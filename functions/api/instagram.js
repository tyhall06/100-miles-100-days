// Cloudflare Pages Function — cached proxy for the Behold Instagram feed.
//
// WHY: the site used to fetch Behold directly on every Home/Community page
// load. With statewide traffic that blew Behold's free monthly view cap. Here
// the subrequest to Behold is cached at Cloudflare's edge (cf.cacheTtl) for
// CACHE_TTL seconds, so Behold is hit at most once per window per edge location
// no matter how many visitors load the page.
//
// Served at:  /api/instagram   (the InstagramFeed component fetches this)

const FALLBACK_FEED_ID = 'YcAFUdHFHAb61hXirByX'
const CACHE_TTL = 21600 // seconds (6 hours). Increase to hit Behold even less.

export async function onRequest(context) {
  const feedId = (context.env && context.env.VITE_BEHOLD_FEED_ID) || FALLBACK_FEED_ID

  let body = '{"posts":[]}'
  let ok = false
  try {
    const upstream = await fetch(`https://feeds.behold.so/${feedId}`, {
      headers: { accept: 'application/json' },
      // Cloudflare caches this subrequest at the edge — the real Behold call
      // only happens on a cache miss (≈ once per CACHE_TTL per location).
      cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
    })
    if (upstream.ok) { body = await upstream.text(); ok = true }
  } catch (e) {
    // network/Behold error — fall through with the empty payload
  }

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': ok ? `public, max-age=${CACHE_TTL}` : 'no-store',
    },
  })
}
