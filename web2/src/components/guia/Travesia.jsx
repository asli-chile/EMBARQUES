import { useEffect, useRef } from 'react'
import s from './Guia.module.css'
import { Fuentes } from './Fuente'

/**
 * "La travesía": el barco recorre la ruta a medida que se hace scroll y cada
 * paso de la exportación es una recalada.
 *
 * Viene de oficina-agentes/web-asli/v3-fluida (trazar/mover), llevado a React:
 * - la ruta se traza con la posición real de cada paso y se vuelve a trazar
 *   cuando cambia el alto (fotos que cargan, cambio de ancho);
 * - el scroll solo mueve el barco y el tramo recorrido (transform y
 *   stroke-dashoffset, un requestAnimationFrame por frame);
 * - los pasos aparecen una vez al entrar en pantalla y quedan quietos;
 * - con reduced motion la ruta queda dibujada completa y sin barco.
 */
export default function Travesia({ pasos }) {
  const contRef = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => {
    const cont = contRef.current
    const svg = svgRef.current
    if (!cont || !svg) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    cont.classList.add(s.conJs)

    const rutaCol = cont.querySelector('[data-ruta-col]')
    const caminos = [...svg.querySelectorAll('[data-camino]')]
    const hecha = svg.querySelector('[data-camino="hecha"]')
    const brillo = svg.querySelector('[data-camino="brillo"]')
    const barco = svg.querySelector('[data-barco]')
    const puntos = [...svg.querySelectorAll('[data-recalada]')]
    const articulos = [...cont.querySelectorAll('[data-paso]')]
    let muestras = []
    let largo = 0
    let marcas = []
    let raf = 0

    function trazar() {
      const W = rutaCol.clientWidth
      const H = cont.offsetHeight
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      const angosto = W < 60
      const xa = angosto ? W * 0.32 : W * 0.28
      const xb = angosto ? W * 0.68 : W * 0.72
      // la ruta parte bajo el título: así el barco no tapa el texto al inicio
      const inicio = 56
      let x = xa
      let y = inicio
      let d = `M ${x} ${inicio}`
      marcas = []
      articulos.forEach((art, i) => {
        // ancla: la altura del número del paso
        const yp = art.offsetTop + Math.min(64, art.offsetHeight / 2)
        const nx = i % 2 ? xb : xa
        if (i === 0) d += ` L ${x} ${yp}`
        else {
          const ym = (y + yp) / 2
          d += ` C ${x} ${ym} ${nx} ${ym} ${nx} ${yp}`
          x = nx
        }
        y = yp
        marcas.push({ x, y })
      })
      d += ` L ${x} ${H}`
      caminos.forEach((c) => c.setAttribute('d', d))
      puntos.forEach((p, i) => {
        if (!marcas[i]) return
        p.setAttribute('cx', marcas[i].x)
        p.setAttribute('cy', marcas[i].y)
      })
      largo = hecha.getTotalLength()
      ;[hecha, brillo].forEach((c) => {
        c.style.strokeDasharray = `${largo} ${largo}`
      })
      muestras = []
      for (let l = 0; l <= largo; l += 4) {
        const p = hecha.getPointAtLength(l)
        muestras.push([l, p.x, p.y])
      }
      barco.style.display = reduce ? 'none' : ''
      mover()
    }

    function mover() {
      raf = 0
      if (!muestras.length) return
      const top = cont.getBoundingClientRect().top
      const objetivo = reduce ? Infinity : window.innerHeight * 0.5 - top
      // la ruta siempre baja: búsqueda binaria por y
      let lo = 0
      let hi = muestras.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (muestras[mid][2] < objetivo) lo = mid + 1
        else hi = mid
      }
      const [l, x, y] = muestras[lo]
      const p2 = hecha.getPointAtLength(Math.min(largo, l + 4))
      const ang = (Math.atan2(p2.y - y, p2.x - x) * 180) / Math.PI
      const escala = rutaCol.clientWidth < 60 ? 0.5 : 0.95
      barco.setAttribute('transform', `translate(${x} ${y}) rotate(${ang}) scale(${escala})`)
      ;[hecha, brillo].forEach((c) => {
        c.style.strokeDashoffset = `${largo - l}`
      })
      puntos.forEach((p, i) => {
        const llego = marcas[i] && marcas[i].y <= y + 1
        p.classList.toggle(s.recaladaHecha, Boolean(llego))
      })
    }

    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(mover)
    }

    trazar()
    const ro = new ResizeObserver(() => trazar())
    ro.observe(cont)
    if (!reduce) {
      window.addEventListener('scroll', pedir, { passive: true })
    }

    // pasos: aparecen una vez y quedan quietos
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add(s.visto)
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    )
    articulos.forEach((a) => io.observe(a))

    // el vaivén del barco solo corre con la sección en pantalla
    const ioVista = new IntersectionObserver(([e]) => {
      cont.classList.toggle(s.enVista, e.isIntersecting)
    })
    ioVista.observe(cont)

    return () => {
      window.removeEventListener('scroll', pedir)
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      ioVista.disconnect()
    }
  }, [pasos])

  return (
    <div ref={contRef} className={s.recorrido}>
      <div className={s.rutaCol} data-ruta-col aria-hidden="true">
        <svg ref={svgRef} className={s.rutaSvg} preserveAspectRatio="none">
          <defs>
            <filter id="ruta-brillo" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <path
            data-camino="pendiente"
            fill="none"
            stroke="#9FB6CC"
            strokeOpacity=".45"
            strokeWidth="2.5"
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          <path data-camino="brillo" fill="none" stroke="#2EF2C8" strokeOpacity=".5" strokeWidth="7" filter="url(#ruta-brillo)" />
          <path data-camino="hecha" fill="none" stroke="#2EF2C8" strokeWidth="3" strokeLinecap="round" />
          {pasos.map((p) => (
            <circle key={p.recalada} data-recalada r="7" className={s.recalada} />
          ))}
          <g data-barco>
            <g className={s.ola}>
              <ellipse cx="-46" cy="0" rx="26" ry="9" fill="#fff" opacity=".3" />
              <g transform="translate(-40 -14)">
                <path d="M2 14 Q2 2 14 2 H66 L80 14 L66 26 H14 Q2 26 2 14 Z" fill="#11224E" stroke="#fff" strokeWidth="2" />
                <rect x="14" y="6" width="10" height="7" rx="1" fill="#2EF2C8" />
                <rect x="25" y="6" width="10" height="7" rx="1" fill="#7DB800" />
                <rect x="36" y="6" width="10" height="7" rx="1" fill="#F6EEE8" />
                <rect x="47" y="6" width="6" height="7" rx="1" fill="#38BDF8" />
                <rect x="14" y="15" width="10" height="7" rx="1" fill="#E4573D" />
                <rect x="25" y="15" width="10" height="7" rx="1" fill="#007A7B" />
                <rect x="36" y="15" width="10" height="7" rx="1" fill="#38BDF8" />
                <rect x="47" y="15" width="6" height="7" rx="1" fill="#F6EEE8" />
                <rect x="56" y="7" width="8" height="14" rx="2" fill="#FFFDFB" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <ol className={s.pasos}>
        {pasos.map((paso, i) => (
          <li key={paso.recalada} data-paso className={s.paso}>
            <div>
              <p className={`${s.pasoNumero} ${s.mono}`}>
                {String(i + 1).padStart(2, '0')} · {paso.recalada}
              </p>
              <h3 className={s.pasoTitulo}>{paso.titulo}</h3>
              {paso.texto.map((t, j) => (
                <p key={j} className={s.pasoTexto}>
                  {t}
                  {j === paso.texto.length - 1 ? <Fuentes numeros={paso.fuentes} /> : null}
                </p>
              ))}
            </div>
            {paso.foto ? (
              <figure className={s.pasoFoto}>
                <img src={paso.foto} alt={paso.fotoAlt} width={720} height={480} loading="lazy" decoding="async" />
              </figure>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
