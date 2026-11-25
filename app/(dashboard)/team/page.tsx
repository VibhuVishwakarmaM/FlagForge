import { PageHeader } from '@/components/app/page-header'
import { TeamView } from '@/components/team/team-view'

export const metadata = { title: 'Team & Access' }

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team & Access" description="Manage who can view and change flags with role-based access." />
      <TeamView />
    </>
  )
}
