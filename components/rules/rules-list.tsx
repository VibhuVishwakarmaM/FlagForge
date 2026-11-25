'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/app/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { keys, revalidate, useFlags, useRules } from '@/hooks/use-api'
import { rulesService } from '@/lib/api/services'
import { environmentKeys, formatRelative, operatorLabels } from '@/lib/format'
import type { TargetingRule } from '@/lib/types'
import { RuleFormDialog } from './rule-form-dialog'

export function RulesList() {
  const params = useSearchParams()
  const router = useRouter()
  const { data, error, mutate } = useRules()
  const { data: flags } = useFlags()
  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState<TargetingRule | undefined>()
  const [deleting, setDeleting] = useState<TargetingRule | null>(null)

  const usage = (ruleId: string) =>
    (flags ?? []).filter((f) => environmentKeys.some((env) => f.environments[env].ruleIds.includes(ruleId)))

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          New rule
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CardGridSkeleton count={4} />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No targeting rules"
          description="Rules define user segments — like beta testers or users in a country — that flags can target."
          action={
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              New rule
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((rule) => {
            const usedBy = usage(rule.id)
            return (
              <Card key={rule.id}>
                <CardHeader>
                  <CardTitle>{rule.name}</CardTitle>
                  <CardDescription className="text-pretty">{rule.description || 'No description.'}</CardDescription>
                  <CardAction className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${rule.name}`}
                      onClick={() => {
                        setEditing(rule)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${rule.name}`} onClick={() => setDeleting(rule)}>
                      <Trash2 />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Users matching <span className="font-medium text-foreground">{rule.combinator === 'AND' ? 'all' : 'any'}</span> of:
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {rule.conditions.map((c) => (
                      <li key={c.id} className="rounded-md border bg-background/40 px-3 py-2 text-sm">
                        <span className="font-mono text-primary">{c.attribute}</span>{' '}
                        <span className="text-muted-foreground">{operatorLabels[c.operator]}</span>{' '}
                        <span className="font-mono">{c.value}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex-wrap justify-between gap-2 border-t text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {usedBy.length ? (
                      <>
                        Used by
                        {usedBy.slice(0, 3).map((f) => (
                          <Badge key={f.id} variant="secondary" className="font-mono font-normal">
                            {f.key}
                          </Badge>
                        ))}
                        {usedBy.length > 3 ? <span>+{usedBy.length - 3}</span> : null}
                      </>
                    ) : (
                      'Not attached to any flag'
                    )}
                  </div>
                  <span>Updated {formatRelative(rule.updatedAt)}</span>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <RuleFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o && params.get('new')) router.replace('/rules')
        }}
        rule={editing}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete targeting rule?"
        description={
          deleting && usage(deleting.id).length
            ? `"${deleting.name}" is attached to ${usage(deleting.id).length} flag(s). It will be detached from all of them.`
            : `"${deleting?.name}" will be permanently deleted.`
        }
        confirmLabel="Delete rule"
        onConfirm={async () => {
          if (!deleting) return
          await rulesService.remove(deleting.id)
          await revalidate(keys.rules, keys.flags)
          toast.success('Rule deleted')
        }}
      />
    </>
  )
}
