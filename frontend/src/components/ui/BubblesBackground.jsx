import { useEffect, useRef } from 'react'

const BUBBLE_COUNT = 55
const AMBER = [245, 158, 11]

function createBubble(canvasWidth, canvasHeight) {
  return {
    x: Math.random() * canvasWidth,
    y: canvasHeight + Math.random() * canvasHeight,
    radius: 0.8 + Math.random() * 2.2,
    speed: 0.15 + Math.random() * 0.35,
    opacity: 0.05 + Math.random() * 0.1,
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.005 + Math.random() * 0.01,
    wobbleAmp: 15 + Math.random() * 25,
  }
}

export default function BubblesBackground() {
  const canvasRef = useRef(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mql.matches
    const onChange = (e) => { prefersReducedMotion.current = e.matches }
    mql.addEventListener('change', onChange)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    let bubbles = []

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      if (bubbles.length === 0) {
        bubbles = Array.from({ length: BUBBLE_COUNT }, () => createBubble(w, h))
      }
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    let rafId
    let frame = 0

    const draw = () => {
      if (prefersReducedMotion.current) {
        rafId = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)
      frame++

      for (const b of bubbles) {
        b.y -= b.speed
        const wobbleX = Math.sin(frame * b.wobbleSpeed + b.wobbleOffset) * b.wobbleAmp * 0.02

        if (b.y + b.radius < 0) {
          b.y = h + b.radius
          b.x = Math.random() * w
        }

        ctx.beginPath()
        ctx.arc(b.x + wobbleX, b.y, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${AMBER[0]}, ${AMBER[1]}, ${AMBER[2]}, ${b.opacity})`
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      mql.removeEventListener('change', onChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
