import ToolDirectoryPage from '../src/components/ToolDirectoryPage'
import Stacking from '../src/components/Stacking'
import { useLocale } from '../src/hooks/useLocale'

const StackingPage = () => {
  const { t } = useLocale()
  const tp = t.stackingPage

  return (
    <ToolDirectoryPage
      seoTitle={tp.seoTitle}
      seoDescription={tp.seoDescription}
      seoPath="/stacking"
      heroImage="/img/docs.webp"
      label={tp.label}
      titleBefore={tp.titleBefore}
      titleAccent={tp.titleAccent}
      lead={tp.lead}
      helpTitle={tp.helpTitle}
      helpBody={tp.helpBody}
      contactCta={tp.contactCta}
      mailSubject={tp.mailSubject}
    >
      <Stacking />
    </ToolDirectoryPage>
  )
}

export default StackingPage
