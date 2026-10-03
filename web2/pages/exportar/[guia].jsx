import GuiaPage from '../../src/components/guia/GuiaPage'
import { getGuia, guiaSlugs } from '../../src/data/guias'

export async function getStaticPaths() {
  return {
    paths: guiaSlugs.map((guia) => ({ params: { guia } })),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const guia = getGuia(params.guia)
  if (!guia) return { notFound: true }
  return { props: { guia } }
}

export default function GuiaSlugPage({ guia }) {
  return <GuiaPage guia={guia} />
}
