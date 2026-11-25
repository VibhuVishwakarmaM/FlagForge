import { AnalyticsView } from '@/components/analytics/analytics-view'
import { PageHeader } from '@/components/app/page-header'

export const metadata = { title: 'Analytics' }

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Evaluation volume, flag usage and experiment conversion." />
      <AnalyticsView />
    </>
  )
}
