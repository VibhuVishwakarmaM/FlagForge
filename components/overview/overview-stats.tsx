'use client'

import { Activity, Flag, FlaskConical, Users } from 'lucide-react'
import { StatCard } from '@/components/app/stat-card'
import { CardGridSkeleton, ErrorState } from '@/components/app/states'
import { useEnvironment } from '@/components/providers/environment-provider'
import { useAnalytics, useExperiments, useFlags } from '@/hooks/use-api'
import { environmentLabels, formatCompact } from '@/lib/format'

export function OverviewStats() {
  const { environment } = useEnvironment()
  const flags = useFlags()
  const experiments = useExperiments()
  const analytics = useAnalytics()

  if (flags.error || experiments.error || analytics.error) {
    return <ErrorState error={flags.error ?? experiments.error ?? analytics.error} onRetry={() => flags.mutate()} />
  }

  if (!flags.data || !experiments.data || !analytics.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardGridSkeleton count={4} />
      </div>
    )
  }

  const active = flags.data.filter((f) => f.environments[environment].enabled).length
  const running = experiments.data.filter((e) => e.status === 'running').length

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total flags" value={String(flags.data.length)} hint="across all environments" icon={Flag} />
      <StatCard
        label="Active flags"
        value={String(active)}
        hint={`enabled in ${environmentLabels[environment]}`}
        icon={Activity}
      />
      <StatCard label="Running experiments" value={String(running)} hint={`of ${experiments.data.length} total`} icon={FlaskConical} />
      <StatCard
        label="Users evaluated"
        value={formatCompact(analytics.data.totals.usersEvaluated)}
        hint="last 30 days"
        trend={12.4}
        icon={Users}
      />
    </div>
  )
}
