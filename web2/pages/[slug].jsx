import ServiceLanding from '../src/components/ServiceLanding'
import { getLanding, landingSlugs } from '../src/data/landings'

export async function getStaticPaths() {
  return {
    paths: landingSlugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const landing = getLanding(params.slug)
  if (!landing) {
    return { notFound: true }
  }
  return { props: { landing } }
}

export default function LandingSlugPage({ landing }) {
  return <ServiceLanding landing={landing} />
}
