import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Crown,
  Lightbulb,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { EnvironmentBadge, ExperimentStatusBadge } from '@/components/app/badges'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPercent } from '@/lib/format'
import type { ResponseBlock, RiskFactor, Tone } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

const toneText: Record<Tone, string> = {
  positive: 'text-success',
  neutral: 'text-foreground',
  caution: 'text-warning',
  negative: 'text-destructive',
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-border bg-background/60 p-3', className)}>{children}</div>
}

function Meter({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Number(value.toFixed(2))}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-foreground/80 transition-[width] duration-700" style={{ width: `${width}%` }} />
    </div>
  )
}

function MetricsBlock({ block }: { block: Extract<ResponseBlock, { type: 'metrics' }> }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {block.items.map((item) => (
        <Panel key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
          <dd className={cn('text-lg font-semibold tabular-nums tracking-tight', toneText[item.tone ?? 'neutral'])}>
            {item.value}
          </dd>
          {item.hint ? <dd className="text-xs text-muted-foreground">{item.hint}</dd> : null}
        </Panel>
      ))}
    </dl>
  )
}

function ComparisonBlock({ block }: { block: Extract<ResponseBlock, { type: 'comparison' }> }) {
  const max = Math.max(...block.variants.map((v) => v.rate), 0.01)
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{block.title}</p>
          <ExperimentStatusBadge status={block.status} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <EnvironmentBadge env={block.environment} />
          <span>Metric: {block.metric}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {block.variants.map((v) => (
          <li key={v.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{v.name}</span>
                {v.isControl ? (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground">
                    Control
                  </Badge>
                ) : null}
                {v.isLeader ? (
                  <Badge className="h-4 gap-0.5 px-1.5 text-[10px]">
                    <Crown aria-hidden="true" />
                    Leading
                  </Badge>
                ) : null}
              </span>
              <span className={cn('font-mono text-sm tabular-nums', v.isLeader ? 'font-semibold' : 'text-muted-foreground')}>
                {formatPercent(v.rate, 2)}
              </span>
            </div>
            <Meter value={v.rate} max={max} label={`${v.name} conversion rate`} />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {formatNumber(v.conversions)} conversions · {formatNumber(v.exposures)} exposures
            </p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        {block.footnote ?? 'Observed rates. Statistical significance is not reported.'}
      </p>
    </Panel>
  )
}

function FlagsBlock({ block }: { block: Extract<ResponseBlock, { type: 'flags' }> }) {
  return (
    <Panel className="p-0">
      <ul className="divide-y divide-border">
        {block.items.map((f) => (
          <li key={f.key} className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center justify-between gap-2">
              <code className="truncate font-mono text-xs">{f.key}</code>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 text-[11px]',
                  f.enabled ? 'text-success' : 'text-muted-foreground',
                )}
              >
                <span aria-hidden="true" className={cn('size-1.5 rounded-full', f.enabled ? 'bg-success' : 'bg-muted-foreground')} />
                {f.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Meter value={f.enabled ? f.rollout : 0} label={`${f.key} rollout`} />
              <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums">{f.enabled ? `${f.rollout}%` : '—'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <span className="capitalize">{f.type}</span>
              <span aria-hidden="true">·</span>
              <span>Serving {f.served}</span>
              {f.rules.map((r) => (
                <Badge key={r} variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                  {r}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

const riskIcon: Record<RiskFactor['status'], { icon: typeof CheckCircle2; className: string; label: string }> = {
  ok: { icon: CheckCircle2, className: 'text-success', label: 'OK' },
  caution: { icon: AlertTriangle, className: 'text-warning', label: 'Caution' },
  risk: { icon: XCircle, className: 'text-destructive', label: 'Risk' },
  unknown: { icon: CircleHelp, className: 'text-muted-foreground', label: 'Unknown' },
}

const levelStyles = {
  low: { label: 'Low risk', bars: 1 },
  moderate: { label: 'Moderate risk', bars: 2 },
  elevated: { label: 'Elevated risk', bars: 3 },
} as const

function RiskBlock({ block }: { block: Extract<ResponseBlock, { type: 'risk' }> }) {
  const level = levelStyles[block.level]
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <ShieldAlert className="size-4 text-muted-foreground" aria-hidden="true" />
          {block.title}
        </p>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-end gap-0.5" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn('w-1 rounded-sm', i <= level.bars ? 'bg-foreground' : 'bg-muted')}
                style={{ height: `${4 + i * 3}px` }}
              />
            ))}
          </span>
          {level.label}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {block.factors.map((f) => {
          const meta = riskIcon[f.status]
          const Icon = meta.icon
          return (
            <li key={`${f.label}-${f.detail}`} className="flex gap-2">
              <Icon className={cn('mt-0.5 size-4 shrink-0', meta.className)} aria-label={meta.label} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-xs font-medium">{f.label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function TrendsBlock({ block }: { block: Extract<ResponseBlock, { type: 'trends' }> }) {
  return (
    <Panel className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{block.title}</p>
      <ul className="flex flex-col gap-1.5">
        {block.items.map((item) => {
          const up = item.trend >= 0
          const Icon = up ? ArrowUpRight : ArrowDownRight
          return (
            <li key={item.label} className="flex items-center justify-between gap-2 text-xs">
              <code className="truncate font-mono">{item.label}</code>
              <span className="flex shrink-0 items-center gap-2 tabular-nums">
                <span className="text-muted-foreground">{item.value}</span>
                <span className={cn('inline-flex w-14 items-center justify-end gap-0.5', up ? 'text-success' : 'text-destructive')}>
                  <Icon className="size-3" aria-hidden="true" />
                  {up ? '+' : ''}
                  {item.trend.toFixed(1)}%
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function InsightBlock({ block }: { block: ResponseBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm leading-relaxed text-pretty">{block.content}</p>
    case 'metrics':
      return <MetricsBlock block={block} />
    case 'comparison':
      return <ComparisonBlock block={block} />
    case 'flags':
      return <FlagsBlock block={block} />
    case 'risk':
      return <RiskBlock block={block} />
    case 'trends':
      return <TrendsBlock block={block} />
    case 'bullets':
      return (
        <div className="flex flex-col gap-1.5">
          {block.title ? <p className="text-xs font-medium text-muted-foreground">{block.title}</p> : null}
          <ul className="flex flex-col gap-1.5">
            {block.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span className="text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'recommendation':
      return (
        <div className="flex gap-2.5 rounded-xl border border-foreground/20 bg-foreground/[0.04] p-3">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold">{block.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{block.content}</p>
          </div>
        </div>
      )
  }
}
