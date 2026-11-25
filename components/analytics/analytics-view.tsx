'use client'

import { Activity, AlertTriangle, Gauge, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { EvaluationsChart } from '@/components/charts/evaluations-chart'
import { ConversionChart } from '@/components/charts/conversion-chart'
import { StatCard } from '@/components/app/stat-card'
import { ErrorState } from '@/components/app/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnalytics } from '@/hooks/use-api'
import { formatCompact, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const variantConfig = { conversionRate: { label: 'Conversion rate', color: 'var(--chart-1)' } } satisfies ChartConfig

export function AnalyticsView() {
  const { data, error, mutate } = useAnalytics()

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />
  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const { totals } = data
  const maxEvals = Math.max(...data.flagUsage.map((f) => f.evaluations))

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Evaluations (30d)" value={formatCompact(totals.evaluations30d)} trend={8.2} icon={Activity} />
        <StatCard label="Users evaluated" value={formatCompact(totals.usersEvaluated)} trend={12.4} icon={Users} />
        <StatCard label="Avg. latency" value={`${totals.avgLatencyMs}ms`} hint="p50 edge evaluation" icon={Gauge} />
        <StatCard label="Error rate" value={`${totals.errorRate}%`} hint="SDK evaluation errors" icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flag evaluations</CardTitle>
          <CardDescription>Daily evaluations across all environments, last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <EvaluationsChart data={data.evaluations} className="h-80 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversion trend</CardTitle>
            <CardDescription>Control vs. treatment, daily conversion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionChart data={data.conversions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Variant comparison</CardTitle>
            <CardDescription>Conversion rate by variant across running experiments</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={variantConfig} className="h-64 w-full">
              <BarChart data={data.variantComparison} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="variant" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="conversionRate" fill="var(--color-conversionRate)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Flag usage</CardTitle>
          <CardDescription>Most evaluated flags in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Flag key</TableHead>
                <TableHead className="hidden sm:table-cell">Share</TableHead>
                <TableHead className="text-right">Evaluations</TableHead>
                <TableHead className="pr-4 text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flagUsage.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="pl-4 font-mono text-sm">{f.key}</TableCell>
                  <TableCell className="hidden w-1/3 sm:table-cell">
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(f.evaluations / maxEvals) * 100}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatNumber(f.evaluations)}</TableCell>
                  <TableCell className={cn('pr-4 text-right font-mono tabular-nums', f.trend >= 0 ? 'text-success' : 'text-destructive')}>
                    {f.trend >= 0 ? '+' : ''}
                    {f.trend.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
