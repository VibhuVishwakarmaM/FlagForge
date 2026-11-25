'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Flag, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EnvironmentDot } from '@/components/app/badges'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/app/states'
import { useEnvironment } from '@/components/providers/environment-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { keys, revalidate, useFlag, useFlags, useRules } from '@/hooks/use-api'
import { flagsService } from '@/lib/api/services'
import { environmentKeys, environmentLabels, formatDate, formatRelative } from '@/lib/format'
import type { EnvironmentKey, FeatureFlag, FlagEnvironmentConfig } from '@/lib/types'
import { EvaluationPreview } from './evaluation-preview'
import { FlagEnvironmentPanel } from './flag-environment-panel'
import { FlagFormDialog } from './flag-form-dialog'

export function FlagDetails({ flagKey }: { flagKey: string }) {
  const { data: flag, error, isLoading, mutate } = useFlag(flagKey)
  const { data: rules } = useRules()

  if (error) {
    const notFound = error instanceof Error && /not found/i.test(error.message)
    return notFound ? (
      <EmptyState
        icon={Flag}
        title="Flag not found"
        description={`No flag with key "${flagKey}" exists in this workspace.`}
        action={
          <Button render={<Link href="/flags" />} nativeButton={false} variant="outline">
            Back to flags
          </Button>
        }
      />
    ) : (
      <ErrorState error={error} onRetry={() => mutate()} />
    )
  }

  if (isLoading || !flag || !rules) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[32rem] lg:col-span-3" />
          <Skeleton className="h-[32rem] lg:col-span-2" />
        </div>
      </div>
    )
  }

  return <FlagDetailsLoaded key={flag.updatedAt} flag={flag} rules={rules} />
}

function FlagDetailsLoaded({ flag, rules }: { flag: FeatureFlag; rules: NonNullable<ReturnType<typeof useRules>['data']> }) {
  const router = useRouter()
  const { environment, setEnvironment } = useEnvironment()
  const { data: allFlags } = useFlags()
  const [drafts, setDrafts] = useState<Record<EnvironmentKey, FlagEnvironmentConfig>>(flag.environments)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="self-start" render={<Link href="/flags" />} nativeButton={false}>
          <ArrowLeft data-icon="inline-start" />
          Feature flags
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{flag.name}</h1>
              <Badge variant="secondary" className="font-normal capitalize">
                {flag.type}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(flag.key)
                toast.success('Flag key copied')
              }}
              className="flex items-center gap-1.5 self-start rounded-sm font-mono text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {flag.key}
              <Copy className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Copy key</span>
            </button>
            {flag.description ? <p className="max-w-2xl text-pretty text-sm text-muted-foreground">{flag.description}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={environment} onValueChange={(v) => setEnvironment(v as EnvironmentKey)}>
        <TabsList>
          {environmentKeys.map((env) => (
            <TabsTrigger key={env} value={env} className="gap-2">
              <EnvironmentDot env={env} />
              {environmentLabels[env]}
              <span className="font-mono text-xs text-muted-foreground">
                {flag.environments[env].enabled ? `${flag.environments[env].rollout}%` : 'off'}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <FlagEnvironmentPanel
            key={environment}
            flag={flag}
            env={environment}
            rules={rules}
            draft={drafts[environment]}
            onDraftChange={(next) => setDrafts((prev) => ({ ...prev, [environment]: next }))}
          />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <EvaluationPreview flag={flag} env={environment} config={drafts[environment]} rules={rules} />
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>Values this flag can serve.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {flag.variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{v.name}</span>
                      {v.description ? <span className="truncate text-xs text-muted-foreground">{v.description}</span> : null}
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {v.value}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Owner</dt>
                <dd>{flag.owner}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(flag.createdAt)}</dd>
                <dt className="text-muted-foreground">Last updated</dt>
                <dd>{formatRelative(flag.updatedAt)}</dd>
                <dt className="text-muted-foreground">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {flag.tags.length ? (
                    flag.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </dd>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <FlagFormDialog open={editOpen} onOpenChange={setEditOpen} flag={flag} existingKeys={(allFlags ?? []).map((f) => f.key)} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete feature flag?"
        description={
          <>
            <span className="font-mono text-foreground">{flag.key}</span> will be permanently removed from all environments.
          </>
        }
        confirmLabel="Delete flag"
        onConfirm={async () => {
          await flagsService.remove(flag.id)
          await revalidate(keys.flags)
          toast.success('Flag deleted', { description: flag.key })
          router.push('/flags')
        }}
      />
    </>
  )
}
