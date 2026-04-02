import { useEffect, useRef } from 'react'

const BUBBLE_COUNT = 22

export default function CursorGlow() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -200, y: -200 })
  const pos = useRef({ x: -200, y: -200 })
  const scroll = useRef({ x: 0, y: 0 })
  const rectsRef = useRef([])
  const fixedRectsRef = useRef([])
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

    // Cache des rects collidables
    const recalcRects = () => {
      const sx = window.scrollX
      const sy = window.scrollY
      const elements = document.querySelectorAll('[data-bubble-collider]')
      const pageRects = []
      const fixedRects = []

      for (const el of elements) {
        const r = el.getBoundingClientRect()
        if (el.hasAttribute('data-bubble-fixed')) {
          fixedRects.push({
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
          })
        } else {
          pageRects.push({
            left: r.left + sx,
            top: r.top + sy,
            right: r.right + sx,
            bottom: r.bottom + sy,
          })
        }
      }

      rectsRef.current = pageRects
      fixedRectsRef.current = fixedRects
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

    // Also recalc on scroll and resize
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

      // Step 3: Collision avec les rects DOM
      const pageRects = rectsRef.current
      const fixedRects = fixedRectsRef.current
      const sx = scroll.current.x
      const sy = scroll.current.y

      for (const b of bubbles) {
        let colliding = false

        const resolveCollision = (bx, by, rect) => {
          if (bx + b.radius < rect.left || bx - b.radius > rect.right ||
              by + b.radius < rect.top  || by - b.radius > rect.bottom) {
            return false
          }

          const penetrations = [
            { depth: (bx + b.radius) - rect.left,   px: -1, py: 0  },
            { depth: rect.right - (bx - b.radius),  px: 1,  py: 0  },
            { depth: (by + b.radius) - rect.top,    px: 0,  py: -1 },
            { depth: rect.bottom - (by - b.radius), px: 0,  py: 1  },
          ]

          const valid = penetrations.filter(p => p.depth > 0)
          if (valid.length === 0) return false

          valid.sort((a, c) => a.depth - c.depth)
          const escape = valid[0]

          b.x += escape.px * escape.depth
          b.y += escape.py * escape.depth

          if (escape.px !== 0) {
            b.vx *= -0.1
            b.scaleX = 0.6
            b.scaleY = 1.35
          }
          if (escape.py !== 0) {
            b.vy *= -0.1
            b.scaleY = 0.6
            b.scaleX = 1.35
          }

          return true
        }

        // Normal elements: page-space collision
        for (const rect of pageRects) {
          if (resolveCollision(b.x, b.y, rect)) colliding = true
        }

        // Fixed/sticky elements: viewport-space collision
        const viewX = b.x - sx
        const viewY = b.y - sy
        for (const rect of fixedRects) {
          if (resolveCollision(viewX, viewY, rect)) colliding = true
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
      className="bubble-cloud-canvas fixed inset-0 w-full h-full pointer-events-none z-[3]"
      aria-hidden="true"
    />
  )
}
