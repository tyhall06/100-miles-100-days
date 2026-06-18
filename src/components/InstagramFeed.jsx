import { useState, useEffect } from 'react'

// Live Instagram feed via Behold.so (free, no API keys in the browser).
//
// Setup (one-time, by an admin):
//   1. Go to behold.so, sign up (free), connect the @MUExtension100Miles
//      Instagram **Business/Creator** account.
//   2. Create a feed; copy its Feed ID.
//   3. In Cloudflare Pages → Settings → Environment variables, add
//        VITE_BEHOLD_FEED_ID = <that id>
//      then redeploy. (Vite env vars are baked in at build time.)
//
// Until VITE_BEHOLD_FEED_ID is set, this renders the placeholder grid so the
// page never looks broken.

// Served by the Cloudflare Pages Function at functions/api/instagram.js, which
// fetches Behold a few times a day and caches it — so Behold isn't hit on every
// page load (that blew the free-tier view cap). Falls back to placeholders if
// the endpoint isn't available (e.g. local `npm run dev`).
const FEED_ENDPOINT = '/api/instagram'

function postImage(p) {
  return (
    p?.sizes?.small?.mediaUrl ||
    p?.sizes?.medium?.mediaUrl ||
    p?.mediaUrl ||
    p?.thumbnailUrl ||
    null
  )
}

export default function InstagramFeed({
  count = 6,
  gridClassName,
  tileClassName,
  placeholderClassName = 'bg-gray-100',
  placeholderIcon = null,
  emptyNote = null,
  emptyNoteClassName = 'text-xs text-gray-400',
}) {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let active = true
    fetch(FEED_ENDPOINT)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!active) return
        const list = Array.isArray(data) ? data : (data.posts || data.data || [])
        setPosts(list.filter(postImage).slice(0, count))
      })
      .catch((e) => console.error('Instagram feed:', e))
    return () => { active = false }
  }, [count])

  const hasPosts = posts.length > 0

  return (
    <>
      <div className={gridClassName}>
        {hasPosts
          ? posts.map((p) => (
              <a
                key={p.id || p.permalink}
                href={p.permalink || 'https://instagram.com/MUExtension100Miles'}
                target="_blank"
                rel="noopener noreferrer"
                className={`${tileClassName} block overflow-hidden group`}
                title={p.caption ? p.caption.slice(0, 80) : 'View on Instagram'}
              >
                <img
                  src={postImage(p)}
                  alt={p.caption ? p.caption.slice(0, 100) : 'Instagram post from @MUExtension100Miles'}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))
          : Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className={`${tileClassName} ${placeholderClassName} flex items-center justify-center`}
              >
                {placeholderIcon}
              </div>
            ))}
      </div>
      {!hasPosts && emptyNote && <p className={emptyNoteClassName}>{emptyNote}</p>}
    </>
  )
}
