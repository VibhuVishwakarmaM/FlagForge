'use client'

import Link from 'next/link'
import { ArrowRight, Flag, FlaskConical, KeyRound, Target } from 'lucide-react'
import { ConversionChart } from '@/components/charts/conversion-chart'
import { EvaluationsChart } from '@/components/charts/evaluations-chart'
import { ErrorState } from '@/components/app/states'
import { useEnvironment } from '@/components/providers/environment-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalytics, useAuditLogs, useExperiments, useFlags } from '@/hooks/use-api'
import { environmentLabels, formatRelative, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function EvaluationActivityCard() {
  const { data, error, mutate } = useAnalytics()
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Evaluation activity</CardTitle>
        <CardDescription>Flag evaluations per day, by environment</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <ErrorState error={error} onRetry={() => mutate()} /> : data ? <EvaluationsChart data={data.evaluations} /> : <Skeleton className="h-64 w-full" />}
      </CardContent>
    </Card>
  )
}

export function QuickActionsCard() {
  const actions = [
    { href: '/flags?new=1', label: 'Create feature flag', icon: Flag },
    { href: '/experiments?new=1', label: 'Launch experiment', icon: FlaskConical },
    { href: '/rules?new=1', label: 'Build targeting rule', icon: Target },
    { href: '/settings#sdk-keys', label: 'Manage SDK keys', icon: KeyRound },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Common workflows</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-lg border bg-background/40 px-3 py-2.5 text-sm transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <a.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex-1 font-medium">{a.label}</span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

export function RolloutOverviewCard() {
  const { environment } = useEnvironment()
  const { data, error, mutate } = useFlags()
  const flags = data?.slice().sort((a, b) => b.environments[environment].rollout - a.environments[environment].rollout).slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollout overview</CardTitle>
        <CardDescription>{environmentLabels[environment]} rollout by flag</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/flags" />} nativeButton={false}>
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : !flags ? (
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)
        ) : (
          flags.map((flag) => {
            const cfg = flag.environments[environment]
            return (
              <Link key={flag.id} href={`/flags/${flag.key}`} className="group flex flex-col gap-1.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium group-hover:text-primary">{flag.name}</span>
                  <span className={cn('font-mono text-xs tabular-nums', cfg.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                    {cfg.enabled ? `${cfg.rollout}%` : 'Off'}
                  </span>
                </div>
                <Progress value={cfg.enabled ? cfg.rollout : 0} aria-label={`${flag.name} rollout`} />
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export function ExperimentPerformanceCard() {
  const { data, error, mutate } = useExperiments()
  const running = data?.find((e) => e.status === 'running')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment performance</CardTitle>
        <CardDescription className="truncate">{running ? running.name : 'Daily conversion rate'}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/experiments" />} nativeButton={false}>
            Details
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : !data ? (
          <Skeleton className="h-56 w-full" />
        ) : running ? (
          <ConversionChart data={running.dailyConversion} className="h-56 w-full" />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No running experiments.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function RecentActivityCard() {
  const { data, error, mutate } = useAuditLogs()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest changes across the workspace</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/audit" />} nativeButton={false}>
            Audit log
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : !data ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {data.slice(0, 6).map((event) => (
              <li key={event.id} className="flex items-start gap-3">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">{initials(event.actor.name)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{event.actor.name}</span>{' '}
                    <span className="text-muted-foreground">{event.details}</span>
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {event.resourceName}
                    {event.environment ? ` · ${environmentLabels[event.environment]}` : ''}
                  </p>
                </div>
                <time dateTime={event.timestamp} className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(event.timestamp)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
