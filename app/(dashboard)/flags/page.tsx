import { Suspense } from 'react'
import { PageHeader } from '@/components/app/page-header'
import { TableSkeleton } from '@/components/app/states'
import { FlagsTable } from '@/components/flags/flags-table'

export const metadata = { title: 'Feature Flags' }

export default function FlagsPage() {
  return (
    <>
      <PageHeader title="Feature Flags" description="Create, target and roll out features without redeploying." />
      <Suspense fallback={<TableSkeleton />}>
        <FlagsTable />
      </Suspense>
    </>
  )
}
