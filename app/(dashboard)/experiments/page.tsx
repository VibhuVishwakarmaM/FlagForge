import { Suspense } from 'react'
import { PageHeader } from '@/components/app/page-header'
import { ExperimentsList } from '@/components/experiments/experiments-list'

export const metadata = { title: 'Experiments' }

export default function ExperimentsPage() {
  return (
    <>
      <PageHeader title="Experiments" description="A/B test flag variants and compare conversion against a baseline." />
      <Suspense>
        <ExperimentsList />
      </Suspense>
    </>
  )
}
