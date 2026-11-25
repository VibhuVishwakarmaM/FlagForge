'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogIn, Menu, Search } from 'lucide-react'
import { EnvironmentDot } from '@/components/app/badges'
import { useEnvironment } from '@/components/providers/environment-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuditLogs } from '@/hooks/use-api'
import { environmentKeys, environmentLabels, formatRelative } from '@/lib/format'
import type { EnvironmentKey } from '@/lib/types'
import { Logo } from './logo'
import { SidebarNav } from './sidebar-nav'

const envItems = environmentKeys.map((key) => ({ value: key, label: environmentLabels[key] }))

export function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { environment, setEnvironment } = useEnvironment()
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/flags?q=${encodeURIComponent(q)}` : '/flags')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu />
      </Button>
      <div className="lg:hidden">
        <Logo />
      </div>

      <Select
        items={envItems}
        value={environment}
        onValueChange={(v) => {
          if (v) setEnvironment(v as EnvironmentKey)
        }}
      >
        <SelectTrigger size="sm" aria-label="Environment" className="ml-auto gap-2 lg:ml-0">
          <EnvironmentDot env={environment} />
          <SelectValue className="hidden sm:flex" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectGroup>
            {envItems.map((env) => (
              <SelectItem key={env.value} value={env.value}>
                <EnvironmentDot env={env.value} />
                {env.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <form onSubmit={handleSearch} role="search" className="hidden flex-1 md:block md:max-w-sm">
        <InputGroup className="h-8">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flags by name or key…"
            aria-label="Search flags"
          />
          <InputGroupAddon align="inline-end">
            <Kbd>↵</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </form>

      <div className="flex items-center gap-1 md:ml-auto">
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search" onClick={() => router.push('/flags')}>
          <Search />
        </Button>
        <NotificationsMenu />
        <UserMenu />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}

function NotificationsMenu() {
  const { data } = useAuditLogs()
  const router = useRouter()
  const recent = data?.slice(0, 5) ?? []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative" />}>
        <Bell />
        {recent.length > 0 ? (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
          {recent.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            recent.map((event) => (
              <DropdownMenuItem key={event.id} onClick={() => router.push('/audit')} className="flex flex-col items-start gap-0.5">
                <span className="text-sm">
                  <span className="font-medium">{event.actor.name}</span>{' '}
                  <span className="text-muted-foreground">{event.details.toLowerCase()}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.resourceName} · {formatRelative(event.timestamp)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/audit')}>View all activity</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Account menu" className="rounded-full" />}>
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary/15 text-xs text-primary">DU</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Demo user</span>
            <span className="text-xs font-normal text-muted-foreground">Not signed in · mock session</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings')}>Workspace settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/team')}>Team & access</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogIn />
          Sign in (Supabase Auth not configured)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
