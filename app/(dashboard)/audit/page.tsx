import { PageHeader } from '@/components/app/page-header'
import { AuditLogTable } from '@/components/audit/audit-log-table'

export const metadata = { title: 'Audit Logs' }

export default function AuditPage() {
  return (
    <>
      <PageHeader title="Audit Logs" description="Every change made in this workspace, who made it and when." />
      <AuditLogTable />
    </>
  )
}
