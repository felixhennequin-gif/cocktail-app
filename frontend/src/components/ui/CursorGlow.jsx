import { useEffect, useRef } from 'react'

const BUBBLE_COUNT = 22

export default function CursorGlow() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -200, y: -200 })
  const pos = useRef({ x: -200, y: -200 })
  const scroll = useRef({ x: 0, y: 0 })
  const rectsRef = useRef([])
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mql.matches
    const onMqlChange = (e) => { prefersReducedMotion.current = e.matches }
    mql.addEventListener('change', onMqlChange)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Initialiser les bulles (positions en page-space)
    const bubbles = Array.from({ length: BUBBLE_COUNT }, () => ({
      x: -200,
      y: -200,
      vx: 0,
      vy: 0,
      radius: 1.5 + Math.random() * 2.5,
      opacity: 0.08 + Math.random() * 0.15,
      scaleX: 1,
      scaleY: 1,
      speedMult: 0.6 + Math.random() * 0.8,
      noiseMult: 0.5 + Math.random() * 1.5,
    }))

    let firstMove = true
    const mountTime = performance.now()

    // Cache header height for hard clamp
    let headerHeight = 0
    const headerEl = document.querySelector('[data-bubble-fixed]')
    if (headerEl) headerHeight = headerEl.getBoundingClientRect().height

    let w, h
    const resize = () => {
      const cw = document.documentElement.clientWidth
      const ch = document.documentElement.clientHeight
      canvas.width = cw
      canvas.height = ch
      canvas.style.width = cw + 'px'
      canvas.style.height = ch + 'px'
      w = cw
      h = ch
      if (headerEl) headerHeight = headerEl.getBoundingClientRect().height
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Mouse en viewport coordinates (converti en page-space chaque frame)
    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      if (firstMove) {
        firstMove = false
        const pageX = e.clientX + window.scrollX
        const pageY = e.clientY + window.scrollY
        pos.current.x = pageX
        pos.current.y = pageY
        for (const b of bubbles) {
          b.x = pageX + (Math.random() - 0.5) * 40
          b.y = pageY + (Math.random() - 0.5) * 40
        }
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Cache des rects collidables (page-space, excluding fixed elements)
    const recalcRects = () => {
      const sx = window.scrollX
      const sy = window.scrollY
      const elements = document.querySelectorAll('[data-bubble-collider]:not([data-bubble-fixed])')
      rectsRef.current = Array.from(elements).map(el => {
        const r = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        const br = parseFloat(style.borderTopLeftRadius) || 0
        return {
          left: r.left + sx,
          top: r.top + sy,
          right: r.right + sx,
          bottom: r.bottom + sy,
          radius: Math.min(br, (r.right - r.left) / 2, (r.bottom - r.top) / 2),
        }
      })
    }

    // Initial calc + periodic recalc for async-loaded content
    recalcRects()
    const startupInterval = setInterval(recalcRects, 500)
    setTimeout(() => clearInterval(startupInterval), 3000)

    // MutationObserver: recalc when DOM changes (new cards rendered, etc.)
    let mutationTimer = null
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer)
      mutationTimer = setTimeout(recalcRects, 200)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Scroll and resize
    const onScroll = () => {
      scroll.current.x = window.scrollX
      scroll.current.y = window.scrollY
      requestAnimationFrame(recalcRects)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', recalcRects, { passive: true })

    let rafId

    const draw = () => {
      if (prefersReducedMotion.current || firstMove) {
        rafId = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      // Mise à jour scroll ref chaque frame
      scroll.current.x = window.scrollX
      scroll.current.y = window.scrollY
      const sx = scroll.current.x
      const sy = scroll.current.y

      // Aggressive rect recalc during first 2 seconds (catch scroll-reveal animations)
      if (performance.now() - mountTime < 2000) {
        recalcRects()
      }

      // Convert viewport mouse to page-space every frame (handles scroll-without-mousemove)
      const mousePageX = mouse.current.x + sx
      const mousePageY = mouse.current.y + sy
      pos.current.x += (mousePageX - pos.current.x) * 0.25
      pos.current.y += (mousePageY - pos.current.y) * 0.25

      const cx = pos.current.x
      const cy = pos.current.y

      // Step 1: Attraction vers le curseur — force proportionnelle à la distance
      for (const b of bubbles) {
        const dx = cx - b.x
        const dy = cy - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0.5) {
          const strength = Math.min(dist * 0.004, 2.0) * b.speedMult
          b.vx += (dx / dist) * strength
          b.vy += (dy / dist) * strength
        }
      }

      // Step 2: Séparation inter-bulles
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const dx = bubbles[j].x - bubbles[i].x
          const dy = bubbles[j].y - bubbles[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = bubbles[i].radius + bubbles[j].radius + 4
          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / dist * 0.3
            bubbles[i].x -= dx * overlap
            bubbles[i].y -= dy * overlap
            bubbles[j].x += dx * overlap
            bubbles[j].y += dy * overlap
          }
        }
      }

      // Step 3: Collision avec les rects DOM (page-space, with rounded corners)
      const rects = rectsRef.current
      for (const b of bubbles) {
        let colliding = false

        for (const rect of rects) {
          // Broad phase AABB
          if (b.x + b.radius < rect.left || b.x - b.radius > rect.right ||
              b.y + b.radius < rect.top  || b.y - b.radius > rect.bottom) {
            continue
          }

          const br = rect.radius || 0

          // Check if bubble is in a corner zone
          const inLeftZone   = b.x < rect.left + br
          const inRightZone  = b.x > rect.right - br
          const inTopZone    = b.y < rect.top + br
          const inBottomZone = b.y > rect.bottom - br

          const inCorner = (inLeftZone || inRightZone) && (inTopZone || inBottomZone)

          if (inCorner && br > 0) {
            // Corner collision: test against the corner circle
            const cornerX = inLeftZone ? rect.left + br : rect.right - br
            const cornerY = inTopZone  ? rect.top + br  : rect.bottom - br

            const dx = b.x - cornerX
            const dy = b.y - cornerY
            const dist = Math.sqrt(dx * dx + dy * dy)
            const minDist = br + b.radius

            if (dist < minDist && dist > 0.01) {
              colliding = true
              const pushDist = minDist - dist
              const nx = dx / dist
              const ny = dy / dist
              b.x += nx * pushDist
              b.y += ny * pushDist

              const absNx = Math.abs(nx)
              const absNy = Math.abs(ny)
              if (absNx > absNy) {
                b.scaleX = 0.65; b.scaleY = 1.3
                b.vx *= -0.1
              } else {
                b.scaleY = 0.65; b.scaleX = 1.3
                b.vy *= -0.1
              }
            }
          } else if (!inCorner) {
            // Edge/center zone: standard AABB min-penetration
            colliding = true

            const penetrations = [
              { depth: (b.x + b.radius) - rect.left,   px: -1, py: 0  },
              { depth: rect.right - (b.x - b.radius),  px: 1,  py: 0  },
              { depth: (b.y + b.radius) - rect.top,    px: 0,  py: -1 },
              { depth: rect.bottom - (b.y - b.radius),  px: 0,  py: 1  },
            ]

            const valid = penetrations.filter(p => p.depth > 0)
            if (valid.length === 0) continue
            valid.sort((a, c) => a.depth - c.depth)
            const escape = valid[0]

            b.x += escape.px * escape.depth
            b.y += escape.py * escape.depth

            if (escape.px !== 0) { b.vx *= -0.1; b.scaleX = 0.6; b.scaleY = 1.35 }
            if (escape.py !== 0) { b.vy *= -0.1; b.scaleY = 0.6; b.scaleX = 1.35 }
          }
        }

        // Recovery toward round shape
        if (!colliding) {
          b.scaleX += (1 - b.scaleX) * 0.12
          b.scaleY += (1 - b.scaleY) * 0.12
        }

        // Step 4: Damping + position update
        b.vx *= 0.85
        b.vy *= 0.85
        b.x += b.vx
        b.y += b.vy

        // Step 5: Cohesion noise
        b.vx += (Math.random() - 0.5) * 0.12 * b.noiseMult
        b.vy += (Math.random() - 0.5) * 0.12 * b.noiseMult
      }

      // Viewport boundary clamp (header + edges)
      for (const b of bubbles) {
        const viewX = b.x - sx
        const viewY = b.y - sy

        // Header hard clamp
        if (headerHeight > 0 && viewY < headerHeight + b.radius + 3) {
          b.y = sy + headerHeight + b.radius + 4
          if (b.vy < 0) b.vy = 0
        }
        // Bottom
        if (viewY > h - b.radius) {
          b.y = sy + h - b.radius
          if (b.vy > 0) b.vy = 0
        }
        // Left
        if (viewX < b.radius) {
          b.x = sx + b.radius
          if (b.vx < 0) b.vx = 0
        }
        // Right
        if (viewX > w - b.radius) {
          b.x = sx + w - b.radius
          if (b.vx > 0) b.vx = 0
        }
      }

      // Rendu — conversion page-space → viewport-space
      for (const b of bubbles) {
        const screenX = b.x - sx
        const screenY = b.y - sy

        if (screenX < -50 || screenX > w + 50 || screenY < -50 || screenY > h + 50) continue

        ctx.beginPath()
        ctx.save()
        ctx.translate(screenX, screenY)
        ctx.scale(b.scaleX, b.scaleY)
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 158, 11, ${b.opacity})`
        ctx.fill()
        ctx.restore()
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', recalcRects)
      mql.removeEventListener('change', onMqlChange)
      observer.disconnect()
      clearInterval(startupInterval)
      clearTimeout(mutationTimer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="bubble-cloud-canvas fixed top-0 left-0 pointer-events-none z-[3]"
      aria-hidden="true"
    />
  )
}
