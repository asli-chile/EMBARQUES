import s from './Guia.module.css'

/** Marca de fuente: [3] enlazada a la lista de fuentes al final de la guía. */
export function Fuentes({ numeros }) {
  if (!numeros || !numeros.length) return null
  return (
    <>
      {numeros.map((n) => (
        <a key={n} href={`#fuente-${n}`} className={`${s.sup} ${s.mono}`} aria-label={`Fuente ${n}`}>
          [{n}]
        </a>
      ))}
    </>
  )
}
