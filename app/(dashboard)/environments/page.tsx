import { PageHeader } from '@/components/app/page-header'
import { EnvironmentsView } from '@/components/environments/environments-view'

export const metadata = { title: 'Environments' }

export default function EnvironmentsPage() {
  return (
    <>
      <PageHeader title="Environments" description="Isolated flag configurations for each stage of your delivery pipeline." />
      <EnvironmentsView />
    </>
  )
}
