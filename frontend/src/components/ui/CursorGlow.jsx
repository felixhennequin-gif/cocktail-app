import { useEffect, useRef } from 'react'

const BUBBLE_COUNT = 22

export default function CursorGlow() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -200, y: -200 })
  const pos = useRef({ x: -200, y: -200 })
  const scroll = useRef({ x: 0, y: 0 })
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
    }))

    let firstMove = true

    let w, h
    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Mouse en page coordinates
    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX + window.scrollX
      mouse.current.y = e.clientY + window.scrollY
      if (firstMove) {
        firstMove = false
        pos.current.x = mouse.current.x
        pos.current.y = mouse.current.y
        for (const b of bubbles) {
          b.x = mouse.current.x + (Math.random() - 0.5) * 40
          b.y = mouse.current.y + (Math.random() - 0.5) * 40
        }
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Cache des rects collidables (en page-space)
    const recalcRects = () => {
      const now = performance.now()
      if (now - lastRecalc.current < 100) return
      lastRecalc.current = now
      const sx = window.scrollX
      const sy = window.scrollY
      const elements = document.querySelectorAll('[data-bubble-collider]')
      rectsRef.current = Array.from(elements).map(el => {
        const r = el.getBoundingClientRect()
        return {
          left: r.left + sx,
          top: r.top + sy,
          right: r.right + sx,
          bottom: r.bottom + sy,
        }
      })
    }

    recalcRects()
    const onScroll = () => {
      scroll.current.x = window.scrollX
      scroll.current.y = window.scrollY
      requestAnimationFrame(recalcRects)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', recalcRects, { passive: true })

    let rafId

    const draw = () => {
      if (prefersReducedMotion.current) {
        rafId = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      // Mise à jour scroll ref chaque frame
      scroll.current.x = window.scrollX
      scroll.current.y = window.scrollY

      // Lerp du centre vers la souris (page-space)
      pos.current.x += (mouse.current.x - pos.current.x) * 0.25
      pos.current.y += (mouse.current.y - pos.current.y) * 0.25

      const cx = pos.current.x
      const cy = pos.current.y

      // Step 1: Attraction vers le curseur — force proportionnelle à la distance
      for (const b of bubbles) {
        const dx = cx - b.x
        const dy = cy - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0.5) {
          const strength = Math.min(dist * 0.004, 2.0)
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

      // Step 3: Collision avec les rects DOM (page-space)
      const rects = rectsRef.current
      for (const b of bubbles) {
        let colliding = false

        for (const rect of rects) {
          // Skip if bubble is clearly outside (broad phase)
          if (b.x + b.radius < rect.left || b.x - b.radius > rect.right ||
              b.y + b.radius < rect.top  || b.y - b.radius > rect.bottom) {
            continue
          }

          colliding = true

          // Find minimum penetration axis
          const penetrations = [
            { axis: 'left',   depth: (b.x + b.radius) - rect.left,   pushX: -1, pushY: 0  },
            { axis: 'right',  depth: rect.right - (b.x - b.radius),  pushX: 1,  pushY: 0  },
            { axis: 'top',    depth: (b.y + b.radius) - rect.top,     pushX: 0,  pushY: -1 },
            { axis: 'bottom', depth: rect.bottom - (b.y - b.radius),  pushX: 0,  pushY: 1  },
          ]

          // Only consider positive penetrations (actual overlaps)
          const valid = penetrations.filter(p => p.depth > 0)
          if (valid.length === 0) continue

          // Pick smallest penetration — that's the cheapest escape direction
          valid.sort((a, c) => a.depth - c.depth)
          const escape = valid[0]

          // Push bubble out
          b.x += escape.pushX * escape.depth
          b.y += escape.pushY * escape.depth

          // Kill velocity in the collision direction + slight bounce
          if (escape.pushX !== 0) {
            b.vx *= -0.1
            b.scaleX = 0.6
            b.scaleY = 1.35
          }
          if (escape.pushY !== 0) {
            b.vy *= -0.1
            b.scaleY = 0.6
            b.scaleX = 1.35
          }
        }

        // Recovery toward round shape when not colliding
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
        b.vx += (Math.random() - 0.5) * 0.12
        b.vy += (Math.random() - 0.5) * 0.12
      }

      // Rendu — conversion page-space → viewport-space
      const sx = scroll.current.x
      const sy = scroll.current.y
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
