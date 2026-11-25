import { PageHeader } from '@/components/app/page-header'
import { SettingsView } from '@/components/settings/settings-view'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace preferences, SDK keys and API connection." />
      <SettingsView />
    </>
  )
}
