'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCheck, MoreHorizontal, Pause, Play, Trash2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { EnvironmentBadge, ExperimentStatusBadge } from '@/components/app/badges'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { ConversionChart } from '@/components/charts/conversion-chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { keys, revalidate } from '@/hooks/use-api'
import { experimentsService } from '@/lib/api/services'
import { formatDate, formatNumber } from '@/lib/format'
import type { Experiment, ExperimentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const rate = (v: { exposures: number; conversions: number }) => (v.exposures ? (v.conversions / v.exposures) * 100 : 0)

export function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const control = experiment.variants[0]
  const controlRate = control ? rate(control) : 0
  const leader = experiment.variants.reduce<(typeof experiment.variants)[number] | null>(
    (best, v) => (v.exposures > 0 && (!best || rate(v) > rate(best)) ? v : best),
    null,
  )
  const totalExposures = experiment.variants.reduce((s, v) => s + v.exposures, 0)

  async function setStatus(status: ExperimentStatus) {
    setBusy(true)
    try {
      await experimentsService.setStatus(experiment.id, status)
      await revalidate(keys.experiments)
      toast.success(`Experiment ${status === 'running' ? 'started' : status}`, { description: experiment.name })
    } catch {
      toast.error('Could not update experiment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{experiment.name}</CardTitle>
          <ExperimentStatusBadge status={experiment.status} />
        </div>
        <CardDescription className="text-pretty">{experiment.hypothesis || 'No hypothesis provided.'}</CardDescription>
        <CardAction className="flex items-center gap-1">
          {experiment.status === 'draft' || experiment.status === 'paused' ? (
            <Button size="sm" disabled={busy} onClick={() => void setStatus('running')}>
              <Play data-icon="inline-start" />
              {experiment.status === 'draft' ? 'Start' : 'Resume'}
            </Button>
          ) : experiment.status === 'running' ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void setStatus('paused')}>
              <Pause data-icon="inline-start" />
              Pause
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${experiment.name}`} />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={experiment.status === 'completed' || experiment.status === 'draft'} onClick={() => void setStatus('completed')}>
                  <CheckCheck />
                  Mark complete
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            Flag
            <Link href={`/flags/${experiment.flagKey}`} className="font-mono text-foreground hover:text-primary">
              {experiment.flagKey}
            </Link>
          </span>
          <EnvironmentBadge env={experiment.environment} />
          <span>
            Traffic <span className="font-mono text-foreground">{experiment.trafficPercentage}%</span>
          </span>
          <span>
            Metric <span className="font-mono text-foreground">{experiment.primaryMetric}</span>
          </span>
          {experiment.startedAt ? <span>Started {formatDate(experiment.startedAt)}</span> : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Split</TableHead>
                  <TableHead className="text-right">Exposures</TableHead>
                  <TableHead className="text-right">Conv. rate</TableHead>
                  <TableHead className="text-right">Lift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiment.variants.map((v, i) => {
                  const r = rate(v)
                  const lift = i === 0 || controlRate === 0 ? null : ((r - controlRate) / controlRate) * 100
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <span className="flex items-center gap-1.5 font-medium">
                          {v.name}
                          {leader?.id === v.id && totalExposures > 0 ? (
                            <Trophy className="size-3.5 text-warning" aria-label="Leading variant" />
                          ) : null}
                          {i === 0 ? (
                            <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                              baseline
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{v.allocation}%</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatNumber(v.exposures)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{r.toFixed(2)}%</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono tabular-nums',
                          lift === null ? 'text-muted-foreground' : lift >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {lift === null ? '—' : `${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="xl:col-span-2">
            {experiment.dailyConversion.length ? (
              <ConversionChart data={experiment.dailyConversion} className="h-48 w-full" />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Results appear once the experiment starts.
              </div>
            )}
          </div>
        </div>
      </CardContent>
      {totalExposures > 0 ? (
        <CardFooter className="border-t text-xs text-muted-foreground">
          {formatNumber(totalExposures)} total exposures
        </CardFooter>
      ) : null}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete experiment?"
        description={`"${experiment.name}" and its collected results will be permanently deleted.`}
        confirmLabel="Delete experiment"
        onConfirm={async () => {
          await experimentsService.remove(experiment.id)
          await revalidate(keys.experiments)
          toast.success('Experiment deleted')
        }}
      />
    </Card>
  )
}
