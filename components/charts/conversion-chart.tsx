'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatShortDate } from '@/lib/format'

const palette = ['var(--chart-2)', 'var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

/** Line chart of daily conversion rate (%) per variant. Series keys are every non-`date` field. */
export function ConversionChart({
  data,
  className = 'h-64 w-full',
}: {
  data: Array<Record<string, number | string>>
  className?: string
}) {
  const series = data.length ? Object.keys(data[0]).filter((k) => k !== 'date') : []
  const config: ChartConfig = Object.fromEntries(
    series.map((s, i) => [s, { label: s.charAt(0).toUpperCase() + s.slice(1), color: palette[i % palette.length] }]),
  )

  return (
    <ChartContainer config={config} className={className}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={(v: string) => formatShortDate(v)} />
        <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} domain={['auto', 'auto']} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatShortDate(String(v))}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[String(name)]?.label ?? name}</span>
                  <span className="font-mono tabular-nums">{Number(value).toFixed(2)}%</span>
                </div>
              )}
            />
          }
        />
        {series.map((s) => (
          <Line key={s} dataKey={s} type="monotone" stroke={`var(--color-${s})`} strokeWidth={2} dot={false} />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}
