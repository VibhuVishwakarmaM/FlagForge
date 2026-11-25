'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatCompact, formatShortDate } from '@/lib/format'
import type { AnalyticsSnapshot, EnvironmentKey } from '@/lib/types'

const config = {
  production: { label: 'Production', color: 'var(--chart-5)' },
  staging: { label: 'Staging', color: 'var(--chart-4)' },
  development: { label: 'Development', color: 'var(--chart-3)' },
} satisfies ChartConfig

export function EvaluationsChart({
  data,
  environments = ['production', 'staging', 'development'],
  className = 'h-64 w-full',
}: {
  data: AnalyticsSnapshot['evaluations']
  environments?: EnvironmentKey[]
  className?: string
}) {
  return (
    <ChartContainer config={config} className={className}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          {environments.map((env) => (
            <linearGradient key={env} id={`fill-${env}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${env})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${env})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatShortDate} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatShortDate(String(v))} />} />
        {environments.map((env) => (
          <Area
            key={env}
            dataKey={env}
            type="monotone"
            stroke={`var(--color-${env})`}
            fill={`url(#fill-${env})`}
            strokeWidth={2}
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}
