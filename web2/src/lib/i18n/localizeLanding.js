/**
 * Aplica overlay de traducción sobre un landing base (landings.js).
 * @param {object} landing
 * @param {object} t diccionario del locale actual
 */
export function localizeLanding(landing, t) {
  if (!landing) return landing
  const over = t?.landings?.[landing.slug]
  if (!over) return landing
  return { ...landing, ...over }
}

/**
 * @param {object[]} related
 * @param {object} t
 */
export function localizeLandings(related, t) {
  return (related || []).map((item) => localizeLanding(item, t))
}
