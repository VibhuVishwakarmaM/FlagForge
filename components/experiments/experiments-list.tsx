'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FlaskConical, Plus } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/app/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useExperiments } from '@/hooks/use-api'
import type { ExperimentStatus } from '@/lib/types'
import { ExperimentCard } from './experiment-card'
import { ExperimentFormDialog } from './experiment-form-dialog'

type Filter = 'all' | ExperimentStatus
const filters: Filter[] = ['all', 'running', 'paused', 'draft', 'completed']

export function ExperimentsList() {
  const params = useSearchParams()
  const router = useRouter()
  const { data, error, mutate } = useExperiments()
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState(params.get('new') === '1')

  const visible = (data ?? []).filter((e) => filter === 'all' || e.status === filter)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[filter]}
          onValueChange={(v) => v[0] && setFilter(v[0] as Filter)}
          variant="outline"
          size="sm"
          aria-label="Filter experiments by status"
          className="flex-wrap"
        >
          {filters.map((f) => (
            <ToggleGroupItem key={f} value={f} className="capitalize">
              {f}
              {data ? (
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {f === 'all' ? data.length : data.filter((e) => e.status === f).length}
                </span>
              ) : null}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          New experiment
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : !data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={data.length ? `No ${filter} experiments` : 'No experiments yet'}
          description="Experiments split traffic between flag variants and measure which performs best."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              New experiment
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((e) => (
            <ExperimentCard key={e.id} experiment={e} />
          ))}
        </div>
      )}

      <ExperimentFormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o && params.get('new')) router.replace('/experiments')
        }}
      />
    </>
  )
}
