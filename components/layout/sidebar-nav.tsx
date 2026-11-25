'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isMockMode } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { isActivePath, navSections } from './nav-items'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{section.label}</p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        active
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <item.icon className={cn('size-4', active && 'text-primary')} aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent/50 p-3 text-xs">
          <p className="font-medium">{isMockMode ? 'Mock data mode' : 'Connected to API'}</p>
          <p className="mt-0.5 text-muted-foreground">
            {isMockMode
              ? 'Set NEXT_PUBLIC_FLAGFORGE_API_URL to connect your Express backend.'
              : 'Requests are sent to your FlagForge backend.'}
          </p>
        </div>
      </div>
    </div>
  )
}
