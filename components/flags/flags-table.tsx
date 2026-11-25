'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flag, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { EnvironmentBadge, FlagStatusBadge } from '@/components/app/badges'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { SimpleSelect } from '@/components/app/simple-select'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/app/states'
import { useEnvironment } from '@/components/providers/environment-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { keys, revalidate, useFlags } from '@/hooks/use-api'
import { flagsService } from '@/lib/api/services'
import { environmentLabels } from '@/lib/format'
import type { FeatureFlag } from '@/lib/types'
import { FlagFormDialog } from './flag-form-dialog'

type TypeFilter = 'all' | 'boolean' | 'multivariate'
type StatusFilter = 'all' | 'enabled' | 'disabled'

const typeOptions = [
  { value: 'all' as const, label: 'All types' },
  { value: 'boolean' as const, label: 'Boolean' },
  { value: 'multivariate' as const, label: 'Multivariate' },
]
const statusOptions = [
  { value: 'all' as const, label: 'Any status' },
  { value: 'enabled' as const, label: 'Enabled' },
  { value: 'disabled' as const, label: 'Disabled' },
]

export function FlagsTable() {
  const params = useSearchParams()
  const router = useRouter()
  const { environment } = useEnvironment()
  const { data, error, isLoading, mutate } = useFlags()

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState<FeatureFlag | undefined>()
  const [deleting, setDeleting] = useState<FeatureFlag | null>(null)
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter((f) => {
      const cfg = f.environments[environment]
      if (type !== 'all' && f.type !== type) return false
      if (status === 'enabled' && !cfg.enabled) return false
      if (status === 'disabled' && cfg.enabled) return false
      if (!q) return true
      return f.name.toLowerCase().includes(q) || f.key.includes(q) || f.tags.some((t) => t.includes(q))
    })
  }, [data, query, type, status, environment])

  const hasFilters = query !== '' || type !== 'all' || status !== 'all'

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open)
    if (!open && params.get('new')) router.replace('/flags')
  }

  async function toggle(flag: FeatureFlag, enabled: boolean) {
    setPendingToggle(flag.id)
    try {
      await mutate(
        async (current) => {
          await flagsService.updateEnvironment(flag.id, environment, { enabled })
          return current
        },
        {
          optimisticData: (current) =>
            (current ?? []).map((f) =>
              f.id === flag.id
                ? { ...f, environments: { ...f.environments, [environment]: { ...f.environments[environment], enabled } } }
                : f,
            ),
          rollbackOnError: true,
          revalidate: true,
        },
      )
      await revalidate(keys.flag(flag.key))
      toast.success(`${flag.name} ${enabled ? 'enabled' : 'disabled'}`, { description: environmentLabels[environment] })
    } catch {
      toast.error('Could not update flag')
    } finally {
      setPendingToggle(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    await flagsService.remove(deleting.id)
    await revalidate(keys.flags)
    toast.success('Flag deleted', { description: deleting.key })
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <InputGroup className="md:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, key or tag…"
            aria-label="Search flags"
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setQuery('')}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        <div className="flex gap-2">
          <SimpleSelect options={typeOptions} value={type} onValueChange={setType} aria-label="Filter by type" className="md:w-40" />
          <SimpleSelect options={statusOptions} value={status} onValueChange={setStatus} aria-label="Filter by status" className="md:w-36" />
        </div>
        <Button className="md:ml-auto" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Create flag
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <TableSkeleton />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No feature flags yet"
          description="Create your first flag to start shipping features safely."
          action={
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Create flag
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No flags match your filters"
          description="Try a different search term or clear the filters."
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setType('all')
                  setStatus('all')
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Flag</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Environment</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden w-40 md:table-cell">Rollout</TableHead>
                  <TableHead className="w-14 text-center">On</TableHead>
                  <TableHead className="w-12 pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((flag) => {
                  const cfg = flag.environments[environment]
                  return (
                    <TableRow key={flag.id}>
                      <TableCell className="max-w-64 pl-4">
                        <Link href={`/flags/${flag.key}`} className="group flex flex-col gap-0.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                          <span className="truncate font-medium group-hover:text-primary">{flag.name}</span>
                          <span className="truncate font-mono text-xs text-muted-foreground">{flag.key}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="font-normal capitalize">
                          {flag.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <EnvironmentBadge env={environment} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <FlagStatusBadge enabled={cfg.enabled} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={cfg.enabled ? cfg.rollout : 0} className="w-20" aria-label={`${flag.name} rollout`} />
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{cfg.rollout}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={cfg.enabled}
                          disabled={pendingToggle === flag.id}
                          onCheckedChange={(checked) => void toggle(flag, checked)}
                          aria-label={`${cfg.enabled ? 'Disable' : 'Enable'} ${flag.name} in ${environmentLabels[environment]}`}
                        />
                      </TableCell>
                      <TableCell className="pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${flag.name}`} />}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => router.push(`/flags/${flag.key}`)}>
                                <SlidersHorizontal />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(flag)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil />
                                Edit details
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(flag)}>
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data ? (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {data.length} flags · statuses reflect {environmentLabels[environment]}
        </p>
      ) : null}

      <FlagFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        flag={editing}
        existingKeys={(data ?? []).map((f) => f.key)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete feature flag?"
        description={
          <>
            <span className="font-mono text-foreground">{deleting?.key}</span> will be removed from every environment. SDKs
            evaluating it will receive their default value.
          </>
        }
        confirmLabel="Delete flag"
        onConfirm={confirmDelete}
      />
    </>
  )
}
