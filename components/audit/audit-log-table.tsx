'use client'

import { useMemo, useState } from 'react'
import { Download, ScrollText, Search } from 'lucide-react'
import { EnvironmentBadge } from '@/components/app/badges'
import { SimpleSelect } from '@/components/app/simple-select'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/app/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuditLogs } from '@/hooks/use-api'
import { formatDateTime, initials } from '@/lib/format'
import type { ResourceType } from '@/lib/types'

const resourceOptions: { value: 'all' | ResourceType; label: string }[] = [
  { value: 'all', label: 'All resources' },
  { value: 'flag', label: 'Flags' },
  { value: 'experiment', label: 'Experiments' },
  { value: 'rule', label: 'Rules' },
  { value: 'member', label: 'Members' },
  { value: 'sdk_key', label: 'SDK keys' },
  { value: 'workspace', label: 'Workspace' },
]

export function AuditLogTable() {
  const { data, error, mutate } = useAuditLogs()
  const [query, setQuery] = useState('')
  const [resource, setResource] = useState<'all' | ResourceType>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter(
      (e) =>
        (resource === 'all' || e.resourceType === resource) &&
        (!q ||
          e.actor.name.toLowerCase().includes(q) ||
          e.resourceName.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.action.includes(q)),
    )
  }, [data, query, resource])

  function exportCsv() {
    const rows = [['timestamp', 'actor', 'action', 'resource', 'environment', 'details']]
    filtered.forEach((e) => rows.push([e.timestamp, e.actor.email, e.action, e.resourceName, e.environment ?? '', e.details]))
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit-log.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actor, resource…" aria-label="Search audit log" />
        </InputGroup>
        <SimpleSelect options={resourceOptions} value={resource} onValueChange={setResource} aria-label="Filter by resource" className="sm:w-44" />
        <Button variant="outline" className="sm:ml-auto" onClick={exportCsv} disabled={!filtered.length}>
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : !data ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No matching events" description="Adjust the search or resource filter." />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Resource</TableHead>
                  <TableHead className="hidden lg:table-cell">Environment</TableHead>
                  <TableHead className="pr-4 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px]">{initials(e.actor.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{e.actor.name}</span>
                          <span className="hidden truncate text-xs text-muted-foreground sm:block">{e.actor.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="self-start font-mono text-[11px] font-normal">
                          {e.action}
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">{e.details}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm md:table-cell">{e.resourceName}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {e.environment ? <EnvironmentBadge env={e.environment} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs whitespace-nowrap text-muted-foreground">
                      <time dateTime={e.timestamp}>{formatDateTime(e.timestamp)}</time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
