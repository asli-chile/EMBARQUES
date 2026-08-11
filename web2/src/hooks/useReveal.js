import { useEffect, useRef, useState } from 'react'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DURATION_MS = 1400

const HIDDEN = {
  up: 'translate3d(0, 72px, 0)',
  left: 'translate3d(-64px, 0, 0)',
  right: 'translate3d(64px, 0, 0)',
  scale: 'scale(0.9)',
  fade: 'none',
}

/**
 * Reveal al scroll / al montar — animación por estilos inline.
 */
export function useReveal(variant = 'up', delay = 0) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const prefersReduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReduce(prefersReduce)

    const el = ref.current
    if (!el) return

    let observer
    let cancelled = false
    let raf2 = 0

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || !ref.current) return

        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setVisible(true)
              observer?.disconnect()
            }
          },
          { threshold: 0.05, rootMargin: '0px 0px -5% 0px' }
        )

        observer.observe(ref.current)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      observer?.disconnect()
    }
  }, [])

  const duration = reduce ? 700 : DURATION_MS
  const transform = reduce
    ? 'none'
    : visible
      ? 'translate3d(0, 0, 0) scale(1)'
      : HIDDEN[variant] || HIDDEN.up

  const style = {
    opacity: visible ? 1 : 0,
    transform,
    transition: `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms`,
    willChange: 'opacity, transform',
  }

  return { ref, visible, style, className: '' }
}

export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  className = '',
  as: Tag = 'div',
}) {
  const { ref, style } = useReveal(variant, delay)

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  )
}
