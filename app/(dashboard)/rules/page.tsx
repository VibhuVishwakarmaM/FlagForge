import { Suspense } from 'react'
import { PageHeader } from '@/components/app/page-header'
import { RulesList } from '@/components/rules/rules-list'

export const metadata = { title: 'Targeting Rules' }

export default function RulesPage() {
  return (
    <>
      <PageHeader title="Targeting Rules" description="Reusable user segments built from attribute conditions." />
      <Suspense>
        <RulesList />
      </Suspense>
    </>
  )
}
