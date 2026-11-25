import { Badge } from '@/components/ui/badge'
import { environmentDotClass, environmentLabels } from '@/lib/format'
import type { EnvironmentKey, ExperimentStatus, Role } from '@/lib/types'
import { cn } from '@/lib/utils'

export function EnvironmentDot({ env, className }: { env: EnvironmentKey; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', environmentDotClass[env], className)} />
}

export function EnvironmentBadge({ env }: { env: EnvironmentKey }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <EnvironmentDot env={env} />
      {environmentLabels[env]}
    </Badge>
  )
}

export function FlagStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-normal', enabled ? 'border-success/30 text-success' : 'text-muted-foreground')}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', enabled ? 'bg-success' : 'bg-muted-foreground')} />
      {enabled ? 'Enabled' : 'Disabled'}
    </Badge>
  )
}

const experimentStatusClass: Record<ExperimentStatus, string> = {
  running: 'border-success/30 text-success',
  paused: 'border-warning/30 text-warning',
  draft: 'text-muted-foreground',
  completed: 'border-primary/30 text-primary',
}

export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  return (
    <Badge variant="outline" className={cn('font-normal capitalize', experimentStatusClass[status])}>
      {status}
    </Badge>
  )
}

const roleClass: Record<Role, string> = {
  admin: 'border-primary/30 text-primary',
  developer: 'border-chart-3/30 text-chart-3',
  viewer: 'text-muted-foreground',
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={cn('font-normal capitalize', roleClass[role])}>
      {role}
    </Badge>
  )
}
