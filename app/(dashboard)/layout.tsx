import { SidebarNav } from '@/components/layout/sidebar-nav'
import { TopBar } from '@/components/layout/top-bar'
import { EnvironmentProvider } from '@/components/providers/environment-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <EnvironmentProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <SidebarNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </EnvironmentProvider>
  )
}
