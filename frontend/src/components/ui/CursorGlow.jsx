import { useEffect, useRef } from 'react'

const BUBBLE_COUNT = 22

export default function CursorGlow() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -200, y: -200 })
  const pos = useRef({ x: -200, y: -200 })
  const rectsRef = useRef([])
  const lastRecalc = useRef(0)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mql.matches
    const onMqlChange = (e) => { prefersReducedMotion.current = e.matches }
    mql.addEventListener('change', onMqlChange)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Initialiser les bulles
    const bubbles = Array.from({ length: BUBBLE_COUNT }, () => ({
      x: -200,
      y: -200,
      vx: 0,
      vy: 0,
      radius: 1.5 + Math.random() * 2.5,
      opacity: 0.08 + Math.random() * 0.15,
      scaleX: 1,
      scaleY: 1,
    }))

    let w, h
    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Cache des rects collidables
    const recalcRects = () => {
      const now = performance.now()
      if (now - lastRecalc.current < 100) return
      lastRecalc.current = now
      const elements = document.querySelectorAll('[data-bubble-collider]')
      rectsRef.current = Array.from(elements).map(el => {
        const r = el.getBoundingClientRect()
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      })
    }

    recalcRects()
    const onScroll = () => requestAnimationFrame(recalcRects)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', recalcRects, { passive: true })

    let rafId

    const draw = () => {
      if (prefersReducedMotion.current) {
        rafId = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      // Lerp du centre vers la souris
      pos.current.x += (mouse.current.x - pos.current.x) * 0.08
      pos.current.y += (mouse.current.y - pos.current.y) * 0.08

      const cx = pos.current.x
      const cy = pos.current.y

      // Step 1: Attraction vers le curseur
      for (const b of bubbles) {
        const dx = cx - b.x
        const dy = cy - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0.1) {
          const force = 0.02
          b.vx += (dx / dist) * force
          b.vy += (dy / dist) * force
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

      // Step 3: Collision avec les rects DOM
      const rects = rectsRef.current
      for (const b of bubbles) {
        let colliding = false

        for (const rect of rects) {
          const closestX = Math.max(rect.left, Math.min(b.x, rect.right))
          const closestY = Math.max(rect.top, Math.min(b.y, rect.bottom))
          const distX = b.x - closestX
          const distY = b.y - closestY
          const dist = Math.sqrt(distX * distX + distY * distY)

          if (dist < b.radius) {
            colliding = true

            const overlapLeft   = b.x + b.radius - rect.left
            const overlapRight  = rect.right - (b.x - b.radius)
            const overlapTop    = b.y + b.radius - rect.top
            const overlapBottom = rect.bottom - (b.y - b.radius)

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

            if (minOverlap === overlapLeft) {
              b.x = rect.left - b.radius
              b.vx = Math.min(b.vx, 0)
              b.scaleX = 0.65; b.scaleY = 1.3
            } else if (minOverlap === overlapRight) {
              b.x = rect.right + b.radius
              b.vx = Math.max(b.vx, 0)
              b.scaleX = 0.65; b.scaleY = 1.3
            } else if (minOverlap === overlapTop) {
              b.y = rect.top - b.radius
              b.vy = Math.min(b.vy, 0)
              b.scaleY = 0.65; b.scaleX = 1.3
            } else {
              b.y = rect.bottom + b.radius
              b.vy = Math.max(b.vy, 0)
              b.scaleY = 0.65; b.scaleX = 1.3
            }
          }
        }

        // Récupération vers forme ronde
        if (!colliding) {
          b.scaleX += (1 - b.scaleX) * 0.1
          b.scaleY += (1 - b.scaleY) * 0.1
        }

        // Step 4: Damping + mise à jour position
        b.vx *= 0.92
        b.vy *= 0.92
        b.x += b.vx
        b.y += b.vy

        // Step 5: Bruit de cohésion
        b.vx += (Math.random() - 0.5) * 0.15
        b.vy += (Math.random() - 0.5) * 0.15
      }

      // Rendu
      for (const b of bubbles) {
        ctx.beginPath()
        ctx.save()
        ctx.translate(b.x, b.y)
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
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="bubble-cloud-canvas fixed inset-0 w-full h-full pointer-events-none z-[3]"
      aria-hidden="true"
    />
  )
}
