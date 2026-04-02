import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 14

export default function CursorGlow() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -200, y: -200 })
  const pos = useRef({ x: -200, y: -200 })
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mql.matches
    const onMqlChange = (e) => { prefersReducedMotion.current = e.matches }
    mql.addEventListener('change', onMqlChange)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Each particle has its own orbit offset, radius, speed, opacity
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      orbitRadius: 8 + Math.random() * 35,
      speed: 0.008 + Math.random() * 0.02,
      size: 1 + Math.random() * 2.5,
      opacity: 0.08 + Math.random() * 0.15,
      // Each particle wobbles its orbit radius slightly
      wobbleSpeed: 0.003 + Math.random() * 0.008,
      wobbleAmp: 3 + Math.random() * 8,
      wobbleOffset: Math.random() * Math.PI * 2,
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

    let rafId
    let frame = 0

    const draw = () => {
      if (prefersReducedMotion.current) {
        rafId = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)
      frame++

      // Lerp the center position toward mouse
      pos.current.x += (mouse.current.x - pos.current.x) * 0.08
      pos.current.y += (mouse.current.y - pos.current.y) * 0.08

      const cx = pos.current.x
      const cy = pos.current.y

      for (const p of particles) {
        p.angle += p.speed
        const wobble = Math.sin(frame * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmp
        const r = p.orbitRadius + wobble
        const px = cx + Math.cos(p.angle) * r
        const py = cy + Math.sin(p.angle) * r

        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity})`
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resize)
      mql.removeEventListener('change', onMqlChange)
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
