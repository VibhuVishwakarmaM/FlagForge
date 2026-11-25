'use client'

import { useState } from 'react'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EnvironmentBadge } from '@/components/app/badges'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { SimpleSelect } from '@/components/app/simple-select'
import { EmptyState, ErrorState } from '@/components/app/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { keys, revalidate, useSdkKeys, useWorkspace } from '@/hooks/use-api'
import { isMockMode } from '@/lib/api/client'
import { settingsService } from '@/lib/api/services'
import { environmentKeys, environmentLabels, formatRelative } from '@/lib/format'
import type { EnvironmentKey, SdkKey, Workspace } from '@/lib/types'

export function SettingsView() {
  const { data, error, mutate } = useWorkspace()
  return (
    <>
      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : data ? (
        <WorkspaceForm key={JSON.stringify(data)} workspace={data} />
      ) : (
        <Skeleton className="h-96 w-full" />
      )}
      <SdkKeysCard />
      <Card size="sm">
        <CardHeader>
          <CardTitle>API connection</CardTitle>
          <CardDescription>
            {isMockMode
              ? 'Running against the built-in mock API. Set NEXT_PUBLIC_API_BASE_URL to connect a real backend.'
              : 'Connected to your feature flag API.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={isMockMode ? 'secondary' : 'default'}>{isMockMode ? 'Mock mode' : 'Live API'}</Badge>
        </CardContent>
      </Card>
    </>
  )
}

function WorkspaceForm({ workspace }: { workspace: Workspace }) {
  const [draft, setDraft] = useState(workspace)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; staleFlagDays?: string }>({})
  const dirty = JSON.stringify(draft) !== JSON.stringify(workspace)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (draft.name.trim().length < 2) next.name = 'Workspace name is required.'
    if (!Number.isInteger(draft.staleFlagDays) || draft.staleFlagDays < 1 || draft.staleFlagDays > 365)
      next.staleFlagDays = 'Enter a whole number between 1 and 365.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      await settingsService.updateWorkspace({ ...draft, name: draft.name.trim() })
      await revalidate(keys.workspace)
      toast.success('Settings saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={save} noValidate className="flex flex-col gap-(--card-spacing)">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>General preferences for this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="ws-name">Workspace name</FieldLabel>
                <Input id="ws-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={errors.name ? true : undefined} />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </Field>
              <Field data-disabled>
                <FieldLabel htmlFor="ws-slug">Slug</FieldLabel>
                <Input id="ws-slug" value={draft.slug} disabled className="font-mono" />
              </Field>
              <Field data-invalid={errors.staleFlagDays ? true : undefined}>
                <FieldLabel htmlFor="ws-stale">Stale flag threshold (days)</FieldLabel>
                <Input
                  id="ws-stale"
                  type="number"
                  min={1}
                  max={365}
                  value={draft.staleFlagDays}
                  onChange={(e) => setDraft({ ...draft, staleFlagDays: Number(e.target.value) })}
                  aria-invalid={errors.staleFlagDays ? true : undefined}
                />
                {errors.staleFlagDays ? (
                  <FieldError>{errors.staleFlagDays}</FieldError>
                ) : (
                  <FieldDescription>Flags unchanged for this long are marked stale.</FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="ws-retention">Audit log retention</FieldLabel>
                <SimpleSelect
                  id="ws-retention"
                  options={['30', '90', '180', '365'].map((d) => ({ value: d, label: `${d} days` }))}
                  value={String(draft.auditRetentionDays)}
                  onValueChange={(v) => setDraft({ ...draft, auditRetentionDays: Number(v) })}
                />
              </Field>
            </div>
            <Field orientation="horizontal" className="rounded-lg border p-4">
              <FieldContent>
                <FieldLabel htmlFor="ws-confirm">Require confirmation for destructive actions</FieldLabel>
                <FieldDescription>Ask before deleting flags, rules, experiments or members.</FieldDescription>
              </FieldContent>
              <Switch
                id="ws-confirm"
                checked={draft.requireDeleteConfirmation}
                onCheckedChange={(v) => setDraft({ ...draft, requireDeleteConfirmation: v })}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={() => setDraft(workspace)}>
            Discard
          </Button>
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function SdkKeysCard() {
  const { data, error, mutate } = useSdkKeys()
  const [createOpen, setCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<SdkKey | null>(null)

  return (
    <Card id="sdk-keys" className="scroll-mt-20 pb-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>SDK keys</CardTitle>
            <CardDescription>Keys your applications use to evaluate flags.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            New key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {error ? (
          <div className="px-4 pb-4">
            <ErrorState error={error} onRetry={() => mutate()} />
          </div>
        ) : !data ? (
          <div className="px-4 pb-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState icon={KeyRound} title="No SDK keys" description="Create a key to connect an application." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden sm:table-cell">Environment</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="hidden md:table-cell">Last used</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{k.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{k.type}-side</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <EnvironmentBadge env={k.environment} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.type === 'client' ? 'client' : 'sdk'}-••••{k.lastFour}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{formatRelative(k.lastUsedAt)}</TableCell>
                  <TableCell className="pr-4">
                    <Button variant="ghost" size="icon-sm" aria-label={`Revoke ${k.name}`} onClick={() => setRevoking(k)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke SDK key?"
        description={`Applications using "${revoking?.name}" will stop receiving flag updates immediately.`}
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (!revoking) return
          await settingsService.revokeSdkKey(revoking.id)
          await revalidate(keys.sdkKeys)
          toast.success('SDK key revoked')
        }}
      />
    </Card>
  )
}

function CreateKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<EnvironmentKey>('production')
  const [type, setType] = useState<SdkKey['type']>('server')
  const [error, setError] = useState<string>()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters.')
      return
    }
    await settingsService.createSdkKey({ name: name.trim(), environment, type })
    await revalidate(keys.sdkKeys)
    toast.success('SDK key created', { description: 'Copy it now — it will only be shown once.' })
    setName('')
    setError(undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Create SDK key</DialogTitle>
            <DialogDescription>Server keys must never be exposed in browsers or mobile apps.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="key-name">Name</FieldLabel>
              <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Web app (prod)" aria-invalid={error ? true : undefined} />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="key-env">Environment</FieldLabel>
                <SimpleSelect id="key-env" options={environmentKeys.map((k) => ({ value: k, label: environmentLabels[k] }))} value={environment} onValueChange={setEnvironment} />
              </Field>
              <Field>
                <FieldLabel htmlFor="key-type">Type</FieldLabel>
                <SimpleSelect
                  id="key-type"
                  options={[
                    { value: 'server' as const, label: 'Server-side' },
                    { value: 'client' as const, label: 'Client-side' },
                  ]}
                  value={type}
                  onValueChange={setType}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
