import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef(null)
  const mouse = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: 0, y: 0 })
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mql.matches
    const onChange = (e) => { prefersReducedMotion.current = e.matches }
    mql.addEventListener('change', onChange)

    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }

    let rafId
    const lerp = (a, b, t) => a + (b - a) * t

    const animate = () => {
      if (!prefersReducedMotion.current && glowRef.current) {
        pos.current.x = lerp(pos.current.x, mouse.current.x, 0.12)
        pos.current.y = lerp(pos.current.y, mouse.current.y, 0.12)
        glowRef.current.style.transform =
          `translate(${pos.current.x - 90}px, ${pos.current.y - 90}px)`
      }
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
      mql.removeEventListener('change', onChange)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="cursor-glow"
      aria-hidden="true"
    />
  )
}
