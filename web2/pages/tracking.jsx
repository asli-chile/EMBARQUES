import ToolDirectoryPage from '../src/components/ToolDirectoryPage'
import Tracking from '../src/components/Tracking'
import { useLocale } from '../src/hooks/useLocale'

const TrackingPage = () => {
  const { t } = useLocale()
  const tp = t.trackingPage

  return (
    <ToolDirectoryPage
      seoTitle={tp.seoTitle}
      seoDescription={tp.seoDescription}
      seoPath="/tracking"
      heroImage="/img/container.webp"
      label={tp.label}
      titleBefore={tp.titleBefore}
      titleAccent={tp.titleAccent}
      lead={tp.lead}
      helpTitle={tp.helpTitle}
      helpBody={tp.helpBody}
      contactCta={tp.contactCta}
      mailSubject={tp.mailSubject}
    >
      <Tracking />
    </ToolDirectoryPage>
  )
}

export default TrackingPage
