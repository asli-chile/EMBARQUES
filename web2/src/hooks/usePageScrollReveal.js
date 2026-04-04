import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * Entrada del hero (stagger), parallax opcional en capa de fondo y reveals por sección al hacer scroll (viewport / window).
 * Atributos: [data-hero-item], [data-page-section] > [data-page-reveal]
 */
export function usePageScrollReveal(parallaxRef) {
  const rootRef = useRef(null)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const root = rootRef.current
    if (!root) return

    const ctx = gsap.context(() => {
      const heroItems = root.querySelectorAll('[data-hero-item]')
      if (heroItems.length) {
        gsap.set(heroItems, { autoAlpha: 0, y: 36 })
        gsap.to(heroItems, {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.12,
          ease: 'power3.out',
          delay: 0.06,
        })
      }

      const parallaxEl = parallaxRef?.current
      if (parallaxEl) {
        gsap.to(parallaxEl, {
          y: 72,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.55,
          },
        })
      }

      root.querySelectorAll('[data-page-section]').forEach((section) => {
        const items = section.querySelectorAll('[data-page-reveal]')
        if (!items.length) return
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 44 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 86%',
              toggleActions: 'play none none none',
            },
          },
        )
      })
    }, root)

    return () => ctx.revert()
  }, [parallaxRef])

  return rootRef
}
